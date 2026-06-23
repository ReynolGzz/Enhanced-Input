//! The runtime engine: reads the physical controller, applies the active
//! profile, and drives the virtual pad + keyboard. Runs on a background thread
//! and exposes a live snapshot for the UI preview.

use crate::input::GamepadState;
use crate::profile::{OutputTarget, Profile};
use crate::{output, transform};
use parking_lot::{Mutex, RwLock};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub running: bool,
    pub connected: bool,
    pub message: String,
}

/// A small snapshot the UI can poll to draw live input.
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LivePreview {
    pub connected: bool,
    pub in_lx: f32,
    pub in_ly: f32,
    pub in_rx: f32,
    pub in_ry: f32,
    pub out_lx: f32,
    pub out_ly: f32,
    pub out_rx: f32,
    pub out_ry: f32,
    pub lt: f32,
    pub rt: f32,
    pub pressed: Vec<String>,
}

pub struct Engine {
    running: AtomicBool,
    profile: RwLock<Profile>,
    status: Mutex<EngineStatus>,
    live: Mutex<LivePreview>,
    thread: Mutex<Option<JoinHandle<()>>>,
}

impl Engine {
    pub fn new(profile: Profile) -> Arc<Self> {
        Arc::new(Engine {
            running: AtomicBool::new(false),
            profile: RwLock::new(profile),
            status: Mutex::new(EngineStatus::default()),
            live: Mutex::new(LivePreview::default()),
            thread: Mutex::new(None),
        })
    }

    pub fn set_profile(&self, profile: Profile) {
        *self.profile.write() = profile;
    }

    pub fn status(&self) -> EngineStatus {
        self.status.lock().clone()
    }

    pub fn live(&self) -> LivePreview {
        self.live.lock().clone()
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    fn set_status(&self, running: bool, connected: bool, message: impl Into<String>) {
        *self.status.lock() = EngineStatus {
            running,
            connected,
            message: message.into(),
        };
    }
}

/// Square-wave turbo gate based on how long a button has been held.
fn turbo_active(start: Instant, rate_hz: f32) -> bool {
    let rate = rate_hz.clamp(1.0, 40.0);
    let elapsed = start.elapsed().as_secs_f32();
    // Two half-periods per cycle; "on" during the first half.
    let phase = (elapsed * rate * 2.0) as u64;
    phase % 2 == 0
}

#[cfg(windows)]
impl Engine {
    /// Start the engine on a background thread. No-op if already running.
    pub fn start(self: &Arc<Self>, controller_path: Option<String>) -> Result<(), String> {
        if self.running.swap(true, Ordering::SeqCst) {
            return Ok(()); // already running
        }

        let engine = Arc::clone(self);
        let handle = std::thread::Builder::new()
            .name("enhanced-input-engine".into())
            .spawn(move || engine.run(controller_path))
            .map_err(|e| e.to_string())?;

        *self.thread.lock() = Some(handle);
        Ok(())
    }

    /// Stop the engine and release any held keys.
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.thread.lock().take() {
            let _ = handle.join();
        }
        self.set_status(false, false, "Stopped");
    }

    fn run(self: Arc<Self>, controller_path: Option<String>) {
        use crate::input::{open_reader, InputReader};
        use crate::output::VirtualPad;

        let mut pad = match VirtualPad::new() {
            Ok(p) => p,
            Err(e) => {
                self.running.store(false, Ordering::SeqCst);
                self.set_status(false, false, format!("Virtual pad error: {e}"));
                return;
            }
        };

        let mut reader: Box<dyn InputReader> = match open_reader(controller_path.as_deref()) {
            Ok(r) => r,
            Err(e) => {
                self.running.store(false, Ordering::SeqCst);
                self.set_status(false, false, format!("Controller error: {e}"));
                return;
            }
        };

        self.set_status(true, true, "Running");

        let mut state = GamepadState::default();
        let mut held_keys: HashSet<String> = HashSet::new();
        let mut turbo_start: HashMap<String, Instant> = HashMap::new();

        while self.running.load(Ordering::SeqCst) {
            // 1. Read newest physical state (keep previous on timeout).
            match reader.read() {
                Ok(Some(s)) => state = s,
                Ok(None) => {}
                Err(e) => {
                    self.set_status(true, false, format!("Read error: {e}"));
                    break;
                }
            }

            let profile = self.profile.read().clone();
            let now = Instant::now();

            // 2. Sticks.
            let (out_lx, out_ly) = transform::apply_stick(&profile.left_stick, state.lx, state.ly);
            let (out_rx, out_ry) = transform::apply_stick(&profile.right_stick, state.rx, state.ry);

            // 3. Triggers (analog passthrough by default).
            let lt = transform::apply_trigger(&profile.left_trigger, state.lt);
            let rt = transform::apply_trigger(&profile.right_trigger, state.rt);

            // 4. Buttons -> output bits + desired keys.
            let mut out_bits: u16 = 0;
            let mut desired_keys: HashSet<String> = HashSet::new();
            let mut pressed_ids: Vec<String> = Vec::new();

            for (id, pressed) in state.buttons.iter() {
                if pressed {
                    pressed_ids.push(id.to_string());
                }
                let mapping = profile.button(id);

                // Turbo gating.
                let active = if pressed && mapping.turbo {
                    let start = *turbo_start.entry(id.to_string()).or_insert(now);
                    turbo_active(start, mapping.turbo_rate_hz)
                } else {
                    if !pressed {
                        turbo_start.remove(id);
                    }
                    pressed
                };

                match &mapping.output {
                    OutputTarget::Passthrough => {
                        if active {
                            out_bits |= output::bit_for(id);
                        }
                    }
                    OutputTarget::None => {}
                    OutputTarget::Gamepad { button } => {
                        if active {
                            out_bits |= output::bit_for(button);
                        }
                    }
                    OutputTarget::Key { code } => {
                        if active {
                            desired_keys.insert(code.clone());
                        }
                    }
                }
            }

            // 5. Trigger digital remaps (in addition to analog output).
            let lt_pressed = lt >= profile.left_trigger.threshold;
            let rt_pressed = rt >= profile.right_trigger.threshold;
            let mut lt_out = lt;
            let mut rt_out = rt;
            apply_trigger_output(
                &profile.left_trigger.output,
                lt_pressed,
                &mut out_bits,
                &mut desired_keys,
                &mut lt_out,
            );
            apply_trigger_output(
                &profile.right_trigger.output,
                rt_pressed,
                &mut out_bits,
                &mut desired_keys,
                &mut rt_out,
            );

            // 6. Diff keyboard state and inject edges.
            for key in desired_keys.iter() {
                if !held_keys.contains(key) {
                    if let Some((sc, ext)) = crate::keyboard::scancode(key) {
                        crate::keyboard::send_key(sc, ext, true);
                    }
                }
            }
            for key in held_keys.iter() {
                if !desired_keys.contains(key) {
                    if let Some((sc, ext)) = crate::keyboard::scancode(key) {
                        crate::keyboard::send_key(sc, ext, false);
                    }
                }
            }
            held_keys = desired_keys;

            // 7. Push the frame to the virtual pad.
            if let Err(e) = pad.update(
                out_bits,
                output::trigger_to_u8(lt_out),
                output::trigger_to_u8(rt_out),
                output::axis_to_i16(out_lx),
                output::axis_to_i16(out_ly),
                output::axis_to_i16(out_rx),
                output::axis_to_i16(out_ry),
            ) {
                self.set_status(true, false, format!("Output error: {e}"));
                break;
            }

            // 8. Publish a live snapshot for the UI.
            *self.live.lock() = LivePreview {
                connected: true,
                in_lx: state.lx,
                in_ly: state.ly,
                in_rx: state.rx,
                in_ry: state.ry,
                out_lx,
                out_ly,
                out_rx,
                out_ry,
                lt: lt_out,
                rt: rt_out,
                pressed: pressed_ids,
            };
        }

        // Release any keys still held when stopping.
        for key in held_keys.iter() {
            if let Some((sc, ext)) = crate::keyboard::scancode(key) {
                crate::keyboard::send_key(sc, ext, false);
            }
        }

        self.running.store(false, Ordering::SeqCst);
        let was_running = { self.status.lock().running };
        if was_running {
            self.set_status(false, false, "Stopped");
        }
    }
}

/// Apply a trigger's optional digital remap. When remapped to a gamepad button
/// or key, the analog channel is muted so the game doesn't see both.
#[cfg(windows)]
fn apply_trigger_output(
    target: &OutputTarget,
    pressed: bool,
    out_bits: &mut u16,
    desired_keys: &mut HashSet<String>,
    analog: &mut f32,
) {
    match target {
        OutputTarget::Passthrough => {}
        OutputTarget::None => *analog = 0.0,
        OutputTarget::Gamepad { button } => {
            *analog = 0.0;
            if pressed {
                *out_bits |= output::bit_for(button);
            }
        }
        OutputTarget::Key { code } => {
            *analog = 0.0;
            if pressed {
                desired_keys.insert(code.clone());
            }
        }
    }
}

#[cfg(not(windows))]
impl Engine {
    pub fn start(self: &Arc<Self>, _controller_path: Option<String>) -> Result<(), String> {
        self.running.store(false, Ordering::SeqCst);
        self.set_status(false, false, "Enhanced Input runs on Windows only");
        Err("Enhanced Input runs on Windows only".into())
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

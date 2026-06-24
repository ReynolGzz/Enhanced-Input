//! The runtime engine: reads the physical controller, applies the active
//! profile, and drives the virtual pad + keyboard. Runs on a background thread
//! and exposes a live snapshot for the UI preview.

use crate::input::GamepadState;
use crate::profile::{MacroAction, MacroStep, MacroTrigger, OutputTarget, Profile};
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
    let rate = rate_hz.clamp(1.0, 100.0);
    let elapsed = start.elapsed().as_secs_f32();
    // Two half-periods per cycle; "on" during the first half.
    let phase = (elapsed * rate * 2.0) as u64;
    phase % 2 == 0
}

/// Initial sustained press before "hold to autofire" turbo kicks in. Skipped
/// when the mapping has `disable_regular_press` (turbo from the first touch).
const TURBO_HOLD_DELAY: f32 = 0.2;

/// xorshift32 -> a pseudo-random f32 in [-1, 1). Used only for jitter smoothing.
fn next_rand(state: &mut u32) -> f32 {
    let mut x = *state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *state = x;
    (x as f32 / u32::MAX as f32) * 2.0 - 1.0
}

/// Per-button macro playback state, kept across frames.
struct MacroPlayback {
    step: usize,
    phase_start: Instant,
    in_hold: bool,
    playing: bool,
    prev_pressed: bool,
}

impl MacroPlayback {
    fn new(now: Instant) -> Self {
        MacroPlayback {
            step: 0,
            phase_start: now,
            in_hold: false,
            playing: false,
            prev_pressed: false,
        }
    }
}

/// Advance a macro and return the action to emit this frame (None during a gap
/// or when the macro isn't playing). Handles the three trigger modes.
fn macro_action<'a>(
    pb: &mut MacroPlayback,
    steps: &'a [MacroStep],
    trigger: MacroTrigger,
    pressed: bool,
    now: Instant,
) -> Option<&'a MacroAction> {
    if steps.is_empty() {
        return None;
    }
    let rising = pressed && !pb.prev_pressed;
    pb.prev_pressed = pressed;

    let start = |pb: &mut MacroPlayback| {
        pb.step = 0;
        pb.phase_start = now;
        pb.in_hold = true;
    };
    match trigger {
        MacroTrigger::Once => {
            if rising {
                pb.playing = true;
                start(pb);
            }
        }
        MacroTrigger::WhileHeld => {
            if rising {
                pb.playing = true;
                start(pb);
            }
            if !pressed {
                pb.playing = false;
            }
        }
        MacroTrigger::Toggle => {
            if rising {
                pb.playing = !pb.playing;
                if pb.playing {
                    start(pb);
                }
            }
        }
    }
    if !pb.playing {
        return None;
    }

    let elapsed_ms = pb.phase_start.elapsed().as_secs_f32() * 1000.0;
    if pb.in_hold {
        if elapsed_ms >= steps[pb.step].hold_ms.max(0.0) {
            pb.in_hold = false; // enter the gap
            pb.phase_start = now;
            return None;
        }
        Some(&steps[pb.step].action)
    } else {
        if elapsed_ms < steps[pb.step].gap_ms.max(0.0) {
            return None; // still in the gap
        }
        pb.step += 1;
        if pb.step >= steps.len() {
            match trigger {
                MacroTrigger::Once => {
                    pb.playing = false;
                    return None;
                }
                _ => pb.step = 0, // loop
            }
        }
        pb.in_hold = true;
        pb.phase_start = now;
        Some(&steps[pb.step].action)
    }
}

/// Stateful smoothing filter for a stick axis pair. `level` -10..10:
/// 0 = off, positive = exponential smoothing (cleaner but slower), negative =
/// artificial jitter. `prev` holds the previous output for the EMA.
fn apply_smoothing(level: i8, prev: &mut (f32, f32), rng: &mut u32, x: f32, y: f32) -> (f32, f32) {
    let level = level.clamp(-10, 10);
    if level == 0 {
        *prev = (x, y);
        return (x, y);
    }
    if level > 0 {
        let alpha = (1.0 - level as f32 * 0.09).clamp(0.05, 1.0);
        let nx = prev.0 + alpha * (x - prev.0);
        let ny = prev.1 + alpha * (y - prev.1);
        *prev = (nx, ny);
        (nx, ny)
    } else {
        let amp = (-level) as f32 * 0.005;
        let nx = (x + next_rand(rng) * amp).clamp(-1.0, 1.0);
        let ny = (y + next_rand(rng) * amp).clamp(-1.0, 1.0);
        *prev = (nx, ny);
        (nx, ny)
    }
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
        let mut held_mouse: HashSet<String> = HashSet::new();
        let mut wheel_up_held = false;
        let mut wheel_down_held = false;
        let mut turbo_start: HashMap<String, Instant> = HashMap::new();
        let mut macro_state: HashMap<String, MacroPlayback> = HashMap::new();
        // Smoothing filter state (per stick) + jitter RNG.
        let mut smooth_l = (0.0f32, 0.0f32);
        let mut smooth_r = (0.0f32, 0.0f32);
        let mut rng: u32 = 0x9E37_79B9;

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

            // 2. Sticks (transform, then stateful smoothing filter).
            let (out_lx, out_ly) = transform::apply_stick(&profile.left_stick, state.lx, state.ly);
            let (out_rx, out_ry) = transform::apply_stick(&profile.right_stick, state.rx, state.ry);
            let (mut out_lx, mut out_ly) =
                apply_smoothing(profile.left_stick.smoothing, &mut smooth_l, &mut rng, out_lx, out_ly);
            let (mut out_rx, mut out_ry) =
                apply_smoothing(profile.right_stick.smoothing, &mut smooth_r, &mut rng, out_rx, out_ry);

            // 3. Triggers (analog passthrough by default).
            let lt = transform::apply_trigger(&profile.left_trigger, state.lt);
            let rt = transform::apply_trigger(&profile.right_trigger, state.rt);

            // 4. Buttons -> output bits + desired keys / mouse.
            let mut out_bits: u16 = 0;
            let mut desired_keys: HashSet<String> = HashSet::new();
            let mut desired_mouse: HashSet<String> = HashSet::new();
            let mut wheel_up = false;
            let mut wheel_down = false;
            let mut pressed_ids: Vec<String> = Vec::new();
            let (mut ovr_lx, mut ovr_ly, mut ovr_rx, mut ovr_ry) = (0.0f32, 0.0f32, 0.0f32, 0.0f32);

            for (id, pressed) in state.buttons.iter() {
                if pressed {
                    pressed_ids.push(id.to_string());
                }
                let mapping = profile.button(id);

                // Turbo gating.
                let active = if pressed && mapping.turbo {
                    let start = *turbo_start.entry(id.to_string()).or_insert(now);
                    // Without "disable regular pressing", the first moment is a
                    // normal press and autofire only starts after a short hold.
                    if !mapping.disable_regular_press
                        && start.elapsed().as_secs_f32() < TURBO_HOLD_DELAY
                    {
                        true
                    } else {
                        turbo_active(start, mapping.turbo_rate_hz)
                    }
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
                    OutputTarget::Mouse { button } => {
                        if active {
                            match button.as_str() {
                                "wheelup" => wheel_up = true,
                                "wheeldown" => wheel_down = true,
                                other => {
                                    desired_mouse.insert(other.to_string());
                                }
                            }
                        }
                    }
                    OutputTarget::StickDir { stick, dir } => {
                        if active {
                            let (dx, dy) = match dir.as_str() {
                                "up" => (0.0, 1.0),
                                "down" => (0.0, -1.0),
                                "left" => (-1.0, 0.0),
                                "right" => (1.0, 0.0),
                                _ => (0.0, 0.0),
                            };
                            if stick == "r" {
                                ovr_rx += dx;
                                ovr_ry += dy;
                            } else {
                                ovr_lx += dx;
                                ovr_ly += dy;
                            }
                        }
                    }
                    OutputTarget::Macro { steps, trigger } => {
                        // Macros use the raw press (their own trigger semantics),
                        // not the turbo-gated `active`.
                        let pb = macro_state
                            .entry(id.to_string())
                            .or_insert_with(|| MacroPlayback::new(now));
                        if let Some(act) = macro_action(pb, steps, *trigger, pressed, now) {
                            match act {
                                MacroAction::Gamepad { button } => {
                                    out_bits |= output::bit_for(button)
                                }
                                MacroAction::Key { code } => {
                                    desired_keys.insert(code.clone());
                                }
                                MacroAction::Mouse { button } => match button.as_str() {
                                    "wheelup" => wheel_up = true,
                                    "wheeldown" => wheel_down = true,
                                    other => {
                                        desired_mouse.insert(other.to_string());
                                    }
                                },
                            }
                        }
                    }
                }
            }

            // 4b. Button-driven stick directions add into the stick output.
            out_lx = (out_lx + ovr_lx).clamp(-1.0, 1.0);
            out_ly = (out_ly + ovr_ly).clamp(-1.0, 1.0);
            out_rx = (out_rx + ovr_rx).clamp(-1.0, 1.0);
            out_ry = (out_ry + ovr_ry).clamp(-1.0, 1.0);

            // 5. Trigger digital remaps (in addition to analog output).
            let lt_pressed = lt >= profile.left_trigger.threshold;
            let rt_pressed = rt >= profile.right_trigger.threshold;
            let mut lt_out = lt;
            let mut rt_out = rt;
            let mut tw = TriggerOut {
                out_bits: &mut out_bits,
                desired_keys: &mut desired_keys,
                desired_mouse: &mut desired_mouse,
                wheel_up: &mut wheel_up,
                wheel_down: &mut wheel_down,
            };
            apply_trigger_output(&profile.left_trigger.output, lt_pressed, &mut tw, &mut lt_out);
            apply_trigger_output(&profile.right_trigger.output, rt_pressed, &mut tw, &mut rt_out);

            // 5b. Outer-ring (edge) bindings: fire when the raw stick magnitude
            //     crosses edge_radius (Steam style). Invert fires while inside.
            let (mut ed_l, mut ed_r) = (0.0f32, 0.0f32);
            let edge_l = edge_active(&profile.left_stick, state.lx, state.ly);
            let edge_r = edge_active(&profile.right_stick, state.rx, state.ry);
            apply_trigger_output(&profile.left_stick.edge_binding, edge_l, &mut tw, &mut ed_l);
            apply_trigger_output(&profile.right_stick.edge_binding, edge_r, &mut tw, &mut ed_r);

            // 6. Diff keyboard state and inject edges.
            for key in desired_keys.iter() {
                if !held_keys.contains(key) {
                    crate::keyboard::send(key, true);
                }
            }
            for key in held_keys.iter() {
                if !desired_keys.contains(key) {
                    crate::keyboard::send(key, false);
                }
            }
            held_keys = desired_keys;

            // 6b. Diff mouse buttons and inject edges; wheel ticks on rising edges.
            for b in desired_mouse.iter() {
                if !held_mouse.contains(b) {
                    crate::mouse::send_mouse_button(b, true);
                }
            }
            for b in held_mouse.iter() {
                if !desired_mouse.contains(b) {
                    crate::mouse::send_mouse_button(b, false);
                }
            }
            held_mouse = desired_mouse;
            if wheel_up && !wheel_up_held {
                crate::mouse::mouse_wheel(1);
            }
            if wheel_down && !wheel_down_held {
                crate::mouse::mouse_wheel(-1);
            }
            wheel_up_held = wheel_up;
            wheel_down_held = wheel_down;

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

        // Release any keys / mouse buttons still held when stopping.
        for key in held_keys.iter() {
            crate::keyboard::send(key, false);
        }
        for b in held_mouse.iter() {
            crate::mouse::send_mouse_button(b, false);
        }

        self.running.store(false, Ordering::SeqCst);
        let was_running = { self.status.lock().running };
        if was_running {
            self.set_status(false, false, "Stopped");
        }
    }
}

/// Mutable sinks a trigger's digital remap can write to.
#[cfg(windows)]
struct TriggerOut<'a> {
    out_bits: &'a mut u16,
    desired_keys: &'a mut HashSet<String>,
    desired_mouse: &'a mut HashSet<String>,
    wheel_up: &'a mut bool,
    wheel_down: &'a mut bool,
}

/// Apply a trigger's optional digital remap. When remapped to a gamepad button,
/// key or mouse action, the analog channel is muted so the game doesn't see both.
#[cfg(windows)]
fn apply_trigger_output(target: &OutputTarget, pressed: bool, out: &mut TriggerOut, analog: &mut f32) {
    match target {
        OutputTarget::Passthrough => {}
        OutputTarget::None => *analog = 0.0,
        OutputTarget::Gamepad { button } => {
            *analog = 0.0;
            if pressed {
                *out.out_bits |= output::bit_for(button);
            }
        }
        OutputTarget::Key { code } => {
            *analog = 0.0;
            if pressed {
                out.desired_keys.insert(code.clone());
            }
        }
        OutputTarget::Mouse { button } => {
            *analog = 0.0;
            if pressed {
                match button.as_str() {
                    "wheelup" => *out.wheel_up = true,
                    "wheeldown" => *out.wheel_down = true,
                    other => {
                        out.desired_mouse.insert(other.to_string());
                    }
                }
            }
        }
        // Stick-direction outputs aren't wired for triggers; ignore.
        OutputTarget::StickDir { .. } => {}
        // Macros on triggers are not wired yet; leave the analog channel intact.
        OutputTarget::Macro { .. } => {}
    }
}

/// True when a stick's outer-ring (edge) binding should fire, from the raw input
/// position. Magnitude is compared in Steam's 0..32767 scale; `edge_invert`
/// flips it so the binding fires while *inside* the ring.
#[cfg(windows)]
fn edge_active(cfg: &crate::profile::StickConfig, x: f32, y: f32) -> bool {
    let mag = (x * x + y * y).sqrt().min(1.0) * 32767.0;
    let beyond = mag >= cfg.edge_radius.clamp(0.0, 32767.0);
    beyond ^ cfg.edge_invert
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

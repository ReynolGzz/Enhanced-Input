//! Physical controller input: detection, reading and normalization.
//!
//! Every physical source is parsed into a normalized [`GamepadState`] using
//! Xbox-style naming, because the virtual output is an Xbox 360 pad. Supported
//! sources:
//!
//! - **DualShock 4** and **DualSense** over USB (HID).
//! - **Xbox / XInput-compatible** pads (Xbox 360/One/Series and GameSir in
//!   "X"/Xbox mode) via the XInput API.
//!
//! All readers implement the [`InputReader`] trait and are created by
//! [`open_reader`], so the engine never needs to know which kind it is driving.

/// Normalized controller state. Sticks are -1..1 (Y up = positive, Xbox
/// convention). Triggers are 0..1.
#[derive(Debug, Clone, Copy, Default)]
pub struct GamepadState {
    pub lx: f32,
    pub ly: f32,
    pub rx: f32,
    pub ry: f32,
    pub lt: f32,
    pub rt: f32,
    pub buttons: Buttons,
}

/// Digital buttons, canonical Xbox naming.
#[derive(Debug, Clone, Copy, Default)]
pub struct Buttons {
    pub a: bool,
    pub b: bool,
    pub x: bool,
    pub y: bool,
    pub lb: bool,
    pub rb: bool,
    pub ls: bool,
    pub rs: bool,
    pub back: bool,
    pub start: bool,
    pub guide: bool,
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
}

impl Buttons {
    /// Read a button by its canonical id.
    pub fn get(&self, id: &str) -> bool {
        match id {
            "a" => self.a,
            "b" => self.b,
            "x" => self.x,
            "y" => self.y,
            "lb" => self.lb,
            "rb" => self.rb,
            "ls" => self.ls,
            "rs" => self.rs,
            "back" => self.back,
            "start" => self.start,
            "guide" => self.guide,
            "up" => self.up,
            "down" => self.down,
            "left" => self.left,
            "right" => self.right,
            _ => false,
        }
    }

    /// Iterate over (id, pressed) for every button, in canonical order.
    pub fn iter(&self) -> impl Iterator<Item = (&'static str, bool)> {
        [
            ("a", self.a),
            ("b", self.b),
            ("x", self.x),
            ("y", self.y),
            ("lb", self.lb),
            ("rb", self.rb),
            ("ls", self.ls),
            ("rs", self.rs),
            ("back", self.back),
            ("start", self.start),
            ("guide", self.guide),
            ("up", self.up),
            ("down", self.down),
            ("left", self.left),
            ("right", self.right),
        ]
        .into_iter()
    }
}

/// Sony vendor id (shared by DualShock 4 and DualSense).
pub const SONY_VID: u16 = 0x054C;
/// Known DualShock 4 product ids (v1, v2, and the USB wireless adapter).
pub const DS4_PIDS: &[u16] = &[0x05C4, 0x09CC, 0x0BA0];
/// Known DualSense product ids (DualSense and DualSense Edge).
pub const DUALSENSE_PIDS: &[u16] = &[0x0CE6, 0x0DF2];

/// True if a HID vid/pid is a controller we know how to parse.
pub fn is_supported_hid(vid: u16, pid: u16) -> bool {
    vid == SONY_VID && (DS4_PIDS.contains(&pid) || DUALSENSE_PIDS.contains(&pid))
}

/// Normalize an unsigned 8-bit stick axis to -1..1 (center at 0x80).
fn norm_u8(v: u8) -> f32 {
    ((v as f32 - 127.5) / 127.5).clamp(-1.0, 1.0)
}

/// Decode an 8-direction hat switch (low nibble) into (up, right, down, left).
fn hat_to_dirs(hat: u8) -> (bool, bool, bool, bool) {
    match hat & 0x0F {
        0 => (true, false, false, false),
        1 => (true, true, false, false),
        2 => (false, true, false, false),
        3 => (false, true, true, false),
        4 => (false, false, true, false),
        5 => (false, false, true, true),
        6 => (false, false, false, true),
        7 => (true, false, false, true),
        _ => (false, false, false, false),
    }
}

/// Parse a DualShock 4 USB input report (report id 0x01) into a normalized state.
/// Returns `None` if the buffer does not look like a USB DS4 report.
pub fn parse_ds4_usb(buf: &[u8]) -> Option<GamepadState> {
    // USB report layout: [0]=0x01, [1..=4]=sticks, [5..=7]=buttons, [8..=9]=triggers.
    if buf.len() < 10 || buf[0] != 0x01 {
        return None;
    }

    let lx = norm_u8(buf[1]);
    let ly = -norm_u8(buf[2]); // DS4 Y grows downward; flip to Xbox convention.
    let rx = norm_u8(buf[3]);
    let ry = -norm_u8(buf[4]);

    let lt = buf[8] as f32 / 255.0;
    let rt = buf[9] as f32 / 255.0;

    // D-pad is a hat switch in the low nibble of byte 5.
    let (up, right, down, left) = hat_to_dirs(buf[5]);

    let b5 = buf[5];
    let b6 = buf[6];
    let b7 = buf[7];

    let buttons = Buttons {
        // Face buttons: DS4 cross/circle/square/triangle -> Xbox a/b/x/y.
        x: b5 & 0x10 != 0, // square
        a: b5 & 0x20 != 0, // cross
        b: b5 & 0x40 != 0, // circle
        y: b5 & 0x80 != 0, // triangle
        lb: b6 & 0x01 != 0,
        rb: b6 & 0x02 != 0,
        // L2/R2 are also exposed as digital here; the analog values live in 8/9.
        back: b6 & 0x10 != 0,  // share
        start: b6 & 0x20 != 0, // options
        ls: b6 & 0x40 != 0,
        rs: b6 & 0x80 != 0,
        guide: b7 & 0x01 != 0, // PS button
        up,
        down,
        left,
        right,
    };

    Some(GamepadState {
        lx,
        ly,
        rx,
        ry,
        lt,
        rt,
        buttons,
    })
}

/// Parse a DualSense USB input report (report id 0x01) into a normalized state.
/// Returns `None` if the buffer does not look like a USB DualSense report.
pub fn parse_dualsense_usb(buf: &[u8]) -> Option<GamepadState> {
    // USB report layout differs from the DS4: [0]=0x01, [1..=4]=sticks,
    // [5]=L2 analog, [6]=R2 analog, [8]=face buttons + hat, [9]=shoulders/
    // options/share/L3/R3, [10]=PS/touchpad.
    if buf.len() < 11 || buf[0] != 0x01 {
        return None;
    }

    let lx = norm_u8(buf[1]);
    let ly = -norm_u8(buf[2]); // DualSense Y grows downward; flip like the DS4.
    let rx = norm_u8(buf[3]);
    let ry = -norm_u8(buf[4]);

    let lt = buf[5] as f32 / 255.0;
    let rt = buf[6] as f32 / 255.0;

    let (up, right, down, left) = hat_to_dirs(buf[8]);

    let b8 = buf[8];
    let b9 = buf[9];
    let b10 = buf[10];

    let buttons = Buttons {
        // Face buttons: cross/circle/square/triangle -> Xbox a/b/x/y.
        x: b8 & 0x10 != 0, // square
        a: b8 & 0x20 != 0, // cross
        b: b8 & 0x40 != 0, // circle
        y: b8 & 0x80 != 0, // triangle
        lb: b9 & 0x01 != 0,
        rb: b9 & 0x02 != 0,
        back: b9 & 0x10 != 0,  // create / share
        start: b9 & 0x20 != 0, // options
        ls: b9 & 0x40 != 0,
        rs: b9 & 0x80 != 0,
        guide: b10 & 0x01 != 0, // PS button
        up,
        down,
        left,
        right,
    };

    Some(GamepadState {
        lx,
        ly,
        rx,
        ry,
        lt,
        rt,
        buttons,
    })
}

/// Parse a raw XInput gamepad frame into a normalized state.
#[cfg(windows)]
fn parse_xinput(gp: &windows::Win32::UI::Input::XboxController::XINPUT_GAMEPAD) -> GamepadState {
    // XInput button bits (stable, well-known values).
    let b = gp.wButtons.0;
    let norm = |v: i16| -> f32 { (v as f32 / 32767.0).clamp(-1.0, 1.0) };

    let buttons = Buttons {
        a: b & 0x1000 != 0,
        b: b & 0x2000 != 0,
        x: b & 0x4000 != 0,
        y: b & 0x8000 != 0,
        lb: b & 0x0100 != 0,
        rb: b & 0x0200 != 0,
        ls: b & 0x0040 != 0,
        rs: b & 0x0080 != 0,
        back: b & 0x0020 != 0,
        start: b & 0x0010 != 0,
        guide: b & 0x0400 != 0, // only ever set by XInputGetStateEx; harmless otherwise
        up: b & 0x0001 != 0,
        down: b & 0x0002 != 0,
        left: b & 0x0004 != 0,
        right: b & 0x0008 != 0,
    };

    GamepadState {
        lx: norm(gp.sThumbLX),
        ly: norm(gp.sThumbLY), // XInput already uses Y-up.
        rx: norm(gp.sThumbRX),
        ry: norm(gp.sThumbRY),
        lt: gp.bLeftTrigger as f32 / 255.0,
        rt: gp.bRightTrigger as f32 / 255.0,
        buttons,
    }
}

/// Friendly description of a connected controller.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerInfo {
    pub name: String,
    pub kind: String,
    pub vid: u16,
    pub pid: u16,
    pub path: String,
}

/// A source of normalized gamepad frames. Implemented per physical controller
/// kind so the engine can drive any of them through one interface.
#[cfg(windows)]
pub trait InputReader {
    /// Read the latest state. `Ok(None)` means no fresh data was available
    /// (the caller should keep the previous state).
    fn read(&mut self) -> anyhow::Result<Option<GamepadState>>;
}

#[cfg(windows)]
mod win {
    use super::*;
    use anyhow::{anyhow, Context, Result};
    use hidapi::HidApi;
    use windows::Win32::UI::Input::XboxController::{XInputGetState, XINPUT_STATE};

    /// List every supported controller currently connected: Sony pads over HID
    /// (DualShock 4 + DualSense) and Xbox/XInput-compatible pads in slots 0..3.
    pub fn list_controllers() -> Result<Vec<ControllerInfo>> {
        let mut out = Vec::new();

        // HID sources (DualShock 4 / DualSense).
        if let Ok(api) = HidApi::new() {
            for dev in api.device_list() {
                let (vid, pid) = (dev.vendor_id(), dev.product_id());
                let kind = if vid == SONY_VID && DS4_PIDS.contains(&pid) {
                    "DualShock 4"
                } else if vid == SONY_VID && DUALSENSE_PIDS.contains(&pid) {
                    "DualSense"
                } else {
                    continue;
                };
                let name = dev
                    .product_string()
                    .filter(|s| !s.is_empty())
                    .unwrap_or("Wireless Controller")
                    .to_string();
                out.push(ControllerInfo {
                    name,
                    kind: kind.to_string(),
                    vid,
                    pid,
                    path: dev.path().to_string_lossy().into_owned(),
                });
            }
        }

        // XInput sources (Xbox 360/One/Series, GameSir in X mode, etc.).
        // NOTE: while the engine is running, our own ViGEm virtual pad also shows
        // up here as an extra XInput slot; that is expected and harmless.
        for idx in 0..4u32 {
            let mut state = XINPUT_STATE::default();
            let connected = unsafe { XInputGetState(idx, &mut state) } == 0; // 0 == ERROR_SUCCESS
            if connected {
                out.push(ControllerInfo {
                    name: format!("Mando Xbox / Compatible {}", idx + 1),
                    kind: "Xbox / Compatible (XInput)".to_string(),
                    vid: 0,
                    pid: 0,
                    path: format!("xinput:{idx}"),
                });
            }
        }

        Ok(out)
    }

    /// Open a reader for the given controller. `path` may be a HID path (Sony
    /// pads) or `"xinput:<n>"` (Xbox/compatible). `None` opens the first
    /// supported HID controller found.
    pub fn open_reader(path: Option<&str>) -> Result<Box<dyn InputReader>> {
        if let Some(rest) = path.and_then(|p| p.strip_prefix("xinput:")) {
            let idx: u32 = rest.parse().context("invalid xinput slot")?;
            return Ok(Box::new(XInputReader::open(idx)?));
        }
        Ok(Box::new(HidReader::open(path)?))
    }

    /// Reader for HID gamepads (DualShock 4 / DualSense). The parser is selected
    /// from the device's vendor/product id when opened.
    pub struct HidReader {
        device: hidapi::HidDevice,
        buf: [u8; 64],
        parse: fn(&[u8]) -> Option<GamepadState>,
    }

    impl HidReader {
        fn open(path: Option<&str>) -> Result<Self> {
            let api = HidApi::new()?;
            let (device, vid, pid) = match path {
                Some(p) => {
                    let cpath = std::ffi::CString::new(p)?;
                    let dev = api.open_path(cpath.as_c_str())?;
                    let info = dev.get_device_info()?;
                    (dev, info.vendor_id(), info.product_id())
                }
                None => {
                    let info = api
                        .device_list()
                        .find(|d| is_supported_hid(d.vendor_id(), d.product_id()))
                        .ok_or_else(|| anyhow!("No supported controller found over USB"))?;
                    let dev = api.open_path(info.path())?;
                    (dev, info.vendor_id(), info.product_id())
                }
            };
            device.set_blocking_mode(false)?;
            let parse: fn(&[u8]) -> Option<GamepadState> =
                if vid == SONY_VID && DUALSENSE_PIDS.contains(&pid) {
                    parse_dualsense_usb
                } else {
                    parse_ds4_usb
                };
            Ok(HidReader {
                device,
                buf: [0u8; 64],
                parse,
            })
        }
    }

    impl InputReader for HidReader {
        fn read(&mut self) -> Result<Option<GamepadState>> {
            // The blocking timeout also paces the engine loop to ~250 Hz.
            let n = self.device.read_timeout(&mut self.buf, 4)?;
            if n == 0 {
                return Ok(None);
            }
            Ok((self.parse)(&self.buf[..n]))
        }
    }

    /// Reader for Xbox / XInput-compatible pads (one XInput slot).
    pub struct XInputReader {
        index: u32,
    }

    impl XInputReader {
        fn open(index: u32) -> Result<Self> {
            let mut state = XINPUT_STATE::default();
            if unsafe { XInputGetState(index, &mut state) } != 0 {
                return Err(anyhow!("No XInput controller in slot {index}"));
            }
            Ok(XInputReader { index })
        }
    }

    impl InputReader for XInputReader {
        fn read(&mut self) -> Result<Option<GamepadState>> {
            // XInput polling is non-blocking, so pace the loop ourselves.
            std::thread::sleep(std::time::Duration::from_millis(2));
            let mut state = XINPUT_STATE::default();
            if unsafe { XInputGetState(self.index, &mut state) } != 0 {
                return Ok(None); // momentarily unavailable; keep previous state
            }
            Ok(Some(parse_xinput(&state.Gamepad)))
        }
    }
}

#[cfg(windows)]
pub use win::{list_controllers, open_reader};

#[cfg(test)]
mod tests {
    use super::*;

    /// A 64-byte report buffer with both sticks centered (0x80).
    fn centered() -> [u8; 64] {
        let mut buf = [0u8; 64];
        buf[0] = 0x01;
        buf[1] = 0x80;
        buf[2] = 0x80;
        buf[3] = 0x80;
        buf[4] = 0x80;
        buf
    }

    #[test]
    fn ds4_neutral_is_centered() {
        let mut buf = centered();
        buf[5] = 0x08; // neutral hat in the low nibble
        let s = parse_ds4_usb(&buf).unwrap();
        assert!(s.lx.abs() < 0.02 && s.ly.abs() < 0.02);
        assert!(!s.buttons.a && !s.buttons.up);
        assert_eq!(s.lt, 0.0);
    }

    #[test]
    fn ds4_cross_maps_to_a_and_triggers() {
        let mut buf = centered();
        buf[5] = 0x08 | 0x20; // neutral hat + cross
        buf[8] = 255; // left trigger
        buf[9] = 255; // right trigger
        let s = parse_ds4_usb(&buf).unwrap();
        assert!(s.buttons.a && !s.buttons.b);
        assert!(s.lt > 0.99 && s.rt > 0.99);
    }

    #[test]
    fn dualsense_neutral_is_centered() {
        let mut buf = centered();
        buf[8] = 0x08; // neutral hat
        let s = parse_dualsense_usb(&buf).unwrap();
        assert!(s.lx.abs() < 0.02 && s.ly.abs() < 0.02);
        assert!(!s.buttons.a && !s.buttons.up);
    }

    #[test]
    fn dualsense_buttons_triggers_and_dpad() {
        let mut buf = centered();
        buf[5] = 255; // L2 analog
        buf[6] = 255; // R2 analog
        buf[8] = 0x00; // hat 0 == up, no face buttons
        let s = parse_dualsense_usb(&buf).unwrap();
        assert!(s.lt > 0.99 && s.rt > 0.99);
        assert!(s.buttons.up && !s.buttons.down);

        let mut buf = centered();
        buf[8] = 0x08 | 0x40; // neutral hat + circle -> b
        buf[9] = 0x01; // L1 -> lb
        let s = parse_dualsense_usb(&buf).unwrap();
        assert!(s.buttons.b && s.buttons.lb && !s.buttons.a);
    }

    #[test]
    fn dualsense_rejects_short_or_wrong_report() {
        assert!(parse_dualsense_usb(&[0x01, 0x80, 0x80]).is_none());
        let mut buf = centered();
        buf[0] = 0x31; // bluetooth report id, not USB
        assert!(parse_dualsense_usb(&buf).is_none());
    }
}

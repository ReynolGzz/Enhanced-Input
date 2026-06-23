//! Physical controller input: detection, reading and normalization.
//!
//! v1 targets the Sony DualShock 4 over USB (the controller DS4Windows users
//! have). The raw HID report is parsed into a normalized [`GamepadState`] using
//! Xbox-style naming, because the virtual output is an Xbox 360 pad. Other
//! sources (DualSense, XInput passthrough) can be added behind the same struct.

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

/// Sony vendor id.
pub const SONY_VID: u16 = 0x054C;
/// Known DualShock 4 product ids (v1, v2, and the USB wireless adapter).
pub const DS4_PIDS: &[u16] = &[0x05C4, 0x09CC, 0x0BA0];

/// Parse a DualShock 4 USB input report (report id 0x01) into a normalized state.
/// Returns `None` if the buffer does not look like a USB DS4 report.
pub fn parse_ds4_usb(buf: &[u8]) -> Option<GamepadState> {
    // USB report layout: [0]=0x01, [1..=4]=sticks, [5..=7]=buttons, [8..=9]=triggers.
    if buf.len() < 10 || buf[0] != 0x01 {
        return None;
    }

    let norm = |v: u8| -> f32 { ((v as f32 - 127.5) / 127.5).clamp(-1.0, 1.0) };

    let lx = norm(buf[1]);
    let ly = -norm(buf[2]); // DS4 Y grows downward; flip to Xbox convention.
    let rx = norm(buf[3]);
    let ry = -norm(buf[4]);

    let lt = buf[8] as f32 / 255.0;
    let rt = buf[9] as f32 / 255.0;

    // D-pad is a hat switch in the low nibble of byte 5.
    let hat = buf[5] & 0x0F;
    let (up, right, down, left) = match hat {
        0 => (true, false, false, false),
        1 => (true, true, false, false),
        2 => (false, true, false, false),
        3 => (false, true, true, false),
        4 => (false, false, true, false),
        5 => (false, false, true, true),
        6 => (false, false, false, true),
        7 => (true, false, false, true),
        _ => (false, false, false, false),
    };

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

#[cfg(windows)]
mod win {
    use super::*;
    use anyhow::{anyhow, Result};
    use hidapi::{HidApi, HidDevice};

    /// List supported controllers currently connected.
    pub fn list_controllers() -> Result<Vec<ControllerInfo>> {
        let api = HidApi::new()?;
        let mut out = Vec::new();
        for dev in api.device_list() {
            if dev.vendor_id() == SONY_VID && DS4_PIDS.contains(&dev.product_id()) {
                let name = dev
                    .product_string()
                    .filter(|s| !s.is_empty())
                    .unwrap_or("Wireless Controller")
                    .to_string();
                out.push(ControllerInfo {
                    name,
                    kind: "DualShock 4".to_string(),
                    vid: dev.vendor_id(),
                    pid: dev.product_id(),
                    path: dev.path().to_string_lossy().into_owned(),
                });
            }
        }
        Ok(out)
    }

    /// Open + read loop for a DualShock 4.
    pub struct Ds4Reader {
        device: HidDevice,
        buf: [u8; 64],
    }

    impl Ds4Reader {
        /// Open the first supported DS4, or a specific one by HID path.
        pub fn open(path: Option<&str>) -> Result<Self> {
            let api = HidApi::new()?;
            let device = match path {
                Some(p) => {
                    let cpath = std::ffi::CString::new(p)?;
                    api.open_path(cpath.as_c_str())?
                }
                None => {
                    let info = api
                        .device_list()
                        .find(|d| d.vendor_id() == SONY_VID && DS4_PIDS.contains(&d.product_id()))
                        .ok_or_else(|| anyhow!("No DualShock 4 found over USB"))?;
                    api.open_path(info.path())?
                }
            };
            device.set_blocking_mode(false)?;
            Ok(Ds4Reader {
                device,
                buf: [0u8; 64],
            })
        }

        /// Read the latest state. Returns `Ok(None)` when no fresh report was
        /// available within the timeout (caller should keep the previous state).
        pub fn read(&mut self) -> Result<Option<GamepadState>> {
            let n = self.device.read_timeout(&mut self.buf, 4)?;
            if n == 0 {
                return Ok(None);
            }
            Ok(parse_ds4_usb(&self.buf[..n]))
        }
    }
}

#[cfg(windows)]
pub use win::{list_controllers, Ds4Reader};

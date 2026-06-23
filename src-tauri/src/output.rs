//! Virtual Xbox 360 pad output (via ViGEmBus) plus pure helpers for converting
//! normalized values into XInput ranges.

/// XInput button bit masks for the virtual pad.
pub mod xbtn {
    pub const UP: u16 = 0x0001;
    pub const DOWN: u16 = 0x0002;
    pub const LEFT: u16 = 0x0004;
    pub const RIGHT: u16 = 0x0008;
    pub const START: u16 = 0x0010;
    pub const BACK: u16 = 0x0020;
    pub const LS: u16 = 0x0040;
    pub const RS: u16 = 0x0080;
    pub const LB: u16 = 0x0100;
    pub const RB: u16 = 0x0200;
    pub const GUIDE: u16 = 0x0400;
    pub const A: u16 = 0x1000;
    pub const B: u16 = 0x2000;
    pub const X: u16 = 0x4000;
    pub const Y: u16 = 0x8000;
}

/// Output button bit for a canonical id, or 0 if it has no gamepad equivalent.
pub fn bit_for(id: &str) -> u16 {
    match id {
        "a" => xbtn::A,
        "b" => xbtn::B,
        "x" => xbtn::X,
        "y" => xbtn::Y,
        "lb" => xbtn::LB,
        "rb" => xbtn::RB,
        "ls" => xbtn::LS,
        "rs" => xbtn::RS,
        "back" => xbtn::BACK,
        "start" => xbtn::START,
        "guide" => xbtn::GUIDE,
        "up" => xbtn::UP,
        "down" => xbtn::DOWN,
        "left" => xbtn::LEFT,
        "right" => xbtn::RIGHT,
        _ => 0,
    }
}

/// Normalized stick axis (-1..1) to XInput i16.
pub fn axis_to_i16(v: f32) -> i16 {
    (v.clamp(-1.0, 1.0) * 32767.0).round() as i16
}

/// Normalized trigger (0..1) to XInput u8.
pub fn trigger_to_u8(v: f32) -> u8 {
    (v.clamp(0.0, 1.0) * 255.0).round() as u8
}

#[cfg(windows)]
mod win {
    use anyhow::Result;
    use vigem_client::{Client, TargetId, XButtons, XGamepad, Xbox360Wired};

    /// A plugged-in virtual Xbox 360 controller.
    pub struct VirtualPad {
        target: Xbox360Wired<Client>,
    }

    impl VirtualPad {
        /// Connect to ViGEmBus and plug in a wired Xbox 360 pad.
        pub fn new() -> Result<Self> {
            let client = Client::connect()
                .map_err(|e| anyhow::anyhow!("ViGEmBus not available (is it installed?): {e}"))?;
            let mut target = Xbox360Wired::new(client, TargetId::XBOX360_WIRED);
            target.plugin()?;
            target.wait_ready()?;
            Ok(VirtualPad { target })
        }

        /// Push a full controller frame to the virtual pad.
        #[allow(clippy::too_many_arguments)]
        pub fn update(
            &mut self,
            buttons: u16,
            left_trigger: u8,
            right_trigger: u8,
            thumb_lx: i16,
            thumb_ly: i16,
            thumb_rx: i16,
            thumb_ry: i16,
        ) -> Result<()> {
            let gamepad = XGamepad {
                buttons: XButtons { raw: buttons },
                left_trigger,
                right_trigger,
                thumb_lx,
                thumb_ly,
                thumb_rx,
                thumb_ry,
            };
            self.target.update(&gamepad)?;
            Ok(())
        }
    }
}

#[cfg(windows)]
pub use win::VirtualPad;

//! Keyboard injection via SendInput, used when a button is remapped to a key.
//!
//! We send hardware scan codes (KEYEVENTF_SCANCODE) rather than virtual keys,
//! because most games read scan codes through DirectInput/RawInput and ignore
//! synthesized virtual-key events.

/// Resolve a key name (e.g. "w", "space", "up") to a (scan code, extended) pair.
/// Returns `None` for unknown names. Set 1 ("make") scan codes.
pub fn scancode(name: &str) -> Option<(u16, bool)> {
    let n = name.trim().to_ascii_lowercase();
    let code: (u16, bool) = match n.as_str() {
        // Letters
        "a" => (0x1E, false),
        "b" => (0x30, false),
        "c" => (0x2E, false),
        "d" => (0x20, false),
        "e" => (0x12, false),
        "f" => (0x21, false),
        "g" => (0x22, false),
        "h" => (0x23, false),
        "i" => (0x17, false),
        "j" => (0x24, false),
        "k" => (0x25, false),
        "l" => (0x26, false),
        "m" => (0x32, false),
        "n" => (0x31, false),
        "o" => (0x18, false),
        "p" => (0x19, false),
        "q" => (0x10, false),
        "r" => (0x13, false),
        "s" => (0x1F, false),
        "t" => (0x14, false),
        "u" => (0x16, false),
        "v" => (0x2F, false),
        "w" => (0x11, false),
        "x" => (0x2D, false),
        "y" => (0x15, false),
        "z" => (0x2C, false),
        // Digits
        "1" => (0x02, false),
        "2" => (0x03, false),
        "3" => (0x04, false),
        "4" => (0x05, false),
        "5" => (0x06, false),
        "6" => (0x07, false),
        "7" => (0x08, false),
        "8" => (0x09, false),
        "9" => (0x0A, false),
        "0" => (0x0B, false),
        // Whitespace / control
        "space" => (0x39, false),
        "enter" | "return" => (0x1C, false),
        "esc" | "escape" => (0x01, false),
        "tab" => (0x0F, false),
        "backspace" => (0x0E, false),
        "lshift" | "shift" => (0x2A, false),
        "rshift" => (0x36, false),
        "lctrl" | "ctrl" | "control" => (0x1D, false),
        "lalt" | "alt" => (0x38, false),
        "capslock" => (0x3A, false),
        // Punctuation
        "minus" | "-" => (0x0C, false),
        "equals" | "=" => (0x0D, false),
        "lbracket" | "[" => (0x1A, false),
        "rbracket" | "]" => (0x1B, false),
        "semicolon" | ";" => (0x27, false),
        "quote" | "'" => (0x28, false),
        "backtick" | "`" => (0x29, false),
        "backslash" | "\\" => (0x2B, false),
        "comma" | "," => (0x33, false),
        "period" | "." => (0x34, false),
        "slash" | "/" => (0x35, false),
        // Function keys
        "f1" => (0x3B, false),
        "f2" => (0x3C, false),
        "f3" => (0x3D, false),
        "f4" => (0x3E, false),
        "f5" => (0x3F, false),
        "f6" => (0x40, false),
        "f7" => (0x41, false),
        "f8" => (0x42, false),
        "f9" => (0x43, false),
        "f10" => (0x44, false),
        "f11" => (0x57, false),
        "f12" => (0x58, false),
        // Extended keys (need the extended flag)
        "up" => (0x48, true),
        "down" => (0x50, true),
        "left" => (0x4B, true),
        "right" => (0x4D, true),
        "rctrl" => (0x1D, true),
        "ralt" => (0x38, true),
        "insert" => (0x52, true),
        "delete" | "del" => (0x53, true),
        "home" => (0x47, true),
        "end" => (0x4F, true),
        "pageup" => (0x49, true),
        "pagedown" => (0x51, true),
        _ => return None,
    };
    Some(code)
}

#[cfg(windows)]
pub fn send_key(scan: u16, extended: bool, down: bool) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE,
    };

    // Build the flag set as a raw u32 to avoid relying on operator impls.
    let mut flags: u32 = KEYEVENTF_SCANCODE.0;
    if extended {
        flags |= KEYEVENTF_EXTENDEDKEY.0;
    }
    if !down {
        flags |= KEYEVENTF_KEYUP.0;
    }

    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: Default::default(),
                wScan: scan,
                dwFlags: KEYBD_EVENT_FLAGS(flags),
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(not(windows))]
pub fn send_key(_scan: u16, _extended: bool, _down: bool) {}

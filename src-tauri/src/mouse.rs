//! Mouse injection via SendInput, used when a control is remapped to a mouse
//! button or wheel tick. Mirrors `keyboard.rs`.

/// One wheel notch.
#[cfg(windows)]
const WHEEL_DELTA: i32 = 120;

/// Send a mouse button edge. `button` ∈ left|right|middle|x1|x2.
#[cfg(windows)]
pub fn send_mouse_button(button: &str, down: bool) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_MOUSE, MOUSEINPUT, MOUSEEVENTF_LEFTDOWN,
        MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_RIGHTDOWN,
        MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_XDOWN, MOUSEEVENTF_XUP, MOUSE_EVENT_FLAGS,
    };

    // XBUTTON1/XBUTTON2 values for the mouseData field.
    const XBUTTON1: u32 = 0x0001;
    const XBUTTON2: u32 = 0x0002;

    let (flag, mouse_data): (MOUSE_EVENT_FLAGS, u32) = match button {
        "left" => (if down { MOUSEEVENTF_LEFTDOWN } else { MOUSEEVENTF_LEFTUP }, 0),
        "right" => (if down { MOUSEEVENTF_RIGHTDOWN } else { MOUSEEVENTF_RIGHTUP }, 0),
        "middle" => (if down { MOUSEEVENTF_MIDDLEDOWN } else { MOUSEEVENTF_MIDDLEUP }, 0),
        "x1" => (if down { MOUSEEVENTF_XDOWN } else { MOUSEEVENTF_XUP }, XBUTTON1),
        "x2" => (if down { MOUSEEVENTF_XDOWN } else { MOUSEEVENTF_XUP }, XBUTTON2),
        _ => return,
    };

    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: mouse_data,
                dwFlags: flag,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

/// Scroll the wheel. `notches` is signed: positive scrolls up.
#[cfg(windows)]
pub fn mouse_wheel(notches: i32) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_MOUSE, MOUSEINPUT, MOUSEEVENTF_WHEEL,
    };

    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                // mouseData carries a signed wheel amount in a u32 field.
                mouseData: (notches * WHEEL_DELTA) as u32,
                dwFlags: MOUSEEVENTF_WHEEL,
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
pub fn send_mouse_button(_button: &str, _down: bool) {}
#[cfg(not(windows))]
pub fn mouse_wheel(_notches: i32) {}

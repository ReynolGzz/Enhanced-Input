# Controller artwork

The Home screen shows a picture of the connected controller. For each controller
the UI tries, in order:

1. `/<base>.png`  — real product photo (preferred)
2. `gamepad.svg`  — generic placeholder silhouette (bundled)
3. 🎮 emoji       — last-resort fallback

So to use real photos, just drop PNG files here with these exact names (no code
change needed — the PNG automatically takes precedence over the placeholder):

| File              | Controller (`kind` from `src-tauri/src/input.rs`) |
| ----------------- | ------------------------------------------------- |
| `dualshock4.png`  | `DualShock 4`                                     |
| `dualsense.png`   | `DualSense`                                        |
| `xbox.png`        | `Xbox / Compatible (XInput)`                       |
| `usb-c.png`       | wired-connection icon (optional; replaces `usb-c.svg`) |

Recommended: square-ish PNGs with a transparent or white background, roughly
512×512 or larger. They are rendered with `object-fit: contain`, so exact
dimensions don't matter.

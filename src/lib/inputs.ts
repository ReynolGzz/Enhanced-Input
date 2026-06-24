// Static metadata describing the controls the editor exposes, plus the
// option lists used by the bind dropdowns.
//
// Labels are resolved through t() at module load; the Language setting reloads
// the window, so these tables rebuild in the chosen language.

import { t } from "./i18n";

export interface ButtonDef {
  id: string;
  label: string;
  glyph: string; // short text glyph shown in the pill
  group: "face" | "shoulder" | "menu" | "stick" | "dpad";
}

// Canonical buttons, Xbox naming (the virtual output is an Xbox 360 pad).
export const BUTTONS: ButtonDef[] = [
  { id: "a", label: t("btn.a"), glyph: "A", group: "face" },
  { id: "b", label: t("btn.b"), glyph: "B", group: "face" },
  { id: "x", label: t("btn.x"), glyph: "X", group: "face" },
  { id: "y", label: t("btn.y"), glyph: "Y", group: "face" },
  { id: "lb", label: t("btn.lb"), glyph: "LB", group: "shoulder" },
  { id: "rb", label: t("btn.rb"), glyph: "RB", group: "shoulder" },
  { id: "back", label: t("btn.back"), glyph: "⧉", group: "menu" },
  { id: "start", label: t("btn.start"), glyph: "≡", group: "menu" },
  { id: "guide", label: t("btn.guide"), glyph: "✦", group: "menu" },
  { id: "ls", label: t("btn.ls"), glyph: "L3", group: "stick" },
  { id: "rs", label: t("btn.rs"), glyph: "R3", group: "stick" },
];

export const DPAD: ButtonDef[] = [
  { id: "up", label: t("dpad.up"), glyph: "▲", group: "dpad" },
  { id: "down", label: t("dpad.down"), glyph: "▼", group: "dpad" },
  { id: "left", label: t("dpad.left"), glyph: "◀", group: "dpad" },
  { id: "right", label: t("dpad.right"), glyph: "▶", group: "dpad" },
];

// Gamepad targets you can remap a button to.
export const GAMEPAD_TARGETS: { value: string; label: string }[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "lb", label: "LB" },
  { value: "rb", label: "RB" },
  { value: "ls", label: "L3" },
  { value: "rs", label: "R3" },
  { value: "back", label: t("tgt.view") },
  { value: "start", label: t("tgt.menu") },
  { value: "guide", label: t("btn.guide") },
  { value: "up", label: t("tgt.dpadUp") },
  { value: "down", label: t("tgt.dpadDown") },
  { value: "left", label: t("tgt.dpadLeft") },
  { value: "right", label: t("tgt.dpadRight") },
];

// Stick-direction outputs (a button drives a virtual stick direction).
export const STICK_DIR_TARGETS: { stick: string; dir: string; label: string }[] = [
  { stick: "l", dir: "up", label: "L ↑" },
  { stick: "l", dir: "down", label: "L ↓" },
  { stick: "l", dir: "left", label: "L ←" },
  { stick: "l", dir: "right", label: "L →" },
  { stick: "r", dir: "up", label: "R ↑" },
  { stick: "r", dir: "down", label: "R ↓" },
  { stick: "r", dir: "left", label: "R ←" },
  { stick: "r", dir: "right", label: "R →" },
];

// Keyboard keys you can remap a button to (matches the Rust scancode table).
export const KEY_TARGETS: { value: string; label: string }[] = [
  ..."abcdefghijklmnopqrstuvwxyz".split("").map((c) => ({ value: c, label: c.toUpperCase() })),
  ..."0123456789".split("").map((c) => ({ value: c, label: c })),
  { value: "space", label: t("key.space") },
  { value: "enter", label: "Enter" },
  { value: "esc", label: "Esc" },
  { value: "tab", label: "Tab" },
  { value: "shift", label: "Shift" },
  { value: "ctrl", label: "Ctrl" },
  { value: "alt", label: "Alt" },
  { value: "up", label: t("key.arrowUp") },
  { value: "down", label: t("key.arrowDown") },
  { value: "left", label: t("key.arrowLeft") },
  { value: "right", label: t("key.arrowRight") },
  { value: "f1", label: "F1" },
  { value: "f2", label: "F2" },
  { value: "f3", label: "F3" },
  { value: "f4", label: "F4" },
];

// Inner dead zone type (how the center is shaped).
export const INNER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "raw", label: t("inner.raw") },
  { value: "cross", label: t("inner.cross") },
  { value: "radial", label: t("inner.radial") },
];

// Outer boundary shape.
export const OUTER_SHAPE_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: t("outer.default") },
  { value: "square", label: t("outer.square") },
  { value: "circle", label: t("outer.circle") },
];

export const CURVE_OPTIONS: { value: string; label: string }[] = [
  { value: "linear", label: t("curve.linear") },
  { value: "aggressive", label: t("curve.aggressive") },
  { value: "relaxed", label: t("curve.relaxed") },
  { value: "precision", label: t("curve.precision") },
  { value: "custom", label: t("curve.custom") },
];

// Mouse targets you can remap a control to (matches mouse.rs).
export const MOUSE_TARGETS: { value: string; label: string }[] = [
  { value: "left", label: t("mouse.left") },
  { value: "right", label: t("mouse.right") },
  { value: "middle", label: t("mouse.middle") },
  { value: "x1", label: t("mouse.x1") },
  { value: "x2", label: t("mouse.x2") },
  { value: "wheelup", label: t("mouse.wheelUp") },
  { value: "wheeldown", label: t("mouse.wheelDown") },
];

// A key on the visual keyboard/numpad layouts. `w` is a relative width unit.
export interface KeyCell {
  value: string; // matches keyboard.rs scancode names
  label: string;
  w?: number;
}

// Compact visual keyboard layout for the rebind picker.
export const KEYBOARD_ROWS: KeyCell[][] = [
  [
    { value: "esc", label: "Esc" },
    ...["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"].map(
      (f) => ({ value: f, label: f.toUpperCase() })
    ),
  ],
  [
    { value: "backtick", label: "`" },
    ..."1234567890".split("").map((c) => ({ value: c, label: c })),
    { value: "minus", label: "-" },
    { value: "equals", label: "=" },
    { value: "backspace", label: "⌫", w: 2 },
  ],
  [
    { value: "tab", label: "Tab", w: 1.5 },
    ..."qwertyuiop".split("").map((c) => ({ value: c, label: c.toUpperCase() })),
    { value: "lbracket", label: "[" },
    { value: "rbracket", label: "]" },
    { value: "backslash", label: "\\" },
  ],
  [
    { value: "capslock", label: "Caps", w: 1.8 },
    ..."asdfghjkl".split("").map((c) => ({ value: c, label: c.toUpperCase() })),
    { value: "semicolon", label: ";" },
    { value: "quote", label: "'" },
    { value: "enter", label: "Enter", w: 2 },
  ],
  [
    { value: "shift", label: "Shift", w: 2.3 },
    ..."zxcvbnm".split("").map((c) => ({ value: c, label: c.toUpperCase() })),
    { value: "comma", label: "," },
    { value: "period", label: "." },
    { value: "slash", label: "/" },
    { value: "rshift", label: "Shift", w: 2.3 },
  ],
  [
    { value: "ctrl", label: "Ctrl", w: 1.5 },
    { value: "alt", label: "Alt", w: 1.5 },
    { value: "space", label: t("key.space"), w: 6 },
    { value: "ralt", label: "Alt", w: 1.5 },
    { value: "rctrl", label: "Ctrl", w: 1.5 },
  ],
  [
    { value: "up", label: "↑" },
    { value: "down", label: "↓" },
    { value: "left", label: "←" },
    { value: "right", label: "→" },
  ],
];

// Numpad + navigation cluster for the rebind picker.
export const NUMPAD_ROWS: KeyCell[][] = [
  [
    { value: "numlock", label: "Num" },
    { value: "numdivide", label: "/" },
    { value: "nummultiply", label: "*" },
    { value: "numminus", label: "-" },
  ],
  [
    { value: "num7", label: "7" },
    { value: "num8", label: "8" },
    { value: "num9", label: "9" },
    { value: "numplus", label: "+" },
  ],
  [
    { value: "num4", label: "4" },
    { value: "num5", label: "5" },
    { value: "num6", label: "6" },
  ],
  [
    { value: "num1", label: "1" },
    { value: "num2", label: "2" },
    { value: "num3", label: "3" },
    { value: "numenter", label: "Enter" },
  ],
  [
    { value: "num0", label: "0", w: 2 },
    { value: "numdot", label: "." },
  ],
  [
    { value: "insert", label: "Ins" },
    { value: "home", label: "Home" },
    { value: "pageup", label: "PgUp" },
  ],
  [
    { value: "delete", label: "Del" },
    { value: "end", label: "End" },
    { value: "pagedown", label: "PgDn" },
  ],
  [
    { value: "prevtrack", label: "⏮" },
    { value: "playpause", label: "⏯" },
    { value: "mediastop", label: "⏹" },
    { value: "nexttrack", label: "⏭" },
  ],
  [
    { value: "voldown", label: "🔉" },
    { value: "volmute", label: "🔇" },
    { value: "volup", label: "🔊" },
  ],
];

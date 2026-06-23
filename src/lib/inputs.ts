// Static metadata describing the controls the editor exposes, plus the
// option lists used by the bind dropdowns.

export interface ButtonDef {
  id: string;
  label: string;
  glyph: string; // short text glyph shown in the pill
  group: "face" | "shoulder" | "menu" | "stick" | "dpad";
}

// Canonical buttons, Xbox naming (the virtual output is an Xbox 360 pad).
export const BUTTONS: ButtonDef[] = [
  { id: "a", label: "Botón A", glyph: "A", group: "face" },
  { id: "b", label: "Botón B", glyph: "B", group: "face" },
  { id: "x", label: "Botón X", glyph: "X", group: "face" },
  { id: "y", label: "Botón Y", glyph: "Y", group: "face" },
  { id: "lb", label: "Botón superior izquierdo", glyph: "LB", group: "shoulder" },
  { id: "rb", label: "Botón superior derecho", glyph: "RB", group: "shoulder" },
  { id: "back", label: "Vista / Atrás", glyph: "⧉", group: "menu" },
  { id: "start", label: "Menú / Start", glyph: "≡", group: "menu" },
  { id: "guide", label: "Guía", glyph: "✦", group: "menu" },
  { id: "ls", label: "Click stick izquierdo (L3)", glyph: "L3", group: "stick" },
  { id: "rs", label: "Click stick derecho (R3)", glyph: "R3", group: "stick" },
];

export const DPAD: ButtonDef[] = [
  { id: "up", label: "Cruceta arriba", glyph: "▲", group: "dpad" },
  { id: "down", label: "Cruceta abajo", glyph: "▼", group: "dpad" },
  { id: "left", label: "Cruceta izquierda", glyph: "◀", group: "dpad" },
  { id: "right", label: "Cruceta derecha", glyph: "▶", group: "dpad" },
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
  { value: "back", label: "Vista" },
  { value: "start", label: "Menú" },
  { value: "guide", label: "Guía" },
  { value: "up", label: "Cruceta ↑" },
  { value: "down", label: "Cruceta ↓" },
  { value: "left", label: "Cruceta ←" },
  { value: "right", label: "Cruceta →" },
];

// Keyboard keys you can remap a button to (matches the Rust scancode table).
export const KEY_TARGETS: { value: string; label: string }[] = [
  ..."abcdefghijklmnopqrstuvwxyz".split("").map((c) => ({ value: c, label: c.toUpperCase() })),
  ..."0123456789".split("").map((c) => ({ value: c, label: c })),
  { value: "space", label: "Espacio" },
  { value: "enter", label: "Enter" },
  { value: "esc", label: "Esc" },
  { value: "tab", label: "Tab" },
  { value: "shift", label: "Shift" },
  { value: "ctrl", label: "Ctrl" },
  { value: "alt", label: "Alt" },
  { value: "up", label: "Flecha ↑" },
  { value: "down", label: "Flecha ↓" },
  { value: "left", label: "Flecha ←" },
  { value: "right", label: "Flecha →" },
  { value: "f1", label: "F1" },
  { value: "f2", label: "F2" },
  { value: "f3", label: "F3" },
  { value: "f4", label: "F4" },
];

// Inner dead zone type (how the center is shaped).
export const INNER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "raw", label: "Sin zona muerta (raw)" },
  { value: "cross", label: "Cruz" },
  { value: "radial", label: "Circular / radial" },
];

// Outer boundary shape.
export const OUTER_SHAPE_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Default (círculo nativo)" },
  { value: "square", label: "Cuadrado" },
  { value: "circle", label: "Círculo perfecto" },
];

export const CURVE_OPTIONS: { value: string; label: string }[] = [
  { value: "linear", label: "Lineal" },
  { value: "aggressive", label: "Agresiva" },
  { value: "relaxed", label: "Relajada" },
  { value: "precision", label: "Precisión" },
  { value: "custom", label: "Custom" },
];

// Mouse targets you can remap a control to (matches mouse.rs).
export const MOUSE_TARGETS: { value: string; label: string }[] = [
  { value: "left", label: "Click izquierdo" },
  { value: "right", label: "Click derecho" },
  { value: "middle", label: "Click central" },
  { value: "x1", label: "Botón 4" },
  { value: "x2", label: "Botón 5" },
  { value: "wheelup", label: "Rueda ↑" },
  { value: "wheeldown", label: "Rueda ↓" },
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
    { value: "space", label: "Espacio", w: 6 },
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
];

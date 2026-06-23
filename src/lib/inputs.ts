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

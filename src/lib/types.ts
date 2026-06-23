// Mirrors the Rust profile model in `src-tauri/src/profile.rs`.
// Keep field names (camelCase) in sync with the serde definitions.

// Inner dead zone type (how the center is shaped) — decoupled from the outer
// shape so any combination is possible.
export type InnerDeadzone = "raw" | "cross" | "radial";

// Outer boundary shape.
export type OuterShape = "default" | "square" | "circle";

export type ResponseCurve =
  | "linear"
  | "aggressive"
  | "relaxed"
  | "precision"
  | "custom";

export type MacroAction =
  | { kind: "gamepad"; button: string }
  | { kind: "key"; code: string }
  | { kind: "mouse"; button: string };

export interface MacroStep {
  action: MacroAction;
  holdMs: number;
  gapMs: number;
}

export type MacroTrigger = "once" | "whileHeld" | "toggle";

export type OutputTarget =
  | { kind: "passthrough" }
  | { kind: "none" }
  | { kind: "gamepad"; button: string }
  | { kind: "key"; code: string }
  // button ∈ left|right|middle|x1|x2|wheelup|wheeldown
  | { kind: "mouse"; button: string }
  | { kind: "macro"; steps: MacroStep[]; trigger: MacroTrigger };

export interface StickConfig {
  innerType: InnerDeadzone;
  outerShape: OuterShape;
  innerDeadzone: number;
  outerRange: number;
  sensitivity: number;
  curve: ResponseCurve;
  curveExponent: number;
  antiDeadzone: number;
  edgeRadius: number;
  smoothing: number;
  invertX: boolean;
  invertY: boolean;
}

export interface TriggerConfig {
  threshold: number;
  deadzoneStart: number;
  deadzoneEnd: number;
  curve: ResponseCurve;
  curveExponent: number;
  output: OutputTarget;
}

export interface ButtonMapping {
  output: OutputTarget;
  turbo: boolean;
  turboRateHz: number;
  disableRegularPress: boolean;
}

// Bounds for a custom curve exponent (mirrors profile.rs).
export const CURVE_EXPONENT_MIN = 0.01;
export const CURVE_EXPONENT_MAX = 1000;
// Steam-style edge binding radius range.
export const EDGE_RADIUS_MAX = 32767;

export interface Profile {
  id: string;
  name: string;
  color: string;
  leftStick: StickConfig;
  rightStick: StickConfig;
  leftTrigger: TriggerConfig;
  rightTrigger: TriggerConfig;
  buttons: Record<string, ButtonMapping>;
}

export interface ProfileSummary {
  id: string;
  name: string;
  color: string;
}

export interface ControllerInfo {
  name: string;
  kind: string;
  vid: number;
  pid: number;
  path: string;
}

export interface EngineStatus {
  running: boolean;
  connected: boolean;
  message: string;
}

export interface LivePreview {
  connected: boolean;
  inLx: number;
  inLy: number;
  inRx: number;
  inRy: number;
  outLx: number;
  outLy: number;
  outRx: number;
  outRy: number;
  lt: number;
  rt: number;
  pressed: string[];
}

export const DEFAULT_STICK: StickConfig = {
  innerType: "radial",
  outerShape: "default",
  innerDeadzone: 0.08,
  outerRange: 1.0,
  sensitivity: 1.0,
  curve: "linear",
  curveExponent: 1.0,
  antiDeadzone: 0.0,
  edgeRadius: 32767,
  smoothing: 0,
  invertX: false,
  invertY: false,
};

export const DEFAULT_TRIGGER: TriggerConfig = {
  threshold: 0.5,
  deadzoneStart: 0.0,
  deadzoneEnd: 1.0,
  curve: "linear",
  curveExponent: 1.0,
  output: { kind: "passthrough" },
};

export const DEFAULT_MAPPING: ButtonMapping = {
  output: { kind: "passthrough" },
  turbo: false,
  turboRateHz: 12,
  disableRegularPress: false,
};

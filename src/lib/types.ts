// Mirrors the Rust profile model in `src-tauri/src/profile.rs`.
// Keep field names (camelCase) in sync with the serde definitions.

export type DeadzoneType =
  | "none"
  | "radial"
  | "scaledRadial"
  | "axial"
  | "cross";

export type ResponseCurve =
  | "linear"
  | "aggressive"
  | "relaxed"
  | "precision";

export type OutputTarget =
  | { kind: "passthrough" }
  | { kind: "none" }
  | { kind: "gamepad"; button: string }
  | { kind: "key"; code: string };

export interface StickConfig {
  deadzoneType: DeadzoneType;
  innerDeadzone: number;
  outerDeadzone: number;
  sensitivity: number;
  curve: ResponseCurve;
  antiDeadzone: number;
  invertX: boolean;
  invertY: boolean;
}

export interface TriggerConfig {
  threshold: number;
  deadzoneStart: number;
  deadzoneEnd: number;
  curve: ResponseCurve;
  output: OutputTarget;
}

export interface ButtonMapping {
  output: OutputTarget;
  turbo: boolean;
  turboRateHz: number;
}

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
  deadzoneType: "scaledRadial",
  innerDeadzone: 0.08,
  outerDeadzone: 0.0,
  sensitivity: 1.0,
  curve: "linear",
  antiDeadzone: 0.0,
  invertX: false,
  invertY: false,
};

export const DEFAULT_TRIGGER: TriggerConfig = {
  threshold: 0.5,
  deadzoneStart: 0.0,
  deadzoneEnd: 1.0,
  curve: "linear",
  output: { kind: "passthrough" },
};

export const DEFAULT_MAPPING: ButtonMapping = {
  output: { kind: "passthrough" },
  turbo: false,
  turboRateHz: 12,
};

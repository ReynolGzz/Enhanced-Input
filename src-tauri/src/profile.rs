//! Profile data model. These structs are serialized to JSON (camelCase) and are
//! the single source of truth shared with the frontend. Keep field names in sync
//! with `src/lib/types.ts`.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Shape of the dead zone applied to an analog stick.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DeadzoneType {
    /// No dead zone at all.
    None,
    /// Circular: ignores the combined magnitude under the inner radius.
    Radial,
    /// Circular + rescales the remaining range back to 0..1 (smoothest).
    ScaledRadial,
    /// Square: each axis gets its own independent dead zone.
    Axial,
    /// Cross/bowtie: axial near the center, radial towards the edge.
    Cross,
}

impl Default for DeadzoneType {
    fn default() -> Self {
        DeadzoneType::ScaledRadial
    }
}

/// Named response curves. Each maps to an exponent applied to the magnitude.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ResponseCurve {
    Linear,
    /// Ramps up faster — twitchy.
    Aggressive,
    /// Ramps up slower — smoother.
    Relaxed,
    /// Extra fine control near the center.
    Precision,
}

impl Default for ResponseCurve {
    fn default() -> Self {
        ResponseCurve::Linear
    }
}

impl ResponseCurve {
    /// Exponent applied to a normalized magnitude (0..1).
    pub fn exponent(self) -> f32 {
        match self {
            ResponseCurve::Linear => 1.0,
            ResponseCurve::Aggressive => 0.65,
            ResponseCurve::Relaxed => 1.35,
            ResponseCurve::Precision => 1.8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickConfig {
    pub deadzone_type: DeadzoneType,
    /// Inner dead zone radius, 0..1.
    pub inner_deadzone: f32,
    /// Outer dead zone, 0..1. Output reaches max before the physical edge.
    pub outer_deadzone: f32,
    /// Output multiplier. 1.0 = passthrough.
    pub sensitivity: f32,
    pub curve: ResponseCurve,
    /// Anti dead zone / outer ring: minimum output magnitude when the stick moves,
    /// used to overcome a dead zone baked into the game itself. 0..1.
    pub anti_deadzone: f32,
    pub invert_x: bool,
    pub invert_y: bool,
}

impl Default for StickConfig {
    fn default() -> Self {
        StickConfig {
            deadzone_type: DeadzoneType::default(),
            inner_deadzone: 0.08,
            outer_deadzone: 0.0,
            sensitivity: 1.0,
            curve: ResponseCurve::default(),
            anti_deadzone: 0.0,
            invert_x: false,
            invert_y: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerConfig {
    /// Point at which the trigger counts as "pressed" for a digital remap, 0..1.
    pub threshold: f32,
    /// Analog dead zone start, 0..1.
    pub deadzone_start: f32,
    /// Analog dead zone end, 0..1.
    pub deadzone_end: f32,
    pub curve: ResponseCurve,
    /// Optional digital output when the trigger crosses `threshold`.
    pub output: OutputTarget,
}

impl Default for TriggerConfig {
    fn default() -> Self {
        TriggerConfig {
            threshold: 0.5,
            deadzone_start: 0.0,
            deadzone_end: 1.0,
            curve: ResponseCurve::default(),
            output: OutputTarget::Passthrough,
        }
    }
}

/// What an input control emits. `Passthrough` keeps the original signal,
/// `None` disables it, `Gamepad` remaps to another virtual-pad button,
/// `Key` injects a keyboard key.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum OutputTarget {
    Passthrough,
    None,
    Gamepad { button: String },
    Key { code: String },
}

impl Default for OutputTarget {
    fn default() -> Self {
        OutputTarget::Passthrough
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ButtonMapping {
    pub output: OutputTarget,
    pub turbo: bool,
    /// Presses per second when turbo is on.
    pub turbo_rate_hz: f32,
}

impl Default for ButtonMapping {
    fn default() -> Self {
        ButtonMapping {
            output: OutputTarget::Passthrough,
            turbo: false,
            turbo_rate_hz: 12.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    /// Accent color shown in the UI (hex, e.g. "#2f6fff").
    pub color: String,
    pub left_stick: StickConfig,
    pub right_stick: StickConfig,
    pub left_trigger: TriggerConfig,
    pub right_trigger: TriggerConfig,
    /// Per-button overrides keyed by canonical input id
    /// (a, b, x, y, lb, rb, ls, rs, back, start, guide, up, down, left, right).
    pub buttons: BTreeMap<String, ButtonMapping>,
}

impl Profile {
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Profile {
            id: id.into(),
            name: name.into(),
            color: "#2f6fff".to_string(),
            left_stick: StickConfig::default(),
            right_stick: StickConfig::default(),
            left_trigger: TriggerConfig::default(),
            right_trigger: TriggerConfig::default(),
            buttons: BTreeMap::new(),
        }
    }

    /// Mapping for a button id, falling back to passthrough defaults.
    pub fn button(&self, id: &str) -> ButtonMapping {
        self.buttons.get(id).cloned().unwrap_or_default()
    }
}

/// Every canonical button id the UI exposes, in display order.
pub const BUTTON_IDS: &[&str] = &[
    "a", "b", "x", "y", "lb", "rb", "ls", "rs", "back", "start", "guide", "up",
    "down", "left", "right",
];

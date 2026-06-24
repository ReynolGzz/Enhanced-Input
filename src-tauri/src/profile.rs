//! Profile data model. These structs are serialized to JSON (camelCase) and are
//! the single source of truth shared with the frontend. Keep field names in sync
//! with `src/lib/types.ts`.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Inner dead zone *type* — how the dead region near the center is shaped.
/// Decoupled from the outer shape so any combination is possible.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InnerDeadzone {
    /// No inner dead zone at all (truly raw center).
    Raw,
    /// Cross/plus: an independent dead zone per axis.
    Cross,
    /// Circular: ignores the combined magnitude under the inner radius
    /// (rescaled to keep the full range — the smoothest option).
    Radial,
}

impl Default for InnerDeadzone {
    fn default() -> Self {
        InnerDeadzone::Radial
    }
}

/// Outer *shape* — how the usable area is bounded toward the edge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OuterShape {
    /// Leave the hardware gate as-is (the typical imperfect ~9% circle).
    Default,
    /// Full square: each axis can reach its max independently (corners reachable).
    Square,
    /// Perfect circle: the combined magnitude is clamped to 1.
    Circle,
}

impl Default for OuterShape {
    fn default() -> Self {
        OuterShape::Default
    }
}

/// Named response curves. Each maps to an exponent applied to the magnitude.
/// `Custom` uses the per-config `curve_exponent` instead of a fixed value.
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
    /// User-defined exponent (see `curve_exponent`).
    Custom,
}

impl Default for ResponseCurve {
    fn default() -> Self {
        ResponseCurve::Linear
    }
}

/// Bounds for a custom curve exponent. Deliberately wide (not capped at a
/// "useful" value) so the user owns the full usable range; only kept finite and
/// positive so the app never breaks on absurd input (e.g. 1e18 -> clamped).
pub const CURVE_EXPONENT_MIN: f32 = 0.01;
pub const CURVE_EXPONENT_MAX: f32 = 1000.0;

impl ResponseCurve {
    /// Exponent applied to a normalized magnitude (0..1). `custom` is the
    /// per-config exponent used only when `self == Custom`.
    pub fn exponent_with(self, custom: f32) -> f32 {
        match self {
            ResponseCurve::Linear => 1.0,
            ResponseCurve::Aggressive => 0.65,
            ResponseCurve::Relaxed => 1.35,
            ResponseCurve::Precision => 1.8,
            ResponseCurve::Custom => sanitize_exponent(custom),
        }
    }
}

/// Clamp a custom exponent into the safe finite range; non-finite -> 1.0.
pub fn sanitize_exponent(e: f32) -> f32 {
    if e.is_finite() {
        e.clamp(CURVE_EXPONENT_MIN, CURVE_EXPONENT_MAX)
    } else {
        1.0
    }
}

fn default_outer_range() -> f32 {
    1.0
}
fn default_edge_radius() -> f32 {
    32767.0
}
fn default_none_output() -> OutputTarget {
    OutputTarget::None
}
fn default_exponent() -> f32 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickConfig {
    /// Inner dead zone type (raw / cross / radial).
    #[serde(default)]
    pub inner_type: InnerDeadzone,
    /// Outer boundary shape (default / square / circle).
    #[serde(default)]
    pub outer_shape: OuterShape,
    /// Inner dead zone radius, 0..1 (can go up to 100%).
    pub inner_deadzone: f32,
    /// Usable outer range, 0..1 (conventional: 1.0 = full range, 0 = unplayable).
    /// Output reaches max when the input magnitude reaches this radius.
    #[serde(default = "default_outer_range")]
    pub outer_range: f32,
    /// Output multiplier. 1.0 = passthrough.
    pub sensitivity: f32,
    pub curve: ResponseCurve,
    /// Exponent used when `curve == Custom`.
    #[serde(default = "default_exponent")]
    pub curve_exponent: f32,
    /// Anti dead zone / outer ring: minimum output magnitude when the stick moves,
    /// used to overcome a dead zone baked into the game itself. 0..1.
    pub anti_deadzone: f32,
    /// Edge / outer-ring binding radius in Steam's 0..32767 scale. The
    /// `edge_binding` fires when the raw stick magnitude crosses this radius
    /// (Steam "Outer Ring Binding Radius"); it does NOT scale the stick output.
    #[serde(default = "default_edge_radius")]
    pub edge_radius: f32,
    /// Action fired when the stick crosses `edge_radius`. `None` = no binding.
    #[serde(default = "default_none_output")]
    pub edge_binding: OutputTarget,
    /// Invert the ring: fire `edge_binding` while *inside* the radius instead.
    #[serde(default)]
    pub edge_invert: bool,
    /// Smoothing filter, -10..10. 0 = off, positive smooths (slower/cleaner),
    /// negative injects artificial jitter. Applied statefully in the engine.
    #[serde(default)]
    pub smoothing: i8,
    pub invert_x: bool,
    pub invert_y: bool,
}

impl Default for StickConfig {
    fn default() -> Self {
        StickConfig {
            inner_type: InnerDeadzone::default(),
            outer_shape: OuterShape::default(),
            inner_deadzone: 0.08,
            outer_range: 1.0,
            sensitivity: 1.0,
            curve: ResponseCurve::default(),
            curve_exponent: 1.0,
            anti_deadzone: 0.0,
            edge_radius: 32767.0,
            edge_binding: OutputTarget::None,
            edge_invert: false,
            smoothing: 0,
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
    /// Exponent used when `curve == Custom`.
    #[serde(default = "default_exponent")]
    pub curve_exponent: f32,
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
            curve_exponent: 1.0,
            output: OutputTarget::Passthrough,
        }
    }
}

/// One action a macro performs during a step.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum MacroAction {
    Gamepad { button: String },
    Key { code: String },
    Mouse { button: String },
}

/// A macro step: hold `action` for `hold_ms`, then wait `gap_ms` before the next.
/// Times are in milliseconds and may be fractional (minimum 0).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MacroStep {
    pub action: MacroAction,
    pub hold_ms: f32,
    pub gap_ms: f32,
}

/// How a macro is triggered by its button.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MacroTrigger {
    /// Play the whole sequence once per press.
    Once,
    /// Loop the sequence while the button is held.
    WhileHeld,
    /// Press to start looping, press again to stop.
    Toggle,
}

impl Default for MacroTrigger {
    fn default() -> Self {
        MacroTrigger::Once
    }
}

/// What an input control emits. `Passthrough` keeps the original signal,
/// `None` disables it, `Gamepad` remaps to another virtual-pad button,
/// `Key` injects a keyboard key, `Mouse` a mouse button or wheel tick,
/// `Macro` plays a timed sequence of actions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum OutputTarget {
    Passthrough,
    None,
    Gamepad { button: String },
    Key { code: String },
    /// `button` ∈ left|right|middle|x1|x2|wheelup|wheeldown.
    Mouse { button: String },
    /// Drive a virtual stick direction while held. `stick` ∈ "l"|"r",
    /// `dir` ∈ "up"|"down"|"left"|"right".
    StickDir { stick: String, dir: String },
    Macro {
        steps: Vec<MacroStep>,
        #[serde(default)]
        trigger: MacroTrigger,
    },
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
    /// Presses per second when turbo is on (up to 100).
    pub turbo_rate_hz: f32,
    /// When true (with turbo on), the button never registers a normal single
    /// press: it is turbo from the first touch ("disable regular pressing").
    #[serde(default)]
    pub disable_regular_press: bool,
}

impl Default for ButtonMapping {
    fn default() -> Self {
        ButtonMapping {
            output: OutputTarget::Passthrough,
            turbo: false,
            turbo_rate_hz: 12.0,
            disable_regular_press: false,
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

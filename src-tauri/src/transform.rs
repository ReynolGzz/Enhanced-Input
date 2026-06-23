//! Pure signal transforms applied to sticks and triggers. No I/O here so the
//! math can be unit-tested on any platform.

use crate::profile::{InnerDeadzone, OuterShape, StickConfig, TriggerConfig};

/// Apply a stick's full transform chain and return normalized output.
/// Order: invert -> inner dead zone (+ outer-range rescale) -> magnitude curve,
/// sensitivity, anti dead zone -> shape-aware clamp.
///
/// The combined output stays within the unit circle for `Circle`, and within the
/// unit square (corners reachable) for `Default`/`Square`.
pub fn apply_stick(cfg: &StickConfig, mut x: f32, mut y: f32) -> (f32, f32) {
    if cfg.invert_x {
        x = -x;
    }
    if cfg.invert_y {
        y = -y;
    }

    let inner = cfg.inner_deadzone.clamp(0.0, 0.99);
    // Conventional outer range: 1.0 = full range, lower = output saturates sooner.
    let hi = cfg.outer_range.clamp(inner + 1e-3, 1.0);

    // 1) Inner dead zone, rescaled so `hi` maps to full deflection.
    let (mut nx, mut ny) = match cfg.inner_type {
        InnerDeadzone::Raw => radial_rescale(x, y, 0.0, hi),
        InnerDeadzone::Cross => (axis_rescale(x, inner, hi), axis_rescale(y, inner, hi)),
        InnerDeadzone::Radial => radial_rescale(x, y, inner, hi),
    };

    // 2) Magnitude shaping. Square uses the L-infinity norm so the corners are
    //    preserved; the others use the Euclidean magnitude.
    let exp = cfg.curve.exponent_with(cfg.curve_exponent);
    let norm = if matches!(cfg.outer_shape, OuterShape::Square) {
        nx.abs().max(ny.abs())
    } else {
        (nx * nx + ny * ny).sqrt()
    };
    if norm > 1e-6 {
        let mut m = norm.min(1.0).powf(exp);
        m = (m * cfg.sensitivity.max(0.0)).min(1.0);
        let anti = cfg.anti_deadzone.clamp(0.0, 0.95);
        if anti > 0.0 && m > 0.0 {
            m = anti + (1.0 - anti) * m;
        }
        let scale = m / norm;
        nx *= scale;
        ny *= scale;
    }

    // 3) Shape-aware clamp.
    if matches!(cfg.outer_shape, OuterShape::Circle) {
        let m = (nx * nx + ny * ny).sqrt();
        if m > 1.0 {
            nx /= m;
            ny /= m;
        }
    }
    (nx.clamp(-1.0, 1.0), ny.clamp(-1.0, 1.0))
}

/// Per-axis dead zone with rescale: `inner..hi` maps to `0..1`.
fn axis_rescale(v: f32, inner: f32, hi: f32) -> f32 {
    let s = v.signum();
    let a = v.abs();
    if a <= inner {
        return 0.0;
    }
    if a >= hi {
        return s;
    }
    s * ((a - inner) / (hi - inner))
}

/// Circular dead zone, rescaled so magnitude `inner..hi` maps to `0..1`.
fn radial_rescale(x: f32, y: f32, inner: f32, hi: f32) -> (f32, f32) {
    let mag = (x * x + y * y).sqrt();
    if mag <= inner || mag < 1e-6 {
        return (0.0, 0.0);
    }
    let t = ((mag - inner) / (hi - inner)).clamp(0.0, 1.0);
    (x / mag * t, y / mag * t)
}

/// Apply a trigger's analog transform, returning 0..1.
pub fn apply_trigger(cfg: &TriggerConfig, v: f32) -> f32 {
    let start = cfg.deadzone_start.clamp(0.0, 0.99);
    let end = cfg.deadzone_end.clamp(start + 0.01, 1.0);
    let t = ((v - start) / (end - start)).clamp(0.0, 1.0);
    t.powf(cfg.curve.exponent_with(cfg.curve_exponent))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profile::ResponseCurve;

    #[test]
    fn center_is_dead() {
        let cfg = StickConfig::default();
        let (x, y) = apply_stick(&cfg, 0.02, 0.0);
        assert_eq!((x, y), (0.0, 0.0));
    }

    #[test]
    fn full_deflection_passes() {
        let cfg = StickConfig::default();
        let (x, _) = apply_stick(&cfg, 1.0, 0.0);
        assert!(x > 0.99);
    }

    #[test]
    fn raw_has_no_inner_deadzone() {
        let mut cfg = StickConfig::default();
        cfg.inner_type = InnerDeadzone::Raw;
        let (x, _) = apply_stick(&cfg, 0.02, 0.0);
        assert!(x > 0.0); // tiny input still produces output
    }

    #[test]
    fn outer_range_saturates_early() {
        // With usable range 0.5, half deflection should already hit full output.
        let mut cfg = StickConfig::default();
        cfg.inner_type = InnerDeadzone::Raw;
        cfg.outer_range = 0.5;
        let (x, _) = apply_stick(&cfg, 0.5, 0.0);
        assert!(x > 0.99);
    }

    #[test]
    fn square_reaches_corner_circle_clamps_it() {
        let mut sq = StickConfig::default();
        sq.inner_type = InnerDeadzone::Cross;
        sq.outer_shape = OuterShape::Square;
        let (x, y) = apply_stick(&sq, 1.0, 1.0);
        assert!(x > 0.99 && y > 0.99); // corner reachable

        let mut ci = StickConfig::default();
        ci.outer_shape = OuterShape::Circle;
        let (x, y) = apply_stick(&ci, 1.0, 1.0);
        let m = (x * x + y * y).sqrt();
        assert!(m <= 1.001); // clamped to the unit circle
    }

    #[test]
    fn custom_curve_uses_exponent() {
        let mut cfg = StickConfig::default();
        cfg.inner_type = InnerDeadzone::Raw;
        cfg.curve = ResponseCurve::Custom;
        cfg.curve_exponent = 2.0;
        // At half input, output magnitude ~ 0.5^2 = 0.25.
        let (x, _) = apply_stick(&cfg, 0.5, 0.0);
        assert!((x - 0.25).abs() < 0.02);
    }

    #[test]
    fn custom_curve_rejects_absurd_values() {
        // 1e18 must be clamped to the safe max, not break the math.
        let mut cfg = StickConfig::default();
        cfg.inner_type = InnerDeadzone::Raw;
        cfg.curve = ResponseCurve::Custom;
        cfg.curve_exponent = 1e18;
        let (x, _) = apply_stick(&cfg, 0.8, 0.0);
        assert!(x.is_finite() && (0.0..=1.0).contains(&x));
    }

    #[test]
    fn trigger_deadzone() {
        let mut cfg = TriggerConfig::default();
        cfg.deadzone_start = 0.1;
        assert_eq!(apply_trigger(&cfg, 0.05), 0.0);
        assert!(apply_trigger(&cfg, 1.0) > 0.99);
    }
}

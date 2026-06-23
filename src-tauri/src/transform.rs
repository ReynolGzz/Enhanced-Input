//! Pure signal transforms applied to sticks and triggers. No I/O here so the
//! math can be unit-tested on any platform.

use crate::profile::{DeadzoneType, StickConfig, TriggerConfig};

/// Apply a stick's full transform chain and return normalized output (-1..1).
/// Order: invert -> dead zone -> response curve -> sensitivity -> anti dead zone.
pub fn apply_stick(cfg: &StickConfig, mut x: f32, mut y: f32) -> (f32, f32) {
    if cfg.invert_x {
        x = -x;
    }
    if cfg.invert_y {
        y = -y;
    }

    let inner = cfg.inner_deadzone.clamp(0.0, 0.95);
    let outer = cfg.outer_deadzone.clamp(0.0, 0.95);

    let (mut nx, mut ny) = match cfg.deadzone_type {
        DeadzoneType::None => (x, y),
        DeadzoneType::Axial => (axis_deadzone(x, inner, outer), axis_deadzone(y, inner, outer)),
        DeadzoneType::Radial => radial_deadzone(x, y, inner, outer, false),
        DeadzoneType::ScaledRadial => radial_deadzone(x, y, inner, outer, true),
        DeadzoneType::Cross => {
            // Axial near the center, then a radial rescale toward the edge.
            let ax = axis_deadzone(x, inner, 0.0);
            let ay = axis_deadzone(y, inner, 0.0);
            radial_deadzone(ax, ay, 0.0, outer, true)
        }
    };

    // Shape the magnitude: curve, then sensitivity, then anti dead zone.
    let mag = (nx * nx + ny * ny).sqrt();
    if mag > 1e-6 {
        let mut m = mag.min(1.0).powf(cfg.curve.exponent());
        m = (m * cfg.sensitivity.max(0.0)).min(1.0);

        let anti = cfg.anti_deadzone.clamp(0.0, 0.95);
        if anti > 0.0 && m > 0.0 {
            m = anti + (1.0 - anti) * m;
        }

        let scale = m / mag;
        nx *= scale;
        ny *= scale;
    }

    // Never let the combined vector escape the unit circle.
    let m2 = (nx * nx + ny * ny).sqrt();
    if m2 > 1.0 {
        nx /= m2;
        ny /= m2;
    }
    (nx.clamp(-1.0, 1.0), ny.clamp(-1.0, 1.0))
}

/// Per-axis dead zone with rescale to keep the full output range.
fn axis_deadzone(v: f32, inner: f32, outer: f32) -> f32 {
    let s = v.signum();
    let a = v.abs();
    if a <= inner {
        return 0.0;
    }
    let hi = (1.0 - outer).max(inner + 1e-6);
    if a >= hi {
        return s;
    }
    s * ((a - inner) / (hi - inner))
}

/// Circular dead zone. When `scaled`, the remaining range is rescaled to 0..1;
/// otherwise the original magnitude is preserved (hard cut at the inner radius).
fn radial_deadzone(x: f32, y: f32, inner: f32, outer: f32, scaled: bool) -> (f32, f32) {
    let mag = (x * x + y * y).sqrt();
    if mag <= inner || mag < 1e-6 {
        return (0.0, 0.0);
    }
    let hi = (1.0 - outer).max(inner + 1e-6);
    let dir_x = x / mag;
    let dir_y = y / mag;

    if scaled {
        let t = ((mag - inner) / (hi - inner)).clamp(0.0, 1.0);
        (dir_x * t, dir_y * t)
    } else {
        let m = mag.min(hi);
        (dir_x * m, dir_y * m)
    }
}

/// Apply a trigger's analog transform, returning 0..1.
pub fn apply_trigger(cfg: &TriggerConfig, v: f32) -> f32 {
    let start = cfg.deadzone_start.clamp(0.0, 0.99);
    let end = cfg.deadzone_end.clamp(start + 0.01, 1.0);
    let t = ((v - start) / (end - start)).clamp(0.0, 1.0);
    t.powf(cfg.curve.exponent())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn center_is_dead() {
        let cfg = StickConfig::default();
        let (x, y) = apply_stick(&cfg, 0.02, 0.0);
        assert_eq!((x, y), (0.0, 0.0));
    }

    #[test]
    fn full_deflection_passes() {
        let mut cfg = StickConfig::default();
        cfg.deadzone_type = DeadzoneType::ScaledRadial;
        let (x, _) = apply_stick(&cfg, 1.0, 0.0);
        assert!(x > 0.99);
    }

    #[test]
    fn trigger_deadzone() {
        let mut cfg = TriggerConfig::default();
        cfg.deadzone_start = 0.1;
        assert_eq!(apply_trigger(&cfg, 0.05), 0.0);
        assert!(apply_trigger(&cfg, 1.0) > 0.99);
    }
}

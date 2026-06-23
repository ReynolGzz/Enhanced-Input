//! Deterministic, shareable profile codes.
//!
//! The same configuration always produces the same code (the per-install `id`
//! and the user-facing `name` are excluded), so two people with an identical
//! setup get the same serial-like code. Codes never expire — they are just a
//! compact, versioned encoding of the configuration:
//!
//! `EIP1` + base58( deflate( json(portable) ) )

use crate::profile::{ButtonMapping, Profile, StickConfig, TriggerConfig};
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{Read, Write};

/// Format version prefix. Bump if the portable layout changes.
const PREFIX: &str = "EIP1";

/// The portable subset of a profile: everything that defines behavior plus the
/// accent color, but not the `id` or `name`.
#[derive(Serialize, Deserialize)]
struct Portable {
    color: String,
    left_stick: StickConfig,
    right_stick: StickConfig,
    left_trigger: TriggerConfig,
    right_trigger: TriggerConfig,
    buttons: BTreeMap<String, ButtonMapping>,
}

impl Portable {
    fn from_profile(p: &Profile) -> Self {
        Portable {
            color: p.color.clone(),
            left_stick: p.left_stick.clone(),
            right_stick: p.right_stick.clone(),
            left_trigger: p.left_trigger.clone(),
            right_trigger: p.right_trigger.clone(),
            buttons: p.buttons.clone(),
        }
    }
}

/// Encode a profile's configuration into a shareable code.
pub fn export_code(p: &Profile) -> Result<String> {
    let json = serde_json::to_vec(&Portable::from_profile(p))?;
    let mut enc =
        flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::best());
    enc.write_all(&json)?;
    let compressed = enc.finish()?;
    Ok(format!("{PREFIX}{}", bs58::encode(compressed).into_string()))
}

/// Decode a shareable code into a profile, assigning a fresh `id` and `name`.
pub fn import_code(code: &str, new_id: impl Into<String>, name: impl Into<String>) -> Result<Profile> {
    let body = code
        .trim()
        .strip_prefix(PREFIX)
        .ok_or_else(|| anyhow!("código no válido (prefijo incorrecto)"))?;
    let compressed = bs58::decode(body)
        .into_vec()
        .context("código corrupto")?;
    let mut dec = flate2::read::DeflateDecoder::new(&compressed[..]);
    let mut json = Vec::new();
    dec.read_to_end(&mut json).context("código corrupto")?;
    let portable: Portable = serde_json::from_slice(&json).context("código incompatible")?;
    Ok(Profile {
        id: new_id.into(),
        name: name.into(),
        color: portable.color,
        left_stick: portable.left_stick,
        right_stick: portable.right_stick,
        left_trigger: portable.left_trigger,
        right_trigger: portable.right_trigger,
        buttons: portable.buttons,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profile::{OutputTarget, ResponseCurve};

    fn sample(id: &str, name: &str) -> Profile {
        let mut p = Profile::new(id, name);
        p.left_stick.inner_deadzone = 0.123;
        p.left_stick.curve = ResponseCurve::Custom;
        p.left_stick.curve_exponent = 1.75;
        p.buttons.insert(
            "a".into(),
            ButtonMapping {
                output: OutputTarget::Key { code: "space".into() },
                turbo: true,
                turbo_rate_hz: 25.0,
                disable_regular_press: true,
            },
        );
        p
    }

    #[test]
    fn roundtrip_preserves_config() {
        let p = sample("p1", "Mío");
        let code = export_code(&p).unwrap();
        let back = import_code(&code, "p2", "Importado").unwrap();
        assert_eq!(back.id, "p2");
        assert_eq!(back.name, "Importado");
        assert_eq!(back.color, p.color);
        assert_eq!(back.left_stick.inner_deadzone, p.left_stick.inner_deadzone);
        assert_eq!(back.left_stick.curve_exponent, 1.75);
        assert_eq!(back.buttons["a"].output, OutputTarget::Key { code: "space".into() });
        assert!(back.buttons["a"].disable_regular_press);
    }

    #[test]
    fn same_config_same_code_regardless_of_id_and_name() {
        let a = sample("aaa", "Reynol");
        let b = sample("zzz", "Amigo");
        assert_eq!(export_code(&a).unwrap(), export_code(&b).unwrap());
    }

    #[test]
    fn different_config_different_code() {
        let a = sample("p", "n");
        let mut b = sample("p", "n");
        b.right_stick.sensitivity = 2.0;
        assert_ne!(export_code(&a).unwrap(), export_code(&b).unwrap());
    }

    #[test]
    fn rejects_garbage() {
        assert!(import_code("not-a-code", "x", "y").is_err());
        assert!(import_code("EIP1####", "x", "y").is_err());
    }
}

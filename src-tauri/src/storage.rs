//! Profile persistence. Profiles live as individual JSON files under the OS
//! config dir, e.g. `%APPDATA%/EnhancedInput/profiles/<id>.json` on Windows.

use crate::profile::Profile;
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const APP_DIR: &str = "EnhancedInput";

fn app_dir() -> Result<PathBuf> {
    let base = dirs::config_dir().ok_or_else(|| anyhow!("no config dir"))?;
    Ok(base.join(APP_DIR))
}

fn profiles_dir() -> Result<PathBuf> {
    Ok(app_dir()?.join("profiles"))
}

fn settings_path() -> Result<PathBuf> {
    Ok(app_dir()?.join("settings.json"))
}

fn ensure_dirs() -> Result<()> {
    fs::create_dir_all(profiles_dir()?)?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub active_profile_id: Option<String>,
}

pub fn load_settings() -> Settings {
    let path = match settings_path() {
        Ok(p) => p,
        Err(_) => return Settings::default(),
    };
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_settings(settings: &Settings) -> Result<()> {
    ensure_dirs()?;
    let json = serde_json::to_string_pretty(settings)?;
    fs::write(settings_path()?, json)?;
    Ok(())
}

/// A fresh identity profile (every input passes through unchanged).
pub fn default_profile() -> Profile {
    Profile::new("default", "Default")
}

/// Create the default profile on first run so the list is never empty.
pub fn bootstrap() -> Result<()> {
    ensure_dirs()?;
    if list_profiles()?.is_empty() {
        save_profile(&default_profile())?;
    }
    Ok(())
}

pub fn list_profiles() -> Result<Vec<ProfileSummary>> {
    let dir = profiles_dir()?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        if let Ok(text) = fs::read_to_string(&path) {
            if let Ok(p) = serde_json::from_str::<Profile>(&text) {
                out.push(ProfileSummary {
                    id: p.id,
                    name: p.name,
                    color: p.color,
                });
            }
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

pub fn load_profile(id: &str) -> Result<Profile> {
    let path = profiles_dir()?.join(format!("{id}.json"));
    let text = fs::read_to_string(&path).with_context(|| format!("profile {id} not found"))?;
    let profile = serde_json::from_str(&text)?;
    Ok(profile)
}

pub fn save_profile(profile: &Profile) -> Result<()> {
    ensure_dirs()?;
    if profile.id.is_empty() {
        return Err(anyhow!("profile id is empty"));
    }
    let path = profiles_dir()?.join(format!("{}.json", profile.id));
    let json = serde_json::to_string_pretty(profile)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn delete_profile(id: &str) -> Result<()> {
    let path = profiles_dir()?.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

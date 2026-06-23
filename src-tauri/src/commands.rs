//! Tauri commands exposed to the frontend. Thin wrappers around storage + engine.

use crate::engine::{EngineStatus, LivePreview};
use crate::input::ControllerInfo;
use crate::profile::Profile;
use crate::storage::{self, ProfileSummary, Settings};
use crate::AppState;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

#[tauri::command]
pub fn list_controllers() -> Result<Vec<ControllerInfo>, String> {
    #[cfg(windows)]
    {
        crate::input::list_controllers().map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<ProfileSummary>, String> {
    storage::list_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_profile(id: String) -> Result<Profile, String> {
    storage::load_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_profile(profile: Profile, state: State<'_, AppState>) -> Result<(), String> {
    storage::save_profile(&profile).map_err(|e| e.to_string())?;
    // Live-apply if this is the profile currently driving the engine.
    let settings = storage::load_settings();
    if settings.active_profile_id.as_deref() == Some(profile.id.as_str()) {
        state.engine.set_profile(profile);
    }
    Ok(())
}

#[tauri::command]
pub fn create_profile(name: String) -> Result<Profile, String> {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let id = format!("p{nanos}");
    let display = if name.trim().is_empty() {
        "New Profile".to_string()
    } else {
        name.trim().to_string()
    };
    let profile = Profile::new(id, display);
    storage::save_profile(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(id: String) -> Result<(), String> {
    storage::delete_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    Ok(storage::load_settings())
}

#[tauri::command]
pub fn set_active_profile(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let profile = storage::load_profile(&id).map_err(|e| e.to_string())?;
    state.engine.set_profile(profile);
    storage::save_settings(&Settings {
        active_profile_id: Some(id),
    })
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn start_engine(
    controller_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<EngineStatus, String> {
    state.engine.start(controller_path)?;
    Ok(state.engine.status())
}

#[tauri::command]
pub fn stop_engine(state: State<'_, AppState>) -> Result<EngineStatus, String> {
    state.engine.stop();
    Ok(state.engine.status())
}

#[tauri::command]
pub fn engine_status(state: State<'_, AppState>) -> EngineStatus {
    state.engine.status()
}

#[tauri::command]
pub fn live_preview(state: State<'_, AppState>) -> LivePreview {
    state.engine.live()
}

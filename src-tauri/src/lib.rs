//! Enhanced Input library entry point. `main.rs` simply calls [`run`].

mod commands;
mod engine;
mod input;
mod keyboard;
mod mouse;
mod output;
mod profile;
mod share;
mod storage;
mod transform;

use std::sync::Arc;

/// Shared application state managed by Tauri.
pub struct AppState {
    pub engine: Arc<engine::Engine>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Make sure a default profile exists on first launch.
    if let Err(e) = storage::bootstrap() {
        eprintln!("Enhanced Input: bootstrap warning: {e}");
    }

    // Load the previously active profile, or fall back to the default.
    let settings = storage::load_settings();
    let profile = settings
        .active_profile_id
        .as_deref()
        .and_then(|id| storage::load_profile(id).ok())
        .unwrap_or_else(storage::default_profile);

    let engine = engine::Engine::new(profile);

    tauri::Builder::default()
        .manage(AppState { engine })
        .invoke_handler(tauri::generate_handler![
            commands::list_controllers,
            commands::list_profiles,
            commands::load_profile,
            commands::save_profile,
            commands::create_profile,
            commands::duplicate_profile,
            commands::rename_profile,
            commands::delete_profile,
            commands::export_profile_code,
            commands::import_profile_code,
            commands::get_settings,
            commands::set_active_profile,
            commands::start_engine,
            commands::stop_engine,
            commands::engine_status,
            commands::live_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Enhanced Input");
}

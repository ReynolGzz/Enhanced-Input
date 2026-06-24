//! Enhanced Input library entry point. `main.rs` simply calls [`run`].

mod commands;
mod engine;
mod input;
mod keyboard;
mod mouse;
mod output;
mod overlay;
mod profile;
mod share;
mod storage;
mod transform;

use std::sync::Arc;

/// Shared application state managed by Tauri.
pub struct AppState {
    pub engine: Arc<engine::Engine>,
    /// Port of the local OBS overlay server (0 if it failed to bind).
    pub overlay_port: u16,
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

    // Start the local OBS overlay server (best-effort; 0 = could not bind).
    let overlay_port = overlay::start(Arc::clone(&engine));

    let mut builder = tauri::Builder::default();
    // Desktop-only plugins: in-app updater + relaunch after install.
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ));
    }

    builder
        .manage(AppState { engine, overlay_port })
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
            commands::overlay_url,
            commands::set_autostart,
            commands::get_autostart,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Enhanced Input");
}

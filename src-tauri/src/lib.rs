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

/// Bring the main window back from the tray (used by the tray icon + menu).
#[cfg(desktop)]
fn restore_main(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
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
        .setup(|app| {
            // System-tray icon so the window can come back after "hide on minimize".
            // Left-click (or the "Mostrar" menu item) restores it; "Salir" quits.
            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::{
                    MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent,
                };

                let show =
                    MenuItem::with_id(app, "show", "Mostrar Enhanced Input", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;

                let mut tray = TrayIconBuilder::with_id("ei-tray")
                    .tooltip("Enhanced Input")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => restore_main(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            restore_main(tray.app_handle());
                        }
                    });
                if let Some(icon) = app.default_window_icon() {
                    tray = tray.icon(icon.clone());
                }
                tray.build(app)?;
            }
            Ok(())
        })
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

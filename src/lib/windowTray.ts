// "Hide on minimize" (minimize-to-tray). When the user minimizes the window and
// the preference is on, we hide it from the taskbar; the system-tray icon
// (created on the Rust side) brings it back. No-op outside the Tauri webview.

import { getBool, WIN_HIDE_MIN } from "./settings";

let started = false;

export async function initMinimizeToTray(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    // onResized fires on minimize/restore/resize; we only act on minimize.
    await win.onResized(async () => {
      if (!getBool(WIN_HIDE_MIN)) return;
      try {
        if (await win.isMinimized()) {
          await win.hide();
        }
      } catch {
        /* ignore */
      }
    });
  } catch {
    // Not running under Tauri (browser preview) — nothing to wire up.
    started = false;
  }
}

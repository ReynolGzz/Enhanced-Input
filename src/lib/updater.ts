// Thin, guarded wrapper around the Tauri updater + process plugins. Every call
// is wrapped so it is a harmless no-op outside Tauri (e.g. browser preview) or
// when the updater isn't configured yet.
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateInfo {
  version: string;
  install: () => Promise<void>;
}

/// Check GitHub releases for a newer signed version. Returns null when up to
/// date, offline, or running outside a configured Tauri build.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const update = await check();
    if (update?.available) {
      return {
        version: update.version,
        install: async () => {
          await update.downloadAndInstall();
          await relaunch();
        },
      };
    }
  } catch {
    /* not under Tauri, updater not configured, or offline */
  }
  return null;
}

// Lightweight, localStorage-backed UI preferences (works in Tauri webview and
// browser preview). OS-level effects (autostart, minimize-to-tray) are wired on
// the Rust side separately; these keys hold the user's chosen state.

export type Lang = "es" | "en";

const LANG_KEY = "ei.lang";
export const WIN_AUTOSTART = "ei.win.autostart";
export const WIN_HIDE_MIN = "ei.win.hideMinimized";
export const OVERLAY_STYLE = "ei.overlay.style"; // "white" | "black"

export function getLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}
export function setLang(l: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
}

export function getBool(key: string, def = false): boolean {
  try {
    const v = localStorage.getItem(key);
    return v == null ? def : v === "1";
  } catch {
    return def;
  }
}
export function setBool(key: string, val: boolean): void {
  try {
    localStorage.setItem(key, val ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function getStr(key: string, def: string): string {
  try {
    return localStorage.getItem(key) ?? def;
  } catch {
    return def;
  }
}
export function setStr(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

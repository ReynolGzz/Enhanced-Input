// App color themes. Each theme is a set of CSS-variable overrides defined in
// styles.css under `:root[data-theme="<id>"]`; "default" uses the base :root.
// The whole UI (including the rebind modal) is built on these variables, so
// switching the theme recolors everything.

export type ThemeId =
  | "default"
  | "azul-pastel"
  | "rosa-pastel"
  | "hard-white"
  | "hard-dark";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  // Colors used only for the little preview swatch in Settings.
  preview: { bg: string; card: string; accent: string; text: string };
}

export const THEMES: ThemeDef[] = [
  {
    id: "default",
    label: "Default",
    preview: { bg: "#0f1216", card: "#1c232c", accent: "#2f6fff", text: "#e7edf3" },
  },
  {
    id: "azul-pastel",
    label: "Azul pastel",
    preview: { bg: "#dfeaff", card: "#ffffff", accent: "#2f6fff", text: "#1c2e4a" },
  },
  {
    id: "rosa-pastel",
    label: "Rosa pastel",
    preview: { bg: "#ffe3ef", card: "#fff0f6", accent: "#ec4f8e", text: "#5a1f3a" },
  },
  {
    id: "hard-white",
    label: "Hard white",
    preview: { bg: "#ffffff", card: "#f0f1f4", accent: "#2f6fff", text: "#0e1116" },
  },
  {
    id: "hard-dark",
    label: "Hard dark",
    preview: { bg: "#000000", card: "#13161b", accent: "#2f6fff", text: "#ffffff" },
  },
];

const KEY = "ei.theme";

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY) as ThemeId | null;
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {
    /* ignore */
  }
  return "default";
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute("data-theme", id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

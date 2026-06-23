import { useState } from "react";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "../lib/theme";

type Section = "appearance" | "overlay" | "windows" | "subscriptions" | "billing";

const NAV: { group: string; items: { id: Section; label: string }[] }[] = [
  {
    group: "Experiencia",
    items: [
      { id: "appearance", label: "Appearance" },
      { id: "overlay", label: "Game Overlay" },
      { id: "windows", label: "Windows" },
    ],
  },
  {
    group: "Facturación",
    items: [
      { id: "subscriptions", label: "Subscriptions" },
      { id: "billing", label: "Billing" },
    ],
  },
];

const TITLES: Record<Section, string> = {
  appearance: "Appearance",
  overlay: "Game Overlay",
  windows: "Windows",
  subscriptions: "Subscriptions",
  billing: "Billing",
};

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section>("appearance");
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme());

  const pick = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id); // recolors the whole app instantly
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-side">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="grp">{g.group}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  className={`settings-nav ${section === it.id ? "active" : ""}`}
                  onClick={() => setSection(it.id)}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="settings-content">
          <button
            className="bind-close"
            onClick={onClose}
            title="Cerrar"
            style={{ position: "absolute", top: 16, right: 16 }}
          >
            ✕
          </button>

          {section === "appearance" ? (
            <>
              <h3>Appearance</h3>
              <p className="sub">
                Elige el tema de la aplicación. El control y toda la interfaz se
                recolorean al instante.
              </p>
              <div className="theme-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-card ${theme === t.id ? "sel" : ""}`}
                    onClick={() => pick(t.id)}
                  >
                    <div
                      className="theme-prev"
                      style={{ background: t.preview.bg }}
                    >
                      <span
                        className="bar"
                        style={{ background: t.preview.card }}
                      />
                      <span
                        className="dot"
                        style={{ background: t.preview.accent }}
                      />
                    </div>
                    <div className="theme-name">
                      <span>{t.label}</span>
                      {theme === t.id && (
                        <span style={{ color: "var(--accent)" }}>✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>{TITLES[section]}</h3>
              <div className="wip-box">
                <div className="big">🚧</div>
                <div>Work in progress — disponible pronto.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

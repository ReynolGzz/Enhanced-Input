import { useEffect, useState } from "react";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "../lib/theme";
import {
  getLang,
  setLang,
  getBool,
  setBool,
  getStr,
  setStr,
  WIN_AUTOSTART,
  WIN_HIDE_MIN,
  OVERLAY_STYLE,
  type Lang,
} from "../lib/settings";
import { checkForUpdate, currentVersion, type UpdateInfo } from "../lib/updater";
import { api } from "../lib/api";
import { Select, Toggle, AdvField } from "./ui";

type Section = "appearance" | "language" | "overlay" | "windows" | "updates";

const NAV: { group: string; items: { id: Section; label: string }[] }[] = [
  {
    group: "Experiencia",
    items: [
      { id: "appearance", label: "Appearance" },
      { id: "language", label: "Language" },
      { id: "overlay", label: "Streamer overlay" },
    ],
  },
  {
    group: "Sistema",
    items: [
      { id: "windows", label: "Windows" },
      { id: "updates", label: "Check for updates" },
    ],
  },
];

const TITLES: Record<Section, string> = {
  appearance: "Appearance",
  language: "Language",
  overlay: "Streamer overlay",
  windows: "Windows",
  updates: "Check for updates",
};

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
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
          <h3>{TITLES[section]}</h3>
          {section === "appearance" && <AppearancePane />}
          {section === "language" && <LanguagePane />}
          {section === "windows" && <WindowsPane />}
          {section === "updates" && <UpdatesPane />}
          {section === "overlay" && <OverlayPane />}
        </div>
      </div>
    </div>
  );
}

function AppearancePane() {
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme());
  const pick = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
  };
  return (
    <>
      <p className="sub">
        Elige el tema. El control y toda la interfaz se recolorean al instante.
      </p>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-card ${theme === t.id ? "sel" : ""}`}
            onClick={() => pick(t.id)}
          >
            <div className="theme-prev" style={{ background: t.preview.bg }}>
              <span className="bar" style={{ background: t.preview.card }} />
              <span className="dot" style={{ background: t.preview.accent }} />
            </div>
            <div className="theme-name">
              <span>{t.label}</span>
              {theme === t.id && <span style={{ color: "var(--accent)" }}>✓</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function LanguagePane() {
  const [lang, setL] = useState<Lang>(getLang());
  const change = (v: string) => {
    const l = v as Lang;
    setL(l);
    setLang(l);
  };
  return (
    <>
      <p className="sub">Idioma de la aplicación.</p>
      <AdvField label="Idioma / Language">
        <Select
          value={lang}
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
          ]}
          onChange={change}
        />
      </AdvField>
      <p className="sub" style={{ marginTop: 14 }}>
        Las traducciones se irán completando de forma progresiva.
      </p>
    </>
  );
}

function WindowsPane() {
  const [autostart, setAutostart] = useState(getBool(WIN_AUTOSTART));
  const [hideMin, setHideMin] = useState(getBool(WIN_HIDE_MIN));
  return (
    <>
      <p className="sub">Comportamiento de la ventana en Windows.</p>
      <AdvField label="Iniciar al arrancar Windows">
        <Toggle
          on={autostart}
          onChange={(v) => {
            setAutostart(v);
            setBool(WIN_AUTOSTART, v);
          }}
        />
      </AdvField>
      <AdvField label="Ocultar al minimizar (a la bandeja)">
        <Toggle
          on={hideMin}
          onChange={(v) => {
            setHideMin(v);
            setBool(WIN_HIDE_MIN, v);
          }}
        />
      </AdvField>
    </>
  );
}

function UpdatesPane() {
  const [current, setCurrent] = useState("…");
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [latest, setLatest] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    currentVersion().then(setCurrent);
  }, []);

  const check = async () => {
    setChecking(true);
    setChecked(false);
    const u = await checkForUpdate();
    setLatest(u);
    setChecked(true);
    setChecking(false);
  };

  return (
    <>
      <p className="sub">Revisa si tienes la última versión.</p>
      <AdvField label="Versión actual">
        <span style={{ color: "var(--text)", fontWeight: 600 }}>v{current}</span>
      </AdvField>
      <AdvField label="Última versión">
        <span style={{ color: "var(--text)", fontWeight: 600 }}>
          {!checked ? "—" : latest ? `v${latest.version}` : `v${current}`}
        </span>
      </AdvField>

      {checked && (
        <p className="sub" style={{ marginTop: 14 }}>
          {latest
            ? "Hay una versión más nueva disponible."
            : "Estás al día. 🎉"}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn" onClick={check} disabled={checking || installing}>
          {checking ? "Buscando…" : "Buscar actualizaciones"}
        </button>
        {latest && (
          <button
            className="btn primary"
            disabled={installing}
            onClick={async () => {
              setInstalling(true);
              try {
                await latest.install();
              } catch {
                setInstalling(false);
              }
            }}
          >
            {installing ? "Instalando…" : `Instalar v${latest.version} y reiniciar`}
          </button>
        )}
      </div>
    </>
  );
}

function OverlayPane() {
  const [style, setStyle] = useState(getStr(OVERLAY_STYLE, "white"));
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      const u = await api.overlayUrl(style);
      setUrl(u);
      await navigator.clipboard.writeText(u);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* not under Tauri / clipboard blocked */
    }
  };

  return (
    <>
      <p className="sub">
        Muestra tu control en vivo en OBS (Browser Source). Modelos sin marcas
        (blanco o negro); fondo transparente.
      </p>
      <AdvField label="Estilo del control">
        <Select
          value={style}
          options={[
            { value: "white", label: "Blanco (gratis)" },
            { value: "black", label: "Negro (gratis)" },
          ]}
          onChange={(v) => {
            setStyle(v);
            setStr(OVERLAY_STYLE, v);
          }}
        />
      </AdvField>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}>
        <button className="btn primary" onClick={copy}>
          Copy Link (OBS)
        </button>
        {copied && (
          <span style={{ color: "var(--accent)", fontSize: 13 }}>¡Copiado!</span>
        )}
      </div>

      {url && (
        <input
          className="input"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          style={{ marginTop: 12, width: "100%" }}
        />
      )}

      <p className="sub" style={{ marginTop: 14 }}>
        En OBS: <b>Fuentes → + → Navegador</b> y pega el enlace. Los botones se
        iluminan en vivo mientras el motor (Iniciar) está activo.
      </p>
    </>
  );
}

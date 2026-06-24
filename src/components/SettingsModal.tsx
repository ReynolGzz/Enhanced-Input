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
import { t } from "../lib/i18n";

type Section = "appearance" | "language" | "overlay" | "windows" | "updates";

const NAV: { group: string; items: { id: Section; label: string }[] }[] = [
  {
    group: t("set.group.experience"),
    items: [
      { id: "appearance", label: t("set.appearance") },
      { id: "language", label: t("set.language") },
      { id: "overlay", label: t("set.overlay") },
    ],
  },
  {
    group: t("set.group.system"),
    items: [
      { id: "windows", label: t("set.windows") },
      { id: "updates", label: t("set.updates") },
    ],
  },
];

const TITLES: Record<Section, string> = {
  appearance: t("set.appearance"),
  language: t("set.language"),
  overlay: t("set.overlay"),
  windows: t("set.windows"),
  updates: t("set.updates"),
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
      <p className="sub">{t("set.appearance.desc")}</p>
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
    if (l === lang) return;
    setL(l);
    setLang(l);
    // Reload so every t() call (and the label tables) rebuild in the new language.
    setTimeout(() => location.reload(), 120);
  };
  return (
    <>
      <p className="sub">{t("set.lang.desc")}</p>
      <AdvField label={t("set.lang.field")}>
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
        {t("set.lang.note")}
      </p>
    </>
  );
}

function WindowsPane() {
  const [auto, setAuto] = useState(getBool(WIN_AUTOSTART));
  const [hideMin, setHideMin] = useState(getBool(WIN_HIDE_MIN));

  useEffect(() => {
    // Reflect the real OS state when available.
    api.getAutostart().then(setAuto).catch(() => {});
  }, []);

  const toggleAuto = async (v: boolean) => {
    setAuto(v);
    setBool(WIN_AUTOSTART, v);
    try {
      await api.setAutostart(v);
    } catch {
      /* not under Tauri */
    }
  };

  return (
    <>
      <p className="sub">{t("set.win.desc")}</p>
      <AdvField label={t("set.win.autostart")}>
        <Toggle on={auto} onChange={toggleAuto} />
      </AdvField>
      <AdvField label={t("set.win.hideMin")}>
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
      <p className="sub">{t("set.upd.desc")}</p>
      <AdvField label={t("set.upd.current")}>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>v{current}</span>
      </AdvField>
      <AdvField label={t("set.upd.latest")}>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>
          {!checked ? "—" : latest ? `v${latest.version}` : `v${current}`}
        </span>
      </AdvField>

      {checked && (
        <p className="sub" style={{ marginTop: 14 }}>
          {latest ? t("set.upd.newer") : t("set.upd.uptodate")}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn" onClick={check} disabled={checking || installing}>
          {checking ? t("set.upd.checking") : t("set.upd.check")}
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
            {installing ? t("set.upd.installing") : t("set.upd.install", { v: latest.version })}
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
      <p className="sub">{t("set.ov.desc")}</p>
      <AdvField label={t("set.ov.style")}>
        <Select
          value={style}
          options={[
            { value: "white", label: t("set.ov.white") },
            { value: "black", label: t("set.ov.black") },
          ]}
          onChange={(v) => {
            setStyle(v);
            setStr(OVERLAY_STYLE, v);
          }}
        />
      </AdvField>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}>
        <button className="btn primary" onClick={copy}>
          {t("set.ov.copy")}
        </button>
        {copied && (
          <span style={{ color: "var(--accent)", fontSize: 13 }}>{t("set.ov.copied")}</span>
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
        {t("set.ov.helpPre")}<b>{t("set.ov.helpBold")}</b>{t("set.ov.helpPost")}
      </p>
    </>
  );
}

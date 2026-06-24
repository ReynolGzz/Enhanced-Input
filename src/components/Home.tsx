import { useState, type ReactNode } from "react";
import type { ControllerInfo, ProfileSummary, EngineStatus } from "../lib/types";
import { ControllerSilhouette } from "./ControllerArt";
import { t } from "../lib/i18n";

// <img> that walks a list of candidate sources, advancing on load error, and
// renders `fallback` once every source has failed. Lets a real PNG take
// precedence over the bundled SVG placeholder with no code change.
function FallbackImg({
  sources,
  alt,
  className,
  fallback = null,
}: {
  sources: string[];
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  if (idx >= sources.length) return <>{fallback}</>;
  return (
    <img
      className={className}
      src={sources[idx]}
      alt={alt}
      draggable={false}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

export function Home({
  controllers,
  profiles,
  activeProfileId,
  status,
  onSelectProfile,
  onNewProfile,
  onManageProfiles,
  onEditProfile,
  onToggleEngine,
  onOpenSettings,
}: {
  controllers: ControllerInfo[];
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  status: EngineStatus;
  onSelectProfile: (id: string) => void;
  onNewProfile: () => void;
  onManageProfiles: () => void;
  onEditProfile: () => void;
  onToggleEngine: () => void;
  onOpenSettings: () => void;
}) {
  const controller = controllers[0] ?? null;
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  const connLabel = controller?.path.startsWith("xinput:") ? "XInput" : "USB";

  return (
    <div className="home">
      <div className="home-top">
        <div className="home-header">
          <div className="home-title">
            <img
              className="logo-mark"
              src="/logo.jpg"
              alt="Enhanced Input"
              draggable={false}
            />
            <h1>Enhanced Input</h1>
          </div>
          <div className="home-actions">
            <button className="btn ghost" onClick={onManageProfiles}>
              {t("home.profiles")}
            </button>
            <button className="icon-btn" onClick={onOpenSettings} title={t("home.settings")}>
              ⚙
            </button>
          </div>
        </div>

        <div className="controllers-head">
          <span>{t("home.controller")}</span>
          <span style={{ textAlign: "right" }}>{t("home.selectedProfile")}</span>
        </div>

        {controller ? (
          <div className="controller-row">
            <div className="controller-id">
              <ControllerSilhouette
                kind={controller.kind}
                className="controller-art"
              />
              <div>
                <div className="controller-name">{controller.name}</div>
                <div className="controller-sub">
                  <span
                    className={`dot ${status.connected ? "ok" : "off"}`}
                  />
                  {controller.kind} ·{" "}
                  {connLabel === "USB" && (
                    <FallbackImg
                      className="conn-icon"
                      sources={[
                        "/controllers/usb-c.png",
                        "/controllers/usb-c.svg",
                      ]}
                      alt="USB-C"
                    />
                  )}
                  {connLabel}
                </div>
              </div>
            </div>

            <div className="profile-pick">
              <span
                className="color-chip"
                style={{ background: activeProfile?.color ?? "#2f6fff" }}
              />
              <select
                className="input"
                style={{ minWidth: 170 }}
                value={activeProfile?.id ?? ""}
                onChange={(e) => onSelectProfile(e.target.value)}
              >
                {profiles.length === 0 && <option value="">—</option>}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={onNewProfile}>
                {t("common.new")}
              </button>
              <button
                className="btn primary"
                onClick={onEditProfile}
                disabled={!activeProfile}
              >
                {t("common.edit")}
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">
            <img
              className="empty-cable"
              src="/controllers/usb-c.png"
              alt=""
              draggable={false}
            />
            <div>{t("home.noController")}</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              {t("home.connectHint")}
            </div>
          </div>
        )}
      </div>

      <div className="statusbar">
        <span className="msg">
          {status.running
            ? `${t("home.active")} · ${status.message}`
            : controller
            ? t("home.ready")
            : status.message || t("home.waiting")}
        </span>
        <button
          className={`btn lg ${status.running ? "danger" : "primary"}`}
          onClick={onToggleEngine}
          disabled={!controller && !status.running}
        >
          {status.running ? t("home.stop") : t("home.start")}
        </button>
      </div>
    </div>
  );
}

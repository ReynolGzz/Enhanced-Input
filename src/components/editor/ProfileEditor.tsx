import { useEffect, useState } from "react";
import type { Profile, LivePreview } from "../../lib/types";
import { api } from "../../lib/api";
import { ButtonsSection, DpadSection } from "./ButtonsSection";
import { TriggersSection } from "./TriggersSection";
import { JoysticksSection } from "./JoysticksSection";

type Section = "buttons" | "dpad" | "triggers" | "sticks";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "buttons", label: "Botones", icon: "A" },
  { id: "dpad", label: "Cruceta", icon: "✛" },
  { id: "triggers", label: "Gatillos", icon: "LT" },
  { id: "sticks", label: "Joysticks", icon: "◉" },
];

export function ProfileEditor({
  profile,
  onChange,
  onSave,
  onBack,
  dirty,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  onSave: () => void;
  onBack: () => void;
  dirty: boolean;
}) {
  const [section, setSection] = useState<Section>("buttons");
  const [live, setLive] = useState<LivePreview | null>(null);

  // Poll the live preview so the stick visualizer moves in real time.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const l = await api.livePreview();
        if (alive) setLive(l);
      } catch {
        /* engine may be stopped */
      }
    };
    const handle = setInterval(tick, 50);
    return () => {
      alive = false;
      clearInterval(handle);
    };
  }, []);

  return (
    <div className="editor">
      <aside className="editor-sidebar">
        <div className="profile-head">
          <div className="kicker">Ajustes del mando para</div>
          <div className="pname">
            <span
              className="color-chip"
              style={{ background: profile.color, width: 16, height: 16 }}
            />
            {profile.name}
          </div>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${section === n.id ? "active" : ""}`}
            onClick={() => setSection(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="spacer" />
      </aside>

      <main className="editor-main">
        {section === "buttons" && (
          <ButtonsSection profile={profile} onChange={onChange} />
        )}
        {section === "dpad" && (
          <DpadSection profile={profile} onChange={onChange} />
        )}
        {section === "triggers" && (
          <TriggersSection profile={profile} onChange={onChange} />
        )}
        {section === "sticks" && (
          <JoysticksSection profile={profile} onChange={onChange} live={live} />
        )}
      </main>

      <div className="statusbar" style={{ gridArea: "actionbar" }}>
        <button className="btn ghost" onClick={onBack}>
          ← Volver
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {dirty && <span className="msg">Cambios sin guardar</span>}
          <button className="btn primary" onClick={onSave} disabled={!dirty}>
            Guardar perfil
          </button>
        </div>
      </div>
    </div>
  );
}

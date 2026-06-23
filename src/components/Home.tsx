import type { ControllerInfo, ProfileSummary, EngineStatus } from "../lib/types";

export function Home({
  controllers,
  profiles,
  activeProfileId,
  status,
  onSelectProfile,
  onNewProfile,
  onEditProfile,
  onToggleEngine,
}: {
  controllers: ControllerInfo[];
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  status: EngineStatus;
  onSelectProfile: (id: string) => void;
  onNewProfile: () => void;
  onEditProfile: () => void;
  onToggleEngine: () => void;
}) {
  const controller = controllers[0] ?? null;
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  return (
    <div className="home">
      <div className="home-top">
        <div className="home-title">
          <span className="logo">EI</span>
          <h1>Enhanced Input</h1>
        </div>

        <div className="controllers-head">
          <span>Mando</span>
          <span style={{ textAlign: "right" }}>Perfil seleccionado</span>
        </div>

        {controller ? (
          <div className="controller-row">
            <div className="controller-id">
              <span className="controller-glyph">🎮</span>
              <div>
                <div className="controller-name">{controller.name}</div>
                <div className="controller-sub">
                  <span
                    className={`dot ${status.connected ? "ok" : "off"}`}
                  />
                  {controller.kind} · USB
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
                Nuevo
              </button>
              <button
                className="btn primary"
                onClick={onEditProfile}
                disabled={!activeProfile}
              >
                Editar
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">
            <div className="big">🔌</div>
            <div>No se detecta ningún mando.</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              Conecta tu DualShock 4 por cable USB y vuelve a intentarlo.
            </div>
          </div>
        )}
      </div>

      <div className="statusbar">
        <span className="msg">
          {status.running
            ? `▶ Activo · ${status.message}`
            : controller
            ? "Listo. Pulsa Iniciar para transformar la señal."
            : status.message || "Esperando un mando…"}
        </span>
        <button
          className={`btn lg ${status.running ? "danger" : "primary"}`}
          onClick={onToggleEngine}
          disabled={!controller && !status.running}
        >
          {status.running ? "Detener" : "Iniciar"}
        </button>
      </div>
    </div>
  );
}

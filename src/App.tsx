import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import type {
  ControllerInfo,
  EngineStatus,
  Profile,
  ProfileSummary,
} from "./lib/types";
import { Home } from "./components/Home";
import { ProfilesModal } from "./components/ProfilesModal";
import { SettingsModal } from "./components/SettingsModal";
import { ProfileEditor } from "./components/editor/ProfileEditor";
import { checkForUpdate, type UpdateInfo } from "./lib/updater";
import { initMinimizeToTray } from "./lib/windowTray";

type Screen = "home" | "editor";

const EMPTY_STATUS: EngineStatus = {
  running: false,
  connected: false,
  message: "",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [controllers, setControllers] = useState<ControllerInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<EngineStatus>(EMPTY_STATUS);

  const [editing, setEditing] = useState<Profile | null>(null);
  const [dirty, setDirty] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [showProfiles, setShowProfiles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updating, setUpdating] = useState(false);

  const refreshProfiles = useCallback(async () => {
    try {
      setProfiles(await api.listProfiles());
    } catch {
      /* not running under Tauri */
    }
  }, []);

  // Initial load.
  useEffect(() => {
    (async () => {
      try {
        const [ctrls, profs, settings, st] = await Promise.all([
          api.listControllers(),
          api.listProfiles(),
          api.getSettings(),
          api.engineStatus(),
        ]);
        setControllers(ctrls);
        setProfiles(profs);
        setStatus(st);
        let active = settings.activeProfileId;
        if (!active && profs.length > 0) {
          active = profs[0].id;
          await api.setActiveProfile(active);
        }
        setActiveProfileId(active);
      } catch {
        /* not running under Tauri (browser preview) */
      }
    })();
  }, []);

  // Poll controllers + engine status.
  useEffect(() => {
    const handle = setInterval(async () => {
      try {
        const [ctrls, st] = await Promise.all([
          api.listControllers(),
          api.engineStatus(),
        ]);
        setControllers(ctrls);
        setStatus(st);
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => clearInterval(handle);
  }, []);

  // Check for an update once on launch (no-op outside a configured Tauri build).
  useEffect(() => {
    checkForUpdate().then(setUpdate);
  }, []);

  // Wire up "hide on minimize" (minimize-to-tray). No-op in browser preview.
  useEffect(() => {
    initMinimizeToTray();
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!update) return;
    setUpdating(true);
    try {
      await update.install();
    } catch {
      setUpdating(false);
    }
  }, [update]);

  const handleSelectProfile = useCallback(async (id: string) => {
    setActiveProfileId(id);
    try {
      await api.setActiveProfile(id);
    } catch {
      /* ignore */
    }
  }, []);

  const handleProfilesChanged = useCallback(
    async (selectId?: string) => {
      let list: ProfileSummary[] = [];
      try {
        list = await api.listProfiles();
      } catch {
        return;
      }
      setProfiles(list);
      if (selectId) {
        setActiveProfileId(selectId);
        await api.setActiveProfile(selectId);
      } else if (!list.find((p) => p.id === activeProfileId) && list[0]) {
        // The active profile was deleted; fall back to the first one.
        setActiveProfileId(list[0].id);
        await api.setActiveProfile(list[0].id);
      }
    },
    [activeProfileId]
  );

  const handleEdit = useCallback(async () => {
    if (!activeProfileId) return;
    try {
      const full = await api.loadProfile(activeProfileId);
      setEditing(full);
      setDirty(false);
      setScreen("editor");
    } catch {
      /* ignore */
    }
  }, [activeProfileId]);

  const handleCreate = useCallback(async () => {
    try {
      const created = await api.createProfile(newName);
      await refreshProfiles();
      setActiveProfileId(created.id);
      await api.setActiveProfile(created.id);
      setEditing(created);
      setDirty(false);
      setScreen("editor");
    } catch {
      /* ignore */
    } finally {
      setShowNew(false);
      setNewName("");
    }
  }, [newName, refreshProfiles]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    try {
      await api.saveProfile(editing);
      setDirty(false);
      await refreshProfiles();
    } catch {
      /* ignore */
    }
  }, [editing, refreshProfiles]);

  const handleToggleEngine = useCallback(async () => {
    try {
      if (status.running) {
        setStatus(await api.stopEngine());
      } else {
        const path = controllers[0]?.path;
        setStatus(await api.startEngine(path));
      }
    } catch (e) {
      setStatus({ ...EMPTY_STATUS, message: String(e) });
    }
  }, [status.running, controllers]);

  const updateBanner = update && (
    <div className="update-banner">
      <span>✨ Actualización disponible (v{update.version}).</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn ghost sm" onClick={() => setUpdate(null)} disabled={updating}>
          Después
        </button>
        <button className="btn primary sm" onClick={handleInstallUpdate} disabled={updating}>
          {updating ? "Instalando…" : "Instalar y reiniciar"}
        </button>
      </div>
    </div>
  );

  if (screen === "editor" && editing) {
    return (
      <div className="app">
        {updateBanner}
        <ProfileEditor
          profile={editing}
          dirty={dirty}
          onChange={(p) => {
            setEditing(p);
            setDirty(true);
          }}
          onSave={handleSave}
          onBack={() => setScreen("home")}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {updateBanner}
      <Home
        controllers={controllers}
        profiles={profiles}
        activeProfileId={activeProfileId}
        status={status}
        onSelectProfile={handleSelectProfile}
        onNewProfile={() => setShowNew(true)}
        onManageProfiles={() => setShowProfiles(true)}
        onEditProfile={handleEdit}
        onToggleEngine={handleToggleEngine}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showProfiles && (
        <ProfilesModal
          profiles={profiles}
          activeId={activeProfileId}
          onClose={() => setShowProfiles(false)}
          onChanged={handleProfilesChanged}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo perfil</h3>
            <div className="field-row">
              <label>Nombre</label>
              <input
                className="input"
                autoFocus
                value={newName}
                placeholder="p. ej. Rocket League"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="row-actions">
              <button className="btn ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button className="btn primary" onClick={handleCreate}>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

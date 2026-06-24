import { useState } from "react";
import type { ProfileSummary } from "../lib/types";
import { api } from "../lib/api";
import { t } from "../lib/i18n";

/// Manage profiles: create, rename, duplicate, delete, and share via codes.
export function ProfilesModal({
  profiles,
  activeId,
  onClose,
  onChanged,
}: {
  profiles: ProfileSummary[];
  activeId: string | null;
  onClose: () => void;
  // Refresh the list; pass an id to also select it.
  onChanged: (selectId?: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importName, setImportName] = useState("");
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    }
  };

  const duplicate = (id: string) =>
    run(async () => onChanged((await api.duplicateProfile(id)).id));
  const remove = (id: string) =>
    run(async () => {
      await api.deleteProfile(id);
      onChanged();
    });
  const commitRename = () =>
    run(async () => {
      if (renamingId) await api.renameProfile(renamingId, renameText);
      setRenamingId(null);
      onChanged();
    });
  const doExport = (id: string) =>
    run(async () => setExportCode(await api.exportProfileCode(id)));
  const doImport = () =>
    run(async () => {
      const p = await api.importProfileCode(importCode.trim(), importName);
      setImportCode("");
      setImportName("");
      onChanged(p.id);
    });
  const create = () =>
    run(async () => {
      const p = await api.createProfile("");
      onChanged(p.id);
    });
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal profiles-modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>{t("profiles.title")}</h3>
          <button className="btn primary sm" onClick={create}>
            {t("profiles.newProfile")}
          </button>
        </div>

        <div className="profiles-list">
          {profiles.map((p) => (
            <div key={p.id} className="profiles-item">
              <span className="color-chip" style={{ background: p.color }} />
              {renamingId === p.id ? (
                <input
                  className="input"
                  autoFocus
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commitRename()}
                  onBlur={commitRename}
                />
              ) : (
                <span className="profiles-name">
                  {p.name}
                  {p.id === activeId && <span className="badge">{t("profiles.activeBadge")}</span>}
                </span>
              )}
              <div className="profiles-actions">
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setRenamingId(p.id);
                    setRenameText(p.name);
                  }}
                >
                  {t("profiles.rename")}
                </button>
                <button className="btn ghost sm" onClick={() => duplicate(p.id)}>
                  {t("profiles.duplicate")}
                </button>
                <button className="btn ghost sm" onClick={() => doExport(p.id)}>
                  {t("profiles.export")}
                </button>
                <button
                  className="btn danger sm"
                  disabled={profiles.length <= 1}
                  onClick={() => remove(p.id)}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {exportCode && (
          <div className="share-box">
            <div className="lbl">{t("profiles.shareCode")}</div>
            <div className="share-row">
              <input className="input" readOnly value={exportCode} />
              <button className="btn" onClick={() => copy(exportCode)}>
                {t("common.copy")}
              </button>
              <button className="btn ghost" onClick={() => setExportCode(null)}>
                {t("common.close")}
              </button>
            </div>
          </div>
        )}

        <div className="share-box">
          <div className="lbl">{t("profiles.importTitle")}</div>
          <div className="share-row">
            <input
              className="input"
              placeholder={t("profiles.importPlaceholder")}
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
            />
            <input
              className="input"
              style={{ maxWidth: 160 }}
              placeholder={t("profiles.nameOptional")}
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
            />
            <button className="btn primary" disabled={!importCode.trim()} onClick={doImport}>
              {t("profiles.import")}
            </button>
          </div>
        </div>

        {error && <div className="share-error">{error}</div>}

        <div className="row-actions">
          <button className="btn ghost" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

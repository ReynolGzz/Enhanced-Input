import { useState } from "react";
import type { OutputTarget } from "../../lib/types";
import {
  GAMEPAD_TARGETS,
  KEY_TARGETS,
  MOUSE_TARGETS,
  KEYBOARD_ROWS,
  NUMPAD_ROWS,
  type KeyCell,
} from "../../lib/inputs";

type Tab = "control" | "keyboard" | "numpad" | "mouse";

const TABS: { id: Tab; label: string }[] = [
  { id: "control", label: "Control" },
  { id: "keyboard", label: "Teclado" },
  { id: "numpad", label: "Teclado numérico" },
  { id: "mouse", label: "Ratón" },
];

const gpLabel = new Map(GAMEPAD_TARGETS.map((t) => [t.value, t.label]));
const keyLabel = new Map(KEY_TARGETS.map((t) => [t.value, t.label]));
const mouseLabel = new Map(MOUSE_TARGETS.map((t) => [t.value, t.label]));

/// Human label for a binding (shown on the field button).
export function targetLabel(o: OutputTarget): string {
  switch (o.kind) {
    case "passthrough":
      return "Por defecto";
    case "none":
      return "Desactivado";
    case "gamepad":
      return gpLabel.get(o.button) ?? o.button;
    case "key":
      return `⌨ ${keyLabel.get(o.code) ?? o.code.toUpperCase()}`;
    case "mouse":
      return `🖱 ${mouseLabel.get(o.button) ?? o.button}`;
  }
}

function Grid({
  items,
  onPick,
}: {
  items: { value: string; label: string }[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="bind-grid">
      {items.map((t) => (
        <button key={t.value} className="bind-key" onClick={() => onPick(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function KeyLayout({
  rows,
  onPick,
}: {
  rows: KeyCell[][];
  onPick: (v: string) => void;
}) {
  return (
    <div className="bind-keyboard">
      {rows.map((row, i) => (
        <div key={i} className="bind-krow">
          {row.map((k) => (
            <button
              key={k.value}
              className="bind-key"
              style={{ flexGrow: k.w ?? 1, minWidth: 34 }}
              onClick={() => onPick(k.value)}
            >
              {k.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function BindPicker({
  onPick,
  onClose,
}: {
  onPick: (o: OutputTarget) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("control");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bind-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bind-head">
          <div className="bind-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`bind-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button className="bind-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="bind-quick">
          <button className="chip" onClick={() => onPick({ kind: "passthrough" })}>
            Por defecto
          </button>
          <button className="chip" onClick={() => onPick({ kind: "none" })}>
            Desactivado
          </button>
        </div>

        <div className="bind-body">
          {tab === "control" && (
            <Grid items={GAMEPAD_TARGETS} onPick={(v) => onPick({ kind: "gamepad", button: v })} />
          )}
          {tab === "keyboard" && (
            <KeyLayout rows={KEYBOARD_ROWS} onPick={(v) => onPick({ kind: "key", code: v })} />
          )}
          {tab === "numpad" && (
            <KeyLayout rows={NUMPAD_ROWS} onPick={(v) => onPick({ kind: "key", code: v })} />
          )}
          {tab === "mouse" && (
            <Grid items={MOUSE_TARGETS} onPick={(v) => onPick({ kind: "mouse", button: v })} />
          )}
        </div>
      </div>
    </div>
  );
}

/// A field that shows the current binding and opens the tabbed picker.
export function BindButton({
  output,
  onChange,
}: {
  output: OutputTarget;
  onChange: (o: OutputTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="bind-btn" onClick={() => setOpen(true)}>
        {targetLabel(output)}
      </button>
      {open && (
        <BindPicker
          onPick={(o) => {
            onChange(o);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

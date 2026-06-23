import { useState } from "react";
import type { OutputTarget, MacroAction, MacroStep, MacroTrigger } from "../../lib/types";
import {
  GAMEPAD_TARGETS,
  KEY_TARGETS,
  MOUSE_TARGETS,
  KEYBOARD_ROWS,
  NUMPAD_ROWS,
  type KeyCell,
} from "../../lib/inputs";
import { Select, NumberSlider } from "../ui";

type Tab = "control" | "keyboard" | "numpad" | "mouse" | "macro";

const TABS: { id: Tab; label: string }[] = [
  { id: "control", label: "Control" },
  { id: "keyboard", label: "Teclado" },
  { id: "numpad", label: "Teclado numérico" },
  { id: "mouse", label: "Ratón" },
  { id: "macro", label: "Macro" },
];

const gpLabel = new Map(GAMEPAD_TARGETS.map((t) => [t.value, t.label]));
const keyLabel = new Map(KEY_TARGETS.map((t) => [t.value, t.label]));
const mouseLabel = new Map(MOUSE_TARGETS.map((t) => [t.value, t.label]));

function actionLabel(a: MacroAction): string {
  if (a.kind === "gamepad") return gpLabel.get(a.button) ?? a.button;
  if (a.kind === "key") return `⌨ ${keyLabel.get(a.code) ?? a.code.toUpperCase()}`;
  return `🖱 ${mouseLabel.get(a.button) ?? a.button}`;
}

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
    case "macro":
      return `🧩 Macro (${o.steps.length})`;
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

/// Action picker shared by the simple tabs and the macro step builder.
function ActionPicker({
  tab,
  onGamepad,
  onKey,
  onMouse,
}: {
  tab: Tab;
  onGamepad: (v: string) => void;
  onKey: (v: string) => void;
  onMouse: (v: string) => void;
}) {
  if (tab === "control") return <Grid items={GAMEPAD_TARGETS} onPick={onGamepad} />;
  if (tab === "keyboard") return <KeyLayout rows={KEYBOARD_ROWS} onPick={onKey} />;
  if (tab === "numpad") return <KeyLayout rows={NUMPAD_ROWS} onPick={onKey} />;
  return <Grid items={MOUSE_TARGETS} onPick={onMouse} />;
}

const TRIGGER_OPTIONS = [
  { value: "once", label: "Una vez por pulsación" },
  { value: "whileHeld", label: "Repetir mientras se mantiene" },
  { value: "toggle", label: "Alternar (toggle)" },
];

function MacroTab({
  current,
  onApply,
}: {
  current: OutputTarget;
  onApply: (o: OutputTarget) => void;
}) {
  const init = current.kind === "macro" ? current : null;
  const [steps, setSteps] = useState<MacroStep[]>(init?.steps ?? []);
  const [trigger, setTrigger] = useState<MacroTrigger>(init?.trigger ?? "once");
  const [actionTab, setActionTab] = useState<Tab>("control");

  const addStep = (action: MacroAction) =>
    setSteps((s) => [...s, { action, holdMs: 50, gapMs: 50 }]);
  const updateStep = (i: number, patch: Partial<MacroStep>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));

  return (
    <div className="macro-tab">
      <div className="macro-controls">
        <span className="lbl">Método de disparo</span>
        <Select
          value={trigger}
          options={TRIGGER_OPTIONS}
          onChange={(v) => setTrigger(v as MacroTrigger)}
        />
        <button
          className="btn primary"
          onClick={() => onApply({ kind: "macro", steps, trigger })}
        >
          Aplicar macro
        </button>
      </div>

      <div className="macro-steps">
        {steps.length === 0 && (
          <div className="macro-empty">Elige acciones abajo para añadir pasos.</div>
        )}
        {steps.map((st, i) => (
          <div key={i} className="macro-step">
            <span className="macro-num">{i + 1}</span>
            <span className="macro-action">{actionLabel(st.action)}</span>
            <span className="lbl">Hold</span>
            <NumberSlider
              value={st.holdMs}
              min={0}
              max={5000}
              step={1}
              suffix="ms"
              onChange={(v) => updateStep(i, { holdMs: v })}
            />
            <span className="lbl">Gap</span>
            <NumberSlider
              value={st.gapMs}
              min={0}
              max={5000}
              step={1}
              suffix="ms"
              onChange={(v) => updateStep(i, { gapMs: v })}
            />
            <button className="bind-close" onClick={() => removeStep(i)} title="Quitar">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="macro-picker">
        <div className="bind-tabs">
          {(["control", "keyboard", "numpad", "mouse"] as Tab[]).map((id) => (
            <button
              key={id}
              className={`bind-tab ${actionTab === id ? "active" : ""}`}
              onClick={() => setActionTab(id)}
            >
              {TABS.find((t) => t.id === id)?.label}
            </button>
          ))}
        </div>
        <div className="bind-body" style={{ maxHeight: "30vh" }}>
          <ActionPicker
            tab={actionTab}
            onGamepad={(v) => addStep({ kind: "gamepad", button: v })}
            onKey={(v) => addStep({ kind: "key", code: v })}
            onMouse={(v) => addStep({ kind: "mouse", button: v })}
          />
        </div>
      </div>
    </div>
  );
}

function BindPicker({
  current,
  onPick,
  onClose,
}: {
  current: OutputTarget;
  onPick: (o: OutputTarget) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(current.kind === "macro" ? "macro" : "control");
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

        {tab !== "macro" && (
          <div className="bind-quick">
            <button className="chip" onClick={() => onPick({ kind: "passthrough" })}>
              Por defecto
            </button>
            <button className="chip" onClick={() => onPick({ kind: "none" })}>
              Desactivado
            </button>
          </div>
        )}

        {tab === "macro" ? (
          <MacroTab current={current} onApply={onPick} />
        ) : (
          <div className="bind-body">
            <ActionPicker
              tab={tab}
              onGamepad={(v) => onPick({ kind: "gamepad", button: v })}
              onKey={(v) => onPick({ kind: "key", code: v })}
              onMouse={(v) => onPick({ kind: "mouse", button: v })}
            />
          </div>
        )}
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
          current={output}
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

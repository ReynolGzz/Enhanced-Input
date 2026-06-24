import { useRef, useState } from "react";
import type { OutputTarget, MacroAction, MacroStep, MacroTrigger } from "../../lib/types";
import { api } from "../../lib/api";
import {
  GAMEPAD_TARGETS,
  KEY_TARGETS,
  MOUSE_TARGETS,
  KEYBOARD_ROWS,
  NUMPAD_ROWS,
  type KeyCell,
} from "../../lib/inputs";
import { Select, NumberSlider } from "../ui";

type Tab = "mouse" | "keyboard" | "numpad" | "control" | "macro";

const TABS: { id: Tab; label: string }[] = [
  { id: "mouse", label: "Ratón" },
  { id: "keyboard", label: "Teclado" },
  { id: "numpad", label: "Teclado numérico" },
  { id: "control", label: "Control" },
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

function headPrefix(tab: Tab): string {
  switch (tab) {
    case "mouse":
      return "Asignar botón del ratón para";
    case "keyboard":
    case "numpad":
      return "Asignar botón del teclado para";
    case "control":
      return "Asignar botón del control para";
    case "macro":
      return "Configurar macro para";
  }
}

function MouseIcon() {
  return (
    <svg viewBox="0 0 16 22" width="13" height="17" fill="none">
      <rect x="1.5" y="1.5" width="13" height="19" rx="6.5" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="2" x2="8" y2="9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function MouseArt() {
  return (
    <svg width="128" height="196" viewBox="0 0 150 230" fill="none">
      <rect x="6" y="6" width="138" height="218" rx="68" fill="var(--bg-elev-2)" stroke="var(--border)" strokeWidth="2.5" />
      <line x1="75" y1="10" x2="75" y2="96" stroke="var(--border)" strokeWidth="2" />
      <line x1="6" y1="96" x2="144" y2="96" stroke="var(--border)" strokeWidth="2" />
      <rect x="66" y="34" width="18" height="44" rx="9" fill="var(--accent)" />
    </svg>
  );
}

function MouseTab({ onPick }: { onPick: (o: OutputTarget) => void }) {
  const opt = (val: string, label: string) => (
    <button className="bind-opt" onClick={() => onPick({ kind: "mouse", button: val })}>
      <span className="bind-opt-ic"><MouseIcon /></span>
      {label}
    </button>
  );
  return (
    <div className="mouse-tab">
      <div className="bind-col">
        {opt("left", "Botón izquierdo del ratón")}
        {opt("middle", "Botón central del ratón")}
        {opt("right", "Botón derecho del ratón")}
        {opt("x1", "Botón 4 del ratón")}
        {opt("x2", "Botón 5 del ratón")}
      </div>
      <div className="mouse-art">
        <MouseArt />
      </div>
      <div className="bind-col">
        {opt("wheelup", "Desplazarse hacia arriba")}
        {opt("wheeldown", "Desplazarse hacia abajo")}
      </div>
    </div>
  );
}

function KeyLayout({ rows, onPick }: { rows: KeyCell[][]; onPick: (v: string) => void }) {
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

function ControlTab({ onPick }: { onPick: (o: OutputTarget) => void }) {
  return (
    <div className="ctl-grid">
      {GAMEPAD_TARGETS.map((t) => (
        <button
          key={t.value}
          className="bind-ctl"
          onClick={() => onPick({ kind: "gamepad", button: t.value })}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
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

/// Action picker used inside the macro step builder.
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

  // --- Recording: poll the live input and turn presses into timed steps. ---
  const [recording, setRecording] = useState(false);
  const rec = useRef<{
    handle: number;
    events: { id: string; t: number; down: boolean }[];
    t0: number;
  } | null>(null);

  const startRec = () => {
    const t0 = performance.now();
    const prev = new Set<string>();
    const events: { id: string; t: number; down: boolean }[] = [];
    const handle = window.setInterval(async () => {
      try {
        const lp = await api.livePreview();
        const cur = new Set(lp.pressed || []);
        cur.forEach((id) => {
          if (!prev.has(id)) events.push({ id, t: performance.now() - t0, down: true });
        });
        prev.forEach((id) => {
          if (!cur.has(id)) events.push({ id, t: performance.now() - t0, down: false });
        });
        prev.clear();
        cur.forEach((id) => prev.add(id));
      } catch {
        /* engine not running */
      }
    }, 16);
    rec.current = { handle, events, t0 };
    setRecording(true);
  };

  const stopRec = () => {
    if (rec.current) {
      clearInterval(rec.current.handle);
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const out: MacroStep[] = [];
      const open: { id: string; t: number }[] = [];
      let lastUp = 0;
      for (const e of rec.current.events) {
        if (e.down) {
          open.push({ id: e.id, t: e.t });
        } else {
          const d = open.find((x) => x.id === e.id);
          if (d) {
            const gap = out.length === 0 ? 0 : Math.max(0, d.t - lastUp);
            out.push({
              action: { kind: "gamepad", button: d.id },
              holdMs: r2(e.t - d.t),
              gapMs: r2(gap),
            });
            lastUp = e.t;
            open.splice(open.indexOf(d), 1);
          }
        }
      }
      if (out.length) setSteps(out);
      rec.current = null;
    }
    setRecording(false);
  };

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
          className={`btn ${recording ? "danger" : ""}`}
          onClick={recording ? stopRec : startRec}
        >
          {recording ? "■ Detener" : "● Grabar"}
        </button>
        <button className="btn ghost" onClick={() => setSteps([])}>
          Borrar todo
        </button>
        <button
          className="btn primary"
          onClick={() => onApply({ kind: "macro", steps, trigger })}
        >
          Aplicar macro
        </button>
      </div>
      {recording && (
        <div className="macro-empty">
          Grabando… pulsa botones en tu control (requiere el motor en “Iniciar”).
        </div>
      )}

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
  target,
  onPick,
  onClose,
}: {
  current: OutputTarget;
  target?: string;
  onPick: (o: OutputTarget) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(current.kind === "macro" ? "macro" : "mouse");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bind-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bind-bar">
          <span className="bind-bumper">LB</span>
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
          <span className="bind-bumper">RB</span>
          <button className="bind-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        {tab !== "macro" && (
          <div className="bind-headline">
            {headPrefix(tab)}
            {target && <span className="bind-target">{target}</span>}
          </div>
        )}

        <div className="bind-body">
          {tab === "mouse" && <MouseTab onPick={onPick} />}
          {tab === "keyboard" && (
            <KeyLayout rows={KEYBOARD_ROWS} onPick={(v) => onPick({ kind: "key", code: v })} />
          )}
          {tab === "numpad" && (
            <KeyLayout rows={NUMPAD_ROWS} onPick={(v) => onPick({ kind: "key", code: v })} />
          )}
          {tab === "control" && <ControlTab onPick={onPick} />}
          {tab === "macro" && <MacroTab current={current} onApply={onPick} />}
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
      </div>
    </div>
  );
}

/// A field that shows the current binding and opens the tabbed picker.
/// `target` is the short label of what's being assigned (shown in the header).
export function BindButton({
  output,
  onChange,
  target,
}: {
  output: OutputTarget;
  onChange: (o: OutputTarget) => void;
  target?: string;
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
          target={target}
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

import { useState } from "react";
import type { ButtonMapping, OutputTarget } from "../../lib/types";
import type { ButtonDef } from "../../lib/inputs";
import { GAMEPAD_TARGETS, KEY_TARGETS } from "../../lib/inputs";
import { Slider, Toggle, AdvField } from "../ui";

function encode(o: OutputTarget): string {
  switch (o.kind) {
    case "passthrough":
      return "passthrough";
    case "none":
      return "none";
    case "gamepad":
      return `gp:${o.button}`;
    case "key":
      return `key:${o.code}`;
  }
}

function decode(v: string): OutputTarget {
  if (v === "passthrough") return { kind: "passthrough" };
  if (v === "none") return { kind: "none" };
  if (v.startsWith("gp:")) return { kind: "gamepad", button: v.slice(3) };
  if (v.startsWith("key:")) return { kind: "key", code: v.slice(4) };
  return { kind: "passthrough" };
}

export function BindSelect({
  output,
  onChange,
}: {
  output: OutputTarget;
  onChange: (o: OutputTarget) => void;
}) {
  return (
    <select
      className="bind-target"
      value={encode(output)}
      onChange={(e) => onChange(decode(e.target.value))}
    >
      <option value="passthrough">Por defecto</option>
      <option value="none">Desactivado</option>
      <optgroup label="Botón del mando">
        {GAMEPAD_TARGETS.map((t) => (
          <option key={t.value} value={`gp:${t.value}`}>
            {t.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Tecla del teclado">
        {KEY_TARGETS.map((t) => (
          <option key={t.value} value={`key:${t.value}`}>
            {t.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

function pillClass(def: ButtonDef): string {
  if (def.group === "face") return `pill face-${def.id}`;
  return "pill";
}

export function ButtonRow({
  def,
  mapping,
  onChange,
}: {
  def: ButtonDef;
  mapping: ButtonMapping;
  onChange: (m: ButtonMapping) => void;
}) {
  const [showAdv, setShowAdv] = useState(false);

  return (
    <>
      <div className="row">
        <div className="row-label">
          <span className={pillClass(def)}>{def.glyph}</span>
          <span>{def.label}</span>
        </div>
        <div className="row-control">
          <BindSelect
            output={mapping.output}
            onChange={(o) => onChange({ ...mapping, output: o })}
          />
          <button
            className={`gear ${showAdv ? "active" : ""}`}
            onClick={() => setShowAdv((s) => !s)}
            title="Opciones avanzadas"
          >
            ⚙
          </button>
        </div>
      </div>
      {showAdv && (
        <div className="advanced">
          <div className="adv-grid">
            <AdvField label="Turbo (mantener para repetir)">
              <Toggle
                on={mapping.turbo}
                onChange={(v) => onChange({ ...mapping, turbo: v })}
              />
            </AdvField>
            {mapping.turbo && (
              <AdvField label="Velocidad de turbo">
                <Slider
                  value={mapping.turboRateHz}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(v) => onChange({ ...mapping, turboRateHz: v })}
                  format={(v) => `${Math.round(v)}/s`}
                />
              </AdvField>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from "react";
import type { ButtonMapping } from "../../lib/types";
import type { ButtonDef } from "../../lib/inputs";
import { NumberSlider, Toggle, AdvField } from "../ui";
import { BindButton } from "./BindPicker";

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
          <BindButton
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
              <>
                <AdvField label="Velocidad de turbo">
                  <NumberSlider
                    value={mapping.turboRateHz}
                    min={1}
                    max={100}
                    step={1}
                    suffix="/s"
                    onChange={(v) => onChange({ ...mapping, turboRateHz: v })}
                  />
                </AdvField>
                <AdvField label="Disable regular pressing (turbo desde el primer toque)">
                  <Toggle
                    on={mapping.disableRegularPress}
                    onChange={(v) =>
                      onChange({ ...mapping, disableRegularPress: v })
                    }
                  />
                </AdvField>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

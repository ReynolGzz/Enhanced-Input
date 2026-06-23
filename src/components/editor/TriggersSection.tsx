import type { Profile, TriggerConfig, ResponseCurve } from "../../lib/types";
import { CURVE_EXPONENT_MIN, CURVE_EXPONENT_MAX } from "../../lib/types";
import { CURVE_OPTIONS } from "../../lib/inputs";
import { Select, NumberSlider, AdvField } from "../ui";
import { BindButton } from "./BindPicker";

function TriggerCard({
  label,
  glyph,
  cfg,
  onChange,
}: {
  label: string;
  glyph: string;
  cfg: TriggerConfig;
  onChange: (c: TriggerConfig) => void;
}) {
  return (
    <div className="stick-card" style={{ display: "block" }}>
      <div className="row-label" style={{ marginBottom: 16 }}>
        <span className="pill">{glyph}</span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
      </div>

      <div className="adv-grid">
        <AdvField label="Umbral de pulsación (digital)">
          <NumberSlider
            value={cfg.threshold * 100}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, threshold: v / 100 })}
          />
        </AdvField>
        <AdvField label="Inicio de recorrido (zona muerta)">
          <NumberSlider
            value={cfg.deadzoneStart * 100}
            min={0}
            max={90}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, deadzoneStart: v / 100 })}
          />
        </AdvField>
        <AdvField label="Fin de recorrido">
          <NumberSlider
            value={cfg.deadzoneEnd * 100}
            min={10}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, deadzoneEnd: v / 100 })}
          />
        </AdvField>
        <AdvField label="Curva de respuesta">
          <Select
            value={cfg.curve}
            options={CURVE_OPTIONS}
            onChange={(v) => onChange({ ...cfg, curve: v as ResponseCurve })}
          />
        </AdvField>
        {cfg.curve === "custom" && (
          <AdvField label="Exponente de la curva">
            <NumberSlider
              value={cfg.curveExponent}
              min={CURVE_EXPONENT_MIN}
              max={CURVE_EXPONENT_MAX}
              step={0.01}
              onChange={(v) => onChange({ ...cfg, curveExponent: v })}
            />
          </AdvField>
        )}
        <AdvField label="Reasignar pulsación a">
          <BindButton
            output={cfg.output}
            onChange={(o) => onChange({ ...cfg, output: o })}
          />
        </AdvField>
      </div>
    </div>
  );
}

export function TriggersSection({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  return (
    <div>
      <h2 className="section-title">Gatillos</h2>
      <p className="section-desc">
        Ajusta el recorrido analógico, el umbral de pulsación y, si quieres,
        reasigna el gatillo a un botón o tecla.
      </p>
      <TriggerCard
        label="Gatillo izquierdo (LT)"
        glyph="LT"
        cfg={profile.leftTrigger}
        onChange={(c) => onChange({ ...profile, leftTrigger: c })}
      />
      <TriggerCard
        label="Gatillo derecho (RT)"
        glyph="RT"
        cfg={profile.rightTrigger}
        onChange={(c) => onChange({ ...profile, rightTrigger: c })}
      />
    </div>
  );
}

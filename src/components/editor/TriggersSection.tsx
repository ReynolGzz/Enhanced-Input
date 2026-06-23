import type { Profile, TriggerConfig, ResponseCurve } from "../../lib/types";
import { CURVE_OPTIONS } from "../../lib/inputs";
import { Select, Slider, AdvField, pct } from "../ui";
import { BindSelect } from "./ButtonRow";

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
          <Slider
            value={cfg.threshold}
            min={0}
            max={1}
            onChange={(v) => onChange({ ...cfg, threshold: v })}
            format={pct}
          />
        </AdvField>
        <AdvField label="Inicio de recorrido (zona muerta)">
          <Slider
            value={cfg.deadzoneStart}
            min={0}
            max={0.9}
            onChange={(v) => onChange({ ...cfg, deadzoneStart: v })}
            format={pct}
          />
        </AdvField>
        <AdvField label="Fin de recorrido">
          <Slider
            value={cfg.deadzoneEnd}
            min={0.1}
            max={1}
            onChange={(v) => onChange({ ...cfg, deadzoneEnd: v })}
            format={pct}
          />
        </AdvField>
        <AdvField label="Curva de respuesta">
          <Select
            value={cfg.curve}
            options={CURVE_OPTIONS}
            onChange={(v) => onChange({ ...cfg, curve: v as ResponseCurve })}
          />
        </AdvField>
        <AdvField label="Reasignar pulsación a">
          <BindSelect
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

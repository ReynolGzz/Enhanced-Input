import type {
  Profile,
  StickConfig,
  DeadzoneType,
  ResponseCurve,
  LivePreview,
} from "../../lib/types";
import { DEADZONE_OPTIONS, CURVE_OPTIONS } from "../../lib/inputs";
import { Select, Slider, Toggle, AdvField, pct } from "../ui";

const R = 85; // visualizer radius in px (container is 180px)

function StickViz({
  inX,
  inY,
  outX,
  outY,
  inner,
  outer,
}: {
  inX: number;
  inY: number;
  outX: number;
  outY: number;
  inner: number;
  outer: number;
}) {
  const innerR = inner * R;
  const outerR = (1 - outer) * R;
  const ring = (r: number) => ({
    width: 2 * r,
    height: 2 * r,
    left: 90 - r,
    top: 90 - r,
  });
  return (
    <div className="stick-viz">
      <div className="ring" style={ring(innerR)} />
      <div className="ring" style={ring(outerR)} />
      <div
        className="dot-in"
        style={{ left: 90 + inX * R, top: 90 - inY * R }}
      />
      <div
        className="dot-out"
        style={{ left: 90 + outX * R, top: 90 - outY * R }}
      />
    </div>
  );
}

function StickCard({
  label,
  cfg,
  onChange,
  inX,
  inY,
  outX,
  outY,
}: {
  label: string;
  cfg: StickConfig;
  onChange: (c: StickConfig) => void;
  inX: number;
  inY: number;
  outX: number;
  outY: number;
}) {
  return (
    <div className="stick-card">
      <StickViz
        inX={inX}
        inY={inY}
        outX={outX}
        outY={outY}
        inner={cfg.innerDeadzone}
        outer={cfg.outerDeadzone}
      />
      <div className="stick-fields">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
          {label}
        </div>
        <AdvField label="Tipo de zona muerta">
          <Select
            value={cfg.deadzoneType}
            options={DEADZONE_OPTIONS}
            onChange={(v) => onChange({ ...cfg, deadzoneType: v as DeadzoneType })}
          />
        </AdvField>
        <AdvField label="Zona muerta interior">
          <Slider
            value={cfg.innerDeadzone}
            min={0}
            max={0.5}
            onChange={(v) => onChange({ ...cfg, innerDeadzone: v })}
            format={pct}
          />
        </AdvField>
        <AdvField label="Zona muerta exterior">
          <Slider
            value={cfg.outerDeadzone}
            min={0}
            max={0.5}
            onChange={(v) => onChange({ ...cfg, outerDeadzone: v })}
            format={pct}
          />
        </AdvField>
        <AdvField label="Sensibilidad">
          <Slider
            value={cfg.sensitivity}
            min={0.1}
            max={3}
            step={0.05}
            onChange={(v) => onChange({ ...cfg, sensitivity: v })}
            format={(v) => `${v.toFixed(2)}x`}
          />
        </AdvField>
        <AdvField label="Anti zona muerta (anillo exterior)">
          <Slider
            value={cfg.antiDeadzone}
            min={0}
            max={0.5}
            onChange={(v) => onChange({ ...cfg, antiDeadzone: v })}
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
        <AdvField label="Invertir eje X">
          <Toggle on={cfg.invertX} onChange={(v) => onChange({ ...cfg, invertX: v })} />
        </AdvField>
        <AdvField label="Invertir eje Y">
          <Toggle on={cfg.invertY} onChange={(v) => onChange({ ...cfg, invertY: v })} />
        </AdvField>
      </div>
    </div>
  );
}

export function JoysticksSection({
  profile,
  onChange,
  live,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  live: LivePreview | null;
}) {
  return (
    <div>
      <h2 className="section-title">Joysticks</h2>
      <p className="section-desc">
        Tipo y tamaño de zona muerta, sensibilidad, curva y anti zona muerta. El
        punto azul es la señal de salida en tiempo real.
      </p>
      <StickCard
        label="Joystick izquierdo"
        cfg={profile.leftStick}
        onChange={(c) => onChange({ ...profile, leftStick: c })}
        inX={live?.inLx ?? 0}
        inY={live?.inLy ?? 0}
        outX={live?.outLx ?? 0}
        outY={live?.outLy ?? 0}
      />
      <StickCard
        label="Joystick derecho"
        cfg={profile.rightStick}
        onChange={(c) => onChange({ ...profile, rightStick: c })}
        inX={live?.inRx ?? 0}
        inY={live?.inRy ?? 0}
        outX={live?.outRx ?? 0}
        outY={live?.outRy ?? 0}
      />
    </div>
  );
}

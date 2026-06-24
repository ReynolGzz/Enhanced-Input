import type {
  Profile,
  StickConfig,
  InnerDeadzone,
  OuterShape,
  ResponseCurve,
  LivePreview,
} from "../../lib/types";
import { CURVE_EXPONENT_MIN, CURVE_EXPONENT_MAX, EDGE_RADIUS_MAX } from "../../lib/types";
import {
  INNER_TYPE_OPTIONS,
  OUTER_SHAPE_OPTIONS,
  CURVE_OPTIONS,
} from "../../lib/inputs";
import { Select, Slider, NumberSlider, Toggle, AdvField } from "../ui";
import { BindButton } from "./BindPicker";
import { t } from "../../lib/i18n";

const R = 85; // visualizer radius in px (container is 180px)

function StickViz({
  inX,
  inY,
  outX,
  outY,
  inner,
  outer,
  innerType,
  outerShape,
}: {
  inX: number;
  inY: number;
  outX: number;
  outY: number;
  inner: number;
  outer: number;
  innerType: InnerDeadzone;
  outerShape: OuterShape;
}) {
  const innerR = inner * R;
  const outerR = outer * R;
  const ring = (r: number, square: boolean) => ({
    width: 2 * r,
    height: 2 * r,
    left: 90 - r,
    top: 90 - r,
    borderRadius: square ? 4 : "50%",
  });
  return (
    <div className="stick-viz">
      <div className="ring" style={ring(outerR, outerShape === "square")} />
      {innerType === "radial" && <div className="ring" style={ring(innerR, false)} />}
      {innerType === "cross" && (
        <>
          <div
            className="cross-band"
            style={{ width: 2 * innerR, height: 2 * R, left: 90 - innerR, top: 90 - R }}
          />
          <div
            className="cross-band"
            style={{ width: 2 * R, height: 2 * innerR, left: 90 - R, top: 90 - innerR }}
          />
        </>
      )}
      <div className="dot-in" style={{ left: 90 + inX * R, top: 90 - inY * R }} />
      <div className="dot-out" style={{ left: 90 + outX * R, top: 90 - outY * R }} />
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
        outer={cfg.outerRange}
        innerType={cfg.innerType}
        outerShape={cfg.outerShape}
      />
      <div className="stick-fields">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
          {label}
        </div>
        <AdvField label={t("sticks.innerType")}>
          <Select
            value={cfg.innerType}
            options={INNER_TYPE_OPTIONS}
            onChange={(v) => onChange({ ...cfg, innerType: v as InnerDeadzone })}
          />
        </AdvField>
        <AdvField label={t("sticks.outerShape")}>
          <Select
            value={cfg.outerShape}
            options={OUTER_SHAPE_OPTIONS}
            onChange={(v) => onChange({ ...cfg, outerShape: v as OuterShape })}
          />
        </AdvField>
        <AdvField label={t("sticks.innerDeadzone")}>
          <NumberSlider
            value={cfg.innerDeadzone * 100}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, innerDeadzone: v / 100 })}
          />
        </AdvField>
        <AdvField label={t("sticks.outerRange")}>
          <NumberSlider
            value={cfg.outerRange * 100}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, outerRange: v / 100 })}
          />
        </AdvField>
        <AdvField label={t("sticks.sensitivity")}>
          <NumberSlider
            value={cfg.sensitivity}
            min={0.1}
            max={5}
            step={0.05}
            suffix="x"
            onChange={(v) => onChange({ ...cfg, sensitivity: v })}
          />
        </AdvField>
        <AdvField label={t("sticks.antiDeadzone")}>
          <NumberSlider
            value={cfg.antiDeadzone * 100}
            min={0}
            max={95}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, antiDeadzone: v / 100 })}
          />
        </AdvField>
        <AdvField label={t("common.curve")}>
          <Select
            value={cfg.curve}
            options={CURVE_OPTIONS}
            onChange={(v) => onChange({ ...cfg, curve: v as ResponseCurve })}
          />
        </AdvField>
        {cfg.curve === "custom" && (
          <AdvField label={t("common.curveExp")}>
            <NumberSlider
              value={cfg.curveExponent}
              min={CURVE_EXPONENT_MIN}
              max={CURVE_EXPONENT_MAX}
              step={0.01}
              onChange={(v) => onChange({ ...cfg, curveExponent: v })}
            />
          </AdvField>
        )}
        <AdvField label={t("sticks.edgeRadius")}>
          <NumberSlider
            value={cfg.edgeRadius}
            min={0}
            max={EDGE_RADIUS_MAX}
            step={1}
            decimals={0}
            onChange={(v) => onChange({ ...cfg, edgeRadius: v })}
          />
        </AdvField>
        <AdvField label={t("sticks.edgeBinding")}>
          <BindButton
            output={cfg.edgeBinding}
            onChange={(o) => onChange({ ...cfg, edgeBinding: o })}
            target={t("sticks.ring")}
          />
        </AdvField>
        <AdvField label={t("sticks.edgeInvert")}>
          <Toggle
            on={cfg.edgeInvert}
            onChange={(v) => onChange({ ...cfg, edgeInvert: v })}
          />
        </AdvField>
        <AdvField label={t("sticks.smoothing")}>
          <Slider
            value={cfg.smoothing}
            min={-10}
            max={10}
            step={1}
            onChange={(v) => onChange({ ...cfg, smoothing: Math.round(v) })}
            format={(v) => `${Math.round(v)}`}
          />
        </AdvField>
        <AdvField label={t("sticks.invertX")}>
          <Toggle on={cfg.invertX} onChange={(v) => onChange({ ...cfg, invertX: v })} />
        </AdvField>
        <AdvField label={t("sticks.invertY")}>
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
      <h2 className="section-title">{t("editor.sticks")}</h2>
      <p className="section-desc">{t("sticks.desc")}</p>
      <StickCard
        label={t("sticks.left")}
        cfg={profile.leftStick}
        onChange={(c) => onChange({ ...profile, leftStick: c })}
        inX={live?.inLx ?? 0}
        inY={live?.inLy ?? 0}
        outX={live?.outLx ?? 0}
        outY={live?.outLy ?? 0}
      />
      <StickCard
        label={t("sticks.right")}
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

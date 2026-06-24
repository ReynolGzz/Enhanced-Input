import type { Profile, TriggerConfig, ResponseCurve } from "../../lib/types";
import { CURVE_EXPONENT_MIN, CURVE_EXPONENT_MAX } from "../../lib/types";
import { CURVE_OPTIONS } from "../../lib/inputs";
import { Select, NumberSlider, AdvField } from "../ui";
import { BindButton } from "./BindPicker";
import { t } from "../../lib/i18n";

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
        <AdvField label={t("triggers.threshold")}>
          <NumberSlider
            value={cfg.threshold * 100}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, threshold: v / 100 })}
          />
        </AdvField>
        <AdvField label={t("triggers.deadzoneStart")}>
          <NumberSlider
            value={cfg.deadzoneStart * 100}
            min={0}
            max={90}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, deadzoneStart: v / 100 })}
          />
        </AdvField>
        <AdvField label={t("triggers.deadzoneEnd")}>
          <NumberSlider
            value={cfg.deadzoneEnd * 100}
            min={10}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(v) => onChange({ ...cfg, deadzoneEnd: v / 100 })}
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
        <AdvField label={t("triggers.remapTo")}>
          <BindButton
            output={cfg.output}
            onChange={(o) => onChange({ ...cfg, output: o })}
            target={glyph}
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
      <h2 className="section-title">{t("editor.triggers")}</h2>
      <p className="section-desc">{t("triggers.desc")}</p>
      <TriggerCard
        label={t("triggers.left")}
        glyph="LT"
        cfg={profile.leftTrigger}
        onChange={(c) => onChange({ ...profile, leftTrigger: c })}
      />
      <TriggerCard
        label={t("triggers.right")}
        glyph="RT"
        cfg={profile.rightTrigger}
        onChange={(c) => onChange({ ...profile, rightTrigger: c })}
      />
    </div>
  );
}

import type { Profile, ButtonMapping } from "../../lib/types";
import { DEFAULT_MAPPING } from "../../lib/types";
import { BUTTONS, DPAD } from "../../lib/inputs";
import type { ButtonDef } from "../../lib/inputs";
import { ButtonRow } from "./ButtonRow";
import { t } from "../../lib/i18n";

function useButtonSetter(profile: Profile, onChange: (p: Profile) => void) {
  return (id: string, mapping: ButtonMapping) =>
    onChange({ ...profile, buttons: { ...profile.buttons, [id]: mapping } });
}

function rows(
  defs: ButtonDef[],
  profile: Profile,
  set: (id: string, m: ButtonMapping) => void
) {
  return defs.map((def) => (
    <ButtonRow
      key={def.id}
      def={def}
      mapping={profile.buttons[def.id] ?? DEFAULT_MAPPING}
      onChange={(m) => set(def.id, m)}
    />
  ));
}

export function ButtonsSection({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const set = useButtonSetter(profile, onChange);
  const face = BUTTONS.filter((b) => b.group === "face");
  const shoulder = BUTTONS.filter((b) => b.group === "shoulder");
  const menu = BUTTONS.filter((b) => b.group === "menu");
  const stick = BUTTONS.filter((b) => b.group === "stick");

  return (
    <div>
      <h2 className="section-title">{t("editor.buttons")}</h2>
      <p className="section-desc">{t("buttons.desc")}</p>

      <div className="group-label">{t("buttons.face")}</div>
      {rows(face, profile, set)}

      <div className="group-label">{t("buttons.shoulder")}</div>
      {rows(shoulder, profile, set)}

      <div className="group-label">{t("buttons.menu")}</div>
      {rows(menu, profile, set)}

      <div className="group-label">{t("buttons.stick")}</div>
      {rows(stick, profile, set)}
    </div>
  );
}

export function DpadSection({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const set = useButtonSetter(profile, onChange);
  return (
    <div>
      <h2 className="section-title">{t("editor.dpad")}</h2>
      <p className="section-desc">{t("dpad.desc")}</p>
      <div className="group-label">{t("dpad.directions")}</div>
      {rows(DPAD, profile, set)}
    </div>
  );
}

import type { Profile, ButtonMapping } from "../../lib/types";
import { DEFAULT_MAPPING } from "../../lib/types";
import { BUTTONS, DPAD } from "../../lib/inputs";
import type { ButtonDef } from "../../lib/inputs";
import { ButtonRow } from "./ButtonRow";

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
      <h2 className="section-title">Botones</h2>
      <p className="section-desc">
        Reasigna cualquier botón a otro botón del mando, una tecla o el ratón.
        Activa turbo en el engranaje.
      </p>

      <div className="group-label">Botones delanteros</div>
      {rows(face, profile, set)}

      <div className="group-label">Botones superiores frontales</div>
      {rows(shoulder, profile, set)}

      <div className="group-label">Botones de menú</div>
      {rows(menu, profile, set)}

      <div className="group-label">Clicks de joystick</div>
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
      <h2 className="section-title">Cruceta</h2>
      <p className="section-desc">Reasigna cada dirección de la cruceta.</p>
      <div className="group-label">Direcciones</div>
      {rows(DPAD, profile, set)}
    </div>
  );
}

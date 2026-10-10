import { input, menuButton, panel } from "../constants";
import { CharacterPortrait } from "../character-portrait";

type SettingsPanelProps = {
  detectiveName: string;
  onChange: (value: string) => void;
  canSave: boolean;
  onBack: () => void;
  onSave: () => void;
};

export function SettingsPanel({
  detectiveName,
  onChange,
  canSave,
  onBack,
  onSave,
}: SettingsPanelProps) {
  return (
    <form
      className={`${panel} w-full max-w-md`}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <h2 className="mb-5 text-3xl uppercase text-[#e4e6d8]">Detective profile</h2>
      <div className="mb-4 flex items-center gap-4">
        <CharacterPortrait className="w-16" id={detectiveName.trim() || "Detective"} />
        <label className="text-xl uppercase text-[#c8d8d2]" htmlFor="profile-name">Detective name</label>
      </div>
      <input
        className={`${input} w-full`}
        id="profile-name"
        onChange={(event) => onChange(event.target.value)}
        value={detectiveName}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button className={menuButton} onClick={onBack} type="button">Back to menu</button>
        <button className={`${menuButton} text-[#e8ac51]`} disabled={!canSave} type="submit">Save</button>
      </div>
    </form>
  );
}

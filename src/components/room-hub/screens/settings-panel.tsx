import { input, menuButton, panel } from "../constants";

type SettingsPanelProps = {
  detectiveName: string;
  onChange: (value: string) => void;
  canSave: boolean;
  onSave: () => void;
};

export function SettingsPanel({
  detectiveName,
  onChange,
  canSave,
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
      <h2 className="mb-5 text-3xl uppercase text-cyan-50">Detective profile</h2>
      <label className="mb-3 block text-xl uppercase text-cyan-100" htmlFor="profile-name">
        Detective name
      </label>
      <input
        className={`${input} w-full`}
        id="profile-name"
        onChange={(event) => onChange(event.target.value)}
        value={detectiveName}
      />
      <button
        className={`${menuButton} mt-4 w-full text-yellow-200`}
        disabled={!canSave}
        type="submit"
      >
        Save
      </button>
    </form>
  );
}

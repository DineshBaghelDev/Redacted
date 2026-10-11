import { input, menuButton, panel } from "../constants";
import { CharacterPortrait } from "../character-portrait";
import { GameLogo } from "../game-logo";

type NameEntryScreenProps = {
  detectiveName: string;
  fallbackName: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

export function NameEntryScreen({
  detectiveName,
  fallbackName,
  onChange,
  onSubmit,
  canSubmit,
}: NameEntryScreenProps) {
  return (
    <div className="relative z-10 flex w-full max-w-sm flex-col gap-8 px-5 sm:px-0">
      <GameLogo />
      <form
        className={panel}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="mb-4 flex items-center gap-4">
          <CharacterPortrait className="w-16" id={detectiveName.trim() || fallbackName} />
          <label className="text-xl uppercase text-[#e4e6d8]" htmlFor="detective-name">Detective name</label>
        </div>
        <input
          autoFocus
          className={`${input} w-full`}
          id="detective-name"
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallbackName}
          value={detectiveName}
        />
        <button
          className={`${menuButton} mt-4 w-full text-[#e8ac51]`}
          disabled={!canSubmit}
          type="submit"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

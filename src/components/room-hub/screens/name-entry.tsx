import { input, menuButton, panel } from "../constants";

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
    <div className="flex w-full max-w-sm flex-col gap-8 px-5 sm:px-0">
      <h1 className="game-title text-5xl leading-none sm:text-7xl">
        REDACTED
      </h1>
      <form
        className={panel}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="mb-3 block text-xl uppercase text-[#e4e6d8]" htmlFor="detective-name">
          Detective name
        </label>
        <input
          autoFocus
          className={input}
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

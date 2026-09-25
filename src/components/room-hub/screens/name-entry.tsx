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
    <div className="flex w-full max-w-sm flex-col gap-8">
      <h1 className="text-5xl leading-none text-cyan-50 drop-shadow-[0_3px_0_rgba(236,72,153,0.9)] sm:text-7xl">
        REDACTED
      </h1>
      <form
        className={panel}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="mb-3 block text-xl uppercase text-cyan-100" htmlFor="detective-name">
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
          className={`${menuButton} mt-4 w-full text-yellow-200`}
          disabled={!canSubmit}
          type="submit"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
import { menuOptionButton } from "../constants";

type MainMenuScreenProps = {
  onCreate: () => void;
  onJoin: () => void;
  onPrevious: () => void;
  onSettings: () => void;
  isWorking: boolean;
  isLoaded: boolean | undefined;
  isSignedIn: boolean | undefined;
  error: string;
};

export function MainMenuScreen({
  onCreate,
  onJoin,
  onPrevious,
  onSettings,
  isWorking,
  isLoaded,
  isSignedIn,
  error,
}: MainMenuScreenProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <h1 className="text-5xl leading-none text-cyan-50 drop-shadow-[0_3px_0_rgba(236,72,153,0.9)] sm:text-7xl">
        REDACTED
      </h1>
      <div className="flex w-full flex-col gap-3">
        <button
          className={`${menuOptionButton} text-yellow-200`}
          disabled={isWorking || !isLoaded || !isSignedIn}
          onClick={onCreate}
          type="button"
        >
          Create room
        </button>
        <button className={menuOptionButton} onClick={onJoin} type="button">
          Join room
        </button>
        <button className={menuOptionButton} onClick={onPrevious} type="button">
          Previous games
        </button>
        <button className={menuOptionButton} onClick={onSettings} type="button">
          Settings
        </button>
        {isLoaded && !isSignedIn ? (
          <p className="text-center text-sm text-cyan-100">Still signing in.</p>
        ) : null}
        {error ? <p className="text-center text-sm text-yellow-200">{error}</p> : null}
      </div>
    </div>
  );
}
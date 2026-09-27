import { menuOptionButton } from "../constants";

type MainMenuScreenProps = {
  activeRooms?: Array<{
    roomCode: string;
    status: "waiting" | "playing";
    caseTitle: string;
    playerCount: number;
  }>;
  onContinue: (roomCode: string, status: "waiting" | "playing") => void;
  onJoin: () => void;
  onPrevious: () => void;
  onSettings: () => void;
  isLoaded: boolean | undefined;
  isSignedIn: boolean | undefined;
  error: string;
};

export function MainMenuScreen({
  activeRooms,
  onContinue,
  onJoin,
  onPrevious,
  onSettings,
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
        {activeRooms?.map((room) => (
          <button
            className="mb-1 min-h-16 border border-yellow-200/70 bg-[#06142d]/90 px-5 py-3 text-left text-cyan-50 shadow-[0_0_18px_rgba(250,204,21,0.16)] transition hover:border-yellow-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-200"
            key={room.roomCode}
            onClick={() => onContinue(room.roomCode, room.status)}
            type="button"
          >
            <span className="block text-xs uppercase tracking-[0.18em] text-yellow-200">
              {room.status === "playing" ? "Continue investigation" : "Return to lobby"}
            </span>
            <span className="mt-1 block truncate text-lg uppercase">{room.caseTitle}</span>
            <span className="mt-1 block text-xs uppercase text-cyan-100/55">
              Room {room.roomCode} · {room.playerCount}/2 connected
            </span>
          </button>
        ))}
        <button
          className={`${menuOptionButton} text-yellow-200`}
          aria-describedby="create-room-status"
          disabled
          type="button"
        >
          Create room
        </button>
        <p id="create-room-status" className="-mt-2 px-5 text-sm uppercase text-cyan-100/60">
          New cases coming soon
        </p>
        <button className={menuOptionButton} onClick={onJoin} type="button">
          Join room
        </button>
        <button className={menuOptionButton} onClick={onPrevious} type="button">
          Previous cases
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

import { ArrowRight } from "lucide-react";
import { menuOptionButton } from "../constants";
import { GameIcon } from "../game-icon";
import { GameLogo } from "../game-logo";
import { play } from "../../../lib/sound";

type MainMenuScreenProps = {
  activeRooms?: Array<{
    roomCode: string;
    status: "waiting" | "playing";
    caseTitle: string;
    playerCount: number;
    reportSubmitted: boolean;
  }>;
  onContinue: (roomCode: string, status: "waiting" | "playing", reportSubmitted: boolean) => void;
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
    <div className="flex max-h-full w-full max-w-md flex-col gap-7 overflow-y-auto py-1">
      <GameLogo />
      <nav aria-label="Main menu" className="flex w-full flex-col gap-2">
        {activeRooms?.map((room) => (
          <button
            className="game-menu-button mb-2 min-h-20 border-[#e8ac51] bg-[#2b2419]"
            key={room.roomCode}
            onClick={() => { play("open"); onContinue(room.roomCode, room.status, room.reportSubmitted); }}
            type="button"
          >
            <GameIcon name="case" className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs uppercase tracking-[0.12em] text-[#e8ac51]">{room.reportSubmitted ? "Open case report" : room.status === "playing" ? "Continue investigation" : "Return to lobby"}</span>
              <span className="mt-1 block break-words text-lg uppercase leading-tight">{room.caseTitle}</span>
              <span className="block text-xs text-[#adbbb1]">Room {room.roomCode} · {room.playerCount}/2 connected</span>
            </span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </button>
        ))}
        <button className={menuOptionButton} onClick={() => { play("open"); onPrevious(); }} type="button">
          <GameIcon name="case" />
          Play a previous case
        </button>
        <button className={menuOptionButton} onClick={() => { play("open"); onJoin(); }} type="button">
          <GameIcon name="badge" />
          Join room
        </button>
        <button className={menuOptionButton} onClick={() => { play("open"); onSettings(); }} type="button">
          <GameIcon name="records" />
          Settings
        </button>
        {isLoaded && !isSignedIn ? (
          <p className="text-sm text-[#c5d2c8]">Still signing in.</p>
        ) : null}
        {error ? <p className="text-sm text-[#e8ac51]" role="alert">{error}</p> : null}
      </nav>
    </div>
  );
}

import { menuButton, panel } from "../constants";
import { RoomCodeInput } from "./room-code-input";

type JoinModalProps = {
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  isWorking: boolean;
  isLoaded: boolean | undefined;
  isSignedIn: boolean | undefined;
  error: string;
  onJoin: () => void;
  onClose: () => void;
};

export function JoinModal({
  roomCode,
  onRoomCodeChange,
  isWorking,
  isLoaded,
  isSignedIn,
  error,
  onJoin,
  onClose,
}: JoinModalProps) {
  const canJoin = isLoaded && isSignedIn && !isWorking && roomCode.length === 6;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <form
        className={`${panel} w-full max-w-md`}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
            event.preventDefault();
            if (canJoin) onJoin();
          }
        }}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-3xl uppercase text-cyan-50">Join room</h2>
          <button
            aria-label="Close join room"
            className="h-10 border border-cyan-300 bg-[#06142d] px-4 text-base uppercase text-cyan-100 transition hover:border-yellow-200 hover:text-yellow-200"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <RoomCodeInput onChange={onRoomCodeChange} value={roomCode} />
        <button
          className={`${menuButton} mt-4 w-full text-yellow-200`}
          disabled={!canJoin}
          onClick={onJoin}
          type="submit"
        >
          Join
        </button>
        {error ? <p className="mt-4 text-center text-sm text-yellow-200">{error}</p> : null}
      </form>
    </div>
  );
}
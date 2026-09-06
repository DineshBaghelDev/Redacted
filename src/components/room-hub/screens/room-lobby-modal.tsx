import { menuButton, panel } from "../constants";

export type RoomLobbyState = {
  roomCode: string;
  status: "waiting" | "playing";
  playerCount: number;
  allReady: boolean;
  meReady: boolean;
  players: Array<{ name: string; isReady: boolean }>;
};

type RoomLobbyModalProps = {
  room: RoomLobbyState | null | undefined;
  nickname: string;
  joinedRoomCode: string;
  copiedCode: boolean;
  onCopyCode: () => void;
  onToggleReady: () => void;
  onStart: () => void;
  onLeave: () => void;
};

export function RoomLobbyModal({
  room,
  nickname,
  joinedRoomCode,
  copiedCode,
  onCopyCode,
  onToggleReady,
  onStart,
  onLeave,
}: RoomLobbyModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className={`${panel} w-full max-w-lg`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl uppercase text-cyan-50">Room {joinedRoomCode}</h2>
          <button
            className="h-10 border border-cyan-300 bg-[#06142d] px-4 text-base uppercase text-yellow-200"
            onClick={onCopyCode}
            type="button"
          >
            {copiedCode ? "Copied" : "Copy code"}
          </button>
        </div>
        <p className="mt-4 text-xl uppercase text-cyan-100">Connected players</p>
        <ul className="mt-2 space-y-2 text-xl text-cyan-200">
          {(room?.players?.length
            ? room.players
            : [{ name: nickname, isReady: false }]
          ).map((player) => (
            <li className="flex justify-between gap-3" key={player.name}>
              <span>{player.name}</span>
              <span className={player.isReady ? "text-yellow-200" : "text-cyan-100/60"}>
                {player.isReady ? "Ready" : "Not ready"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className={`${menuButton} text-yellow-200`} onClick={onToggleReady} type="button">
            {room?.meReady ? "Unready" : "Ready"}
          </button>
          <button
            className={`${menuButton} h-auto min-h-12 whitespace-normal py-2 leading-tight`}
            disabled={!room?.allReady}
            onClick={onStart}
            type="button"
          >
            Start
          </button>
          <button
            className={`${menuButton} border-red-400 bg-red-950/80 text-red-200 hover:border-red-200 hover:text-red-100 sm:col-span-2`}
            onClick={onLeave}
            type="button"
          >
            Leave room
          </button>
        </div>
        {room ? (
          <p className="mt-4 text-center text-sm uppercase text-cyan-100">
            {room.allReady
              ? "All detectives are ready"
              : `${room.playerCount}/2 detectives connected. Waiting for ready.`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
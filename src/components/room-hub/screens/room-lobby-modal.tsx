"use client";

import { useEffect, useRef } from "react";
import { menuButton } from "../constants";
import { CharacterPortrait } from "../character-portrait";
import { GameIcon } from "../game-icon";

export type RoomLobbyState = {
  roomCode: string;
  status: "waiting" | "playing";
  caseTitle: string;
  playerCount: number;
  allReady: boolean;
  canStart: boolean;
  meReady: boolean;
  players: Array<{ name: string; isReady: boolean }>;
};

type RoomLobbyModalProps = {
  room: RoomLobbyState | null | undefined;
  nickname: string;
  joinedRoomCode: string;
  copiedCode: boolean;
  error: string;
  onCopyCode: () => void;
  onToggleReady: () => void;
  onStart: () => void;
  onLeave: () => void;
  workingAction: "create" | "join" | "ready" | "start" | "copy" | "leave" | null;
};

export function RoomLobbyModal({
  room,
  nickname,
  joinedRoomCode,
  copiedCode,
  error,
  onCopyCode,
  onToggleReady,
  onStart,
  onLeave,
  workingAction,
}: RoomLobbyModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openingCase = room?.status === "playing";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="room-lobby-title"
      aria-busy={workingAction !== null}
      className="fixed inset-0 z-20 m-0 hidden h-full max-h-none w-full max-w-none items-center justify-center overflow-y-auto bg-black/70 p-3 text-[#c8d8d2] open:flex sm:p-4"
      onCancel={(event) => event.preventDefault()}
      ref={dialogRef}
    >
      <div className="game-panel my-auto w-full max-w-lg px-8 py-20 sm:px-12 sm:py-14">
        <div className="flex flex-wrap items-center gap-3">
          <GameIcon name="badge" className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[#e8ac51]">Room code</p>
            <h2 className="break-words text-2xl uppercase text-[#e4e6d8] sm:text-3xl" id="room-lobby-title">{joinedRoomCode}</h2>
          </div>
          <button
            className="ml-auto min-h-10 w-full shrink-0 border-b border-[#6f9f98] px-2 text-right text-sm uppercase text-[#e8ac51] hover:border-[#e8ac51] sm:w-auto"
            disabled={workingAction !== null}
            onClick={onCopyCode}
            type="button"
          >
            {workingAction === "copy" ? "Copying..." : copiedCode ? "Link copied" : "Copy invite link"}
          </button>
        </div>
        <p className="mt-4 break-words border-y border-[#45635d] py-3 text-lg uppercase leading-tight text-[#e8ac51]">{room?.caseTitle ?? "Loading case..."}</p>
        <p className="mt-4 text-sm uppercase tracking-[0.15em] text-[#a5c6bb]">Detectives</p>
        <ul className="mt-2 divide-y divide-[#45635d] text-[#c8d8d2]">
          {(room?.players?.length
            ? room.players
            : [{ name: nickname, isReady: false }]
          ).map((player) => (
            <li className="flex min-w-0 items-center gap-3 py-2" key={player.name}>
              <CharacterPortrait className="w-12" id={player.name} />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-lg uppercase leading-tight">{player.name}</span>
                {(room?.playerCount ?? 1) > 1 ? (
                  <span className={`mt-1 block text-xs uppercase ${player.isReady ? "text-[#e8ac51]" : "text-[#c8d8d2]/60"}`}>
                    {player.isReady ? "Ready" : "Not ready"}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {/* Alone in the room, Start is all it takes; Ready only matters to a partner. */}
        <div className={`mt-5 grid gap-2 sm:gap-3 ${(room?.playerCount ?? 1) > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {(room?.playerCount ?? 1) > 1 ? (
            <button className={`${menuButton} min-w-0 justify-center text-center text-[#e8ac51]`} disabled={!room || openingCase || workingAction !== null} onClick={onToggleReady} type="button">
              {workingAction === "ready" ? "Saving..." : room?.meReady ? "Unready" : "Ready"}
            </button>
          ) : null}
          <button
            className={`${menuButton} h-auto min-h-12 min-w-0 justify-center whitespace-normal py-2 text-center leading-tight`}
            disabled={!room?.canStart || openingCase || workingAction !== null}
            onClick={onStart}
            type="button"
          >
            {workingAction === "start" ? "Starting..." : openingCase ? "Opening case..." : "Start"}
          </button>
        </div>
        {room ? (
          <p className="mt-4 text-center text-sm uppercase text-[#c8d8d2]">
            {openingCase
              ? "Investigation started. Opening the case file..."
              : room.playerCount === 1
              ? "Play alone, or send the invite link to a partner."
              : room.canStart
              ? "Your partner is ready"
              : "Waiting for your partner to be ready."}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-center text-sm text-red-300" role="alert">{error}</p> : null}
        <button
          className="mx-auto mt-4 block min-h-10 border-b border-[#8b7355] px-2 text-sm uppercase text-[#d5b4a8] hover:border-[#e8ac51] hover:text-[#e8ac51]"
          disabled={workingAction !== null}
          onClick={onLeave}
          type="button"
        >
          {workingAction === "leave" ? "Leaving..." : "Leave room"}
        </button>
      </div>
    </dialog>
  );
}

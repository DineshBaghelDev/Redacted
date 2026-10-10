"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { menuButton } from "../constants";
import { GameIcon } from "../game-icon";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="join-room-title"
      className="fixed inset-0 z-20 m-0 hidden h-full max-h-none w-full max-w-none items-center justify-center overflow-y-auto bg-black/70 p-3 text-[#c8d8d2] open:flex sm:p-4"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <form
        className="game-panel my-auto w-full max-w-md px-8 py-16 sm:px-10 sm:py-12"
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
            event.preventDefault();
            if (canJoin) onJoin();
          }
        }}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="mb-5 flex items-center gap-2">
          <GameIcon name="badge" className="size-8" />
          <h2 className="min-w-0 flex-1 text-xl uppercase text-[#e4e6d8] sm:text-3xl" id="join-room-title">Join room</h2>
          <button
            aria-label="Close join room"
            className="flex size-9 shrink-0 items-center justify-center border border-[#6f9f98] bg-[#0b1a1c] text-[#c8d8d2] transition hover:border-[#e8ac51] hover:text-[#e8ac51]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <RoomCodeInput onChange={onRoomCodeChange} value={roomCode} />
        <button
          className={`${menuButton} mt-4 w-full text-[#e8ac51]`}
          disabled={!canJoin}
          onClick={onJoin}
          type="submit"
        >
          Join
        </button>
        {error ? <p className="mt-4 text-center text-sm text-[#e8ac51]" role="alert">{error}</p> : null}
      </form>
    </dialog>
  );
}

"use client";

import { useEffect, useRef } from "react";
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
      className="fixed inset-0 z-20 m-0 hidden h-full max-h-none w-full max-w-none items-center justify-center bg-black/70 p-4 text-cyan-100 open:flex"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
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
          <h2 className="text-3xl uppercase text-cyan-50" id="join-room-title">Join room</h2>
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
        {error ? <p className="mt-4 text-center text-sm text-yellow-200" role="alert">{error}</p> : null}
      </form>
    </dialog>
  );
}

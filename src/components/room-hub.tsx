"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

const menuButton =
  "h-12 border border-cyan-300 bg-[#06142d]/85 px-5 text-left text-xl uppercase text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:border-yellow-200 hover:text-yellow-200 disabled:opacity-60";

export function RoomHub() {
  const { user } = useUser();
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const createRoom = useMutation(api.sessions.create);
  const joinRoom = useMutation(api.sessions.join);
  const room = useQuery(
    api.sessions.get,
    joinedRoomCode ? { roomCode: joinedRoomCode } : "skip",
  );
  const nickname = user?.firstName || user?.username || "Detective";

  async function run(action: "create" | "join") {
    if (!isLoaded || !isSignedIn) {
      setError("Still signing in. Try again in a moment.");
      return;
    }

    setIsWorking(true);
    setError("");

    try {
      const result =
        action === "create"
          ? await createRoom({ nickname })
          : await joinRoom({ roomCode, nickname });
      setJoinedRoomCode(result.roomCode);
      setRoomCode(result.roomCode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <h1 className="text-5xl leading-none text-cyan-50 drop-shadow-[0_3px_0_rgba(236,72,153,0.9)] sm:text-7xl">
        REDACTED
      </h1>
      <div className="flex w-full flex-col gap-3">
        <button
          className={`${menuButton} text-yellow-200`}
          disabled={isWorking || !isLoaded || !isSignedIn}
          onClick={() => run("create")}
          type="button"
        >
          Play solo
        </button>
        <button
          className={menuButton}
          disabled={isWorking || !isLoaded || !isSignedIn}
          onClick={() => run("create")}
          type="button"
        >
          Create a room
        </button>
        <input
          aria-label="Room code"
          className="h-12 min-w-0 border border-cyan-300 bg-[#06142d]/85 px-5 text-xl uppercase text-cyan-100 outline-none placeholder:text-cyan-100/45"
          maxLength={6}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder="Room code"
          value={roomCode}
        />
        <button
          className={menuButton}
          disabled={isWorking || !isLoaded || !isSignedIn || !roomCode.trim()}
          onClick={() => run("join")}
          type="button"
        >
          Join a room
        </button>
        <button className={menuButton} type="button">
          Settings
        </button>
        <button className={menuButton} type="button">
          Quit
        </button>
        {joinedRoomCode ? (
          <p className="border border-cyan-300 bg-[#06142d]/85 px-3 py-2 text-center text-sm text-cyan-100">
            Joined room {joinedRoomCode}
            {room ? ` (${room.playerCount}/2)` : ""}
          </p>
        ) : null}
        {isLoaded && !isSignedIn ? (
          <p className="text-center text-sm text-cyan-100">Still signing in.</p>
        ) : null}
        {error ? <p className="text-center text-sm text-yellow-200">{error}</p> : null}
      </div>
    </div>
  );
}

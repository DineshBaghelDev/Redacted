"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

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
    <div className="flex w-full max-w-64 flex-col items-center gap-2">
      <div className="grid size-17 place-items-center text-base">
        Redacted
      </div>
      <div className="flex w-full flex-col gap-3">
        <button
          className="h-10 rounded-lg border-[3px] border-[#1976d2] bg-background text-base text-[#1976d2]"
          disabled={isWorking || !isLoaded || !isSignedIn}
          onClick={() => run("create")}
          type="button"
        >
          Create Room
        </button>
        <div className="flex gap-2">
          <input
            aria-label="Room code"
            className="min-w-0 flex-1 rounded-lg border-[3px] border-[#1976d2] bg-background px-3 text-base uppercase text-[#1976d2] outline-none"
            maxLength={6}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="CODE"
            value={roomCode}
          />
          <button
            className="h-10 rounded-lg border-[3px] border-[#1976d2] bg-background px-3 text-base text-[#1976d2]"
            disabled={isWorking || !isLoaded || !isSignedIn || !roomCode.trim()}
            onClick={() => run("join")}
            type="button"
          >
            Join
          </button>
        </div>
        {joinedRoomCode ? (
          <p className="rounded-lg border-[3px] border-[#1976d2] px-3 py-2 text-center text-sm">
            Joined room {joinedRoomCode}
            {room ? ` (${room.playerCount}/2)` : ""}
          </p>
        ) : null}
        {isLoaded && !isSignedIn ? (
          <p className="text-center text-sm">Still signing in.</p>
        ) : null}
        {error ? <p className="text-center text-sm">{error}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

const menuButton =
  "h-12 border border-cyan-300 bg-[#06142d]/85 px-5 text-left text-xl uppercase text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:border-yellow-200 hover:text-yellow-200 disabled:opacity-60";
const panel =
  "border border-cyan-300 bg-[#06142d]/90 p-5 shadow-[0_0_28px_rgba(34,211,238,0.22)]";
const input =
  "h-12 min-w-0 border border-cyan-300 bg-[#020817]/90 px-4 text-xl uppercase text-cyan-100 outline-none placeholder:text-cyan-100/45";

type Screen = "menu" | "join" | "previous" | "loading" | "brief";

const previousGames = [
  {
    caseId: "#0182",
    name: "The Ashwood Murder",
    players: "Dinesh, Anshuman",
    progress: "Day 2 - 23:17",
  },
  {
    caseId: "#0176",
    name: "The Cerulean Facility",
    players: "Kavya, Rohit",
    progress: "Day 4 - 11:05",
  },
  {
    caseId: "#0169",
    name: "The Arcadia Letters",
    players: "Meera, Sid",
    progress: "Day 3 - 07:48",
  },
];

export function RoomHub() {
  const { user } = useUser();
  const [detectiveName, setDetectiveName] = useState("");
  const [hasDetectiveName, setHasDetectiveName] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState("");
  const [screen, setScreen] = useState<Screen>("menu");
  const [showRoom, setShowRoom] = useState(false);
  const [freshStartCase, setFreshStartCase] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const createRoom = useMutation(api.sessions.create);
  const joinRoom = useMutation(api.sessions.join);
  const room = useQuery(
    api.sessions.get,
    joinedRoomCode ? { roomCode: joinedRoomCode } : "skip",
  );
  const fallbackName = user?.firstName || user?.username || "Detective";
  const nickname = detectiveName.trim() || fallbackName;

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
      setShowRoom(true);
      setScreen("menu");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsWorking(false);
    }
  }

  function openBrief() {
    setShowRoom(false);
    setScreen("loading");
    window.setTimeout(() => setScreen("brief"), 1200);
  }

  if (!hasDetectiveName) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-8">
        <h1 className="text-5xl leading-none text-cyan-50 drop-shadow-[0_3px_0_rgba(236,72,153,0.9)] sm:text-7xl">
          REDACTED
        </h1>
        <form
          className={panel}
          onSubmit={(event) => {
            event.preventDefault();
            setHasDetectiveName(true);
          }}
        >
          <label className="mb-3 block text-xl uppercase text-cyan-100" htmlFor="detective-name">
            Detective name
          </label>
          <input
            autoFocus
            className={input}
            id="detective-name"
            onChange={(event) => setDetectiveName(event.target.value)}
            placeholder={fallbackName}
            value={detectiveName}
          />
          <button
            className={`${menuButton} mt-4 w-full text-yellow-200`}
            disabled={!nickname.trim()}
            type="submit"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (screen === "loading") {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-xl flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-4xl uppercase tracking-[0.18em] text-cyan-50 sm:text-5xl">
          Preparing case...
        </h1>
        <div className="space-y-3 text-left text-2xl text-cyan-200">
          <p>Generating city...</p>
          <p>Preparing records...</p>
          <p>Building case...</p>
        </div>
      </div>
    );
  }

  if (screen === "brief") {
    return (
      <div className="mx-auto w-full max-w-3xl border border-cyan-300 bg-[#06142d]/90 p-8 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.22)]">
        <h1 className="text-4xl uppercase text-cyan-50">Case Brief</h1>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-start">
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
            Create room
          </button>
          <button className={menuButton} onClick={() => setScreen("join")} type="button">
            Join room
          </button>
          <button className={menuButton} onClick={() => setScreen("previous")} type="button">
            Previous games
          </button>
          <button className={menuButton} type="button">
            Settings
          </button>
          {isLoaded && !isSignedIn ? (
            <p className="text-center text-sm text-cyan-100">Still signing in.</p>
          ) : null}
          {error ? <p className="text-center text-sm text-yellow-200">{error}</p> : null}
        </div>
      </div>

      {screen === "join" ? (
        <form className={`${panel} w-full max-w-md`} onSubmit={(event) => event.preventDefault()}>
          <h2 className="mb-5 text-3xl uppercase text-cyan-50">Join room</h2>
          <input
            aria-label="Room code"
            className={`${input} w-full`}
            maxLength={6}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="Room code"
            value={roomCode}
          />
          <button
            className={`${menuButton} mt-4 w-full text-yellow-200`}
            disabled={isWorking || !isLoaded || !isSignedIn || !roomCode.trim()}
            onClick={() => run("join")}
            type="submit"
          >
            Join
          </button>
        </form>
      ) : null}

      {screen === "previous" ? (
        <div className="grid w-full gap-4 md:grid-cols-3">
          {previousGames.map((game) => (
            <article
              className="border-4 border-[#8b5b38] bg-[#d3b08b] p-5 text-[#160d13] shadow-[8px_8px_0_rgba(0,0,0,0.45)]"
              key={game.caseId}
            >
              <p className="text-lg uppercase">Case {game.caseId}</p>
              <h2 className="min-h-16 border-b-2 border-[#160d13] pb-2 text-3xl uppercase leading-none">
                {game.name}
              </h2>
              <p className="mt-4 text-lg uppercase">Players:</p>
              <p className="text-lg uppercase">{game.players}</p>
              <p className="mt-4 text-lg uppercase">Progress:</p>
              <p className="text-lg uppercase">{game.progress}</p>
              <button
                className="mt-5 h-11 w-full border-2 border-cyan-300 bg-[#06142d] text-lg uppercase text-yellow-200"
                onClick={() => openBrief()}
                type="button"
              >
                Continue
              </button>
              <button
                className="mt-2 h-11 w-full border-2 border-cyan-100 bg-[#1f2541] text-lg uppercase text-cyan-100"
                onClick={() => setFreshStartCase(game.caseId)}
                type="button"
              >
                Fresh start
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {showRoom ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <div className={`${panel} w-full max-w-lg`}>
            <h2 className="text-3xl uppercase text-cyan-50">Room {joinedRoomCode}</h2>
            <p className="mt-4 text-xl uppercase text-cyan-100">Connected players</p>
            <ul className="mt-2 space-y-2 text-xl text-cyan-200">
              {(room?.players?.length ? room.players : [nickname]).map((player) => (
                <li key={player}>{player}</li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className={`${menuButton} text-yellow-200`} type="button">
                Ready
              </button>
              <button className={menuButton} onClick={openBrief} type="button">
                Start investigation
              </button>
              <button
                className={`${menuButton} sm:col-span-2`}
                onClick={() => setShowRoom(false)}
                type="button"
              >
                Leave room
              </button>
            </div>
            {room ? (
              <p className="mt-4 text-center text-sm uppercase text-cyan-100">
                {room.playerCount}/2 detectives connected
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {freshStartCase ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className={`${panel} w-full max-w-md text-center`}>
            <h2 className="text-3xl uppercase text-cyan-50">Start fresh?</h2>
            <p className="mt-4 text-xl text-cyan-100">
              This will delete your previous progress and state.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className={`${menuButton} text-yellow-200`} onClick={openBrief} type="button">
                Start fresh
              </button>
              <button className={menuButton} onClick={() => setFreshStartCase("")} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

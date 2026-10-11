"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "../../../../convex/_generated/api";
import { ControlIcon } from "../control-icon";

export function CaseBriefScreen({
  roomCode,
  error,
  onBegin,
  onLeave,
}: {
  roomCode: string;
  error: string;
  onBegin: () => void;
  onLeave: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const brief = useQuery(api.cases.getBrief, isLoaded && isSignedIn && roomCode ? { roomCode } : "skip");

  return (
    <section className="flex h-screen w-full items-center justify-center overflow-y-auto bg-[#071014]/92 p-3 text-[#211d17] sm:p-6">
      <div className="game-dossier my-auto w-full max-w-xl px-4 pb-8 pt-9 sm:px-7 sm:pb-10 sm:pt-10">
        <div className="flex flex-col items-start gap-4 border-b-2 border-[#211d17] pb-4 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-red-800"><span aria-hidden="true" className="case-opened-icon" />Bureau case file</p>
            <h1 className="mt-2 break-words text-2xl uppercase leading-tight sm:text-3xl">{brief?.title ?? "Case brief"}</h1>
          </div>
          <span className="shrink-0 border-2 border-red-800 px-3 py-1 text-sm uppercase text-red-800">Room {roomCode}</span>
        </div>

        {brief === undefined ? <p className="py-12 text-center text-xl uppercase">Opening the file...</p> : null}
        {brief === null ? <p className="py-12 text-center text-xl uppercase text-red-800">This case file is unavailable.</p> : null}
        {brief ? (
          <div className="py-4">
            <p className="text-base leading-relaxed sm:text-lg">{brief.summary}</p>
            <details className="mt-4 border-l-4 border-red-800 bg-[#ad9e80]/55 p-3 sm:p-4">
              <summary className="cursor-pointer text-sm uppercase tracking-[0.12em] text-red-800">Known details · {brief.initialFacts.length}</summary>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
                {brief.initialFacts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </details>
          </div>
        ) : null}

        <div className="grid gap-3 border-t-2 border-[#211d17] pt-5 sm:grid-cols-[1fr_auto]">
          <button
            className="game-control-button flex min-h-12 items-center justify-center gap-2 px-5 text-lg uppercase text-[#f1c987] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!brief}
            onClick={onBegin}
            type="button"
          >
            <ControlIcon name="play" />Begin investigation
          </button>
          <button className="min-h-12 border-2 border-red-800 px-5 text-lg uppercase text-red-900 hover:bg-red-900 hover:text-red-50" onClick={onLeave} type="button">
            Leave room
          </button>
        </div>
        {error ? <p className="mt-3 text-center text-sm text-red-800">{error}</p> : null}
      </div>
    </section>
  );
}

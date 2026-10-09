"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

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
    <section className="flex h-screen w-full items-center justify-center overflow-y-auto bg-[#050712]/92 p-4 text-[#211d17] sm:p-8">
      <div className="my-auto w-full max-w-3xl border-4 border-[#8b5b38] bg-[#e9dfc5] p-5 shadow-[10px_10px_0_rgba(0,0,0,0.5)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#211d17] pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-800">Bureau case file</p>
            <h1 className="mt-2 text-3xl uppercase leading-none sm:text-5xl">{brief?.title ?? "Case brief"}</h1>
          </div>
          <span className="border-2 border-red-800 px-3 py-1 text-sm uppercase text-red-800">Room {roomCode}</span>
        </div>

        {brief === undefined ? <p className="py-12 text-center text-xl uppercase">Opening the file...</p> : null}
        {brief === null ? <p className="py-12 text-center text-xl uppercase text-red-800">This case file is unavailable.</p> : null}
        {brief ? (
          <div className="py-6">
            <p className="text-lg leading-relaxed sm:text-xl">{brief.summary}</p>
            <div className="mt-6 border-l-4 border-red-800 bg-[#d8c8a7]/55 p-4">
              <h2 className="text-sm uppercase tracking-[0.18em] text-red-800">Known before the investigation</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed sm:text-lg">
                {brief.initialFacts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 border-t-2 border-[#211d17] pt-5 sm:grid-cols-[1fr_auto]">
          <button
            className="min-h-12 border-2 border-[#211d17] bg-[#16283a] px-5 text-lg uppercase text-yellow-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!brief}
            onClick={onBegin}
            type="button"
          >
            Begin investigation
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

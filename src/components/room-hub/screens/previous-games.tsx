"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

type PreviousGamesScreenProps = {
  isWorking: boolean;
  onPlay: (generationJobId: Id<"generationJobs">) => void;
};

export function PreviousGamesScreen({ isWorking, onPlay }: PreviousGamesScreenProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const cases = useQuery(api.cases.listPassed, isLoaded && isSignedIn ? {} : "skip");

  return (
    <section className="grid max-h-[50vh] min-w-0 flex-1 gap-4 overflow-y-auto px-1 pb-4 pr-3 md:grid-cols-3 lg:max-h-[calc(100vh-4rem)]">
        {cases === undefined ? <p className="text-xl uppercase text-cyan-100">Loading cases...</p> : null}
        {cases?.length === 0 ? <p className="text-xl uppercase text-cyan-100">No passed cases yet.</p> : null}
        {cases?.map((game) => (
          <article
            className="border-4 border-[#8b5b38] bg-[#d3b08b] p-5 text-[#160d13] shadow-[8px_8px_0_rgba(0,0,0,0.45)]"
            key={game.generationJobId}
          >
            <p className="text-lg uppercase">{game.difficulty} case</p>
            <h2 className="min-h-16 border-b-2 border-[#160d13] pb-2 text-3xl uppercase leading-none">
              {game.title}
            </h2>
            <p className="mt-4 break-words text-base leading-snug">{game.description}</p>
            <button
              className="mt-5 h-11 w-full border-2 border-cyan-300 bg-[#06142d] text-lg uppercase text-yellow-200"
              disabled={isWorking}
              onClick={() => onPlay(game.generationJobId)}
              type="button"
            >
              Play in lobby
            </button>
          </article>
        ))}
    </section>
  );
}

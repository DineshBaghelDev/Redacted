"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { menuButton } from "../constants";

type PreviousGamesScreenProps = {
  error: string;
  isWorking: boolean;
  onBack: () => void;
  onPlay: (game: { generationJobId: Id<"generationJobs">; caseId: Id<"cases"> }, deadlineMinutes?: number) => void;
};

export function PreviousGamesScreen({ error, isWorking, onBack, onPlay }: PreviousGamesScreenProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const cases = useQuery(api.cases.listPassed, isLoaded && isSignedIn ? {} : "skip");
  const [deadlineHours, setDeadlineHours] = useState("");
  const hours = Number(deadlineHours);
  const deadlineMinutes = deadlineHours && Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : undefined;
  const invalidDeadline = deadlineHours !== "" && (hours < 1 || !Number.isSafeInteger(deadlineMinutes));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <button className={`${menuButton} w-fit`} onClick={onBack} type="button">Back to menu</button>
      <h1 className="game-title text-3xl uppercase sm:text-5xl">Case archive</h1>
      {error ? <p className="border border-red-300 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
      <label className="flex w-fit flex-col gap-1 text-sm uppercase text-[#c8d8d2]" htmlFor="replay-deadline-hours">
        Optional deadline (hours)
        <input
          className="min-h-11 w-48 border border-[#6f9f98]/50 bg-[#0b1a1c] px-3 text-base text-[#e4e6d8]"
          id="replay-deadline-hours"
          min="1"
          onChange={(event) => setDeadlineHours(event.target.value)}
          placeholder="Use case default"
          type="number"
          value={deadlineHours}
        />
      </label>
      <section aria-label="Case archive" className="grid min-h-0 min-w-0 flex-1 content-start gap-3 overflow-y-auto px-1 pb-4 pr-3 md:grid-cols-2">
        {cases === undefined ? <p className="text-xl uppercase text-[#c8d8d2]">Loading cases...</p> : null}
        {cases?.length === 0 ? <p className="text-xl uppercase text-[#c8d8d2]">No passed cases yet.</p> : null}
        {cases?.map((game) => (
          <article
            className="game-dossier p-3 text-[#211d17] sm:p-5"
            key={game.generationJobId}
          >
            <p className="text-lg uppercase">{game.difficulty} case</p>
            <h2 className="min-h-16 border-b border-[#573821] pb-2 text-2xl uppercase leading-none">
              {game.title}
            </h2>
            <p className="mt-4 break-words text-base leading-snug">{game.description}</p>
            <button
              className="mt-5 h-11 w-full border-2 border-[#6f9f98] bg-[#0b1a1c] text-lg uppercase text-[#e8ac51]"
              disabled={isWorking || invalidDeadline}
              onClick={() => onPlay(game, deadlineMinutes)}
              type="button"
            >
              Play case
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

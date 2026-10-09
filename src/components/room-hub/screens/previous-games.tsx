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
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <button className={`${menuButton} w-fit`} onClick={onBack} type="button">Back to menu</button>
      {error ? <p className="border border-red-300 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
      <label className="flex w-fit flex-col gap-1 text-sm uppercase text-cyan-100" htmlFor="replay-deadline-hours">
        Optional deadline (hours)
        <input
          className="min-h-11 w-48 border border-cyan-300/50 bg-[#06142d] px-3 text-base text-white"
          id="replay-deadline-hours"
          min="1"
          onChange={(event) => setDeadlineHours(event.target.value)}
          placeholder="Use case default"
          type="number"
          value={deadlineHours}
        />
      </label>
      <section className="grid max-h-[50vh] min-w-0 gap-4 overflow-y-auto px-1 pb-4 pr-3 md:grid-cols-3 lg:max-h-[calc(100vh-8rem)]">
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

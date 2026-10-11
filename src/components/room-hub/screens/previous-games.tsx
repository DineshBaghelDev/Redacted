"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex-helpers/react/cache";
import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { menuButton } from "../constants";
import { ControlIcon } from "../control-icon";

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
    <div className="flex min-w-0 flex-col gap-4">
      <button className={`${menuButton} w-fit`} onClick={onBack} type="button"><ControlIcon name="back" />Back to menu</button>
      <h1 className="game-title text-3xl uppercase sm:text-5xl">Case archive</h1>
      {error ? <p className="border border-red-300 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
      <details className="max-w-md border-l-2 border-[#e8ac51]/60 pl-3 text-sm text-[#c8d8d2]">
        <summary className="cursor-pointer uppercase text-[#e8ac51]">Set a custom deadline</summary>
        <p className="mt-2 leading-relaxed">The case default gives your team its suggested time plus one day. A custom limit is shared by both detectives. Going past it marks the clock overdue; you can keep playing and your score is unchanged.</p>
        <label className="mt-3 flex w-fit flex-col gap-1 uppercase" htmlFor="replay-deadline-hours">
          Game hours from the start
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
      </details>
      <section aria-label="Case archive" className="grid min-w-0 content-start gap-3 px-1 pb-4 md:grid-cols-2">
        {cases === undefined ? <p className="text-xl uppercase text-[#c8d8d2]">Loading cases...</p> : null}
        {cases?.length === 0 ? <p className="text-xl uppercase text-[#c8d8d2]">No passed cases yet.</p> : null}
        {cases?.map((game) => (
          <article
            className="game-dossier p-3 text-[#211d17] sm:p-5"
            key={game.generationJobId}
          >
            <p className="text-lg uppercase">{game.difficulty} case</p>
            <h2 className="min-h-16 break-words border-b border-[#573821] pb-2 text-2xl uppercase leading-tight">
              {game.title}
            </h2>
            <details className="mt-3 border-b border-[#8b7355]/60 text-[#3e342a]"><summary className="min-h-11 cursor-pointer py-3 text-sm uppercase text-red-800">Read case brief</summary><p className="pb-3 break-words text-base leading-snug">{game.description}</p></details>
            <button
              className="game-control-button mt-5 flex h-12 w-full items-center justify-center gap-2 text-lg uppercase text-[#e8ac51]"
              disabled={isWorking || invalidDeadline}
              onClick={() => onPlay(game, deadlineMinutes)}
              type="button"
            >
              <ControlIcon name="play" />Play case
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

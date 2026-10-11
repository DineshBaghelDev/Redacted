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
  // A solved case asks once before replaying: the answer is already known.
  const [confirmReplay, setConfirmReplay] = useState<string | null>(null);
  // One unplayed case a day is featured, the same for everyone that day.
  const fresh = (cases ?? []).filter((game) => game.played === "new");
  const [today] = useState(() => Math.floor(Date.now() / 86_400_000));
  const featuredId = fresh.length ? fresh[Number(today) % fresh.length]?.caseId ?? null : null;
  const ordered = [...(cases ?? [])].sort((a, b) => Number(b.caseId === featuredId) - Number(a.caseId === featuredId));
  const hours = Number(deadlineHours);
  const deadlineMinutes = deadlineHours && Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : undefined;
  const invalidDeadline = deadlineHours !== "" && (hours < 1 || !Number.isSafeInteger(deadlineMinutes));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <button className={`${menuButton} w-fit`} onClick={onBack} type="button"><ControlIcon name="back" />Back to menu</button>
      <h1 className="game-title text-3xl uppercase sm:text-5xl">Case archive</h1>
      <p className="max-w-md text-sm text-[#c8d8d2]">Play alone or with a partner. Each case is a fresh room; send your partner the invite link from the room.</p>
      {error ? <p className="border border-red-300 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
      <details className="max-w-md border-l-2 border-[#e8ac51]/60 pl-3 text-sm text-[#c8d8d2]">
        <summary className="cursor-pointer uppercase text-[#e8ac51]">Set a custom deadline</summary>
        <p className="mt-2 leading-relaxed">By default your team gets the case’s suggested time plus half again. A custom limit is shared by both detectives. You can keep playing after the deadline, but closing the case in time earns a higher detective rank.</p>
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
        {ordered.map((game) => (
          <article
            className="game-dossier p-3 text-[#211d17] sm:p-5"
            key={game.generationJobId}
          >
            <p className="flex flex-wrap items-center justify-between gap-2 text-lg uppercase">
              <span>{game.difficulty} case <span className="text-xs text-[#5d4d3d]">· {suspects[game.difficulty]} suspects</span></span>
              {game.caseId === featuredId ? <span className="border-2 border-red-800 px-2 text-xs text-red-800">Case of the day</span> : <PlayedStamp bestStars={"bestStars" in game ? game.bestStars : undefined} played={game.played} />}
            </p>
            <h2 className="min-h-16 break-words border-b border-[#573821] pb-2 text-2xl uppercase leading-tight">
              {game.title}
            </h2>
            <p className="mt-3 break-words border-b border-[#8b7355]/60 pb-3 text-base leading-snug text-[#3e342a]">{game.description}</p>
            <button
              className="game-control-button mt-5 flex h-12 w-full items-center justify-center gap-2 text-lg uppercase text-[#e8ac51]"
              disabled={isWorking || invalidDeadline}
              onClick={() => { if (game.played === "solved" && confirmReplay !== game.caseId) setConfirmReplay(game.caseId); else onPlay(game, deadlineMinutes); }}
              type="button"
            >
              <ControlIcon name="play" />{confirmReplay === game.caseId ? "Replay anyway" : game.played === "in-progress" ? "Start a new room" : "Play case"}
            </button>
            {confirmReplay === game.caseId ? <p className="mt-2 text-sm text-red-900">You’ve solved this one, so you know the answer. Replay anyway?</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}

const suspects = { easy: "3–4", normal: "6–7", hard: "10+" } as const;

function PlayedStamp({ played, bestStars }: { played: "new" | "in-progress" | "given-up" | "solved"; bestStars?: number }) {
  if (played === "new") return null;
  const text = played === "solved" ? `Solved ${"★".repeat(bestStars ?? 0)}${"☆".repeat(5 - (bestStars ?? 0))}` : played === "given-up" ? "Given up" : "In progress";
  return <span className={`border-2 px-2 text-xs ${played === "solved" ? "border-emerald-900 text-emerald-900" : "border-[#6d5138] text-[#6d5138]"}`}>{text}</span>;
}

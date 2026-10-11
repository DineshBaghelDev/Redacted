"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "../../../../convex/_generated/api";
import { formatDuration } from "../../../lib/game-time";
import { menuButton } from "../constants";
import { ControlIcon } from "../control-icon";

const RANKS = ["Rookie", "Detective", "Inspector", "Chief Inspector"];

/** Every case this detective has closed, with simple career stats. Tapping one reopens its report. */
export function CaseHistoryScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (roomCode: string) => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const history = useQuery(api.sessions.listHistory, isLoaded && isSignedIn ? {} : "skip");
  const solved = (history ?? []).filter((entry) => entry.outcome === "solved");
  const averageStars = solved.length ? solved.reduce((sum, entry) => sum + (entry.stars ?? 0), 0) / solved.length : 0;
  const bestRank = solved.reduce((best, entry) => Math.max(best, RANKS.indexOf(entry.rank ?? "")), -1);
  const fastest = solved.reduce<number | null>((best, entry) => entry.tookMinutes === undefined ? best : best === null ? entry.tookMinutes : Math.min(best, entry.tookMinutes), null);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <button className={`${menuButton} w-fit`} onClick={onBack} type="button"><ControlIcon name="back" />Back to menu</button>
      <h1 className="game-title text-3xl uppercase sm:text-5xl">Case history</h1>
      {history === undefined ? <p className="text-xl uppercase text-[#c8d8d2]">Opening the files...</p> : null}
      {history?.length ? (
        <dl className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cases solved" value={String(solved.length)} />
          <Stat label="Average stars" value={solved.length ? averageStars.toFixed(1) : "–"} />
          <Stat label="Best rank" value={bestRank >= 0 ? RANKS[bestRank] : "–"} />
          <Stat label="Fastest solve" value={fastest === null ? "–" : formatDuration(fastest)} />
        </dl>
      ) : null}
      {history?.length === 0 ? <p className="max-w-md text-base text-[#c8d8d2]">No closed cases yet. Cases you file or give up on are kept here with their results.</p> : null}
      <ul className="grid min-w-0 content-start gap-3 pb-4 md:grid-cols-2">
        {history?.map((entry) => (
          <li key={entry.roomCode}>
            <button className="game-dossier block w-full p-4 text-left text-[#211d17] sm:p-5" onClick={() => onOpen(entry.roomCode)} type="button">
              <p className="flex items-center justify-between gap-3 text-xs uppercase text-red-800">
                <span>{entry.difficulty} case · {new Date(entry.closedAt).toLocaleDateString()}</span>
                <span className="font-mono text-base">{entry.outcome === "solved" ? `${"★".repeat(entry.stars ?? 0)}${"☆".repeat(5 - (entry.stars ?? 0))}` : entry.outcome === "judging" ? "Under review" : "Given up"}</span>
              </p>
              <h2 className="mt-2 break-words text-xl uppercase leading-tight">{entry.caseTitle}</h2>
              <p className="mt-2 text-sm text-[#5d4d3d]">
                {[entry.rank, entry.tookMinutes !== undefined ? `Case time ${formatDuration(entry.tookMinutes)}` : null, entry.partner ? `with ${entry.partner}` : "Solo"].filter(Boolean).join(" · ")}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-[#e8ac51]/60 pl-3">
      <dt className="text-xs uppercase tracking-[0.15em] text-[#c8d8d2]/70">{label}</dt>
      <dd className="mt-1 text-xl uppercase text-[#f1c987]">{value}</dd>
    </div>
  );
}

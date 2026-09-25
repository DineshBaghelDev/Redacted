"use client";

import { useState } from "react";
import type { EvidenceSet } from "../../../../convex/generation/core/evidence/types";
import { formatTime, type Lie, type Lies, type Story } from "../../../../convex/generation/core/schemas";
import type { NpcScript } from "../../../../convex/generation/core/scripts";
import type { CaseCheck } from "../../../../convex/generation/core/validate";
import { accessText } from "./evidence-views";

type Names = Map<string, string>;

const WHEN_CAUGHT: Record<Lie["whenCaught"], string> = {
  "full-truth": "tells the whole truth",
  "admit-shown": "admits only what the proof shows",
  "backup-lie": "switches to a backup lie",
};

function Proof({ ids, set, names }: { ids: string[]; set?: EvidenceSet; names: Names }) {
  return (
    <ul>
      {ids.map((id) => {
        const e = set?.evidence.find((x) => x.id === id);
        return (
          <li key={id} className={`text-xs ${e ? "" : "text-red-400"}`}>
            • {e ? `${e.title} — ${accessText(e, names)}` : `${id} (missing)`}
          </li>
        );
      })}
    </ul>
  );
}

/** Each person's lies: what they claim, what really happened, and which evidence breaks it. */
export function LiesView({ lies, story, set, names }: { lies: Lies; story?: Story; set?: EvidenceSet; names: Names }) {
  const truthText = (id: string) =>
    story?.events.find((e) => e.id === id)?.action ??
    story?.comms.find((c) => c.id === id)?.gist ??
    story?.purchases.find((p) => p.id === id)?.item ??
    id;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {lies.lies.map((lie) => (
        <div key={lie.id} className="border border-cyan-300/40 p-2">
          <div className="text-xs uppercase opacity-60">
            {names.get(lie.npcId) ?? lie.npcId} · {lie.topic}
          </div>
          <div className="text-yellow-200">&ldquo;{lie.claim}&rdquo;</div>
          <div className="mt-1 text-xs opacity-80">Why: {lie.reason}</div>
          {lie.truthIds.length > 0 && (
            <div className="mt-1 text-xs">
              <span className="opacity-60">Really: </span>
              {lie.truthIds.map(truthText).join(" · ")}
            </div>
          )}
          <div className="mt-1 text-xs opacity-60">Broken by showing:</div>
          <Proof ids={lie.disprovingEvidenceIds} set={set} names={names} />
          <div className="mt-1 text-xs">When caught: {WHEN_CAUGHT[lie.whenCaught]}</div>
          {lie.backupLie && (
            <div className="mt-2 border-l border-yellow-200/50 pl-2">
              <div className="text-xs opacity-60">Backup lie</div>
              <div className="text-yellow-200">&ldquo;{lie.backupLie.claim}&rdquo;</div>
              <Proof ids={lie.backupLie.disprovingEvidenceIds} set={set} names={names} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** One NPC at a time: who they are, what they know (in time order), their lies and rules. */
export function ScriptsView({ scripts }: { scripts: NpcScript[] }) {
  const [npcId, setNpcId] = useState(scripts[0]?.npcId);
  const s = scripts.find((x) => x.npcId === npcId);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {scripts.map((x) => (
          <button
            key={x.npcId}
            className={`border px-2 py-0.5 ${x.npcId === npcId ? "border-yellow-200 text-yellow-200" : "border-cyan-300/40"}`}
            onClick={() => setNpcId(x.npcId)}
          >
            {x.name}
          </button>
        ))}
      </div>
      {s && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <div className="text-yellow-200">
              {s.name}, {s.age}, {s.gender}
            </div>
            <div className="text-xs">
              {s.job} · lives at {s.home}
            </div>
            <div className="text-xs">Personality: {s.personality.join(", ")}</div>
            <div className="text-xs">To the victim: {s.relationshipToVictim}</div>
            <div className="text-xs">Secret: {s.secret}</div>
            <div className="text-xs">Protects: {s.protects}</div>
            <div className="mt-2 text-xs opacity-60">Lies</div>
            {s.lies.length === 0 && <div className="text-xs opacity-50">None.</div>}
            {s.lies.map((l) => (
              <div key={l.id} className="text-xs">
                &ldquo;{l.claim}&rdquo; <span className="opacity-60">({WHEN_CAUGHT[l.whenCaught]} when caught)</span>
              </div>
            ))}
            <div className="mt-2 text-xs opacity-60">Rules</div>
            <ul className="list-disc pl-4 text-xs">
              {s.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs opacity-60">What they know</div>
            <ul className="flex flex-col gap-1">
              {s.knowledge.map((k) => (
                <li key={`${k.how}-${k.id}`} className="border-l border-cyan-300/40 pl-2 text-xs">
                  <span className="opacity-60">
                    {formatTime(k.time)} · {k.how}
                    {k.where && ` · ${k.where}`}
                  </span>
                  <div>{k.text}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pass/fail list of the solvability checks, with the evidence that satisfies each. */
export function CheckView({ checks, set, names }: { checks: CaseCheck[]; set?: EvidenceSet; names: Names }) {
  return (
    <ul className="flex flex-col gap-2">
      {checks.map((c) => (
        <li key={c.id} className={`border-l-2 pl-2 ${c.ok ? "border-green-400" : "border-red-400"}`}>
          <span className={c.ok ? "text-green-300" : "text-red-400"}>{c.ok ? "✓" : "✗"}</span> {c.label}
          {c.problems.map((p) => (
            <div key={p} className="text-xs text-red-400">
              {p}
            </div>
          ))}
          {c.evidenceIds.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer opacity-60">{c.evidenceIds.length} pieces of evidence</summary>
              <Proof ids={[...new Set(c.evidenceIds)]} set={set} names={names} />
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

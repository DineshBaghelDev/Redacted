import { findRoom, streetRoute, type City } from "./city";
import type { Evidence, EvidenceSet } from "./evidence/types";
import type { Facts } from "./facts";
import type { Difficulty } from "./crimeCast";
import type { Lies } from "./schemas";

// Stage 10: the evidence a good investigation needs, where it is and what it costs in game minutes
// (fixed action costs from GAME_SYSTEMS.md), times a difficulty factor for dead ends.

const BUREAU = "police-bureau";
const LAB = "forensic-lab";
/** Real players don't know where to look: dead ends, wrong camera windows, questioning innocents. */
const DEAD_ENDS: Record<Difficulty, number> = { easy: 2, normal: 2.5, hard: 3 };
const COST = { search: 15 + 2, cctv: 5, lab: 5, records: 10, phone: 3 + 5, device: 5, interrogation: 9 } as const;

export type EstimateStep = { evidenceId: string; title: string; placeId: string; action: string; minutes: number };

function step(city: City, e: Evidence): EstimateStep {
  const a = e.access;
  const base = { evidenceId: e.id, title: e.title };
  switch (a.tool) {
    case "search":
      return { ...base, placeId: findRoom(city, a.roomId)?.place.id ?? BUREAU, action: `search ${a.roomId} (${a.slot})`, minutes: COST.search };
    case "lab":
      return { ...base, placeId: LAB, action: "forensic test", minutes: COST.lab };
    case "cctv":
      return { ...base, placeId: BUREAU, action: "review CCTV window", minutes: COST.cctv };
    case "records":
      return { ...base, placeId: BUREAU, action: "public records search", minutes: COST.records };
    case "phone":
      return { ...base, placeId: BUREAU, action: "get and read a phone", minutes: COST.phone };
    case "device":
      return { ...base, placeId: BUREAU, action: "read a device", minutes: COST.device };
    case "interrogation":
      return { ...base, placeId: BUREAU, action: "question someone (about 3 questions)", minutes: COST.interrogation };
  }
}

/**
 * The shortest useful investigation: decisive evidence, one piece per fact, each alibi, and proof for
 * the killer's lies, plus items that must be found before a lab test or device read.
 *
 * @returns Steps, travel minutes for a simple route from the bureau and back, and their total as a lower bound.
 */
export function estimateInput(city: City, set: EvidenceSet, facts: Facts, lies: Lies, killerId: string) {
  const byId = new Map(set.evidence.map((e) => [e.id, e]));
  const wanted = new Set([
    ...facts.decisiveIds,
    ...facts.facts.flatMap((f) => f.evidenceIds.slice(0, f.kind === "motive" ? 2 : 1)),
    ...lies.lies.filter((l) => l.npcId === killerId).map((l) => l.disprovingEvidenceIds[0]),
  ]);
  for (const id of [...wanted]) {
    const a = byId.get(id)?.access;
    if (a?.tool === "lab" && a.subjectId.startsWith("item:")) wanted.add(`item/${a.subjectId.slice(5)}`);
    if (a?.tool === "device") wanted.add(`item/${a.itemId}`);
  }
  const steps = [...wanted].filter((id) => byId.has(id)).map((id) => step(city, byId.get(id)!));

  // Nearest-place-first route from the bureau through every place with a step, then back.
  let at = BUREAU;
  let travelMinutes = 0;
  const left = new Set(steps.map((s) => s.placeId).filter((p) => p !== BUREAU));
  const minutes = (a: string, b: string) => streetRoute(city, a, b)?.minutes ?? 0;
  while (left.size) {
    const next = [...left].sort((a, b) => minutes(at, a) - minutes(at, b))[0];
    travelMinutes += minutes(at, next);
    left.delete(next);
    at = next;
  }
  travelMinutes += minutes(at, BUREAU);

  const lowerBound = travelMinutes + steps.reduce((n, s) => n + s.minutes, 0);
  return { steps, travelMinutes, lowerBound };
}

export type Estimate = ReturnType<typeof estimateTime>;

/**
 * How long a good investigation should take: the shortest one times the difficulty's dead-end factor,
 * rounded up to 15 minutes.
 */
export function estimateTime(city: City, set: EvidenceSet, facts: Facts, lies: Lies, killerId: string, difficulty: Difficulty) {
  const input = estimateInput(city, set, facts, lies, killerId);
  const factor = DEAD_ENDS[difficulty];
  const estimatedOptimalMinutes = Math.ceil((input.lowerBound * factor) / 15) * 15;
  const reasoningSummary = `A perfect investigation takes ${input.lowerBound} min (${input.steps.length} steps, ${input.travelMinutes} min travel). Times ${factor} for dead ends on ${difficulty}.`;
  return { ...input, estimatedOptimalMinutes, reasoningSummary };
}

import { describe, expect, it } from "vitest";
import { cast, crimeCore, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { streetRoute } from "./city";
import { createRng } from "./rng";
import type { Story } from "./schemas";
import { buildTimeline, checkTimeline, type Timeline } from "./timeline";

// Invariant tests: many seeds and randomly tweaked stories. Whenever the checker says "no problems",
// an independent re-check must agree the timeline is physically possible.

const CRIME_EVENTS = new Set(["murder", "take-ledger", "dump-weapon", "hide-coat", "discovery"]);

/** Independent re-check of the basic rules (does not reuse checkTimeline). */
function physicalProblems(timeline: Timeline) {
  const problems: string[] = [];
  const byActor = Map.groupBy(timeline.entries, (e) => e.actorId);
  for (const [actor, entries] of byActor) {
    const sorted = [...entries].sort((a, b) => a.start - b.start);
    sorted.forEach((e, i) => {
      if (e.end <= e.start) problems.push(`${actor}: empty entry ${e.id}`);
      if (e.start < timeline.windowStart) problems.push(`${actor}: before window ${e.id}`);
      const next = sorted[i + 1];
      if (!next) return;
      if (next.start < e.end) problems.push(`${actor}: overlap ${e.id} / ${next.id}`);
      const travel = e.placeId === next.placeId ? 0 : streetRoute(city, e.placeId, next.placeId)!.minutes;
      if (next.start - e.end < travel) problems.push(`${actor}: too fast ${e.id} -> ${next.id}`);
    });
  }
  const dead = timeline.entries.filter((e) => e.actorId === crimeCore.victimId && e.start > crimeCore.timeOfDeath);
  if (dead.length) problems.push("victim acts after death");
  return problems;
}

function tweak(seed: number): Story {
  const rng = createRng(seed);
  const movable = story.events.filter((e) => !CRIME_EVENTS.has(e.id));
  const target = rng.pick(movable);
  const shift = rng.int(-24, 24) * 5;
  return { ...story, events: story.events.map((e) => (e.id === target.id ? { ...e, start: e.start + shift, end: e.end + shift } : e)) };
}

describe("timeline invariants", () => {
  it("the hand-written case passes for 200 seeds", () => {
    for (let seed = 0; seed < 200; seed++) {
      const timeline = buildTimeline(city, crimeCore, cast, story, seed);
      expect(checkTimeline(city, crimeCore, cast, story, timeline), `seed ${seed}`).toEqual([]);
      expect(physicalProblems(timeline), `seed ${seed}`).toEqual([]);
    }
  });

  it("randomly shifted stories never crash, and a clean check really is clean", () => {
    let clean = 0;
    for (let seed = 0; seed < 200; seed++) {
      const tweaked = tweak(seed);
      const timeline = buildTimeline(city, crimeCore, cast, tweaked, seed);
      const problems = checkTimeline(city, crimeCore, cast, tweaked, timeline);
      if (problems.length === 0) {
        clean++;
        expect(physicalProblems(timeline), `seed ${seed}`).toEqual([]);
      }
    }
    expect(clean).toBeGreaterThan(0);
  });
});

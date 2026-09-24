import { describe, expect, it } from "vitest";
import { cast, crimeCore, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { at, castSchema, crimeCoreSchema, schemaProblems, storySchema, type Cast, type CrimeCore, type Story } from "./schemas";
import { buildTimeline, checkTimeline } from "./timeline";

const SEED = 1234;

function problemsFor(crime: CrimeCore = crimeCore, people: Cast = cast, events: Story = story) {
  return checkTimeline(city, crime, people, events, buildTimeline(city, crime, people, events, SEED));
}

function withEvent(id: string, change: Partial<Story["events"][number]>): Story {
  return { ...story, events: story.events.map((e) => (e.id === id ? { ...e, ...change } : e)) };
}

describe("hand-written easy case", () => {
  it("matches the stage shapes", () => {
    expect(schemaProblems(crimeCoreSchema, crimeCore)).toEqual([]);
    expect(schemaProblems(castSchema, cast)).toEqual([]);
    expect(schemaProblems(storySchema, story)).toEqual([]);
  });

  it("builds a timeline with no problems", () => {
    expect(problemsFor()).toEqual([]);
  });

  it("gives everyone something to do all window long, with the same result for the same seed", () => {
    const a = buildTimeline(city, crimeCore, cast, story, SEED);
    const b = buildTimeline(city, crimeCore, cast, story, SEED);
    expect(a).toEqual(b);
    for (const c of cast.characters) expect(a.entries.some((e) => e.actorId === c.id)).toBe(true);
  });

  it("keeps the victim at the scene and silent after death", () => {
    const { entries } = buildTimeline(city, crimeCore, cast, story, SEED);
    const last = entries.filter((e) => e.actorId === "daniel").at(-1)!;
    expect(last.roomId).toBe("keel-14:kitchen");
    expect(last.start).toBeLessThanOrEqual(crimeCore.timeOfDeath);
  });
});

describe("checkTimeline catches broken cases", () => {
  it("killer somewhere else at the time of death", () => {
    const broken = withEvent("murder", { actors: ["daniel"] });
    expect(problemsFor(crimeCore, cast, broken)).toContain("The killer isn't in the crime scene at Day 2 22:30.");
  });

  it("travel that is too fast", () => {
    const broken = withEvent("dump-weapon", { roomId: "pier-9:bay-1", enteredVia: undefined, leftVia: undefined });
    expect(problemsFor(crimeCore, cast, broken).some((p) => p.startsWith("Victor Hale can't get from"))).toBe(true);
  });

  it("victim acting after death", () => {
    const broken: Story = {
      ...story,
      comms: [...story.comms, { id: "ghost", from: "daniel", to: "nora", time: at(2, "23:00"), type: "message", gist: "hi", proves: [] }],
    };
    expect(problemsFor(crimeCore, cast, broken)).toContain("The victim calls or messages someone after dying.");
  });

  it("weapon ends up somewhere nothing took it", () => {
    const broken = withEvent("dump-weapon", { itemsUsed: [] });
    expect(problemsFor(crimeCore, cast, broken).join("\n")).toMatch(/Nothing in the story takes "Cast-iron doorstop" \(weapon\) from .*add an event in/);
  });

  it("more people in a job than the place has", () => {
    const extra = { ...cast.characters[1], id: "victor2", name: "Victor Two" };
    const broken: Cast = { characters: [...cast.characters, extra] };
    expect(problemsFor(crimeCore, broken).join("\n")).toMatch(/Meridian Tower has only \d+ "executive" job\(s\), but .*Victor Two/);
  });

  it("story window longer than 2 days", () => {
    const broken = { ...crimeCore, windowStart: at(1, "00:00") - 1440 };
    expect(problemsFor(broken)).toContain("windowStart must be 0 (Day 1 00:00).");
  });
});

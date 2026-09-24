import { describe, expect, it } from "vitest";
import { brief, cast, crimeCore, lies, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { storyPrompt } from "../prompts/story";
import { briefProblems } from "./brief";
import { estimateInput, estimateProblems } from "./estimate";
import { buildEvidence } from "./evidence";
import { buildFacts } from "./facts";
import { keepValidLies } from "./lies";
import { STORY_RULES, storyProblems } from "./story";
import { applyTexts, textProblems, textTargets } from "./text";
import { buildTimeline } from "./timeline";

const SEED = 1234;
const timeline = buildTimeline(city, crimeCore, cast, story, SEED);
const set = buildEvidence(city, crimeCore, cast, story, timeline, "easy", SEED);
const facts = buildFacts(city, crimeCore, cast, story, set);

describe("story check", () => {
  it("hand-written story passes, and the prompt carries every rule", () => {
    expect(storyProblems(city, crimeCore, cast, story, "easy", SEED)).toEqual([]);
    const prompt = storyPrompt(city, crimeCore, cast, "easy");
    for (const rule of STORY_RULES) expect(prompt).toContain(rule);
    expect(prompt).toContain("keel-14:back-door Back door [entrance]");
  });

  it("goes past the timeline: a story that leaves an innocent without an alibi fails", () => {
    const broken = { ...story, events: story.events.filter((e) => e.id !== "lena-bar") };
    expect(storyProblems(city, crimeCore, cast, broken, "easy", SEED).join("\n")).toMatch(/Nothing clears Lena Ortiz/);
  });

  it("catches duplicate ids", () => {
    const broken = { ...story, events: [...story.events, story.events[0]] };
    expect(storyProblems(city, crimeCore, cast, broken, "easy", SEED)[0]).toMatch(/used twice: nora-pills/);
  });
});

describe("lies clean-up", () => {
  it("drops lies that can't be caught and keeps the rest", () => {
    const bad = { ...lies.lies[2], id: "bad", disprovingEvidenceIds: ["nope"] };
    const kept = keepValidLies(crimeCore, cast, story, set, { lies: [...lies.lies, bad] });
    expect(kept.lies.map((l) => l.id)).toEqual(lies.lies.map((l) => l.id));
  });
});

describe("written text", () => {
  const targets = textTargets(cast, story, set);

  it("targets messages once, device files and witness statements", () => {
    expect(targets.map((t) => t.id)).toEqual(expect.arrayContaining(["debt-message", "file/laptop/0", "witness/eli/cafe-argument"]));
    expect(targets.some((t) => t.id.startsWith("message/"))).toBe(false);
  });

  it("rejects added people, places and times", () => {
    const problems = textProblems(city, cast, targets, {
      texts: [{ id: "debt-message", text: "Lena, pay me by 18:00 or Victor hears about it at the Blue Lantern Bar." }],
    });
    expect(problems.join("\n")).toMatch(/Victor Hale/);
    expect(problems.join("\n")).toMatch(/18:00/);
    expect(problems.join("\n")).toMatch(/Blue Lantern Bar/);
    expect(textProblems(city, cast, targets, { texts: [{ id: "debt-message", text: "Lena, I need my $5,000 back by Friday." }] })).toEqual([]);
  });

  it("applies a message's text to both phones", () => {
    const out = applyTexts(set, { texts: [{ id: "debt-message", text: "Pay up." }] });
    expect(out.evidence.filter((e) => e.summary === "Pay up.").map((e) => e.id)).toEqual(["message/debt-message/daniel", "message/debt-message/lena"]);
  });
});

describe("brief", () => {
  it("hand-written brief passes; naming the killer or the hidden weapon fails", () => {
    expect(briefProblems(crimeCore, cast, story, brief)).toEqual([]);
    const leaky = { ...brief, initialFacts: [...brief.initialFacts.slice(0, 3), "Victor Hale was seen nearby with a cast-iron doorstop."] };
    const problems = briefProblems(crimeCore, cast, story, leaky);
    expect(problems.join("\n")).toMatch(/names Victor Hale/);
    expect(problems.join("\n")).toMatch(/names the weapon/);
  });
});

describe("time estimate", () => {
  it("builds steps with a lower bound and keeps the estimate within 1–4 times it", () => {
    const input = estimateInput(city, set, facts, lies, "victor");
    expect(input.steps.map((s) => s.evidenceId)).toEqual(expect.arrayContaining(facts.decisiveIds));
    expect(input.lowerBound).toBeGreaterThan(input.travelMinutes);
    expect(estimateProblems(input.lowerBound, { estimatedOptimalMinutes: input.lowerBound - 1, reasoningSummary: "" })[0]).toMatch(/below/);
    expect(estimateProblems(input.lowerBound, { estimatedOptimalMinutes: input.lowerBound * 5, reasoningSummary: "" })[0]).toMatch(/4 times/);
    expect(estimateProblems(input.lowerBound, { estimatedOptimalMinutes: input.lowerBound * 2, reasoningSummary: "" })).toEqual([]);
  });
});

describe("lies clean-up keeps a good main lie", () => {
  it("drops only a broken backup lie and switches to admitting what the proof shows", () => {
    const victorHome = lies.lies.find((l) => l.id === "victor-home")!;
    const broken = { ...victorHome, backupLie: { claim: "x", disprovingEvidenceIds: ["nope"] } };
    const kept = keepValidLies(crimeCore, cast, story, set, { lies: [broken] });
    expect(kept.lies).toHaveLength(1);
    expect(kept.lies[0]).toMatchObject({ id: "victor-home", whenCaught: "admit-shown", backupLie: undefined });
  });
});

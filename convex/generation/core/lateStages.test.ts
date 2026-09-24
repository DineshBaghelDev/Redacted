import { describe, expect, it } from "vitest";
import { brief, cast, crimeCore, lies, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { storyPrompt } from "../prompts/story";
import { briefProblems } from "./brief";
import { estimateInput, estimateTime } from "./estimate";
import { buildEvidence } from "./evidence";
import { buildFacts } from "./facts";
import { keepValidLies } from "./lies";
import { evidencePlan, STORY_RULES, storyProblems } from "./story";
import { buildScripts, scriptProblems } from "./scripts";
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
    expect(prompt).toContain("keel-14:back-door [entrance] [no items]");
  });

  it("goes past the timeline: a story that loses the decisive evidence fails", () => {
    // Victor doesn't take the ledger or wear the coat: nothing decisive is left.
    const broken = {
      ...story,
      events: story.events.filter((e) => e.id !== "take-ledger").map((e) => ({ ...e, itemsUsed: e.itemsUsed.filter((i) => i !== "overcoat" && i !== "ledger") })),
      items: story.items.filter((i) => i.id !== "ledger"),
    };
    expect(storyProblems(city, crimeCore, cast, broken, "easy", SEED).join("\n")).toMatch(/decisive/);
  });

  it("an innocent without an alibi is fine", () => {
    const noBar = { ...story, events: story.events.filter((e) => e.id !== "lena-bar") };
    expect(storyProblems(city, crimeCore, cast, noBar, "easy", SEED)).toEqual([]);
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
  it("builds steps with a lower bound and scales it by difficulty", () => {
    const input = estimateInput(city, set, facts, lies, "victor");
    expect(input.steps.map((s) => s.evidenceId)).toEqual(expect.arrayContaining(facts.decisiveIds));
    expect(input.lowerBound).toBeGreaterThan(input.travelMinutes);
    const easy = estimateTime(city, set, facts, lies, "victor", "easy").estimatedOptimalMinutes;
    const hard = estimateTime(city, set, facts, lies, "victor", "hard").estimatedOptimalMinutes;
    expect(easy % 15).toBe(0);
    expect(easy).toBeGreaterThanOrEqual(input.lowerBound * 2);
    expect(hard).toBeGreaterThan(easy);
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

describe("evidence plan", () => {
  it("offers only the routes this crime allows", () => {
    const plan = evidencePlan(city, crimeCore, "easy");
    expect(plan.needed).toBe(2);
    expect(plan.decisive.join(" | ")).toMatch(/blood on the killer's clothing/);
    expect(plan.accomplice).toEqual([]);
    const wiped = evidencePlan(city, { ...crimeCore, coverUp: ["wipe-prints"], weapon: { ...crimeCore.weapon, category: "firearm" } }, "hard");
    expect(wiped.needed).toBe(1);
    expect(wiped.decisive.join(" | ")).not.toMatch(/prints on the weapon|blood on the killer's clothing/);
    expect(wiped.decisive.join(" | ")).toMatch(/killer's home/);
    expect(wiped.weaponToKiller.join(" | ")).not.toMatch(/prints/);
    expect(wiped.weaponToKiller.join(" | ")).toMatch(/ownerId set to the killer/);
  });

  it("goes into the story prompt", () => {
    const prompt = storyPrompt(city, crimeCore, cast, "easy");
    expect(prompt).toContain("Decisive evidence: at least 2 piece(s). Use these 2:");
    expect(prompt).toContain("Link the weapon to the killer");
  });
});

describe("story copying the solution", () => {
  it("a story that copies the method word for word goes back for a repair", () => {
    const copied = { ...story, events: story.events.map((e, i) => (i === 0 ? { ...e, action: crimeCore.method } : e)) };
    expect(storyProblems(city, crimeCore, cast, copied, "easy", 1234)).toEqual(["The story copies the crime core's method word for word; describe it in your own words."]);
  });
});

describe("script leak check", () => {
  it("everyone may hear the body was found, even when the finding was private", () => {
    const privateFind = {
      ...story,
      events: story.events.map((e) => (e.actors.includes(crimeCore.discovery.byId) && e.roomId === crimeCore.sceneRoomId ? { ...e, visibility: "private" as const } : e)),
    };
    const scripts = buildScripts(city, crimeCore, cast, privateFind, set, lies);
    expect(scriptProblems(crimeCore, privateFind, scripts)).toEqual([]);
  });
});

describe("suspects need substance", () => {
  it("a suspect missing from the story goes back for a repair", () => {
    const tom = "tom";
    const without = {
      ...story,
      events: story.events.map((e) => ({ ...e, actors: e.actors.filter((a) => a !== tom) })).filter((e) => e.actors.length > 0),
      comms: story.comms.filter((m) => m.from !== tom && m.to !== tom),
      purchases: story.purchases.filter((p) => p.who !== tom),
    };
    expect(storyProblems(city, crimeCore, cast, without, "easy", SEED)[0]).toMatch(/don't appear in the story.*\(tom\)/);
  });
});

describe("brief and a hidden weapon", () => {
  it("can't name a weapon the killer hid, even if it's still at the scene", () => {
    const hiddenAtScene = { ...story, items: story.items.map((i) => (i.id === "weapon" ? { ...i, finalRoomId: crimeCore.sceneRoomId } : i)) };
    const weapon = hiddenAtScene.items.find((i) => i.id === "weapon")!;
    const naming = { ...brief, initialFacts: [...brief.initialFacts.slice(0, 3), `A ${weapon.name.toLowerCase()} was found nearby.`] };
    expect(briefProblems(crimeCore, cast, hiddenAtScene, naming).join(" | ")).toMatch(/isn't in plain sight/);
  });
});

describe("lie clean-up", () => {
  it("drops only the bad proof ids and keeps the lie", () => {
    const main = lies.lies.find((l) => l.npcId === crimeCore.killerId && l.topic === "whereabouts")!;
    const withBad = { lies: lies.lies.map((l) => (l.id === main.id ? { ...l, disprovingEvidenceIds: [...l.disprovingEvidenceIds, "no-such-evidence"] } : l)) };
    const kept = keepValidLies(crimeCore, cast, story, set, withBad).lies.find((l) => l.id === main.id);
    expect(kept?.disprovingEvidenceIds).toEqual(main.disprovingEvidenceIds);
  });
});

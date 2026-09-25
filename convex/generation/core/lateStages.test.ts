import { describe, expect, it } from "vitest";
import { brief, cast, crimeCore, lies, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { storyPrompt } from "../prompts/story";
import { briefProblems } from "./brief";
import { estimateInput, estimateTime } from "./estimate";
import { buildEvidence } from "./evidence";
import { buildFacts } from "./facts";
import { keepValidLies } from "./lies";
import { clockProblems, evidencePlan, storyProblems, storyRules, tidyStory } from "./story";
import { buildScripts, scriptProblems } from "./scripts";
import { applyTexts, textProblems, textTargets } from "./text";
import { buildTimeline, checkTimeline } from "./timeline";
import { castBrief, tidyCast } from "./crimeCast";
import { clockTimesIn, wrongPartsOfDay } from "./clock";

const SEED = 1234;
const timeline = buildTimeline(city, crimeCore, cast, story, SEED);
const set = buildEvidence(city, crimeCore, cast, story, timeline, "easy", SEED);
const facts = buildFacts(city, crimeCore, cast, story, set);

describe("story check", () => {
  it("hand-written story passes, and the prompt carries every rule", () => {
    expect(storyProblems(city, crimeCore, cast, story, "easy", SEED)).toEqual([]);
    const prompt = storyPrompt(city, crimeCore, cast, "easy");
    for (const rule of storyRules(crimeCore)) expect(prompt).toContain(rule);
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
    expect(briefProblems(city, crimeCore, cast, story, brief)).toEqual([]);
    const leaky = { ...brief, initialFacts: [...brief.initialFacts.slice(0, 3), "Victor Hale was seen nearby with a cast-iron doorstop."] };
    const problems = briefProblems(city, crimeCore, cast, story, leaky);
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
    expect(plan.routes.map((r) => r.checkId)).toEqual(["culprit", "weapon"]);
    const wiped = evidencePlan(city, { ...crimeCore, coverUp: ["wipe-prints"], weapon: { ...crimeCore.weapon, category: "firearm" } } as typeof crimeCore, "hard");
    expect(wiped.needed).toBe(1);
    expect(wiped.decisive.join(" | ")).not.toMatch(/prints on the weapon|blood on the killer's clothing/);
    expect(wiped.decisive.join(" | ")).toMatch(/killer's home/);
    const weaponWays = wiped.routes.find((r) => r.checkId === "weapon")!.ways.join(" | ");
    expect(weaponWays).not.toMatch(/prints on the weapon/);
    expect(weaponWays).toMatch(/ownerId set to the killer/);
    expect(weaponWays).toMatch(/buys the weapon by card/);
    const withHelper = evidencePlan(city, { ...crimeCore, accomplice: { id: "lena", role: "fake-alibi" } }, "normal");
    expect(withHelper.routes.map((r) => r.checkId)).toContain("accomplice");
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
    expect(briefProblems(city, crimeCore, cast, hiddenAtScene, naming).join(" | ")).toMatch(/isn't in plain sight/);
  });
});

describe("lie clean-up", () => {
  it("drops only the bad proof ids and keeps the lie", () => {
    const main = lies.lies.find((l) => l.npcId === crimeCore.culpritId && l.topic === "whereabouts")!;
    const withBad = { lies: lies.lies.map((l) => (l.id === main.id ? { ...l, disprovingEvidenceIds: [...l.disprovingEvidenceIds, "no-such-evidence"] } : l)) };
    const kept = keepValidLies(crimeCore, cast, story, set, withBad).lies.find((l) => l.id === main.id);
    expect(kept?.disprovingEvidenceIds).toEqual(main.disprovingEvidenceIds);
  });
});

describe("wording that disagrees with the data", () => {
  it("flags a clock time an event's own time contradicts", () => {
    const at = (action: string, start: number) => ({ ...story, events: [{ ...story.events[0], id: "e", action, start, end: start + 30 }] });
    expect(clockProblems(at("He dozed through his two o'clock round.", 1260))).toHaveLength(1);
    expect(clockProblems(at("She arrived at 9:30 pm sharp.", 1290))).toEqual([]);
    expect(clockProblems(at("He left at 2 a.m. for the docks.", 1440 + 120))).toEqual([]);
    expect(clockProblems(at("They met for the eight o'clock briefing.", 1440 + 1200))).toEqual([]);
  });

  it("rejects a brief that invents a weekday", () => {
    const tuesday = { ...brief, summary: `${brief.summary} It happened early Tuesday.` };
    expect(briefProblems(city, crimeCore, cast, story, tuesday).join(" | ")).toMatch(/Tuesday/);
  });
});

describe("clock times in prose", () => {
  it("reads am/pm, dotted and o'clock times", () => {
    expect(clockTimesIn("left at 7.30am, back by 9 pm, then the two o'clock bus").map((t) => t.minutes)).toEqual([[450], [1260], [120, 840]]);
  });
});

describe("a fall has no weapon item", () => {
  it("drops the weapon routes and asks for no weapon item", () => {
    const fall = { ...crimeCore, weapon: { ...crimeCore.weapon, category: "fall" as const } };
    const plan = evidencePlan(city, fall, "normal");
    expect(plan.routes.map((r) => r.checkId)).toEqual(["culprit"]);
    expect(plan.decisive.join(" | ")).not.toMatch(/weapon/);
    expect(storyRules(fall).join(" | ")).toMatch(/A fall has no weapon/);
    expect(storyProblems(city, fall, cast, story, "normal", 1234).join(" | ")).toMatch(/remove the item with id "weapon"/);
    // Without the weapon item, nothing asks to link a weapon to the killer.
    const noWeapon = { ...story, items: story.items.filter((i) => i.id !== "weapon"), events: story.events.map((e) => ({ ...e, itemsUsed: e.itemsUsed.filter((i) => i !== "weapon") })) };
    const facts = buildFacts(city, fall, cast, noWeapon, buildEvidence(city, fall, cast, noWeapon, buildTimeline(city, fall, cast, noWeapon, SEED), "normal", SEED));
    expect(facts.facts.map((f) => f.id)).not.toContain("weapon-to-killer");
    expect(storyProblems(city, fall, cast, noWeapon, "normal", SEED).join(" | ")).not.toMatch(/weapon to the killer|links to Victor/);
  });
});

describe("brief part of day", () => {
  it("rejects a part of day that doesn't fit the discovery time", () => {
    // The hand-written body is found at Day 3 08:15.
    const evening = { ...brief, summary: `${brief.summary} Her friend came by that evening.` };
    expect(briefProblems(city, crimeCore, cast, story, evening).join(" | ")).toMatch(/says "evening"/);
    const morning = { ...brief, summary: `${brief.summary} It was found in the morning.` };
    expect(briefProblems(city, crimeCore, cast, story, morning)).toEqual([]);
  });
});

describe("parts of the day in events", () => {
  it("are not checked: actions often mention plans or other times", () => {
    const at = (action: string, start: number) => ({ ...story, events: [{ ...story.events[0], id: "e", action, start, end: start + 12 }] });
    expect(clockProblems(at("Clara tells Hana she has a family matter to settle that afternoon.", 1440 + 120))).toEqual([]);
  });
});

describe("text times", () => {
  it("accepts the same time in 12-hour form, rejects a new one", () => {
    const targets = [{ id: "t", kind: "statement" as const, people: [], source: "Day 2 21:30–Day 2 21:45: Tom left." }];
    expect(textProblems(city, cast, targets, { texts: [{ id: "t", text: "I saw Tom leave at 9:30." }] })).toEqual([]);
    expect(textProblems(city, cast, targets, { texts: [{ id: "t", text: "I saw Tom leave at 9:50." }] })).toHaveLength(1);
  });
});

describe("code fixes before a story is checked", () => {
  it("renames duplicate ids and gives an owned item's move to its owner's event there", () => {
    const e0 = story.events[0];
    const dupe = { ...story, events: [...story.events, { ...e0 }], comms: [...story.comms, { ...story.comms[0] }] };
    const fixed = tidyStory(dupe);
    const ids = [...fixed.events, ...fixed.comms].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);

    const owner = cast.characters.find((c) => c.role === "suspect")!;
    const ownerEvent = { ...e0, id: "owner-home", actors: [owner.id], roomId: "keel-14:living", itemsUsed: [] };
    const bag = { ...story.items[0], id: "bag", kind: "other" as const, ownerId: owner.id, startRoomId: "keel-14:kitchen", finalRoomId: "keel-14:living" };
    const moved = tidyStory({ ...story, events: [...story.events, ownerEvent], items: [...story.items, bag] });
    expect(moved.events.find((e) => e.id === "owner-home")!.itemsUsed).toContain("bag");
  });

  it("only requires an event for the weapon's move", () => {
    const stray = { ...story.items[0], id: "note", kind: "document" as const, ownerId: undefined, startRoomId: "keel-14:kitchen", finalRoomId: "keel-14:living" };
    const withStray = { ...story, items: [...story.items, stray] };
    expect(checkTimeline(city, crimeCore, cast, withStray, buildTimeline(city, crimeCore, cast, withStray, SEED)).join(" | ")).not.toMatch(/"note"/);
  });
});

describe("code fixes before a cast is checked", () => {
  it("renames ids to the lowercase first name and sets the victim's routine", () => {
    const seed = 5;
    const { victimRoutine } = castBrief(seed, "easy");
    const off = { characters: cast.characters.map((c) => (c.role === "witness" && c.id !== crimeCore.discovery.byId ? { ...c, id: `${c.id}-x` } : c.id === crimeCore.victimId ? { ...c, routine: victimRoutine === "office" ? ("shop" as const) : ("office" as const) } : c)) };
    const fixed = tidyCast(city, crimeCore, off, seed, "easy");
    for (const c of fixed.characters) if (c.role === "witness" && c.id !== crimeCore.discovery.byId) expect(c.id).toBe(c.name.split(" ")[0].toLowerCase());
    const victim = fixed.characters.find((c) => c.id === crimeCore.victimId)!;
    expect(victim.routine).toBe(victimRoutine);
    if (victimRoutine === "unemployed" || victimRoutine === "student") expect(victim.hangoutPlaceId).toBeTruthy();
  });
});

describe("fixes from the PR review", () => {
  it("scene prints only include people living in the scene room, not the whole block", () => {
    const block = city.places.find((p) => p.building.homeUnits.length > 2)!;
    const [flatA, flatB] = block.building.homeUnits;
    const [a, b] = cast.characters.filter((c) => c.role === "witness");
    const blockCast = { characters: cast.characters.map((c) => (c.id === a.id ? { ...c, homeUnitId: flatA.id } : c.id === b.id ? { ...c, homeUnitId: flatB.id } : c)) };
    const inFlat = { ...crimeCore, sceneRoomId: flatA.roomId };
    const t = buildTimeline(city, inFlat, blockCast, story, SEED);
    const prints = buildEvidence(city, inFlat, blockCast, story, t, "easy", SEED).evidence.find((e) => e.id === "forensic/scene/prints")!;
    expect(prints.aboutIds).toContain(a.id);
    expect(prints.aboutIds).not.toContain(b.id);
  });

  it("blood on a weapon the killer owns isn't decisive", () => {
    const owned = { ...story, items: story.items.map((i) => (i.id === "weapon" ? { ...i, ownerId: crimeCore.culpritId } : i)) };
    const t = buildTimeline(city, crimeCore, cast, owned, SEED);
    const f = buildFacts(city, crimeCore, cast, owned, buildEvidence(city, crimeCore, cast, owned, t, "easy", SEED));
    expect(f.decisiveIds).not.toContain("forensic/weapon/blood");
  });

  it("an NPC in a house gets a readable home, not a raw id", () => {
    const scripts = buildScripts(city, crimeCore, cast, story, set, lies);
    for (const s of scripts) expect(s.home).not.toMatch(/:home$/);
  });

  it("names with regex characters don't break the name checks", () => {
    const odd = { characters: cast.characters.map((c) => (c.id === crimeCore.culpritId ? { ...c, name: "Victor (Vic) Hale+" } : c)) };
    expect(() => briefProblems(city, crimeCore, odd, story, brief)).not.toThrow();
    const targets = [{ id: "t", kind: "statement" as const, people: [], source: "x" }];
    expect(() => textProblems(city, odd, targets, { texts: [{ id: "t", text: "Hi" }] })).not.toThrow();
  });

  it("a part of day is checked at the span's last minute too", () => {
    expect(wrongPartsOfDay("late that night", 1440 + 1139, 1440 + 1145)).toEqual([]);
  });
});

describe("part of day by overlap", () => {
  it("finds a boundary inside a short span and across midnight", () => {
    const d2 = 1440;
    expect(wrongPartsOfDay("that night", d2 + 18 * 60 + 57, d2 + 19 * 60 + 4)).toEqual([]);
    expect(wrongPartsOfDay("that night", d2 + 12 * 60, d2 + 12 * 60 + 30)).toEqual(["night"]);
    expect(wrongPartsOfDay("that evening", d2 + 23 * 60 + 50, d2 + 24 * 60 + 10)).toEqual([]);
    expect(wrongPartsOfDay("that evening", d2 + 60, d2 + 90)).toEqual(["evening"]);
    expect(wrongPartsOfDay("that afternoon", d2, d2 + 1440)).toEqual([]);
  });
});

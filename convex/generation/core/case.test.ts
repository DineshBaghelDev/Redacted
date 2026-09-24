import { describe, expect, it } from "vitest";
import { cast, crimeCore, lies, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { buildEvidence } from "./evidence";
import type { EvidenceSet } from "./evidence/types";
import { buildFacts } from "./facts";
import { checkLies } from "./lies";
import type { Lie, Lies } from "./schemas";
import { buildScripts, scriptProblems } from "./scripts";
import { buildTimeline } from "./timeline";
import { validateCase, validationProblems } from "./validate";

const SEED = 1234;
const timeline = buildTimeline(city, crimeCore, cast, story, SEED);
const set = buildEvidence(city, crimeCore, cast, story, timeline, "easy", SEED);
const facts = buildFacts(city, crimeCore, cast, story, set);

const validate = (s: EvidenceSet = set, l: Lies = lies) =>
  validationProblems(validateCase(city, crimeCore, cast, story, s, buildFacts(city, crimeCore, cast, story, s), l, "easy"));
const without = (drop: (id: string) => boolean): EvidenceSet => ({ ...set, evidence: set.evidence.filter((e) => !drop(e.id)) });
const withLie = (id: string, change: Partial<Lie>): Lies => ({ lies: lies.lies.map((l) => (l.id === id ? { ...l, ...change } : l)) });

describe("lies", () => {
  it("hand-written lies pass", () => {
    expect(checkLies(crimeCore, cast, story, set, lies)).toEqual([]);
  });

  it("rejects proof that doesn't exist, background items and the liar's own statement", () => {
    const clutter = set.evidence.find((e) => e.type === "item" && e.data.clutter)!.id;
    const problems = checkLies(crimeCore, cast, story, set, withLie("lena-debt", { disprovingEvidenceIds: ["nope", clutter, "witness/lena/cafe-argument"] }));
    expect(problems.join("\n")).toMatch(/"nope" doesn't exist/);
    expect(problems.join("\n")).toMatch(/background item/);
    expect(problems.join("\n")).toMatch(/liar's own statement/);
  });

  it("rejects proof unrelated to the liar", () => {
    expect(checkLies(crimeCore, cast, story, set, withLie("nora-pills", { disprovingEvidenceIds: ["record/tom/0"] }))[0]).toMatch(/isn't about Nora/);
  });

  it("the killer needs a whereabouts lie hiding the murder", () => {
    const l = { lies: lies.lies.filter((x) => x.id !== "victor-home") };
    expect(checkLies(crimeCore, cast, story, set, l)).toContain("Victor Hale needs a whereabouts lie that hides the murder.");
  });

  it("a backup lie needs its own proof", () => {
    const l = withLie("victor-home", { backupLie: { claim: "x", disprovingEvidenceIds: ["forensic/footprints/keel-14:back-door"] } });
    expect(checkLies(crimeCore, cast, story, set, l).join("\n")).toMatch(/needs proof other than/);
    expect(checkLies(crimeCore, cast, story, set, withLie("victor-home", { backupLie: undefined })).join("\n")).toMatch(/has none/);
  });
});

describe("NPC scripts", () => {
  const scripts = buildScripts(city, crimeCore, cast, story, set, lies);
  const script = (id: string) => scripts.find((s) => s.npcId === id)!;
  const knows = (id: string) => script(id).knowledge.map((k) => k.id);

  it("has no script for the victim", () => {
    expect(scripts.some((s) => s.npcId === crimeCore.victimId)).toBe(false);
  });

  it("knowledge is what they took part in or saw", () => {
    expect(knows("eli")).toContain("cafe-argument");
    expect(knows("eli")).not.toContain("murder");
    expect(knows("victor")).toEqual(expect.arrayContaining(["murder", "office-confrontation", "victor-call"]));
    expect(knows("tom")).toContain("tom-beer");
    expect(scriptProblems(crimeCore, story, scripts)).toEqual([]);
  });

  it("only the killer gets the never-confess rule", () => {
    expect(script("victor").rules.join(" ")).toMatch(/Never confess/);
    expect(script("lena").rules.join(" ")).not.toMatch(/Never confess/);
  });

  it("flags leaks", () => {
    const leaky = scripts.map((s) =>
      s.npcId === "eli" ? { ...s, knowledge: [...s.knowledge, { id: "murder", how: "saw" as const, time: 0, text: crimeCore.method }] } : s,
    );
    expect(scriptProblems(crimeCore, story, leaky)).toHaveLength(2);
  });
});

describe("can the case be solved", () => {
  it("the hand-written case passes every check with no AI", () => {
    expect(validate()).toEqual([]);
    expect(facts.decisiveIds).toEqual(expect.arrayContaining(["forensic/overcoat/blood", "item/ledger"]));
  });

  it("fails when nothing puts the killer at the scene", () => {
    const s = without((id) => id.startsWith("forensic/") || id.startsWith("cctv/"));
    expect(validate(s).join("\n")).toMatch(/place Victor Hale at the scene/);
  });

  it("fails when an innocent can't be cleared", () => {
    const s = without((id) => id === "card/tom-beer" || (id.startsWith("cctv/") && set.evidence.find((e) => e.id === id)!.aboutIds.includes("tom")));
    expect(validate(s)).toContain("Every innocent suspect can be cleared: Nothing clears Tom Rusk.");
  });

  it("a witness lying about what they saw can't clear anyone", () => {
    const samuelLie: Lie = {
      id: "samuel-shift",
      npcId: "samuel",
      topic: "whereabouts",
      claim: "I worked alone that night.",
      truthIds: ["nora-shift"],
      reason: "test",
      disprovingEvidenceIds: ["witness/nora/nora-shift"],
      whenCaught: "full-truth",
    };
    expect(validate(set, { lies: [...lies.lies, samuelLie] })).toContain("Every innocent suspect can be cleared: Nothing clears Nora Reyes.");
  });

  it("fails when a lie's proof is missing", () => {
    expect(validate(without((id) => id === "item/painkillers")).join("\n")).toMatch(/Every lie can be caught: .*"item\/painkillers" doesn't exist/);
  });

  it("fails when one piece of evidence names the killer", () => {
    const s = { ...set, evidence: [...set.evidence, { ...set.evidence.find((e) => e.id === "record/victor/0")!, id: "x", summary: "Victor Hale killed Daniel." }] };
    expect(validate(s).join("\n")).toMatch(/names the killer outright/);
  });

  it("easy needs two decisive pieces", () => {
    expect(validate(without((id) => id === "item/ledger")).join("\n")).toMatch(/Only 1 reachable piece\(s\) of evidence that is decisive/);
  });
});

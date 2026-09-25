import type { z } from "zod";
import type { City } from "../city";
import type { Difficulty } from "../crimeCast";
import type { Evidence, EvidenceSet } from "../evidence/types";
import type { Fact, Facts } from "../facts";
import type { Rng } from "../rng";
import type { Brief, Cast, CrimeBase, Story } from "../schemas";
import type { Timeline } from "../timeline";
import type { CaseCheck } from "../validate";

// A crime kind (murder now; theft, robbery later) plugs everything specific to that crime into the
// shared pipeline: its extra crime-core fields, rules, evidence, facts, checks and wording. The shared
// code handles people, times, places, cameras, phones, witnesses, lies and the culprit's presence.

/** Words the shared rules, prompts and messages use for this kind of crime. */
export type CrimeWords = {
  /** e.g. "murder" */
  crime: string;
  /** e.g. "killer" */
  culprit: string;
  /** e.g. "time of death" */
  crimeTime: string;
  /** e.g. "the body is found" */
  discovery: string;
  /** e.g. "whoever finds the body" */
  finder: string;
};

/** The parts of a case every kind hook can read. */
export type CaseParts<C extends CrimeBase = CrimeBase> = { city: City; crime: C; cast: Cast; story: Story };

/** A check the story is often short of, with the ways this crime allows to meet it. */
export type EvidenceRoute = { checkId: string; label: string; ways: string[] };

export type CrimeKind<C extends CrimeBase = CrimeBase> = {
  type: string;
  words: CrimeWords;
  /** The crime core's output shape (the AI's structured-output schema). */
  schema: z.ZodType<C>;

  // Stage 1: crime core
  /** This kind's seeded choices (e.g. weapon category): lines for the prompt's brief, and the matching check. */
  picks(rng: Rng): { lines: string[]; problems(crime: C): string[] };
  crimeRules: string[];
  /** Field notes for this kind's fields, shown in the crime prompt. */
  crimeNotes: string[];
  /** Checks on this kind's own fields (e.g. the weapon's room exists). */
  crimeProblems(city: City, crime: C): string[];
  /** One line for the "don't repeat recent cases" list. */
  summary(crime: C): string;

  // Stage 3: story
  /** When the victim's day ends (murder: the death); undefined when they live on. */
  victimEndsAt?(crime: C): number;
  storyRules(crime: C): string[];
  /** The "items:" line of the story prompt's "What to write". */
  storyItems: string;
  evidenceNotes: string[];
  /** Decisive-evidence kinds this crime adds, in plain words, for rules and problem messages. */
  decisiveKinds: string[];
  /** Ways this crime's story can get decisive evidence (simplest first) and meet its own link checks. */
  plan(parts: Pick<CaseParts<C>, "city" | "crime">, difficulty: Difficulty): { decisive: string[]; routes: EvidenceRoute[] };
  timelineProblems(parts: CaseParts<C>, timeline: Timeline): string[];

  // Stages 4, 5, 11: evidence, facts and checks
  /** Items whose prints the "wipe-prints" cover-up removes. */
  keyItemIds: string[];
  /** Where the victim's phone is found; by default the victim hands it over when questioned. */
  victimPhone?(crime: C): Evidence["access"];
  /** Evidence only this crime produces (murder: autopsy, blood, weapon tests). */
  evidence(parts: CaseParts<C>, difficulty: Difficulty, nameOf: (id: string) => string): Evidence[];
  /** This crime's facts (murder: weapon links, method) and its decisive evidence. */
  facts(parts: CaseParts<C>, set: EvidenceSet): { facts: Fact[]; decisive: Evidence[] };
  /** This crime's own solvability checks (murder: weapon, method). */
  checks(parts: CaseParts<C>, facts: Facts, atLeast: (ids: string[], n: number, what: string) => string[]): CaseCheck[];
  /** Evidence of this crime's decisive sort that points at an innocent person. */
  pointsAt(parts: CaseParts<C>, set: EvidenceSet, personId: string): Evidence[];
  /** Verbs that, between the culprit's and the victim's names, give the answer away. */
  shortcutVerbs: string;

  // Stages 8 and 9: NPC scripts and case brief
  scriptRules: { culprit: string; accomplice: string; innocent: string };
  /** What everyone hears once the crime is discovered. */
  news(parts: CaseParts<C>, when: number): string;
  briefRules: string[];
  /** What the police know when called in, as "label: value" lines for the brief prompt. */
  briefFacts(parts: CaseParts<C>): string[];
  /** This crime's own leak and content checks on the brief. */
  briefProblems(parts: CaseParts<C>, brief: Brief): string[];
};

export const makeCheck = (id: string, label: string, evidenceIds: string[], problems: string[]): CaseCheck => ({
  id,
  label,
  ok: problems.length === 0,
  problems,
  evidenceIds,
});

/** The story event where the crime happens: the culprit in the scene room at the crime time. */
export function crimeEvent(crime: CrimeBase, story: Story) {
  return story.events.find((e) => e.roomId === crime.sceneRoomId && e.actors.includes(crime.culpritId) && e.start <= crime.crimeTime && crime.crimeTime <= e.end);
}

/** Is this person in a story event in the scene room at this time? */
export function inSceneAt(crime: CrimeBase, timeline: Timeline, personId: string, time: number) {
  return timeline.entries.some((e) => e.actorId === personId && e.start <= time && time <= e.end && e.roomId === crime.sceneRoomId && e.source === "story");
}

export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

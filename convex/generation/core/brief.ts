import { crimeKind } from "./crimes";
import type { Brief, Cast, CrimeBase, Story } from "./schemas";
import type { City } from "./city";

// Stage 9: what investigators legitimately know at the start. The crime kind says what that is.

const SHAPE_RULE = "title: 2–5 words, like a case file name. summary: 2–4 plain sentences. initialFacts: 3–5 short facts.";

/** The brief's rules: the kind's, plus the shape every brief has. */
export function briefRules(crime: CrimeBase) {
  return [...crimeKind(crime).briefRules, SHAPE_RULE];
}

/** What the police know when called in, worked out by code (as "label: value" lines). */
export function briefFacts(city: City, crime: CrimeBase, cast: Cast, story: Story) {
  return crimeKind(crime).briefFacts({ city, crime, cast, story });
}

/**
 * Leak check: the brief must not name the culprit or accomplice, or carry the hidden motive or method;
 * the kind adds its own (murder: a weapon that isn't in plain sight).
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function briefProblems(city: City, crime: CrimeBase, cast: Cast, story: Story, brief: Brief) {
  const problems: string[] = [];
  const text = [brief.title, brief.summary, ...brief.initialFacts].join(" ");
  const lower = text.toLowerCase();
  // Name parts shared with the victim or the finder (e.g. a family surname) are fine.
  const safe = new Set(
    [crime.victimId, crime.discovery.byId].flatMap((id) => cast.characters.find((c) => c.id === id)?.name.toLowerCase().split(" ") ?? []),
  );
  for (const id of [crime.culpritId, crime.accomplice?.id].filter(Boolean)) {
    const person = cast.characters.find((c) => c.id === id);
    for (const part of person?.name.split(" ").filter((p) => p.length > 2 && !p.endsWith(".") && !safe.has(p.toLowerCase())) ?? []) {
      if (new RegExp(`\\b${part}\\b`, "i").test(text)) problems.push(`The brief names ${person!.name}, who is a culprit.`);
    }
  }
  if (lower.includes(crime.method.toLowerCase().slice(0, 40))) problems.push("The brief copies the hidden method.");
  if (lower.includes(crime.motive.details.toLowerCase().slice(0, 40))) problems.push("The brief copies the hidden motive.");
  problems.push(...crimeKind(crime).briefProblems({ city, crime, cast, story }, brief));
  if (brief.initialFacts.length < 3 || brief.initialFacts.length > 5) problems.push("The brief needs 3–5 initial facts.");
  return problems;
}

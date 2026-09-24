import type { City } from "./city";
import { buildEvidence } from "./evidence";
import { buildFacts } from "./facts";
import type { Cast, CrimeCore, Story } from "./schemas";
import { buildTimeline, checkTimeline } from "./timeline";
import type { Difficulty } from "./crimeCast";
import { validateCase, validationProblems } from "./validate";

// Story rules: the same text goes into the AI prompt, and storyProblems enforces it.

export const STORY_RULES = [
  "Ids of events, messages, purchases and items are short, unique and kebab-case. Actors, senders and buyers are cast ids.",
  "Times are whole minutes from Day 1 00:00. Everything happens between 0 and the time the body is found.",
  "Every roomId is copied from the room list. enteredVia/leftVia, when given, is an [entrance] room of the same building.",
  "Nobody is in two events at once, and there is enough travel time between events at different places (see travel minutes). Everyday routines are added by code around your events; you only write what matters.",
  "The murder is one event in the crime scene room with the killer and the victim, covering the time of death, with \"weapon\" in itemsUsed. The victim does nothing after it (no events, messages or purchases).",
  "Exactly one item has id \"weapon\" and kind \"weapon\", starting in the crime's weapon origin room. An item that ends in a different room from where it starts needs an event in its final room that uses it. finalSlot is one of that room's search spots.",
  "Whoever finds the body has an event in the crime scene room starting at the discovery time.",
  "If there is an accomplice, the killer and accomplice must meet or talk in the story.",
  "Visibility: \"public\" events can be seen by anyone at the same place; \"private\" events are known only to their actors.",
  "Tag with proves [\"motive\"] the messages, items, device files that show the killer's real motive; at least two things (records count) must prove it.",
];

/** How code turns the story into evidence, so the AI can plan a solvable case. */
export const EVIDENCE_NOTES = [
  "Cameras record people passing or staying where cameras are (by appearance, never by name).",
  "Calls and messages are on both phones. Card purchases leave a record; cash leaves nothing.",
  "Items are found where they end up. Anyone who handled an item (owner or actor in an event using it) leaves prints on it, unless the cover-up wipes the weapon.",
  "Clothing owned by the killer and listed in the murder event's itemsUsed gets the victim's blood (blunt or sharp weapons) and leaves fibers on the weapon and at the scene.",
  "Side doors (enteredVia/leftVia) the killer uses at the scene building get their shoe prints.",
  "The weapon links to the killer through their prints on it (not with wipe-prints), fibers from their clothing, or the killer caught on camera in the weapon's origin room during a story event there that uses the weapon (e.g. taking poison from a pharmacy store with a camera).",
  "Anyone at the same place during a public event becomes a witness to it.",
  "Decisive evidence (at least 2 pieces on easy): the victim's blood on the killer's clothing, the killer's prints on the weapon, the killer on the scene room's camera at the time of death, or something taken from the scene that ends up in the killer's home.",
  "Every innocent suspect needs an alibi at the time of death: a public event far enough away that others see them, a camera, or a card purchase.",
];

/**
 * Checks the story end to end: timeline first, then (if that passes) whether the evidence it produces
 * makes the case solvable. Lies aren't written yet, so their checks are skipped.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function storyProblems(city: City, crime: CrimeCore, cast: Cast, story: Story, difficulty: Difficulty, seed: number) {
  const ids = [...story.events, ...story.comms, ...story.purchases, ...story.items].map((x) => x.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) return [`These ids are used twice: ${dupes.join(", ")}.`];
  const timeline = buildTimeline(city, crime, cast, story, seed);
  const timelineProblems = checkTimeline(city, crime, cast, story, timeline);
  if (timelineProblems.length) return timelineProblems;
  const set = buildEvidence(city, crime, cast, story, timeline, difficulty, seed);
  const facts = buildFacts(city, crime, cast, story, set);
  const checks = validateCase(city, crime, cast, story, set, facts, { lies: [] }, difficulty).filter((c) => c.id !== "lies");
  return validationProblems(checks);
}

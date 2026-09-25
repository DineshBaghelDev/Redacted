import { findRoom, type City } from "./city";
import { capitalize, crimeKind, type CrimeKind } from "./crimes";
import { buildEvidence, evidenceProblems } from "./evidence";
import { listCameras } from "./evidence/cctv";
import { buildFacts, factProblems } from "./facts";
import { formatTime, type Cast, type CrimeBase, type Story } from "./schemas";
import { buildTimeline, checkTimeline } from "./timeline";
import { clockTimesIn, nearSpan, wrongPartsOfDay } from "./clock";
import type { Difficulty } from "./crimeCast";
import { validateCase, validationProblems } from "./validate";

// Story rules: the same text goes into the AI prompt, and storyProblems enforces it. Shared rules come
// first, then the crime kind's own.

export function storyRules(crime: CrimeBase) {
  const kind = crimeKind(crime);
  const w = kind.words;
  return [
    "Ids of events, messages, purchases and items are short, unique and kebab-case. Actors, senders and buyers are cast ids.",
    `Times are whole minutes from Day 1 00:00. Everything happens between 0 and the time ${w.discovery}. Every event lasts at least 1 minute (end is after start); a quick action takes 2–5 minutes.`,
    "Every roomId is copied from the room list. enteredVia/leftVia, when given, is an [entrance] room of the same building.",
    "Nobody is in two events at once, and there is enough travel time between events at different places (see travel minutes). Everyday routines are added by code around your events; you only write what matters.",
    ...kind.storyRules(crime),
    "An item that ends in a different room from where it starts needs an event in its final room that uses it. finalSlot is where in the room it ends up (e.g. a drawer, the bin); rooms marked [no items] can't hold one.",
    `${capitalize(w.finder)} has an event in the crime scene room starting at the discovery time.`,
    `Every suspect appears in the story (an event, call, message or purchase) in a way that backs up why police would suspect them: a clash with the victim, a debt, being near the scene around the ${w.crimeTime}.`,
    `At least one innocent suspect has no alibi or is out near the scene around the ${w.crimeTime}, so the ${w.culprit} isn't the only one who could have done it.`,
    "Nobody states a plan to commit the crime or confesses in a message or call. Motive evidence is indirect: a debt notice, a letter about the will, an argument someone overheard.",
    `Everything the ${w.culprit} does has a reason in the story; never add an action only to create evidence.`,
    `If there is an accomplice, the ${w.culprit} and accomplice must meet or talk in the story.`,
    "An event's action happens at that event's own time: never mention a clock time or part of day in it that disagrees with its start and end (after midnight is night, not evening).",
    "Write every action, gist and file in your own words; never copy the crime core's method or motive text (NPC scripts are built from the story and must not contain it).",
    'Visibility: "public" events can be seen by anyone at the same place; "private" events are known only to their actors.',
    `Tag with proves ["motive"] the messages, items, device files that show the ${w.culprit}'s real motive; at least two things (records count) must prove it.`,
  ];
}

/** How code turns the story into evidence, so the AI can plan a solvable case. */
export function evidenceNotes(kind: CrimeKind) {
  const w = kind.words;
  const decisive = [...kind.decisiveKinds, `the ${w.culprit} on the scene room's camera at the ${w.crimeTime}`, `something taken from the scene that ends up in the ${w.culprit}'s home`];
  return [
    "Cameras record people passing or staying where cameras are (by appearance, never by name).",
    "Calls and messages are on both phones. Card purchases leave a record; cash leaves nothing.",
    "Items are found where they end up. Anyone who handled an item (owner or actor in an event using it) leaves prints on it, unless the cover-up wipes it.",
    `Clothing owned by the ${w.culprit} and listed in the ${w.crime} event's itemsUsed leaves fibers at the scene. Doors (enteredVia/leftVia) the ${w.culprit} uses at the scene building get their shoe prints.`,
    ...kind.evidenceNotes,
    "Anyone at the same place during a public event becomes a witness to it.",
    `At least 2 different kinds of evidence must place the ${w.culprit} at or near the scene around the ${w.crimeTime}. Lab traces at the scene (prints, fibers, shoe prints) are one kind; add a camera, a witness at a public event, or a card purchase at the scene's place.`,
    `Decisive evidence (at least 2 pieces on easy): ${decisive.join(", ")}.`,
    "Innocent suspects may or may not have a provable alibi (a public event elsewhere that others see, a camera, a card purchase); the story decides. Nothing decisive may point at an innocent.",
  ];
}

/**
 * The ways this crime allows to meet the evidence checks the story is most often short of (decisive
 * evidence, placing the culprit at the scene, the kind's own links, the accomplice), so the story can
 * plan them instead of finding out from the checks.
 */
export function evidencePlan(city: City, crime: CrimeBase, difficulty: Difficulty) {
  const kind = crimeKind(crime);
  const w = kind.words;
  const own = kind.plan({ city, crime }, difficulty);
  const off = crime.disabledCamera?.cameraId;
  const scenePlace = crime.sceneRoomId.split(":")[0];
  const sceneHasCamera = !!findRoom(city, crime.sceneRoomId)?.place.building.cameraRoomIds.includes(crime.sceneRoomId) && off !== `cam:${crime.sceneRoomId}`;
  const nearCameras = listCameras(city)
    .filter((c) => c.id !== off && (c.placeId === scenePlace || c.streetId?.split("~").includes(scenePlace)))
    .map((c) => c.id);
  const wiped = crime.coverUp.includes("wipe-prints");
  // Simplest first: the prompt tells the story to use the first ones it needs.
  const decisive = [
    ...own.decisive.slice(0, 1),
    ...(sceneHasCamera ? [`the ${w.culprit} on the scene room's camera at the ${w.crimeTime}: the ${w.culprit} is in the scene room then`] : []),
    ...own.decisive.slice(1),
    `something the ${w.culprit} takes from the scene for a reason the story makes clear (e.g. the document it was about) and that ends up in their home: an item starting in the scene building, not owned by the ${w.culprit}, whose final room is in the ${w.culprit}'s home, with an event there that uses it`,
  ];
  const atScene = [
    `lab traces at the scene count as one kind: ${wiped ? "fibers from clothing the " + w.culprit + " wears in the " + w.crime + " event, or" : "their prints in the scene room (automatic), fibers, or"} shoe prints (an enteredVia or leftVia on their event at the scene, with shoes in their appearance)`,
    ...(nearCameras.length ? [`a camera: the ${w.culprit} passes or stays in view of ${nearCameras.join(", ")} within an hour of the ${w.crimeTime}`] : []),
    `a witness: a public event at the scene's place (${scenePlace}) within an hour of the ${w.crimeTime} where someone sees the ${w.culprit}`,
    `a card purchase by the ${w.culprit} at ${scenePlace} within an hour of the ${w.crimeTime}`,
  ];
  const routes = [
    { checkId: "culprit", label: `Place the ${w.culprit} at the scene with 2 different kinds of evidence`, ways: atScene },
    ...own.routes,
    ...(crime.accomplice
      ? [{ checkId: "accomplice", label: `Link the accomplice to the ${w.culprit} (at least 1)`, ways: [`a call or message between the ${w.culprit} and the accomplice`, 'a message, item or device file tagged proves ["accomplice"]'] }]
      : []),
  ];
  return { needed: difficulty === "easy" ? 2 : 1, decisive, routes };
}

/**
 * Events whose wording names a clock time that disagrees with the event's own time, e.g. "dozed
 * through his two o'clock round" in an event at 21:00. A time within half an hour of the event is fine.
 */
export function clockProblems(story: Story) {
  return story.events.flatMap((e) => {
    const says = (what: string) => `Event "${e.id}" says "${what}" but happens at ${formatTime(e.start)}–${formatTime(e.end)}: change the wording or the time so they agree.`;
    return [
      ...clockTimesIn(e.action)
        .filter((t) => !t.minutes.some((m) => nearSpan(m, e.start, e.end, 30)))
        .map((t) => says(t.said)),
      ...wrongPartsOfDay(e.action, e.start, e.end).map(says),
    ];
  });
}

/**
 * Checks the story end to end: timeline first, then (if that passes) whether the evidence it produces
 * makes the case solvable. Lies aren't written yet, so their checks are skipped.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function storyProblems(city: City, crime: CrimeBase, cast: Cast, story: Story, difficulty: Difficulty, seed: number) {
  const ids = [...story.events, ...story.comms, ...story.purchases, ...story.items].map((x) => x.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) return [`These ids are used twice: ${dupes.join(", ")}.`];
  // NPC scripts are built from the story; the scripts check rejects the solution's own wording.
  const text = JSON.stringify(story);
  const copied = [...(text.includes(crime.method) ? ["method"] : []), ...(text.includes(crime.motive.details) ? ["motive details"] : [])];
  if (copied.length) return copied.map((what) => `The story copies the crime core's ${what} word for word; describe it in your own words.`);
  const inStory = new Set([...story.events.flatMap((e) => e.actors), ...story.comms.flatMap((m) => [m.from, m.to]), ...story.purchases.map((p) => p.who)]);
  const missing = cast.characters.filter((c) => c.role === "suspect" && !inStory.has(c.id)).map((c) => `${c.name} (${c.id})`);
  const clock = clockProblems(story);
  if (clock.length) return clock;
  if (missing.length) return [`These suspects don't appear in the story, so nothing backs up why police would suspect them: ${missing.join(", ")}. Give each one an event, call, message or purchase that does.`];
  const timeline = buildTimeline(city, crime, cast, story, seed);
  const timelineProblems = checkTimeline(city, crime, cast, story, timeline);
  if (timelineProblems.length) return timelineProblems;
  const set = buildEvidence(city, crime, cast, story, timeline, difficulty, seed);
  // The switched-off camera needs someone there to switch it off; only the story can fix that.
  const cameraProblems = evidenceProblems(crime, timeline, set);
  if (cameraProblems.length) return cameraProblems;
  const facts = buildFacts(city, crime, cast, story, set);
  // The same checks the later code stages run, so nothing fails there that a story repair could have fixed.
  const earlyProblems = factProblems(facts);
  if (earlyProblems.length) return earlyProblems;
  const checks = validateCase(city, crime, cast, story, set, facts, { lies: [] }, difficulty).filter((c) => c.id !== "lies");
  const problems = validationProblems(checks);
  // The general messages don't say which ways this crime allows; the repair needs that.
  const plan = evidencePlan(city, crime, difficulty);
  const failed = (id: string) => checks.some((c) => c.id === id && !c.ok);
  if (failed("evidence")) problems.push(`Ways to get decisive evidence in this case: ${plan.decisive.join("; ")}.`);
  for (const route of plan.routes) if (failed(route.checkId)) problems.push(`${route.label}. Ways in this case: ${route.ways.join("; ")}.`);
  return problems;
}

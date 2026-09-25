import { findRoom, type City } from "./city";
import { capitalize, crimeKind, crimeTypeFor, type CrimeWords } from "./crimes";
import { listCameras } from "./evidence/cctv";
import { FIRST_NAMES, SURNAMES } from "./names";
import { createRng } from "./rng";
import { routineTypes, type Cast, type CrimeBase } from "./schemas";

// Rules for the crime core and cast. The same text goes into the AI prompts and the checks below
// enforce it, so the AI is told exactly what the checker will reject. Rules every crime kind shares
// live here; each kind adds its own (see crimes/).

export type Difficulty = "easy" | "normal" | "hard";

const DAY = 1440;

export const SUSPECTS: Record<Difficulty, [number, number]> = { easy: [3, 4], normal: [6, 7], hard: [10, 12] };
export const WITNESSES: [number, number] = [3, 6];

/** Crime-core rules every kind shares. */
export const crimeRules = (w: CrimeWords) => [
  'Ids are lowercase first names from the brief\'s name list (e.g. "amara"). The cast stage creates these people later.',
  `The victim, the ${w.culprit} (culpritId), any accomplice and ${w.finder} (discovery.byId) are all different people. Nobody discovers their own crime.`,
  "Times are whole minutes from Day 1 00:00 (Day 2 00:00 = 1440). windowStart is 0.",
  `The ${w.crime} happens on Day 2: crimeTime (the ${w.crimeTime}) is 1440–2879. discovery.time (when ${w.discovery}) comes after it, before the end of Day 3 (4319).`,
  "sceneRoomId must be a room id from the city list, at the place given in the brief.",
  "Follow the brief: every choice it lists, whether there is an accomplice, and the part of Day 2 it happens in.",
  'coverUp lists only what the culprit really does, each step once. If it includes "disable-camera", fill disabledCamera with a camera id from the list; otherwise leave it null.',
];

export const castRules = (difficulty: Difficulty, w: CrimeWords) => [
  `Create every person the crime core names, using exactly those ids: the victim (role "victim"), the ${w.culprit} and any accomplice (role "suspect"), and ${w.finder}.`,
  `Exactly one victim, ${SUSPECTS[difficulty][0]}–${SUSPECTS[difficulty][1]} suspects (the ${w.culprit} included), ${WITNESSES[0]}–${WITNESSES[1]} witnesses. Ids are unique.`,
  "homeUnitId must be a home id from the list. People may share a home only if they live together.",
  'job is null or uses a place id and a job title from that place\'s jobs; "cashier ×2" means at most 2 people in the cast have that job there. job.roomId, if given, is a room of that place.',
  "routine is one of: office, night-shift, shop, unemployed, student. Unemployed people and students need a hangoutPlaceId (a public place id).",
  `Innocent suspects need a reason police would look at them (fakeMotive: a motive, a grudge, or just being near at the wrong time). At least 2 of them have a motive as serious as the ${w.culprit}'s (money, revenge, jealousy, a secret the victim could expose), so the ${w.culprit} isn't obvious. The ${w.culprit} has no fakeMotive.`,
  "secret and protects only where the person really has something serious to hide (it could get them arrested, fired, or ruin their reputation or family) or someone to shield; leave them out otherwise. Most people have none.",
  "appearance is what a camera would see: height, build, usual clothing, and shoes for anyone who might leave footprints.",
];

/** Parts of Day 2 the crime can fall in, as [from, to) game minutes. */
const CRIME_TIMES = [
  { label: "night (00:00–06:00)", from: DAY, to: DAY + 360 },
  { label: "morning (06:00–12:00)", from: DAY + 360, to: DAY + 720 },
  { label: "afternoon (12:00–18:00)", from: DAY + 720, to: DAY + 1080 },
  { label: "evening (18:00–24:00)", from: DAY + 1080, to: 2 * DAY },
];

/** Share of cases with an accomplice. Left to the AI, it never picks one. */
const ACCOMPLICE_SHARE = 0.2;

/**
 * The seed's choices for the crime, so cases vary: the kind of crime and its own choices (for a murder,
 * motive type and weapon category), the crime-scene place, accomplice or not, the part of Day 2 it
 * falls in, and the names this case may use.
 */
export function crimeBrief(city: City, seed: number) {
  const rng = createRng(seed + 7);
  const type = crimeTypeFor(seed);
  // The kind's picks come first so existing seeds keep their motive and weapon.
  const picks = crimeKind(type).picks(rng);
  const scenes = city.places.filter((p) => p.crimeSceneAllowed);
  return {
    type,
    picks,
    scenePlaceId: rng.pick(scenes).id,
    accomplice: rng.next() < ACCOMPLICE_SHARE,
    crimeTime: rng.pick(CRIME_TIMES),
    firstNames: rng.shuffle(FIRST_NAMES).slice(0, 24),
    surnames: rng.shuffle(SURNAMES).slice(0, 20),
  };
}

/** The seed's choices for the cast: the exact number of suspects and the victim's daily routine. */
export function castBrief(seed: number, difficulty: Difficulty) {
  const rng = createRng(seed + 11);
  const [min, max] = SUSPECTS[difficulty];
  return { suspects: rng.int(min, max), victimRoutine: rng.pick(routineTypes) };
}

/**
 * Checks the crime core on its own: rooms exist, times fit the window, it follows the brief, plus the
 * kind's own checks.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function crimeProblems(city: City, crime: CrimeBase, brief?: ReturnType<typeof crimeBrief>) {
  const problems: string[] = [];
  const kind = crimeKind(crime);
  const w = kind.words;
  const scene = findRoom(city, crime.sceneRoomId);
  if (!scene) problems.push(`Crime scene room ${crime.sceneRoomId} doesn't exist.`);
  else if (!scene.place.crimeSceneAllowed) problems.push(`${scene.place.name} can't be a crime scene.`);
  problems.push(...kind.crimeProblems(city, crime));

  const people = [crime.victimId, crime.culpritId, crime.accomplice?.id, crime.discovery.byId].filter(Boolean);
  if (new Set(people).size !== people.length) problems.push(`The victim, ${w.culprit}, accomplice and ${w.finder} must be different people.`);

  if (new Set(crime.coverUp).size !== crime.coverUp.length) problems.push("The cover-up lists the same step twice.");
  if (crime.coverUp.includes("disable-camera") !== !!crime.disabledCamera) {
    problems.push('disabledCamera must be filled exactly when the cover-up includes "disable-camera".');
  }
  if (crime.disabledCamera && !listCameras(city).some((c) => c.id === crime.disabledCamera!.cameraId)) {
    problems.push(`Camera ${crime.disabledCamera.cameraId} doesn't exist.`);
  }

  if (crime.windowStart !== 0) problems.push("windowStart must be 0 (Day 1 00:00).");
  if (crime.crimeTime < DAY || crime.crimeTime >= 2 * DAY) problems.push(`The ${w.crime} must happen on Day 2 (crimeTime 1440–2879).`);
  if (crime.discovery.time <= crime.crimeTime) problems.push(`discovery.time must be after crimeTime: ${w.discovery} after the ${w.crime}.`);
  if (crime.discovery.time >= 3 * DAY) problems.push("discovery.time must be before the end of Day 3 (4319).");

  if (brief) {
    if (crime.type !== brief.type) problems.push(`This case is a ${brief.type}.`);
    else problems.push(...brief.picks.problems(crime));
    if (scene && scene.place.id !== brief.scenePlaceId) problems.push(`The crime must happen at ${brief.scenePlaceId}.`);
    if (!!crime.accomplice !== brief.accomplice) problems.push(brief.accomplice ? "This case needs an accomplice." : "This case has no accomplice.");
    const band = brief.crimeTime;
    if (crime.crimeTime < band.from || crime.crimeTime >= band.to) problems.push(`The ${w.crime} must happen on Day 2 in the ${band.label}.`);
    const names = new Set(brief.firstNames.map((n) => n.toLowerCase()));
    for (const id of people) if (!names.has(id!)) problems.push(`"${id}" isn't a lowercase first name from the name list.`);
  }
  return problems;
}

/**
 * Checks the cast against the city and the crime core: roles, counts, homes, jobs, hangouts.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function castProblems(city: City, crime: CrimeBase, cast: Cast, difficulty?: Difficulty, seed?: number) {
  const problems: string[] = [];
  const w = crimeKind(crime).words;
  const people = new Map(cast.characters.map((c) => [c.id, c]));

  if (people.size !== cast.characters.length) problems.push("Two people share an id.");
  if (people.get(crime.victimId)?.role !== "victim") problems.push("The victim is missing from the cast or not marked as the victim.");
  if (people.get(crime.culpritId)?.role !== "suspect") problems.push(`The ${w.culprit} is missing from the cast or not marked as a suspect.`);
  if (!people.has(crime.discovery.byId)) problems.push(`${capitalize(w.finder)} (${crime.discovery.byId}) is not in the cast.`);
  if (crime.accomplice && people.get(crime.accomplice.id)?.role !== "suspect") problems.push("The accomplice must be a suspect.");
  if (people.get(crime.culpritId)?.fakeMotive) problems.push(`The ${w.culprit} shouldn't have a fake motive.`);
  for (const c of cast.characters) {
    if (c.role === "suspect" && c.id !== crime.culpritId && c.id !== crime.accomplice?.id && !c.fakeMotive?.trim()) {
      problems.push(`${c.name} is a suspect with no reason police would look at them: give a fakeMotive tied to the victim (a motive, a grudge, or being near at the wrong time), or make them a witness.`);
    }
  }

  const count = (role: string) => cast.characters.filter((c) => c.role === role).length;
  if (count("victim") !== 1) problems.push(`There must be exactly one victim (found ${count("victim")}).`);
  if (difficulty) {
    const [min, max] = SUSPECTS[difficulty];
    if (count("suspect") < min || count("suspect") > max) problems.push(`Need ${min}–${max} suspects for ${difficulty} (found ${count("suspect")}).`);
  }
  // The seeded brief (only for AI output; the hand-written case predates it).
  if (seed !== undefined && difficulty) {
    const { suspects, victimRoutine } = castBrief(seed, difficulty);
    if (count("suspect") !== suspects) problems.push(`This case needs exactly ${suspects} suspects (found ${count("suspect")}).`);
    const victim = people.get(crime.victimId);
    if (victim && victim.routine !== victimRoutine) problems.push(`The victim's routine must be "${victimRoutine}".`);
    const { firstNames, surnames } = crimeBrief(city, seed);
    for (const c of cast.characters) {
      const parts = c.name.split(" ");
      const [first, last] = [parts[0], parts[parts.length - 1]];
      if (!firstNames.includes(first as (typeof firstNames)[number])) problems.push(`${c.name}: the first name must come from the name list.`);
      if (parts.length < 2 || !surnames.includes(last as (typeof surnames)[number])) problems.push(`${c.name}: the surname must come from the surname list.`);
      if (c.id !== first.toLowerCase()) problems.push(`${c.name}'s id must be "${first.toLowerCase()}".`);
    }
  }
  if (count("witness") < WITNESSES[0] || count("witness") > WITNESSES[1]) {
    problems.push(`Need ${WITNESSES[0]}–${WITNESSES[1]} witnesses (found ${count("witness")}).`);
  }

  const homeIds = new Set(city.places.flatMap((p) => p.building.homeUnits.map((u) => u.id)));
  const jobsTaken = new Map<string, number>();
  for (const c of cast.characters) {
    if (!homeIds.has(c.homeUnitId)) problems.push(`${c.name} lives in unknown home ${c.homeUnitId}.`);
    if (c.job) {
      const place = city.places.find((p) => p.id === c.job!.placeId);
      if (!place) problems.push(`${c.name} works at unknown place ${c.job.placeId}.`);
      else {
        const key = `${place.id}/${c.job.title}`;
        jobsTaken.set(key, (jobsTaken.get(key) ?? 0) + 1);
        const slots = place.jobSlots.filter((s) => s === c.job!.title).length;
        if (jobsTaken.get(key)! > slots) {
          const holders = cast.characters.filter((o) => o.job?.placeId === place.id && o.job.title === c.job!.title).map((o) => o.name);
          problems.push(`${place.name} has only ${slots} "${c.job.title}" job(s), but ${holders.join(", ")} all have it: give ${c.name} another job or place.`);
        }
      }
      if (c.job.roomId && (!c.job.roomId.startsWith(`${c.job.placeId}:`) || !findRoom(city, c.job.roomId))) {
        problems.push(`${c.name}'s work room isn't a room of their workplace.`);
      }
    }
    if ((c.routine === "unemployed" || c.routine === "student") && !c.hangoutPlaceId) {
      problems.push(`${c.name} needs a place to spend the afternoon.`);
    }
    if (c.hangoutPlaceId && city.places.find((p) => p.id === c.hangoutPlaceId)?.kind !== "public") {
      problems.push(`${c.name}'s hangout ${c.hangoutPlaceId} isn't a public place.`);
    }
  }
  return problems;
}

/**
 * Last clean-up for an AI cast whose counts are still off after repairs: extra innocent suspects become
 * witnesses (without their fake motive), then extra witnesses are removed. People the crime names are
 * never touched. Safe because nothing is built on the cast yet.
 */
export function trimCast(crime: CrimeBase, cast: Cast, seed: number, difficulty: Difficulty): Cast {
  const named = new Set([crime.victimId, crime.culpritId, crime.accomplice?.id, crime.discovery.byId]);
  const { suspects } = castBrief(seed, difficulty);
  let extraSuspects = cast.characters.filter((c) => c.role === "suspect").length - suspects;
  let characters = cast.characters.map((c) => {
    if (extraSuspects <= 0 || c.role !== "suspect" || named.has(c.id)) return c;
    extraSuspects--;
    return { ...c, role: "witness" as const, fakeMotive: undefined };
  });
  let extraWitnesses = characters.filter((c) => c.role === "witness").length - WITNESSES[1];
  characters = [...characters].reverse().filter((c) => {
    if (extraWitnesses <= 0 || c.role !== "witness" || named.has(c.id)) return true;
    extraWitnesses--;
    return false;
  }).reverse();
  return { characters };
}

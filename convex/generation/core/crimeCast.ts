import { findRoom, type City } from "./city";
import { listCameras } from "./evidence/cctv";
import { createRng } from "./rng";
import { crimeCoreSchema, type Cast, type CrimeCore } from "./schemas";

// Rules for the crime core and cast. The same text goes into the AI prompts and the checks below
// enforce it, so the AI is told exactly what the checker will reject.

export type Difficulty = "easy" | "normal" | "hard";

const DAY = 1440;

export const SUSPECTS: Record<Difficulty, [number, number]> = { easy: [3, 4], normal: [6, 7], hard: [10, 12] };
export const WITNESSES: [number, number] = [3, 6];

export const CRIME_RULES = [
  "Ids are short lowercase first names (e.g. \"daniel\"). The cast stage creates these people later.",
  "The victim, killer, accomplice and whoever finds the body are all different people. Nobody finds their own crime.",
  "Times are whole minutes from Day 1 00:00 (Day 2 00:00 = 1440). windowStart is 0.",
  "The death happens on Day 2 (1440–2879). The body is found after the death, before the end of Day 3 (4319).",
  "sceneRoomId and weapon.originRoomId must be room ids from the city list; the scene must be at the place given in the brief.",
  "Use the motive type and weapon category from the brief.",
  "coverUp lists only what the killer really does, each step once. If it includes \"disable-camera\", fill disabledCamera with a camera id from the list; otherwise leave it out.",
];

export const castRules = (difficulty: Difficulty) => [
  "Create every person the crime core names, using exactly those ids: the victim (role \"victim\"), the killer and any accomplice (role \"suspect\"), and whoever finds the body.",
  `Exactly one victim, ${SUSPECTS[difficulty][0]}–${SUSPECTS[difficulty][1]} suspects (the killer included), ${WITNESSES[0]}–${WITNESSES[1]} witnesses. Ids are unique.`,
  "homeUnitId must be a home id from the list. People may share a home only if they live together.",
  "job is null or uses a place id and a job title from that place's free jobs; each job title can be filled as many times as it is listed. job.roomId, if given, is a room of that place.",
  "routine is one of: office, night-shift, shop, unemployed, student. Unemployed people and students need a hangoutPlaceId (a public place id).",
  "Innocent suspects need a reason police would look at them (fakeMotive: a motive, a grudge, or just being near at the wrong time). The killer has no fakeMotive.",
  "secret and protects only where the person really has something serious to hide (it could get them arrested, fired, or ruin their reputation or family) or someone to shield; leave them out otherwise. Most people have none.",
  "appearance is what a camera would see: height, build, usual clothing, and shoes for anyone who might leave footprints.",
];

/** Motive type, weapon category and crime-scene place picked from the seed, so cases vary. */
export function crimeBrief(city: City, seed: number) {
  const rng = createRng(seed + 7);
  const motives = crimeCoreSchema.shape.motive.shape.type.options;
  const weapons = crimeCoreSchema.shape.weapon.shape.category.options;
  const scenes = city.places.filter((p) => p.crimeSceneAllowed);
  return { motiveType: rng.pick(motives), weaponCategory: rng.pick(weapons), scenePlaceId: rng.pick(scenes).id };
}

/**
 * Checks the crime core on its own: rooms exist, times fit the window, it follows the brief.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function crimeProblems(city: City, crime: CrimeCore, brief?: ReturnType<typeof crimeBrief>) {
  const problems: string[] = [];
  const scene = findRoom(city, crime.sceneRoomId);
  if (!scene) problems.push(`Crime scene room ${crime.sceneRoomId} doesn't exist.`);
  else if (!scene.place.crimeSceneAllowed) problems.push(`${scene.place.name} can't be a crime scene.`);
  if (!findRoom(city, crime.weapon.originRoomId)) problems.push(`Weapon starts in unknown room ${crime.weapon.originRoomId}.`);

  const people = [crime.victimId, crime.killerId, crime.accomplice?.id, crime.discovery.byId].filter(Boolean);
  if (new Set(people).size !== people.length) problems.push("Victim, killer, accomplice and whoever finds the body must be different people.");

  if (new Set(crime.coverUp).size !== crime.coverUp.length) problems.push("The cover-up lists the same step twice.");
  if (crime.coverUp.includes("disable-camera") !== !!crime.disabledCamera) {
    problems.push('disabledCamera must be filled exactly when the cover-up includes "disable-camera".');
  }
  if (crime.disabledCamera && !listCameras(city).some((c) => c.id === crime.disabledCamera!.cameraId)) {
    problems.push(`Camera ${crime.disabledCamera.cameraId} doesn't exist.`);
  }

  if (crime.windowStart !== 0) problems.push("windowStart must be 0 (Day 1 00:00).");
  if (crime.timeOfDeath < DAY || crime.timeOfDeath >= 2 * DAY) problems.push("The death must happen on Day 2.");
  if (crime.discovery.time <= crime.timeOfDeath) problems.push("The body is found before the death.");
  if (crime.discovery.time >= 3 * DAY) problems.push("The body must be found by the end of Day 3.");

  if (brief) {
    if (crime.motive.type !== brief.motiveType) problems.push(`Motive type must be "${brief.motiveType}".`);
    if (crime.weapon.category !== brief.weaponCategory) problems.push(`Weapon category must be "${brief.weaponCategory}".`);
    if (scene && scene.place.id !== brief.scenePlaceId) problems.push(`The crime must happen at ${brief.scenePlaceId}.`);
  }
  return problems;
}

/**
 * Checks the cast against the city and the crime core: roles, counts, homes, jobs, hangouts.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function castProblems(city: City, crime: CrimeCore, cast: Cast, difficulty?: Difficulty) {
  const problems: string[] = [];
  const people = new Map(cast.characters.map((c) => [c.id, c]));

  if (people.size !== cast.characters.length) problems.push("Two people share an id.");
  if (people.get(crime.victimId)?.role !== "victim") problems.push("The victim is missing from the cast or not marked as the victim.");
  if (people.get(crime.killerId)?.role !== "suspect") problems.push("The killer is missing from the cast or not marked as a suspect.");
  if (!people.has(crime.discovery.byId)) problems.push("Whoever finds the body is not in the cast.");
  if (crime.accomplice && people.get(crime.accomplice.id)?.role !== "suspect") problems.push("The accomplice must be a suspect.");
  if (people.get(crime.killerId)?.fakeMotive) problems.push("The killer shouldn't have a fake motive.");

  const count = (role: string) => cast.characters.filter((c) => c.role === role).length;
  if (count("victim") !== 1) problems.push(`There must be exactly one victim (found ${count("victim")}).`);
  if (difficulty) {
    const [min, max] = SUSPECTS[difficulty];
    if (count("suspect") < min || count("suspect") > max) problems.push(`Need ${min}–${max} suspects for ${difficulty} (found ${count("suspect")}).`);
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
        if (jobsTaken.get(key)! > slots) problems.push(`${place.name} has no free "${c.job.title}" job for ${c.name}.`);
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

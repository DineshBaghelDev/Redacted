import { findRoom, type City } from "./city";
import { formatTime, type Brief, type Cast, type CrimeCore, type Story } from "./schemas";

// Stage 9: what investigators legitimately know at the start.

export const BRIEF_RULES = [
  "Only what the police know when they are called: who died, where the body was found, when, and who reported it.",
  "Never name or hint at the killer or accomplice, the motive, the exact method, or the weapon (unless the weapon was left at the scene).",
  "title: 2–5 words, like a case file name. summary: 2–4 plain sentences. initialFacts: 3–5 short facts.",
];

/** The facts the brief may use, worked out by code. */
export function briefInput(city: City, crime: CrimeCore, cast: Cast, story: Story) {
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const scene = findRoom(city, crime.sceneRoomId);
  const weapon = story.items.find((i) => i.id === "weapon");
  const victim = cast.characters.find((c) => c.id === crime.victimId);
  return {
    victim: victim ? `${victim.name}, ${victim.age}, ${victim.job ? victim.job.title : "no job"}` : crime.victimId,
    foundAt: scene ? `${scene.place.name}, ${scene.room.name}` : crime.sceneRoomId,
    foundAtTime: formatTime(crime.discovery.time),
    reportedBy: `${nameOf(crime.discovery.byId)} (${cast.characters.find((c) => c.id === crime.discovery.byId)?.relationshipToVictim ?? ""})`,
    weaponAtScene: weapon && weapon.finalRoomId === crime.sceneRoomId ? weapon.name : null,
  };
}

/**
 * Leak check: the brief must not name the killer or accomplice, or carry the hidden motive, method or
 * a weapon that isn't at the scene.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function briefProblems(crime: CrimeCore, cast: Cast, story: Story, brief: Brief) {
  const problems: string[] = [];
  const text = [brief.title, brief.summary, ...brief.initialFacts].join(" ");
  const lower = text.toLowerCase();
  // Name parts shared with the victim or the finder (e.g. a family surname) are fine.
  const safe = new Set(
    [crime.victimId, crime.discovery.byId].flatMap((id) => cast.characters.find((c) => c.id === id)?.name.toLowerCase().split(" ") ?? []),
  );
  for (const id of [crime.killerId, crime.accomplice?.id].filter(Boolean)) {
    const person = cast.characters.find((c) => c.id === id);
    for (const part of person?.name.split(" ").filter((p) => p.length > 2 && !p.endsWith(".") && !safe.has(p.toLowerCase())) ?? []) {
      if (new RegExp(`\\b${part}\\b`, "i").test(text)) problems.push(`The brief names ${person!.name}, who is a culprit.`);
    }
  }
  const weapon = story.items.find((i) => i.id === "weapon");
  if (weapon && weapon.finalRoomId !== crime.sceneRoomId && lower.includes(weapon.name.toLowerCase())) problems.push("The brief names the weapon, which isn't at the scene.");
  if (lower.includes(crime.method.toLowerCase().slice(0, 40))) problems.push("The brief copies the hidden method.");
  if (lower.includes(crime.motive.details.toLowerCase().slice(0, 40))) problems.push("The brief copies the hidden motive.");
  const victim = cast.characters.find((c) => c.id === crime.victimId);
  if (victim && !text.includes(victim.name.split(" ")[0])) problems.push("The brief doesn't say who died.");
  if (brief.initialFacts.length < 3 || brief.initialFacts.length > 5) problems.push("The brief needs 3–5 initial facts.");
  return problems;
}

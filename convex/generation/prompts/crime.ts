import type { City } from "../core/city";
import { CRIME_RULES, crimeBrief, type Difficulty } from "../core/crimeCast";
import { camerasText, roomsText } from "./city";

export const SYSTEM = `You design murder cases for a two-player detective game set in a small modern city.
Cases must be fair: the truth is hidden but can be worked out from evidence. Keep it grounded and believable, no supernatural elements.
Reply with JSON only.`;

/** Prompt for stage 1: the crime core. */
export function crimePrompt(city: City, seed: number, difficulty: Difficulty, recentCrimes: string[] = []) {
  const brief = crimeBrief(city, seed);
  const avoid = recentCrimes.length
    ? `\n\nRecent cases already used these premises. Make this one clearly different: a different kind of relationship between victim and killer, a different situation behind the motive, a different weapon item. Don't reuse these plots:\n${recentCrimes.map((c) => `- ${c}`).join("\n")}`
    : "";
  return `Create the crime core for a ${difficulty} case.${avoid}

Brief (must follow):
- motive type: ${brief.motiveType}
- weapon category: ${brief.weaponCategory}
- crime scene place: ${brief.scenePlaceId}
- accomplice: ${brief.accomplice ? "yes, the killer has a helper" : "none, the killer acts alone"}
- time of death: Day 2, ${brief.deathTime.label}
- first names to pick ids from: ${brief.firstNames.join(", ")}

Rules:
${CRIME_RULES.map((r) => `- ${r}`).join("\n")}

Field notes:
- motive.details: 1–2 sentences, the real reason, naming victim and killer by first name.
- method: one sentence on how the victim died.
- weapon.originRoomId: where the weapon was before the crime, copied exactly from the room list (e.g. a kitchen or garage at the scene, or a room at a home or workplace). Never invent ids; homes aren't assigned to people yet.
- disabledCamera: { cameraId, from, to } (minutes) if coverUp includes "disable-camera", otherwise null. Most cases don't switch off a camera.
- accomplice: null unless the brief says there is one; then pick the role that fits the story: fake-alibi, weapon-disposal or distraction.

City rooms (id, name if it adds anything):
${roomsText(city)}

Cameras:
${camerasText(city)}`;
}

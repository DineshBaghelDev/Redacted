import type { City } from "../core/city";
import { CRIME_RULES, crimeBrief, type Difficulty } from "../core/crimeCast";
import { camerasText, roomsText } from "./city";

export const SYSTEM = `You design murder cases for a two-player detective game set in a small modern city.
Cases must be fair: the truth is hidden but can be worked out from evidence. Keep it grounded and believable, no supernatural elements.
Reply with JSON only.`;

/** Prompt for stage 1: the crime core. */
export function crimePrompt(city: City, seed: number, difficulty: Difficulty) {
  const brief = crimeBrief(city, seed);
  return `Create the crime core for a ${difficulty} case.

Brief (must follow):
- motive type: ${brief.motiveType}
- weapon category: ${brief.weaponCategory}
- crime scene place: ${brief.scenePlaceId}

Rules:
${CRIME_RULES.map((r) => `- ${r}`).join("\n")}

Field notes:
- motive.details: 1–2 sentences, the real reason, naming victim and killer by first name.
- method: one sentence on how the victim died.
- weapon.originRoomId: where the weapon was before the crime, copied exactly from the room list (e.g. a kitchen or garage at the scene, or a room at a home or workplace). Never invent ids; homes aren't assigned to people yet.
- disabledCamera: { cameraId, from, to } (minutes). Only if coverUp includes "disable-camera", and then it is required. Most cases don't switch off a camera.
- accomplice: only if it makes the case better (more likely on hard); role is fake-alibi, weapon-disposal or distraction.

City rooms (id Name):
${roomsText(city)}

Cameras (id Name):
${camerasText(city)}`;
}

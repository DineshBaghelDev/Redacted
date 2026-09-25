import type { City } from "../core/city";
import { crimeBrief, crimeRules, type Difficulty } from "../core/crimeCast";
import { crimeKind } from "../core/crimes";
import { camerasText, roomsText } from "./city";

/** The system prompt every stage uses, worded for the case's kind of crime. */
export function systemPrompt(type = "murder") {
  return `You design ${crimeKind(type).words.crime} cases for a two-player detective game set in a small modern city.
Cases must be fair: the truth is hidden but can be worked out from evidence. Keep it grounded and believable, no supernatural elements.
Reply with JSON only.`;
}

/** Prompt for stage 1: the crime core. */
export function crimePrompt(city: City, seed: number, difficulty: Difficulty, recentCrimes: string[] = []) {
  const brief = crimeBrief(city, seed);
  const kind = crimeKind(brief.type);
  const avoid = recentCrimes.length
    ? `\n\nRecent cases already used these premises. Make this one clearly different: a different kind of relationship between victim and ${kind.words.culprit}, a different situation behind the motive, a different key object. Don't reuse these plots:\n${recentCrimes.map((c) => `- ${c}`).join("\n")}`
    : "";
  return `Create the crime core for a ${difficulty} ${kind.words.crime} case.${avoid}

Brief (must follow):
- type: "${brief.type}"
${brief.picks.lines.map((l) => `- ${l}`).join("\n")}
- crime scene place: ${brief.scenePlaceId}
- accomplice: ${brief.accomplice ? `yes, the ${kind.words.culprit} has a helper` : `none, the ${kind.words.culprit} acts alone`}
- when: Day 2, ${brief.crimeTime.label}, so crimeTime is ${brief.crimeTime.from}–${brief.crimeTime.to - 1}
- first names to pick ids from: ${brief.firstNames.join(", ")}

Rules:
${[...crimeRules(kind.words), ...kind.crimeRules].map((r) => `- ${r}`).join("\n")}

Field notes:
- culpritId: the ${kind.words.culprit}. crimeTime: the ${kind.words.crimeTime}. discovery: when and by whom ${kind.words.discovery}.
- motive.details: 2–3 sentences: the history between them, what just happened to set it off, and what the ${kind.words.culprit} gains or avoids. Name the victim and the ${kind.words.culprit} by first name.
${kind.crimeNotes.map((n) => `- ${n}`).join("\n")}
- disabledCamera: { cameraId, from, to } (minutes) if coverUp includes "disable-camera", otherwise null. Most cases don't switch off a camera.

City rooms (id, name if it adds anything):
${roomsText(city)}

Cameras:
${camerasText(city)}`;
}

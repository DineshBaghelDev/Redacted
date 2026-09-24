import type { City } from "../core/city";
import { EVIDENCE_NOTES, evidencePlan, STORY_RULES } from "../core/story";
import type { Difficulty } from "../core/crimeCast";
import { formatTime, type Cast, type CrimeCore } from "../core/schemas";
import { storyRoomsText, travelText } from "./city";

/** Prompt for stage 3a: the story events around the crime. */
export function storyPrompt(city: City, crime: CrimeCore, cast: Cast, difficulty: Difficulty) {
  const plan = evidencePlan(city, crime, difficulty);
  return `Write the story events for this ${difficulty} case: everything that matters in the two days up to the discovery of the body.

Crime core (death at ${formatTime(crime.timeOfDeath)}, found at ${formatTime(crime.discovery.time)}):
${JSON.stringify(crime, null, 2)}

Cast:
${JSON.stringify(cast, null, 2)}

Rules:
${STORY_RULES.map((r) => `- ${r}`).join("\n")}

How code turns your story into evidence (plan the case so it can be solved, but not trivially):
${EVIDENCE_NOTES.map((r) => `- ${r}`).join("\n")}

Plan these on purpose; they are what cases most often lack:
- Decisive evidence: at least ${plan.needed} piece(s). Use ${plan.needed === 1 ? "this one" : `these ${plan.needed}`}:
${plan.decisive.slice(0, plan.needed).map((r) => `  - ${r}`).join("\n")}${plan.decisive.length > plan.needed ? `\n  Other ways that also work for this crime, if the story needs them:\n${plan.decisive.slice(plan.needed).map((r) => `  - ${r}`).join("\n")}` : ""}
- Link the weapon to the killer (at least 1):
${plan.weaponToKiller.map((r) => `  - ${r}`).join("\n")}${plan.accomplice.length ? `\n- Link the accomplice to the killer (at least 1):\n${plan.accomplice.map((r) => `  - ${r}`).join("\n")}` : ""}

What to write:
- events: the murder and cover-up, earlier conflicts that give suspects motives, where people really were around the time of death (some provable, some not), the discovery. Usually 10–20 events. action is one plain sentence.
- comms: calls and messages that matter (gist = what was said). durationMinutes for calls.
- purchases: things bought that matter (card or cash).
- items: the weapon, clothing the killer wore, documents and devices that matter. Devices (laptops, tablets) can hold files in contents.

Rooms by place (id, name if it adds anything, [entrance], [no items]):
${storyRoomsText(city)}

Travel minutes between places (same both ways; each pair listed once):
${travelText(city)}`;
}

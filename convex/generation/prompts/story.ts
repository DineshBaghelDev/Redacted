import type { City } from "../core/city";
import type { Difficulty } from "../core/crimeCast";
import { crimeKind } from "../core/crimes";
import { formatTime, type Cast, type CrimeBase } from "../core/schemas";
import { evidenceNotes, evidencePlan, storyRules } from "../core/story";
import { storyRoomsText, travelText } from "./city";

/** Prompt for stage 3a: the story events around the crime. */
export function storyPrompt(city: City, crime: CrimeBase, cast: Cast, difficulty: Difficulty) {
  const kind = crimeKind(crime);
  const w = kind.words;
  const plan = evidencePlan(city, crime, difficulty);
  const list = (items: string[]) => items.map((r) => `  - ${r}`).join("\n");
  return `Write the story events for this ${difficulty} ${w.crime} case: everything that matters in the two days up to when ${w.discovery}.

Crime core (${w.crimeTime} ${formatTime(crime.crimeTime)}, discovered ${formatTime(crime.discovery.time)}):
${JSON.stringify(crime, null, 2)}

Cast:
${JSON.stringify(cast, null, 2)}

Rules:
${storyRules(crime).map((r) => `- ${r}`).join("\n")}

How code turns your story into evidence (plan the case so it can be solved, but not trivially):
${evidenceNotes(kind).map((r) => `- ${r}`).join("\n")}

Plan these on purpose; they are what cases most often lack:
- Decisive evidence: at least ${plan.needed} piece(s). Use ${plan.needed === 1 ? "this one" : `these ${plan.needed}`}:
${list(plan.decisive.slice(0, plan.needed))}${plan.decisive.length > plan.needed ? `\n  Other ways that also work for this crime, if the story needs them:\n${list(plan.decisive.slice(plan.needed))}` : ""}
${plan.routes.map((r) => `- ${r.label}:\n${list(r.ways)}`).join("\n")}

What to write:
- events: the ${w.crime} and any cover-up, earlier conflicts that give each suspect their reason to be suspected, where people really were around the ${w.crimeTime} (some provable, some not), the discovery. Every suspect appears at least once. Usually 15–30 events. action is one plain sentence.
- comms: calls and messages between two different people that matter (gist = what was said). durationMinutes for calls. Drafts and notes go in a device's contents instead.
- purchases: things bought that matter (card or cash); itemId when the thing bought is a story item.
- ${kind.storyItems}

Rooms by place (id, name if it adds anything, [entrance], [no items]):
${storyRoomsText(city)}

Travel minutes between places (same both ways; each pair listed once):
${travelText(city)}`;
}

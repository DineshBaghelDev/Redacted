import { briefFacts, briefRules } from "../core/brief";
import type { City } from "../core/city";
import type { Cast, CrimeBase, Story } from "../core/schemas";

/** Prompt for stage 9: the case brief players start with. */
export function briefPrompt(city: City, crime: CrimeBase, cast: Cast, story: Story) {
  return `Write the case brief investigators receive when they are called in.

Rules:
${briefRules(crime).map((r) => `- ${r}`).join("\n")}

Known at the start:
${briefFacts(city, crime, cast, story).map((f) => `- ${f}`).join("\n")}`;
}

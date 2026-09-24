import type { City } from "../core/city";
import { castBrief, castRules, crimeBrief, type Difficulty } from "../core/crimeCast";
import type { CrimeCore } from "../core/schemas";
import { homesText, jobsText, publicPlacesText } from "./city";

/** Prompt for stage 2: the cast, built around the crime core. */
export function castPrompt(city: City, crime: CrimeCore, difficulty: Difficulty, seed: number) {
  const { suspects, victimRoutine } = castBrief(seed, difficulty);
  const { firstNames, surnames } = crimeBrief(city, seed);
  return `Create the cast for this ${difficulty} case.

Brief (must follow):
- exactly ${suspects} suspects (the killer included)
- the victim's routine: ${victimRoutine}
- names are "First Surname"; first names from: ${firstNames.join(", ")}
- surnames from: ${surnames.join(", ")} (family members may share one)
- each id is the lowercase first name

Crime core:
${JSON.stringify(crime, null, 2)}

Rules:
${castRules(difficulty).map((r) => `- ${r}`).join("\n")}

Field notes:
- traits: 2–4 personality words that drive how they talk and lie.
- relationshipToVictim: plain words, e.g. "Daniel's neighbour".
- secret / protects: something they would lie about that is NOT the murder (except for the killer).
- records: public records a detective could look up (debts, insurance, complaints, companies, property). Tag with proves ["motive"] only records that show the killer's real motive.
- Give the victim and killer real links to other people so several suspects look guilty.

Homes (id · address):
${homesText(city)}

Workplaces (id · name: jobs; rooms):
${jobsText(city)}

Public places for hangouts:
${publicPlacesText(city)}`;
}

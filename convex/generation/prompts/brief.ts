import { BRIEF_RULES, type briefInput } from "../core/brief";

/** Prompt for stage 9: the case brief players start with. */
export function briefPrompt(input: ReturnType<typeof briefInput>) {
  return `Write the case brief investigators receive when they are called in.

Rules:
${BRIEF_RULES.map((r) => `- ${r}`).join("\n")}

Known at the start:
- victim: ${input.victim}
- body found at: ${input.foundAt}
- found at: ${input.foundAtTime}
- reported by: ${input.reportedBy}
${input.weaponAtScene ? `- left at the scene: ${input.weaponAtScene}` : "- no weapon was found at the scene"}`;
}

import type { EvidenceSet } from "../core/evidence/types";
import { LIE_RULES } from "../core/lies";
import type { Cast, CrimeCore, Story } from "../core/schemas";

/**
 * Prompt for stage 6: lies. Evidence is cut down to what can prove something (no background items,
 * no everyday camera rows) so the prompt stays small.
 */
export function liesPrompt(crime: CrimeCore, cast: Cast, story: Story, set: EvidenceSet) {
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const people = cast.characters
    .filter((c) => c.role !== "victim")
    .map((c) => `${c.id} · ${c.name} (${c.role}${c.id === crime.killerId ? ", KILLER" : ""}${c.id === crime.accomplice?.id ? ", ACCOMPLICE" : ""}) traits: ${c.traits.join(", ")}; secret: ${c.secret}; protects: ${c.protects}${c.fakeMotive ? `; looks guilty because: ${c.fakeMotive}` : ""}`)
    .join("\n");
  const evidence = set.evidence
    .filter((e) => !(e.type === "item" && e.data.clutter) && !(e.type === "cctv" && e.sourceIds[0]?.startsWith("routine/")) && e.type !== "device")
    .map((e) => `${e.id} [${e.type}] ${e.title}: ${e.summary} (about: ${e.aboutIds.map(nameOf).join(", ") || "nobody"}; from: ${e.sourceIds.join(", ") || "-"})`)
    .join("\n");
  return `Decide who lies about what in this case. The killer is ${nameOf(crime.killerId)}.

Rules:
${LIE_RULES.map((r) => `- ${r}`).join("\n")}

People:
${people}

Story (what really happened):
${JSON.stringify({ events: story.events, comms: story.comms, purchases: story.purchases }, null, 2)}

Evidence (id [type] title: text (about; from story ids)):
${evidence}

Give each suspect 1–2 lies and some witnesses one where their personality fits. The killer gets a whereabouts lie and usually one more.`;
}

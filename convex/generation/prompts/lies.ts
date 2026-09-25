import type { EvidenceSet } from "../core/evidence/types";
import { crimeKind } from "../core/crimes";
import { lieRules, MAX_INNOCENT_LIARS } from "../core/lies";
import { formatTime, type Cast, type CrimeBase, type Story } from "../core/schemas";

/**
 * Prompt for stage 6: lies. Each person gets only their own part of the story and the evidence about
 * them (no background items, no everyday camera rows), which keeps the prompt small.
 */
export function liesPrompt(crime: CrimeBase, cast: Cast, story: Story, set: EvidenceSet, difficulty: keyof typeof MAX_INNOCENT_LIARS) {
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const useful = set.evidence.filter(
    (e) => !(e.type === "item" && e.data.clutter) && !(e.type === "cctv" && e.sourceIds[0]?.startsWith("routine/")) && e.type !== "device",
  );
  const w = crimeKind(crime).words;
  const crimeId = story.events.find((e) => e.roomId === crime.sceneRoomId && e.actors.includes(crime.culpritId))?.id ?? "(missing)";

  const people = cast.characters
    .filter((c) => c.role !== "victim")
    .map((c) => {
      const role = c.id === crime.culpritId ? w.culprit.toUpperCase() : c.id === crime.accomplice?.id ? "ACCOMPLICE" : c.role;
      const events = story.events.filter((e) => e.actors.includes(c.id));
      const comms = story.comms.filter((m) => m.from === c.id || m.to === c.id);
      const buys = story.purchases.filter((p) => p.who === c.id);
      const mine = new Set([...events, ...comms, ...buys].map((x) => x.id));
      // Their own statement can't disprove their lie, so it isn't offered.
      const proof = useful.filter(
        (e) => (e.aboutIds.includes(c.id) || e.sourceIds.some((s) => mine.has(s))) && !(e.type === "witness" && e.data.witnessId === c.id),
      );
      return [
        `${c.id} · ${c.name} (${role}) — traits: ${c.traits.join(", ")}`,
        c.secret ? `  secret: ${c.secret}${c.protects ? `; protects: ${c.protects}` : ""}` : "  no secret",
        c.fakeMotive ? `  why police might suspect them: ${c.fakeMotive}` : "",
        "  What they did:",
        ...events.map((e) => `  [${e.id}] ${formatTime(e.start)} ${e.action}`),
        ...comms.map((m) => `  [${m.id}] ${formatTime(m.time)} ${m.type} ${nameOf(m.from)} → ${nameOf(m.to)}: ${m.gist}`),
        ...buys.map((p) => `  [${p.id}] ${formatTime(p.time)} bought ${p.item} (${p.payment})`),
        "  Evidence about them (ids usable as proof):",
        ...proof.map((e) => `  ${e.id} [${e.type}] ${e.title}: ${e.summary}`),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return `Decide who lies about what in this case. The ${w.culprit} is ${nameOf(crime.culpritId)}; the ${w.crime} event is ${crimeId}.

Rules:
${lieRules(w).map((r) => `- ${r}`).join("\n")}

People:
${people}

Write the ${w.culprit}'s cover story (the required whereabouts lie, plus a backup if they are cunning). Innocent people whose secret the investigation would touch usually lie to protect it; people with nothing serious to hide tell the truth. This is a ${difficulty} case: usually 1 to ${MAX_INNOCENT_LIARS[difficulty]} innocent people lie (never more).`;
}

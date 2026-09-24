import type { EvidenceSet } from "./evidence/types";
import type { Cast, CrimeCore, Lie, Lies, Story } from "./schemas";

// Lie rules: the same text goes into the AI prompt, and checkLies enforces it.
export const LIE_RULES = [
  "Lies come from personality and what the person protects, never at random. Innocent people lie about their secrets and embarrassing moments; the killer lies about the crime.",
  "The killer must have a \"whereabouts\" lie whose truthIds include the murder event.",
  "truthIds are ids of story events, messages/calls or purchases the lie hides (may be empty for a secret with no event).",
  "disprovingEvidenceIds are evidence ids from the list. Each must be about the liar or come from something the lie hides. Never a background item, and never the liar's own statement.",
  "whenCaught follows personality: nervous people tell the full truth (\"full-truth\"), stubborn ones admit only what the proof shows (\"admit-shown\"), cunning ones switch to a backup lie (\"backup-lie\"), which then must exist and needs at least one piece of proof the first lie doesn't use.",
  "Lie ids are unique. The victim can't lie.",
];

/**
 * Checks each lie can be caught in play: it hides something real, and evidence that exists and is
 * about the liar (or comes from what the lie hides) disproves it. The killer must have a whereabouts
 * lie about the murder.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function checkLies(crime: CrimeCore, cast: Cast, story: Story, set: EvidenceSet, { lies }: Lies) {
  const problems: string[] = [];
  const truthIds = new Set([...story.events, ...story.comms, ...story.purchases].map((x) => x.id));
  const evidence = new Map(set.evidence.map((e) => [e.id, e]));
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;

  const disproves = (lie: Lie, evidenceId: string) => {
    const e = evidence.get(evidenceId);
    if (!e) return `evidence "${evidenceId}" doesn't exist`;
    if (e.type === "item" && e.data.clutter) return `"${e.title}" is a background item`;
    if (e.type === "witness" && e.data.witnessId === lie.npcId) return `"${e.title}" is the liar's own statement`;
    if (!e.aboutIds.includes(lie.npcId) && !e.sourceIds.some((s) => lie.truthIds.includes(s))) {
      return `"${e.title}" isn't about ${nameOf(lie.npcId)} or what the lie hides`;
    }
    return null;
  };

  for (const lie of lies) {
    const who = nameOf(lie.npcId);
    const label = `${who}'s lie "${lie.claim}"`;
    const person = cast.characters.find((c) => c.id === lie.npcId);
    if (!person) problems.push(`${label}: nobody with id ${lie.npcId}.`);
    if (person?.role === "victim") problems.push(`${label}: the victim can't be questioned.`);
    for (const t of lie.truthIds) if (!truthIds.has(t)) problems.push(`${label}: hides "${t}", which isn't in the story.`);
    for (const id of lie.disprovingEvidenceIds) {
      const why = disproves(lie, id);
      if (why) problems.push(`${label}: ${why}.`);
    }

    if (lie.whenCaught === "backup-lie" && !lie.backupLie) problems.push(`${label}: switches to a backup lie but has none.`);
    if (lie.backupLie) {
      const backup = lie.backupLie;
      for (const id of backup.disprovingEvidenceIds) {
        const why = disproves(lie, id);
        if (why) problems.push(`${who}'s backup lie "${backup.claim}": ${why}.`);
      }
      if (backup.disprovingEvidenceIds.every((id) => lie.disprovingEvidenceIds.includes(id))) {
        problems.push(`${who}'s backup lie "${backup.claim}": needs proof other than what broke the first lie.`);
      }
    }
  }

  const murderIds = story.events.filter((e) => e.roomId === crime.sceneRoomId && e.actors.includes(crime.killerId)).map((e) => e.id);
  const killerAlibiLie = lies.some((l) => l.npcId === crime.killerId && l.topic === "whereabouts" && l.truthIds.some((t) => murderIds.includes(t)));
  if (!killerAlibiLie) problems.push(`${nameOf(crime.killerId)} needs a whereabouts lie that hides the murder.`);

  const ids = lies.map((l) => l.id);
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) problems.push(`Two lies share the id "${id}".`);
  return problems;
}

/**
 * Drops lies that can't be caught in play (as the design says), keeping the rest. The killer's
 * required whereabouts lie is reported by checkLies, not fixed here.
 */
export function keepValidLies(crime: CrimeCore, cast: Cast, story: Story, set: EvidenceSet, lies: Lies): Lies {
  const ok = (lie: Lie) => checkLies(crime, cast, story, set, { lies: [lie] }).filter((p) => !p.includes("needs a whereabouts lie")).length === 0;
  const kept: Lie[] = [];
  for (const lie of lies.lies) {
    if (ok(lie)) kept.push(lie);
    else if (lie.backupLie) {
      // A broken backup lie shouldn't cost the main one: drop the backup, admit what the proof shows.
      const simpler = { ...lie, backupLie: undefined, whenCaught: lie.whenCaught === "backup-lie" ? ("admit-shown" as const) : lie.whenCaught };
      if (ok(simpler)) kept.push(simpler);
    }
  }
  return { lies: kept };
}

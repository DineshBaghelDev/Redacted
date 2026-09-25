import type { City } from "./city";
import type { EvidenceSet } from "./evidence/types";
import { escapeRegExp, type Cast, type Story, type Texts } from "./schemas";

// Stage 7: the AI rewrites plain code-made wording into natural text. It may not add facts.

export const TEXT_RULES = [
  "Rewrite each piece in natural, in-world wording: messages as real text messages, files as the document's contents, statements in the witness's own voice (first person).",
  "Keep every fact of the source and add none. Only mention people, places and times that appear in that piece's source or its \"people\" list.",
  "Keep it short: messages 1–3 sentences, files and statements up to 5 sentences.",
  "Return one entry per id you were given, using the same id.",
];

export type TextTarget = {
  id: string;
  kind: "message" | "file" | "statement";
  /** People the text may mention. */
  people: string[];
  source: string;
};

/**
 * What stage 7 rewrites: each message (once, keyed by message id), each device file and each witness
 * statement.
 */
export function textTargets(cast: Cast, story: Story, set: EvidenceSet): TextTarget[] {
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const messages = story.comms
    .filter((c) => c.type === "message")
    .map((c) => ({ id: c.id, kind: "message" as const, people: [nameOf(c.from), nameOf(c.to)], source: `From ${nameOf(c.from)} to ${nameOf(c.to)}: ${c.gist}` }));
  const rest = set.evidence.flatMap((e): TextTarget[] => {
    if (e.type === "file") return [{ id: e.id, kind: "file", people: e.aboutIds.map(nameOf), source: `${e.title}: ${e.summary}` }];
    if (e.type === "witness") {
      return [{ id: e.id, kind: "statement", people: [nameOf(e.data.witnessId), ...e.aboutIds.map(nameOf)], source: `${nameOf(e.data.witnessId)} saw, ${e.summary}` }];
    }
    return [];
  });
  return [...messages, ...rest];
}

/**
 * Checks rewritten texts: known ids only, and no people, places or clock times that the source doesn't
 * have.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function textProblems(city: City, cast: Cast, targets: TextTarget[], { texts }: Texts) {
  const problems: string[] = [];
  const byId = new Map(targets.map((t) => [t.id, t]));
  for (const { id, text } of texts) {
    const target = byId.get(id);
    if (!target) {
      problems.push(`Unknown text id "${id}".`);
      continue;
    }
    const allowed = `${target.source} ${target.people.join(" ")}`.toLowerCase();
    for (const c of cast.characters) {
      for (const part of c.name.split(" ").filter((p) => p.length > 2 && !p.endsWith("."))) {
        if (new RegExp(`\\b${escapeRegExp(part)}\\b`, "i").test(text) && !allowed.includes(part.toLowerCase())) {
          problems.push(`Text "${id}" mentions ${c.name}, who isn't in its source.`);
          break;
        }
      }
    }
    for (const p of city.places) {
      if (text.toLowerCase().includes(p.name.toLowerCase()) && !allowed.includes(p.name.toLowerCase())) {
        problems.push(`Text "${id}" mentions ${p.name}, which isn't in its source.`);
      }
    }
    // Same clock time in 12- or 24-hour form is fine ("9:30" for a source's "21:30").
    const sourceTimes = new Set((allowed.match(/\b\d{1,2}:\d{2}\b/g) ?? []).map((t) => minuteOfDay(t) % 720));
    for (const time of text.match(/\b\d{1,2}:\d{2}\b/g) ?? []) {
      if (!sourceTimes.has(minuteOfDay(time) % 720)) problems.push(`Text "${id}" mentions the time ${time}, which isn't in its source.`);
    }
  }
  return problems;
}

/** Evidence with the rewritten wording applied (messages get it on both phones). */
export function applyTexts(set: EvidenceSet, { texts }: Texts): EvidenceSet {
  const byId = new Map(texts.map((t) => [t.id, t.text]));
  return {
    ...set,
    evidence: set.evidence.map((e) => {
      const text = byId.get(e.id) ?? (e.type === "message" ? byId.get(e.sourceIds[0]) : undefined);
      return text ? { ...e, summary: text } : e;
    }),
  };
}

/** "21:30" to minutes of the day. */
function minuteOfDay(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

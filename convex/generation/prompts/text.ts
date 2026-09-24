import { TEXT_RULES, type TextTarget } from "../core/text";

/** Prompt for stage 7: rewriting code-made wording into natural text. */
export function textPrompt(targets: TextTarget[]) {
  return `Rewrite these pieces of evidence so they read like the real thing.

Rules:
${TEXT_RULES.map((r) => `- ${r}`).join("\n")}

Pieces (id · kind · people · source):
${targets.map((t) => `${t.id} · ${t.kind} · ${t.people.join(", ")} · ${t.source}`).join("\n")}`;
}

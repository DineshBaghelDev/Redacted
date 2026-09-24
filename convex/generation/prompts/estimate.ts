import type { estimateInput } from "../core/estimate";

/** Prompt for stage 10: how long a competent investigation should take. */
export function estimatePrompt(input: ReturnType<typeof estimateInput>, difficulty: string) {
  return `Estimate how many game minutes a competent pair of detectives needs to solve this ${difficulty} case.

The shortest useful investigation needs these steps (fixed game-minute costs):
${input.steps.map((s) => `- ${s.title} at ${s.placeId}: ${s.action}, ${s.minutes} min`).join("\n")}
Travel on a simple route from the police bureau through every place and back: ${input.travelMinutes} min.
That adds up to ${input.lowerBound} min if they knew exactly where to look.

Real players don't know where to look: add time for dead ends, reviewing the wrong camera windows, questioning people who turn out innocent, and waiting between steps. The answer must be between ${input.lowerBound} and ${input.lowerBound * 4} minutes.
reasoningSummary: 1–3 sentences.`;
}

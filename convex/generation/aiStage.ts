import { generateJson, modelsFor, type LlmCall } from "./llm";
import { checkOutput, type StageDef, type StageJob } from "./stages";

/** Repairs allowed after the first try. */
export const MAX_REPAIRS = 2;

export type AiAttempt = {
  call: LlmCall;
  system: string;
  prompt: string;
  output: unknown;
  problems: string[];
  /** True when this try's problems should go back to the AI for another try. */
  retry: boolean;
  /** Calls to earlier models in the stage's list that failed before `call`. */
  failedCalls: LlmCall[];
};

/** The first prompt, or, for a repair, the first prompt plus the previous answer and its problems. */
function repairPrompt(prompt: string, previous?: { output: unknown; problems: string[] }) {
  if (!previous) return prompt;
  return `${prompt}

Your previous answer:
${JSON.stringify(previous.output)}

The checker found these problems:
${previous.problems.map((p) => `- ${p}`).join("\n")}

Return the whole corrected JSON. Fix every problem and keep everything else the same.`;
}

/**
 * One AI try at a stage: builds the prompt (with the last answer and its problems on a repair), calls
 * the model and checks the output. After the last repair, the stage's finalize step cleans up what's
 * left (e.g. drops lies that still can't be caught).
 */
export async function runAiAttempt(
  stage: StageDef,
  inputs: Record<string, unknown>,
  job: StageJob,
  attempt: number,
  previous?: { output: unknown; problems: string[] },
  model?: string,
): Promise<AiAttempt> {
  if (!stage.prompt || !stage.schema) throw new Error("The AI version of this stage isn't built yet. Use the hand-written one.");
  const { system, prompt: base } = stage.prompt(inputs, job);
  const prompt = repairPrompt(base, previous);
  // A failed call (rate limit, quota, overload) moves on to the stage's next model.
  const calls: LlmCall[] = [];
  const models = model ? [model] : modelsFor(stage.name);
  for (const [i, next] of models.entries()) {
    // Only the last model retries a failed call; before that, moving on is faster (e.g. a used-up daily quota).
    const call = () => generateJson({ schema: stage.schema!, system, prompt, model: next, maxRetries: i === models.length - 1 ? undefined : 0 });
    let result = await call();
    // Kimi's paid account allows 3 calls a minute, one at a time: waiting beats falling back to a weaker model.
    for (let wait = 0; wait < 3 && /max RPM|max organization concurrency/.test(result.error ?? ""); wait++) {
      await new Promise((r) => setTimeout(r, 25_000));
      result = await call();
    }
    calls.push(result);
    if (!calls[calls.length - 1].error) break;
  }
  const call = calls[calls.length - 1];
  const failedCalls = calls.slice(0, -1);
  if (call.error) return { call, system, prompt, output: previous?.output ?? null, problems: call.problems, retry: false, failedCalls };

  // Safe mechanical fixes first (e.g. a duplicate id), so they don't cost a repair.
  let output = !call.problems.length && stage.tidy ? stage.tidy(call.output, inputs, job) : call.output;
  let problems = call.problems.length ? call.problems : checkOutput(stage, output, inputs, job, true);
  // An unusable reply (not JSON, wrong shape) never replaces a usable earlier answer: the next repair
  // works on that answer again, and it's what's kept if the repairs run out.
  if (call.problems.length && previous && stage.schema.safeParse(previous.output).success) ({ output, problems } = previous);
  const retry = problems.length > 0 && attempt < MAX_REPAIRS;
  if (!retry && problems.length > 0) {
    // A repair can make things worse: keep the earlier answer if it had fewer problems (and was usable).
    if (previous && stage.schema.safeParse(previous.output).success && previous.problems.length < problems.length) ({ output, problems } = previous);
    if (stage.finalize && stage.schema.safeParse(output).success) {
      output = stage.finalize(stage.schema.parse(output), inputs, job);
      problems = checkOutput(stage, output, inputs, job, true);
    }
  }
  return { call, system, prompt, output, problems, retry, failedCalls };
}

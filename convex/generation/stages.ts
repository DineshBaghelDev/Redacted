import { createRng } from "./core/rng";

export type Difficulty = "easy" | "normal" | "hard";

export type StageJob = { seed: number; difficulty: Difficulty };

export type StageResult = { output: unknown; checkErrors: string[] };

export type StageDef = {
  name: string;
  label: string;
  kind: "code" | "llm";
  /** Stages whose outputs this stage reads. */
  inputs: string[];
  run: (inputs: Record<string, unknown>, job: StageJob) => Promise<StageResult> | StageResult;
};

/**
 * Pipeline stages in run order. Each stage reads earlier drafts and returns its output plus check errors.
 */
export const stages: StageDef[] = [
  {
    // Placeholder to prove the tester plumbing; replaced by the city stage.
    name: "ping",
    label: "Ping (plumbing test)",
    kind: "code",
    inputs: [],
    run: (_inputs, job) => {
      const rng = createRng(job.seed);
      return { output: { seed: job.seed, difficulty: job.difficulty, dice: [rng.int(1, 6), rng.int(1, 6)] }, checkErrors: [] };
    },
  },
];

/**
 * Looks up a stage by name.
 *
 * @throws If the stage does not exist.
 */
export function getStage(name: string) {
  const stage = stages.find((s) => s.name === name);
  if (!stage) throw new Error(`Unknown stage: ${name}`);
  return stage;
}

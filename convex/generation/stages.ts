import { city } from "../fixtures/city";
import { checkCity, cityCapacity } from "./core/city";

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
    name: "city",
    label: "0 · City and buildings",
    kind: "code",
    inputs: [],
    run: () => ({ output: { capacity: cityCapacity(city), ...city }, checkErrors: checkCity(city) }),
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

import type { z } from "zod";
import * as easyCase from "../fixtures/caseEasy";
import { city } from "../fixtures/city";
import { checkCity, cityCapacity } from "./core/city";
import { castSchema, crimeCoreSchema, storySchema, type Cast, type CrimeCore, type Story } from "./core/schemas";
import { buildEvidence, evidenceProblems } from "./core/evidence";
import type { EvidenceSet } from "./core/evidence/types";
import { buildFacts, factProblems } from "./core/facts";
import { buildTimeline, checkTimeline, type Timeline } from "./core/timeline";

export type Difficulty = "easy" | "normal" | "hard";

export type StageJob = { seed: number; difficulty: Difficulty };

export type StageResult = { output: unknown; checkErrors: string[] };

export type StageDef = {
  name: string;
  label: string;
  kind: "code" | "llm";
  /** Stages whose outputs this stage reads. */
  inputs: string[];
  /** Output shape; checked for LLM and hand-written outputs. */
  schema?: z.ZodType;
  /** Hand-written output from the fixture case, usable instead of running the stage. */
  handWritten?: unknown;
  /** Code stages only. */
  run?: (inputs: Record<string, unknown>, job: StageJob) => StageResult;
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
  {
    name: "crime",
    label: "1 · Crime core",
    kind: "llm",
    inputs: [],
    schema: crimeCoreSchema,
    handWritten: easyCase.crimeCore,
  },
  {
    name: "cast",
    label: "2 · Cast",
    kind: "llm",
    inputs: ["crime"],
    schema: castSchema,
    handWritten: easyCase.cast,
  },
  {
    name: "story",
    label: "3a · Story events",
    kind: "llm",
    inputs: ["crime", "cast"],
    schema: storySchema,
    handWritten: easyCase.story,
  },
  {
    name: "timeline",
    label: "3b · Timeline (routines + story, checked)",
    kind: "code",
    inputs: ["crime", "cast", "story"],
    run: (inputs, job) => {
      const [crime, cast, story] = [inputs.crime as CrimeCore, inputs.cast as Cast, inputs.story as Story];
      const timeline = buildTimeline(city, crime, cast, story, job.seed);
      return { output: timeline, checkErrors: checkTimeline(city, crime, cast, story, timeline) };
    },
  },
  {
    name: "evidence",
    label: "4 · Evidence (CCTV, phones, forensics, items, records, witnesses)",
    kind: "code",
    inputs: ["crime", "cast", "story", "timeline"],
    run: (inputs, job) => {
      const [crime, cast, story] = [inputs.crime as CrimeCore, inputs.cast as Cast, inputs.story as Story];
      const timeline = inputs.timeline as Timeline;
      const output = buildEvidence(city, crime, cast, story, timeline, job.difficulty, job.seed);
      return { output, checkErrors: evidenceProblems(crime, timeline, output) };
    },
  },
  {
    name: "facts",
    label: "5 · What the evidence proves",
    kind: "code",
    inputs: ["crime", "cast", "story", "evidence"],
    run: (inputs) => {
      const [crime, cast, story] = [inputs.crime as CrimeCore, inputs.cast as Cast, inputs.story as Story];
      const output = buildFacts(city, crime, cast, story, inputs.evidence as EvidenceSet);
      return { output, checkErrors: factProblems(output) };
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

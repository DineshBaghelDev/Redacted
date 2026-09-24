import type { z } from "zod";
import * as easyCase from "../fixtures/caseEasy";
import { city } from "../fixtures/city";
import { checkCity, cityCapacity } from "./core/city";
import { castSchema, crimeCoreSchema, liesSchema, storySchema, type Cast, type CrimeCore, type Lies, type Story } from "./core/schemas";
import { buildEvidence, evidenceProblems } from "./core/evidence";
import type { EvidenceSet } from "./core/evidence/types";
import { buildFacts, factProblems, type Facts } from "./core/facts";
import { checkLies } from "./core/lies";
import { buildScripts, scriptProblems } from "./core/scripts";
import { buildTimeline, checkTimeline, type Timeline } from "./core/timeline";
import { validateCase, validationProblems } from "./core/validate";

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
  /** LLM stages: code checks on the output (hand-written or AI), beyond its shape. */
  check?: (output: unknown, inputs: Record<string, unknown>, job: StageJob) => string[];
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
  {
    name: "lies",
    label: "6 · Lies",
    kind: "llm",
    inputs: ["crime", "cast", "story", "evidence"],
    schema: liesSchema,
    handWritten: easyCase.lies,
    check: (output, inputs) =>
      checkLies(inputs.crime as CrimeCore, inputs.cast as Cast, inputs.story as Story, inputs.evidence as EvidenceSet, output as Lies),
  },
  {
    name: "scripts",
    label: "8 · NPC scripts",
    kind: "code",
    inputs: ["crime", "cast", "story", "evidence", "lies"],
    run: (inputs) => {
      const [crime, story] = [inputs.crime as CrimeCore, inputs.story as Story];
      const output = buildScripts(city, crime, inputs.cast as Cast, story, inputs.evidence as EvidenceSet, inputs.lies as Lies);
      return { output, checkErrors: scriptProblems(crime, story, output) };
    },
  },
  {
    name: "check",
    label: "11 · Can the case be solved?",
    kind: "code",
    inputs: ["crime", "cast", "story", "evidence", "facts", "lies"],
    run: (inputs, job) => {
      const [crime, cast, story] = [inputs.crime as CrimeCore, inputs.cast as Cast, inputs.story as Story];
      const output = validateCase(city, crime, cast, story, inputs.evidence as EvidenceSet, inputs.facts as Facts, inputs.lies as Lies, job.difficulty);
      return { output, checkErrors: validationProblems(output) };
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

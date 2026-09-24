import type { z } from "zod";
import * as easyCase from "../fixtures/caseEasy";
import { city } from "../fixtures/city";
import { checkCity, cityCapacity } from "./core/city";
import { castProblems, crimeBrief, crimeProblems } from "./core/crimeCast";
import { castPrompt } from "./prompts/cast";
import { crimePrompt, SYSTEM } from "./prompts/crime";
import { briefInput, briefProblems } from "./core/brief";
import { estimateInput, estimateProblems } from "./core/estimate";
import {
  briefSchema,
  castSchema,
  crimeCoreSchema,
  estimateSchema,
  liesSchema,
  schemaProblems,
  storySchema,
  textsSchema,
  type Brief,
  type Cast,
  type CrimeCore,
  type Estimate,
  type Lies,
  type Story,
  type Texts,
} from "./core/schemas";
import { storyProblems } from "./core/story";
import { textProblems, textTargets } from "./core/text";
import { briefPrompt } from "./prompts/brief";
import { estimatePrompt } from "./prompts/estimate";
import { liesPrompt } from "./prompts/lies";
import { storyPrompt } from "./prompts/story";
import { textPrompt } from "./prompts/text";
import { buildEvidence, evidenceProblems } from "./core/evidence";
import type { EvidenceSet } from "./core/evidence/types";
import { buildFacts, factProblems, type Facts } from "./core/facts";
import { checkLies, keepValidLies, liarCountProblems } from "./core/lies";
import { buildScripts, scriptProblems } from "./core/scripts";
import { buildTimeline, checkTimeline, type Timeline } from "./core/timeline";
import { validateCase, validationProblems } from "./core/validate";

import type { Difficulty } from "./core/crimeCast";

export type { Difficulty };

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
  check?: (output: unknown, inputs: Record<string, unknown>, job: StageJob, fromAi: boolean) => string[];
  /** LLM stages with AI built: the prompt for this job. */
  prompt?: (inputs: Record<string, unknown>, job: StageJob) => { system: string; prompt: string };
  /** LLM stages: last clean-up after repairs run out (e.g. drop lies that still can't be caught). */
  finalize?: (output: unknown, inputs: Record<string, unknown>, job: StageJob) => unknown;
};

type In = Record<string, unknown>;
const get = (inputs: In) => ({
  crime: inputs.crime as CrimeCore,
  cast: inputs.cast as Cast,
  story: inputs.story as Story,
  evidence: inputs.evidence as EvidenceSet,
  facts: inputs.facts as Facts,
  lies: inputs.lies as Lies,
});

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
    prompt: (_inputs, job) => ({ system: SYSTEM, prompt: crimePrompt(city, job.seed, job.difficulty) }),
    // The seeded brief only binds AI output; the hand-written case predates it.
    check: (output, _inputs, job, fromAi) => crimeProblems(city, output as CrimeCore, fromAi ? crimeBrief(city, job.seed) : undefined),
    // A switched-off camera the AI never names: drop that cover-up step rather than fail the case.
    finalize: (output) => {
      const crime = output as CrimeCore;
      return crime.disabledCamera ? crime : { ...crime, coverUp: crime.coverUp.filter((c) => c !== "disable-camera") };
    },
  },
  {
    name: "cast",
    label: "2 · Cast",
    kind: "llm",
    inputs: ["crime"],
    schema: castSchema,
    handWritten: easyCase.cast,
    prompt: (inputs, job) => ({ system: SYSTEM, prompt: castPrompt(city, inputs.crime as CrimeCore, job.difficulty) }),
    check: (output, inputs, job) => castProblems(city, inputs.crime as CrimeCore, output as Cast, job.difficulty),
  },
  {
    name: "story",
    label: "3a · Story events",
    kind: "llm",
    inputs: ["crime", "cast"],
    schema: storySchema,
    handWritten: easyCase.story,
    prompt: (inputs, job) => {
      const { crime, cast } = get(inputs);
      return { system: SYSTEM, prompt: storyPrompt(city, crime, cast, job.difficulty) };
    },
    check: (output, inputs, job) => {
      const { crime, cast } = get(inputs);
      return storyProblems(city, crime, cast, output as Story, job.difficulty, job.seed);
    },
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
    prompt: (inputs, job) => {
      const { crime, cast, story, evidence } = get(inputs);
      return { system: SYSTEM, prompt: liesPrompt(crime, cast, story, evidence, job.difficulty) };
    },
    check: (output, inputs, job) => {
      const { crime, cast, story, evidence } = get(inputs);
      return [...checkLies(crime, cast, story, evidence, output as Lies), ...liarCountProblems(crime, cast, output as Lies, job.difficulty)];
    },
    finalize: (output, inputs) => {
      const { crime, cast, story, evidence } = get(inputs);
      return keepValidLies(crime, cast, story, evidence, output as Lies);
    },
  },
  {
    name: "text",
    label: "7 · Written text (messages, files, statements)",
    kind: "llm",
    inputs: ["cast", "story", "evidence"],
    schema: textsSchema,
    handWritten: easyCase.texts,
    prompt: (inputs) => {
      const { cast, story, evidence } = get(inputs);
      return { system: SYSTEM, prompt: textPrompt(textTargets(cast, story, evidence)) };
    },
    check: (output, inputs) => {
      const { cast, story, evidence } = get(inputs);
      return textProblems(city, cast, textTargets(cast, story, evidence), output as Texts);
    },
    // Texts that still add facts are dropped; the plain wording stays for those.
    finalize: (output, inputs) => {
      const { cast, story, evidence } = get(inputs);
      const targets = textTargets(cast, story, evidence);
      return { texts: (output as Texts).texts.filter((t) => textProblems(city, cast, targets, { texts: [t] }).length === 0) };
    },
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
    name: "brief",
    label: "9 · Case brief",
    kind: "llm",
    inputs: ["crime", "cast", "story"],
    schema: briefSchema,
    handWritten: easyCase.brief,
    prompt: (inputs) => {
      const { crime, cast, story } = get(inputs);
      return { system: SYSTEM, prompt: briefPrompt(briefInput(city, crime, cast, story)) };
    },
    check: (output, inputs) => {
      const { crime, cast, story } = get(inputs);
      return briefProblems(crime, cast, story, output as Brief);
    },
  },
  {
    name: "estimate",
    label: "10 · Time estimate",
    kind: "llm",
    inputs: ["crime", "evidence", "facts", "lies"],
    schema: estimateSchema,
    handWritten: easyCase.estimate,
    prompt: (inputs, job) => {
      const { crime, evidence, facts, lies } = get(inputs);
      return { system: SYSTEM, prompt: estimatePrompt(estimateInput(city, evidence, facts, lies, crime.killerId), job.difficulty) };
    },
    check: (output, inputs) => {
      const { crime, evidence, facts, lies } = get(inputs);
      return estimateProblems(estimateInput(city, evidence, facts, lies, crime.killerId).lowerBound, output as Estimate);
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

/**
 * Checks an LLM stage's output (hand-written or AI): shape first, then the stage's own checks.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function checkOutput(stage: StageDef, output: unknown, inputs: Record<string, unknown>, job: StageJob, fromAi: boolean) {
  const shape = stage.schema ? schemaProblems(stage.schema, output) : [];
  if (shape.length > 0 || !stage.check) return shape;
  return stage.check(stage.schema ? stage.schema.parse(output) : output, inputs, job, fromAi);
}

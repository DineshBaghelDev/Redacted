import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type ActionCtx } from "../_generated/server";
import { jobStatus } from "../schema";
import { runAiAttempt } from "./aiStage";
import type { CrimeCore } from "./core/schemas";
import { getStage } from "./stages";

// Running stages for a generation job, shared by the dev tester (one stage at a time) and the
// workflow ("Run all"). Drafts hold hidden case data: nothing here is client-callable.

/**
 * Runs a code stage on the job's drafts and saves its output.
 *
 * @returns The stage's check problems; empty when fine.
 */
export async function runCodeStage(ctx: ActionCtx, jobId: Id<"generationJobs">, stageName: string) {
  const stage = getStage(stageName);
  if (!stage.run) throw new Error(`${stage.name} isn't a code stage.`);
  const { job, drafts } = await ctx.runQuery(internal.generation.jobs.loadInputs, { jobId, stages: stage.inputs });
  const missing = stage.inputs.filter((name) => !(name in drafts));
  if (missing.length > 0) throw new Error(`Run these stages first: ${missing.join(", ")}`);
  const result = stage.run(drafts, { seed: job.seed, difficulty: job.difficulty });
  await ctx.runMutation(internal.generation.jobs.saveDraft, { jobId, stage: stage.name, output: result.output, checkErrors: result.checkErrors, source: "code" });
  return result.checkErrors;
}

/**
 * One AI try at a stage (0 = first, then repairs): calls the model, logs the call and saves the draft.
 *
 * @returns The problems left, whether another repair should follow, and the error if the call failed.
 */
export async function runAiTry(ctx: ActionCtx, jobId: Id<"generationJobs">, stageName: string, attempt: number) {
  const stage = getStage(stageName);
  const { job, drafts, previous } = await ctx.runQuery(internal.generation.jobs.loadInputs, {
    jobId,
    stages: stage.inputs,
    previousOf: attempt > 0 ? stage.name : undefined,
  });
  const recentCrimes = stage.name === "crime" ? await ctx.runQuery(internal.generation.jobs.recentCrimes, { excludeJobId: jobId }) : undefined;
  const stageJob = { seed: job.seed, difficulty: job.difficulty, recentCrimes };
  const result = await runAiAttempt(stage, drafts, stageJob, attempt, previous ? { output: previous.output, problems: previous.checkErrors } : undefined);
  const { call } = result;
  await ctx.runMutation(internal.generation.jobs.saveLog, {
    jobId,
    stage: stage.name,
    model: call.model,
    mode: call.mode,
    system: result.system,
    prompt: result.prompt,
    rawText: call.rawText,
    problems: result.problems,
    error: call.error,
    inputTokens: call.inputTokens,
    outputTokens: call.outputTokens,
    ms: call.ms,
    attempt,
  });
  if (!call.error) {
    await ctx.runMutation(internal.generation.jobs.saveDraft, { jobId, stage: stage.name, output: result.output, checkErrors: result.problems, source: "llm" });
  }
  return { problems: result.problems, retry: result.retry, error: call.error };
}

/** Workflow step: one code stage. */
export const codeStep = internalAction({
  args: { jobId: v.id("generationJobs"), stage: v.string() },
  handler: async (ctx, { jobId, stage }): Promise<string[]> => await runCodeStage(ctx, jobId, stage),
});

/** Workflow step: one AI try. A failed call throws so the workflow retries it (network, rate limit, timeout). */
export const aiStep = internalAction({
  args: { jobId: v.id("generationJobs"), stage: v.string(), attempt: v.number() },
  handler: async (ctx, { jobId, stage, attempt }): Promise<{ problems: string[]; retry: boolean }> => {
    await ctx.runMutation(internal.generation.jobs.setRunning, { jobId, running: { stage, attempt } });
    const result = await runAiTry(ctx, jobId, stage, attempt);
    if (result.error) throw new Error(`AI call failed on ${stage}: ${result.error}`);
    return { problems: result.problems, retry: result.retry };
  },
});

/** Moves a job to a new status; start and finish times are stamped here. */
export const setStatus = internalMutation({
  args: { jobId: v.id("generationJobs"), status: jobStatus, failedStage: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, { jobId, status, failedStage, error }) => {
    const done = status !== "queued" && status !== "running";
    await ctx.db.patch(jobId, {
      status,
      failedStage,
      error,
      running: undefined,
      ...(status === "running" ? { startedAt: Date.now() } : {}),
      ...(done ? { finishedAt: Date.now() } : {}),
    });
  },
});

export const setRunning = internalMutation({
  args: { jobId: v.id("generationJobs"), running: v.optional(v.object({ stage: v.string(), attempt: v.number() })) },
  handler: async (ctx, { jobId, running }) => {
    await ctx.db.patch(jobId, { running });
  },
});

export const saveLog = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    stage: v.string(),
    model: v.string(),
    mode: v.union(v.literal("strict"), v.literal("json")),
    system: v.string(),
    prompt: v.string(),
    rawText: v.string(),
    problems: v.array(v.string()),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    ms: v.number(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("generationLogs", { ...args, createdAt: Date.now() });
  },
});

/** How many past AI crimes the crime prompt is told not to repeat. */
const RECENT_CRIMES = 10;

/** One-line summaries of the newest AI-written crimes from other jobs. */
export const recentCrimes = internalQuery({
  args: { excludeJobId: v.id("generationJobs") },
  handler: async (ctx, { excludeJobId }): Promise<string[]> => {
    const drafts = await ctx.db
      .query("generationDrafts")
      .withIndex("by_stage", (q) => q.eq("stage", "crime"))
      .order("desc")
      .take(RECENT_CRIMES * 3);
    return drafts
      .filter((d) => d.source === "llm" && d.jobId !== excludeJobId)
      .slice(0, RECENT_CRIMES)
      .map((d) => {
        const crime = d.output as CrimeCore;
        return `${crime.motive.type}, ${crime.weapon.name}: ${crime.motive.details}`;
      });
  },
});

export const loadInputs = internalQuery({
  args: { jobId: v.id("generationJobs"), stages: v.array(v.string()), previousOf: v.optional(v.string()) },
  handler: async (ctx, { jobId, stages: names, previousOf }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found.");
    const drafts: Record<string, unknown> = {};
    for (const name of names) {
      const draft = await ctx.db
        .query("generationDrafts")
        .withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", name))
        .unique();
      if (draft) drafts[name] = draft.output;
    }
    const previous = previousOf
      ? await ctx.db
          .query("generationDrafts")
          .withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", previousOf))
          .unique()
      : null;
    return { job, drafts, previous };
  },
});

export const saveDraft = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    stage: v.string(),
    output: v.any(),
    checkErrors: v.array(v.string()),
    source: v.union(v.literal("hand-written"), v.literal("code"), v.literal("llm")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("generationDrafts")
      .withIndex("by_job_stage", (q) => q.eq("jobId", args.jobId).eq("stage", args.stage))
      .unique();
    const draft = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, draft);
    } else {
      await ctx.db.insert("generationDrafts", draft);
    }
  },
});

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { runAiAttempt } from "../generation/aiStage";
import { checkOutput, getStage, stages, type StageResult } from "../generation/stages";
import { isDevUser, requireDevUser } from "../lib/auth";

// Dev-only generation tester. Every public function here checks the DEV_TOOL_USER_IDS allowlist.

const difficulty = v.union(v.literal("easy"), v.literal("normal"), v.literal("hard"));

/** Tells the page whether the current user may use the tester (and their id, to add to the allowlist). */
export const access = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { signedIn: false, allowed: false, userId: null };
    return { signedIn: true, allowed: isDevUser(identity.subject), userId: identity.subject };
  },
});

export const listStages = query({
  args: {},
  handler: async (ctx) => {
    await requireDevUser(ctx);
    return stages.map(({ name, label, kind, inputs, handWritten, run, prompt }) => ({
      name,
      label,
      kind,
      inputs,
      hasHandWritten: handWritten !== undefined,
      canRun: run !== undefined || prompt !== undefined,
    }));
  },
});

export const createJob = mutation({
  args: { difficulty, seed: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const createdBy = await requireDevUser(ctx);
    return await ctx.db.insert("generationJobs", {
      seed: args.seed ?? Math.floor(Math.random() * 2 ** 31),
      difficulty: args.difficulty,
      createdBy,
      createdAt: Date.now(),
    });
  },
});

export const listJobs = query({
  args: {},
  handler: async (ctx) => {
    await requireDevUser(ctx);
    return await ctx.db.query("generationJobs").order("desc").take(50);
  },
});

export const listDrafts = query({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    await requireDevUser(ctx);
    return await ctx.db
      .query("generationDrafts")
      .withIndex("by_job_stage", (q) => q.eq("jobId", jobId))
      .collect();
  },
});

/**
 * Runs one stage on the job's existing drafts (or loads its hand-written output) and saves the result
 * as that stage's draft. AI stages run in the background (see aiAttempt); the page follows along live.
 */
export const runStage = action({
  args: { jobId: v.id("generationJobs"), stage: v.string(), handWritten: v.optional(v.boolean()) },
  handler: async (ctx, { jobId, stage: stageName, handWritten }) => {
    await requireDevUser(ctx);
    const stage = getStage(stageName);
    const { job, drafts } = await ctx.runQuery(internal.dev.tester.loadInputs, {
      jobId,
      stages: stage.inputs,
    });

    const missing = stage.inputs.filter((name) => !(name in drafts));
    if (missing.length > 0) {
      throw new Error(`Run these stages first: ${missing.join(", ")}`);
    }
    if (job.running) throw new Error(`The AI is still working on "${job.running.stage}".`);

    const stageJob = { seed: job.seed, difficulty: job.difficulty };
    let result: StageResult;
    if (handWritten) {
      if (stage.handWritten === undefined) throw new Error("This stage has no hand-written version.");
      result = { output: stage.handWritten, checkErrors: checkOutput(stage, stage.handWritten, drafts, stageJob, false) };
    } else if (stage.run) {
      result = stage.run(drafts, stageJob);
    } else if (stage.prompt) {
      await ctx.runMutation(internal.dev.tester.setRunning, { jobId, running: { stage: stage.name, attempt: 0 } });
      await ctx.scheduler.runAfter(0, internal.dev.tester.aiAttempt, { jobId, stage: stage.name, attempt: 0 });
      return [];
    } else {
      throw new Error("The AI version of this stage isn't built yet. Use the hand-written one.");
    }

    await ctx.runMutation(internal.dev.tester.saveDraft, {
      jobId,
      stage: stage.name,
      output: result.output,
      checkErrors: result.checkErrors,
      source: handWritten ? "hand-written" : stage.kind,
    });
    return result.checkErrors;
  },
});

/** Reruns an AI stage's checks on its saved output (useful after the checks change). */
export const recheckStage = action({
  args: { jobId: v.id("generationJobs"), stage: v.string() },
  handler: async (ctx, { jobId, stage: stageName }) => {
    await requireDevUser(ctx);
    const stage = getStage(stageName);
    const { job, drafts, previous } = await ctx.runQuery(internal.dev.tester.loadInputs, { jobId, stages: stage.inputs, previousOf: stage.name });
    if (!previous) throw new Error("Nothing saved for this stage yet.");
    const checkErrors = checkOutput(stage, previous.output, drafts, { seed: job.seed, difficulty: job.difficulty }, previous.source === "llm");
    await ctx.runMutation(internal.dev.tester.saveDraft, { jobId, stage: stage.name, output: previous.output, checkErrors, source: previous.source });
    return checkErrors;
  },
});

/**
 * One AI try at a stage. Each try is its own action so a slow model can't hit the action time limit.
 * If the checks fail and repairs are left, it saves this try and schedules the next with the problems.
 */
export const aiAttempt = internalAction({
  args: { jobId: v.id("generationJobs"), stage: v.string(), attempt: v.number() },
  handler: async (ctx, { jobId, stage: stageName, attempt }) => {
    try {
      const stage = getStage(stageName);
      const { job, drafts, previous } = await ctx.runQuery(internal.dev.tester.loadInputs, {
        jobId,
        stages: stage.inputs,
        previousOf: attempt > 0 ? stage.name : undefined,
      });
      const stageJob = { seed: job.seed, difficulty: job.difficulty };
      const result = await runAiAttempt(stage, drafts, stageJob, attempt, previous ? { output: previous.output, problems: previous.checkErrors } : undefined);
      const { call } = result;
      await ctx.runMutation(internal.dev.tester.saveLog, {
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
      if (call.error) return;
      await ctx.runMutation(internal.dev.tester.saveDraft, { jobId, stage: stage.name, output: result.output, checkErrors: result.problems, source: "llm" });
      if (result.retry) {
        await ctx.runMutation(internal.dev.tester.setRunning, { jobId, running: { stage: stage.name, attempt: attempt + 1 } });
        await ctx.scheduler.runAfter(0, internal.dev.tester.aiAttempt, { jobId, stage: stage.name, attempt: attempt + 1 });
        return;
      }
    } catch (error) {
      await ctx.runMutation(internal.dev.tester.setRunning, { jobId });
      throw error;
    }
    await ctx.runMutation(internal.dev.tester.setRunning, { jobId });
  },
});

export const setRunning = internalMutation({
  args: { jobId: v.id("generationJobs"), running: v.optional(v.object({ stage: v.string(), attempt: v.number() })) },
  handler: async (ctx, { jobId, running }) => {
    await ctx.db.patch(jobId, { running });
  },
});

/** Clears a stuck "AI working" flag (e.g. if a background try was killed). */
export const stopWaiting = mutation({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    await requireDevUser(ctx);
    await ctx.db.patch(jobId, { running: undefined });
  },
});

export const getJob = query({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    await requireDevUser(ctx);
    return await ctx.db.get(jobId);
  },
});

export const listLogs = query({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    await requireDevUser(ctx);
    return await ctx.db
      .query("generationLogs")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .order("desc")
      .collect();
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

/**
 * Record and replay: a job's AI-written stage outputs, to save under convex/fixtures/recorded/ as a
 * permanent test case. Run with: npx convex run dev/tester:exportJob '{"jobId":"..."}'
 */
export const exportJob = internalQuery({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found.");
    const drafts = await ctx.db
      .query("generationDrafts")
      .withIndex("by_job_stage", (q) => q.eq("jobId", jobId))
      .collect();
    const outputs: Record<string, { output: unknown; source: string }> = {};
    for (const d of drafts) if (d.source !== "code") outputs[d.stage] = { output: d.output, source: d.source };
    return { jobId, seed: job.seed, difficulty: job.difficulty, outputs };
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

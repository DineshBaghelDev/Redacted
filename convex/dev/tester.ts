import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { generateJson } from "../generation/llm";
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
 * as that stage's draft.
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

    const stageJob = { seed: job.seed, difficulty: job.difficulty };
    let result: StageResult;
    if (handWritten) {
      if (stage.handWritten === undefined) throw new Error("This stage has no hand-written version.");
      result = { output: stage.handWritten, checkErrors: checkOutput(stage, stage.handWritten, drafts, stageJob, false) };
    } else if (stage.run) {
      result = stage.run(drafts, stageJob);
    } else if (stage.prompt && stage.schema) {
      const { system, prompt } = stage.prompt(drafts, stageJob);
      const call = await generateJson({ schema: stage.schema, system, prompt });
      await ctx.runMutation(internal.dev.tester.saveLog, {
        jobId,
        stage: stage.name,
        model: call.model,
        mode: call.mode,
        system,
        prompt,
        rawText: call.rawText,
        problems: call.problems,
        error: call.error,
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
        ms: call.ms,
      });
      if (call.error) throw new Error(`AI call failed: ${call.error}`);
      result = {
        output: call.output,
        checkErrors: call.problems.length ? call.problems : checkOutput(stage, call.output, drafts, stageJob, true),
      };
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
  args: { jobId: v.id("generationJobs"), stages: v.array(v.string()) },
  handler: async (ctx, { jobId, stages: names }) => {
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
    return { job, drafts };
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

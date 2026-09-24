import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { getStage, stages } from "../generation/stages";
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
    return stages.map(({ name, label, kind, inputs }) => ({ name, label, kind, inputs }));
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

/** Runs one stage on the job's existing drafts and saves the result as that stage's draft. */
export const runStage = action({
  args: { jobId: v.id("generationJobs"), stage: v.string() },
  handler: async (ctx, { jobId, stage: stageName }) => {
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

    const result = await stage.run(drafts, { seed: job.seed, difficulty: job.difficulty });
    await ctx.runMutation(internal.dev.tester.saveDraft, {
      jobId,
      stage: stage.name,
      output: result.output,
      checkErrors: result.checkErrors,
      source: stage.kind,
    });
    return result.checkErrors;
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

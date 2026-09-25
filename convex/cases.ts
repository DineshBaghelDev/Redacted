import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";

type Brief = {
  title?: unknown;
  summary?: unknown;
  initialFacts?: unknown;
};

function readBrief(output: unknown) {
  const brief = output as Brief | undefined;
  if (!brief || typeof brief.title !== "string" || typeof brief.summary !== "string" || !Array.isArray(brief.initialFacts)) {
    return null;
  }
  return {
    title: brief.title,
    summary: brief.summary,
    initialFacts: brief.initialFacts.filter((fact): fact is string => typeof fact === "string"),
  };
}

export async function ensureCaseForJob(ctx: MutationCtx, generationJobId: Id<"generationJobs">) {
  const existing = await ctx.db
    .query("cases")
    .withIndex("by_generationJobId", (q) => q.eq("generationJobId", generationJobId))
    .unique();
  if (existing) return existing._id;

  const job = await ctx.db.get(generationJobId);
  if (!job || job.status !== "passed") throw new Error("This case is not ready to play.");

  const draft = await ctx.db
    .query("generationDrafts")
    .withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "brief"))
    .unique();
  const brief = readBrief(draft?.output);
  if (!brief) throw new Error("This case has no playable brief.");

  return await ctx.db.insert("cases", {
    generationJobId,
    difficulty: job.difficulty,
    ...brief,
    createdAt: Date.now(),
  });
}

export const listPassed = query({
  args: {},
  returns: v.array(v.object({
    generationJobId: v.id("generationJobs"),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    title: v.string(),
    description: v.string(),
  })),
  handler: async (ctx) => {
    await requireUserId(ctx);
    const jobs = await ctx.db
      .query("generationJobs")
      .withIndex("by_status", (q) => q.eq("status", "passed"))
      .order("desc")
      .collect();
    const cases = [];
    for (const job of jobs) {
      const draft = await ctx.db
        .query("generationDrafts")
        .withIndex("by_job_stage", (q) => q.eq("jobId", job._id).eq("stage", "brief"))
        .unique();
      const brief = readBrief(draft?.output);
      if (brief) cases.push({
        generationJobId: job._id,
        difficulty: job.difficulty,
        title: brief.title,
        description: brief.summary,
      });
    }
    return cases;
  },
});

export const getBrief = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({ title: v.string(), summary: v.string(), initialFacts: v.array(v.string()) })),
  handler: async (ctx, { roomCode }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .unique();
    if (!session?.caseId || session.expiresAt < Date.now()) return null;

    const player = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId_authUserId", (q) => q.eq("sessionId", session._id).eq("authUserId", authUserId))
      .unique();
    if (!player) return null;

    const playableCase = await ctx.db.get(session.caseId);
    return playableCase
      ? { title: playableCase.title, summary: playableCase.summary, initialFacts: playableCase.initialFacts }
      : null;
  },
});

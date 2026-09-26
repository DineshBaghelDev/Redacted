import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";

type Brief = {
  title?: unknown;
  summary?: unknown;
  initialFacts?: unknown;
};

type CctvKind = "stay" | "pass" | "offline";
type PublicCctvRecord = {
  id: string;
  cameraId: string;
  start: number;
  end: number;
  summary: string;
  kind: CctvKind;
};

const cctvData = v.object({
  caseTitle: v.string(),
  start: v.number(),
  end: v.number(),
  cameras: v.array(v.object({
    id: v.string(),
    name: v.string(),
    faulty: v.boolean(),
  })),
  records: v.array(v.object({
    id: v.string(),
    cameraId: v.string(),
    start: v.number(),
    end: v.number(),
    summary: v.string(),
    kind: v.union(v.literal("stay"), v.literal("pass"), v.literal("offline")),
  })),
});

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

function readCctv(output: unknown) {
  if (!isObject(output) || !Array.isArray(output.cameras) || !Array.isArray(output.evidence)) return null;

  const cameras = output.cameras.flatMap((value) => {
    if (!isObject(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.faulty !== "boolean") return [];
    return [{ id: value.id, name: value.name, faulty: value.faulty }];
  });
  const cameraIds = new Set(cameras.map((camera) => camera.id));
  const records: PublicCctvRecord[] = output.evidence.flatMap((value) => {
    if (!isObject(value) || value.type !== "cctv" || typeof value.id !== "string" || typeof value.summary !== "string") return [];
    const access = value.access;
    const data = value.data;
    if (
      !isObject(access)
      || access.tool !== "cctv"
      || typeof access.cameraId !== "string"
      || !cameraIds.has(access.cameraId)
      || typeof value.time !== "number"
      || (value.end !== undefined && typeof value.end !== "number")
      || !isObject(data)
      || (data.kind !== "stay" && data.kind !== "pass" && data.kind !== "offline")
    ) return [];
    return [{
      id: value.id,
      cameraId: access.cameraId,
      start: value.time,
      end: value.end ?? value.time,
      summary: value.summary,
      kind: data.kind as CctvKind,
    }];
  });
  if (!cameras.length || !records.length) return null;

  const start = Math.min(...records.map((record) => record.start));
  const end = Math.max(start + 5, ...records.map((record) => record.end));
  return { start, end, cameras, records };
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

export const getCctv = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), cctvData),
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
    if (!playableCase) return null;
    const draft = await ctx.db
      .query("generationDrafts")
      .withIndex("by_job_stage", (q) => q.eq("jobId", playableCase.generationJobId).eq("stage", "evidence"))
      .unique();
    const cctv = readCctv(draft?.output);
    return cctv ? { caseTitle: playableCase.title, ...cctv } : null;
  },
});

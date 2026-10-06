import { v } from "convex/values";
import { z } from "zod";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { crimeCoreSchema } from "./generation/core/crimes";
import { castSchema } from "./generation/core/schemas";
import { getPlayingRoomMember, getRoomMember, requireUserId } from "./lib/auth";
import { ensureCaseCctv } from "./lib/publishCctv";
import { ensureCaseDevices } from "./lib/publishDevices";
import { ensureCaseForensics } from "./lib/publishForensics";
import { ensureCaseNarrative } from "./lib/publishNarrative";
import { ensureCaseItems } from "./lib/publishItems";
import { ensureCaseRecords } from "./lib/publishRecords";
import { ensureCaseWorld } from "./lib/publishWorld";

type Brief = {
  title?: unknown;
  summary?: unknown;
  initialFacts?: unknown;
};

export const PUBLICATION_VERSION = 1;

const cctvRecord = v.object({
  id: v.string(),
  cameraId: v.string(),
  start: v.number(),
  end: v.number(),
  summary: v.string(),
  kind: v.union(v.literal("stay"), v.literal("pass"), v.literal("offline")),
});

const cctvData = v.object({
  caseTitle: v.string(),
  start: v.number(),
  end: v.number(),
  cameras: v.array(v.object({
    id: v.string(),
    name: v.string(),
    faulty: v.boolean(),
  })),
});

const solutionFactsSchema = z.object({
  facts: z.array(z.object({
    kind: z.string(),
    text: z.string(),
    evidenceIds: z.array(z.string()),
  })),
  decisiveIds: z.array(z.string()),
});

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

async function getDraft(ctx: MutationCtx, jobId: Id<"generationJobs">, stage: string) {
  return await ctx.db
    .query("generationDrafts")
    .withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", stage))
    .unique();
}

async function ensureCaseSolution(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const existing = await ctx.db
    .query("caseSolutions")
    .withIndex("by_caseId", (q) => q.eq("caseId", caseId))
    .unique();
  if (existing) return;

  const [crimeDraft, castDraft, factsDraft] = await Promise.all([
    getDraft(ctx, generationJobId, "crime"),
    getDraft(ctx, generationJobId, "cast"),
    getDraft(ctx, generationJobId, "facts"),
  ]);
  const crime = crimeCoreSchema.safeParse(crimeDraft?.output);
  const cast = castSchema.safeParse(castDraft?.output);
  const facts = solutionFactsSchema.safeParse(factsDraft?.output);
  if (!crime.success || !cast.success || !facts.success) {
    throw new Error("This case has no valid private solution.");
  }
  if (facts.data.decisiveIds.length === 0) throw new Error("This case has no decisive evidence.");

  const npcIds = new Map<string, Id<"npcs">>();
  for (const character of cast.data.characters) {
    const stored = await ctx.db
      .query("npcs")
      .withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", caseId).eq("sourceId", character.id))
      .unique();
    const npcId = stored?._id ?? await ctx.db.insert("npcs", {
      caseId,
      sourceId: character.id,
      role: character.role,
      name: character.name,
      age: character.age,
      occupation: character.job?.title,
      publicDescription: `${character.appearance.height}, ${character.appearance.build}, wearing ${character.appearance.clothing}.`,
    });
    npcIds.set(character.id, npcId);
  }

  const culpritNpcId = npcIds.get(crime.data.culpritId);
  const culprit = cast.data.characters.find((character) => character.id === crime.data.culpritId);
  const victim = cast.data.characters.find((character) => character.id === crime.data.victimId);
  if (!culpritNpcId || !culprit || !victim) throw new Error("This case solution names an unknown person.");

  const relevantFacts = facts.data.facts.filter(
    (fact) => ["culprit", "motive", "weapon", "method", "accomplice"].includes(fact.kind) && fact.evidenceIds.length > 0,
  );
  await ctx.db.insert("caseSolutions", {
    caseId,
    culpritNpcId,
    motive: crime.data.motive.details,
    weaponDescription: crime.data.weapon.name,
    method: crime.data.method,
    canonicalExplanation: `${culprit.name} killed ${victim.name}. ${crime.data.motive.details} ${crime.data.method}`,
    keyReasoningPoints: relevantFacts.map((fact) => fact.text),
    evidenceGroups: [
      { description: "Decisive evidence", requiredEvidenceIds: facts.data.decisiveIds },
      ...relevantFacts.map((fact) => ({ description: fact.text, requiredEvidenceIds: fact.evidenceIds })),
    ],
  });
}

async function loadCctv(ctx: QueryCtx, roomCode: string) {
  const member = await getPlayingRoomMember(ctx, roomCode);
  if (!member?.session.caseId) return null;
  const playableCase = await ctx.db.get(member.session.caseId);
  if (!playableCase) return null;
  const cameras = await ctx.db.query("cctvCameras").withIndex("by_caseId", (q) => q.eq("caseId", playableCase._id)).take(128);
  if (!cameras.length) return null;
  return {
    caseTitle: playableCase.title,
    start: Math.min(...cameras.map((camera) => camera.startTime)),
    end: Math.max(...cameras.map((camera) => camera.endTime)),
    cameras,
  };
}

export async function ensureCaseForJob(ctx: MutationCtx, generationJobId: Id<"generationJobs">) {
  const existing = await ctx.db
    .query("cases")
    .withIndex("by_generationJobId", (q) => q.eq("generationJobId", generationJobId))
    .unique();

  if (existing?.publicationVersion === PUBLICATION_VERSION) return existing._id;

  const job = await ctx.db.get(generationJobId);
  if (!job || job.status !== "passed") throw new Error("This case is not ready to play.");

  if (existing) {
    await ensureCaseWorld(ctx, existing._id);
    await ensureCaseItems(ctx, existing._id, generationJobId);
    await ensureCaseSolution(ctx, existing._id, generationJobId);
    await ensureCaseCctv(ctx, existing._id, generationJobId);
    await ensureCaseDevices(ctx, existing._id, generationJobId);
    await ensureCaseRecords(ctx, existing._id, generationJobId);
    await ensureCaseForensics(ctx, existing._id, generationJobId);
    await ensureCaseNarrative(ctx, existing._id, generationJobId);
    await ctx.db.patch(existing._id, { publicationVersion: PUBLICATION_VERSION });
    return existing._id;
  }

  const draft = await ctx.db
    .query("generationDrafts")
    .withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "brief"))
    .unique();
  const brief = readBrief(draft?.output);
  if (!brief) throw new Error("This case has no playable brief.");

  const caseId = await ctx.db.insert("cases", {
    generationJobId,
    difficulty: job.difficulty,
    ...brief,
    createdAt: Date.now(),
  });
  await ensureCaseWorld(ctx, caseId);
  await ensureCaseItems(ctx, caseId, generationJobId);
  await ensureCaseSolution(ctx, caseId, generationJobId);
  await ensureCaseCctv(ctx, caseId, generationJobId);
  await ensureCaseDevices(ctx, caseId, generationJobId);
  await ensureCaseRecords(ctx, caseId, generationJobId);
  await ensureCaseForensics(ctx, caseId, generationJobId);
  await ensureCaseNarrative(ctx, caseId, generationJobId);
  await ctx.db.patch(caseId, { publicationVersion: PUBLICATION_VERSION });
  return caseId;
}

export const listPassed = query({
  args: {},
  returns: v.array(v.object({
    generationJobId: v.id("generationJobs"),
    caseId: v.optional(v.id("cases")),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    title: v.string(),
    description: v.string(),
  })),
  handler: async (ctx) => {
    await requireUserId(ctx);
    const cases = [];
    const publishedJobIds = new Set<string>();
    for await (const playableCase of ctx.db.query("cases").withIndex("by_publicationVersion", (q) => q.eq("publicationVersion", PUBLICATION_VERSION))) {
      publishedJobIds.add(playableCase.generationJobId);
      cases.push({
        generationJobId: playableCase.generationJobId,
        caseId: playableCase._id,
        difficulty: playableCase.difficulty,
        title: playableCase.title,
        description: playableCase.summary,
      });
    }
    const jobs = await ctx.db
      .query("generationJobs")
      .withIndex("by_status", (q) => q.eq("status", "passed"))
      .order("desc")
      .collect();
    for (const job of jobs) {
      if (publishedJobIds.has(job._id)) continue;
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
    return cases.sort((a, b) => b.generationJobId.localeCompare(a.generationJobId));
  },
});

export const getBrief = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({ title: v.string(), summary: v.string(), initialFacts: v.array(v.string()) })),
  handler: async (ctx, { roomCode }) => {
    const member = await getRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;

    const playableCase = await ctx.db.get(member.session.caseId);
    return playableCase
      ? { title: playableCase.title, summary: playableCase.summary, initialFacts: playableCase.initialFacts }
      : null;
  },
});

export const getCctv = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), cctvData),
  handler: async (ctx, { roomCode }) => {
    const cctv = await loadCctv(ctx, roomCode);
    return cctv ? {
      caseTitle: cctv.caseTitle,
      start: cctv.start,
      end: cctv.end,
      cameras: cctv.cameras.map((camera) => ({ id: camera.sourceId, name: camera.name, faulty: camera.faulty })),
    } : null;
  },
});

export const getCctvWindow = query({
  args: { roomCode: v.string(), cameraId: v.string(), minute: v.number() },
  returns: v.union(v.null(), v.array(cctvRecord)),
  handler: async (ctx, { roomCode, cameraId, minute }) => {
    const cctv = await loadCctv(ctx, roomCode);
    const camera = cctv?.cameras.find((item) => item.sourceId === cameraId);
    if (!camera || !Number.isFinite(minute)) return null;
    const records = [];
    for await (const record of ctx.db
      .query("cctvRecords")
      .withIndex("by_cameraId_and_startTime", (q) => q.eq("cameraId", camera._id).lte("startTime", minute + 20))) {
      if (record.endTime >= minute - 20) records.push(record);
    }
    return records.map((record) => ({
        id: record.evidenceId,
        cameraId,
        start: record.startTime,
        end: record.endTime,
        summary: record.description,
        kind: record.kind,
      }));
  },
});

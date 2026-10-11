import { v } from "convex/values";
import { z } from "zod";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { crimeCoreSchema } from "./generation/core/crimes";
import { castSchema } from "./generation/core/schemas";
import { cameraAtAccessPoint, getCameraAccess, getPlayingRoomMember, getRoomMember, requireInvestigationOpen, requireUserId } from "./lib/auth";
import { CCTV_HALF_WINDOW, knownPeople } from "./lib/discoveries";
import { ensureCaseCctv } from "./lib/publishCctv";
import { ensureCaseFiller, ensureVictimLeads } from "./lib/publishFiller";
import { ensureCaseClutter } from "./lib/publishClutter";
import { ensureDeviceNotes } from "./lib/deviceCodes";
import { ensureCaseDevices } from "./lib/publishDevices";
import { ensureCaseForensics, restoreBodyForensicSources } from "./lib/publishForensics";
import { ensureCaseNarrative } from "./lib/publishNarrative";
import { ensureCaseItems } from "./lib/publishItems";
import { ensureCaseRecords, ensurePaymentTimes } from "./lib/publishRecords";
import { ensureCaseStatements } from "./lib/publishStatements";
import { ensureCaseWorld } from "./lib/publishWorld";
import { settleActions } from "./world";

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
    start: v.number(),
    end: v.number(),
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
const estimateSchema = z.object({ estimatedOptimalMinutes: z.number().int().positive() });

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

async function ensureCaseEstimate(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const playableCase = await ctx.db.get(caseId);
  if (playableCase?.estimatedOptimalMinutes !== undefined) return;
  const draft = await getDraft(ctx, generationJobId, "estimate");
  const estimate = estimateSchema.safeParse(draft?.output);
  if (!estimate.success) throw new Error("This case has no valid time estimate.");
  await ctx.db.patch(caseId, { estimatedOptimalMinutes: estimate.data.estimatedOptimalMinutes });
}

/** Copies the discovery minute and crime-scene room into the frozen case, once. */
export async function ensureCaseOpening(ctx: MutationCtx, caseId: Id<"cases">) {
  await ensureCaseClutter(ctx, caseId);
  await ensureDeviceNotes(ctx, caseId);
  await ensureCaseFiller(ctx, caseId);
  const opening = await ctx.db.get(caseId);
  if (opening) await ensurePaymentTimes(ctx, caseId, opening.generationJobId);
  if (opening) await ensureVictimLeads(ctx, caseId, (await getDraft(ctx, opening.generationJobId, "cast"))?.output);
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase || playableCase.discoveryMinute !== undefined || !playableCase.cityId) return;
  const crime = (await getDraft(ctx, playableCase.generationJobId, "crime"))?.output as { discovery?: { time?: unknown }; sceneRoomId?: unknown } | undefined;
  const discoveryMinute = typeof crime?.discovery?.time === "number" && Number.isSafeInteger(crime.discovery.time) ? crime.discovery.time : 0;
  let sceneRoomId: Id<"rooms"> | undefined;
  if (typeof crime?.sceneRoomId === "string") {
    for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
      if (!place.buildingId) continue;
      const room = await ctx.db.query("rooms").withIndex("by_buildingId_and_sourceId", (q) => q.eq("buildingId", place.buildingId!).eq("sourceId", crime.sceneRoomId as string)).unique();
      if (room) { sceneRoomId = room._id; break; }
    }
  }
  await ctx.db.patch(caseId, { discoveryMinute, ...(sceneRoomId ? { sceneRoomId } : {}) });
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
  const rawCrime = crimeDraft?.output;
  const crime = crimeCoreSchema.safeParse(rawCrime && typeof rawCrime === "object" && "killerId" in rawCrime && "timeOfDeath" in rawCrime
    ? { ...rawCrime, type: "murder", culpritId: rawCrime.killerId, crimeTime: rawCrime.timeOfDeath }
    : rawCrime);
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
  const access = await getCameraAccess(ctx, roomCode, "cctv");
  if (!access?.member.session.caseId) return null;
  const playableCase = await ctx.db.get(access.member.session.caseId);
  if (!playableCase) return null;
  const cameras = await ctx.db.query("cctvCameras").withIndex("by_caseId", (q) => q.eq("caseId", playableCase._id)).take(128);
  const available = cameras.filter((camera) => cameraAtAccessPoint(camera, access));
  if (!available.length) return null;
  return {
    member: access.member,
    caseTitle: playableCase.title,
    start: Math.min(...available.map((camera) => camera.startTime)),
    end: Math.max(...available.map((camera) => camera.endTime)),
    cameras: available,
  };
}

export async function ensureCaseForJob(ctx: MutationCtx, generationJobId: Id<"generationJobs">) {
  const existing = await ctx.db
    .query("cases")
    .withIndex("by_generationJobId", (q) => q.eq("generationJobId", generationJobId))
    .unique();

  if (existing?.publicationVersion === PUBLICATION_VERSION) {
    await ensureCaseEstimate(ctx, existing._id, generationJobId);
    await ensureCaseStatements(ctx, existing._id, generationJobId);
    await ensureCaseOpening(ctx, existing._id);
    return existing._id;
  }

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
    await ensureCaseStatements(ctx, existing._id, generationJobId);
    await ensureCaseEstimate(ctx, existing._id, generationJobId);
    await ensureCaseOpening(ctx, existing._id);
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
  await ensureCaseStatements(ctx, caseId, generationJobId);
  await ensureCaseEstimate(ctx, caseId, generationJobId);
  await ensureCaseOpening(ctx, caseId);
  await ctx.db.patch(caseId, { publicationVersion: PUBLICATION_VERSION });
  return caseId;
}

/** Publishes one older passed job without exposing generation drafts to players. */
export const publishPassedJob = internalMutation({
  args: { jobId: v.id("generationJobs") },
  returns: v.id("cases"),
  handler: async (ctx, { jobId }) => await ensureCaseForJob(ctx, jobId),
});

/** Repairs device rows omitted by the first publisher without changing a case's generated truth. */
export const backfillPublishedDevices = internalMutation({
  args: { caseId: v.id("cases") },
  returns: v.object({ laptops: v.number(), files: v.number(), physicalPhones: v.number() }),
  handler: async (ctx, { caseId }) => {
    const playableCase = await ctx.db.get(caseId);
    if (!playableCase || playableCase.publicationVersion !== PUBLICATION_VERSION) throw new Error("This case is not published.");
    await ensureCaseDevices(ctx, caseId, playableCase.generationJobId);
    let laptops = 0;
    let files = 0;
    let physicalPhones = 0;
    for await (const device of ctx.db.query("devices").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) {
      if (device.type === "phone" && device.sourceItemId) physicalPhones++;
      if (device.type !== "laptop") continue;
      laptops++;
      for await (const file of ctx.db.query("deviceFiles").withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))) {
        if (file.caseId === caseId) files++;
      }
    }
    return { laptops, files, physicalPhones };
  },
});

/** Publishes pre-generated statement wording omitted from an older frozen case. */
export const backfillPublishedStatements = internalMutation({
  args: { caseId: v.id("cases") },
  returns: v.null(),
  handler: async (ctx, { caseId }) => {
    const playableCase = await ctx.db.get(caseId);
    if (!playableCase || playableCase.publicationVersion !== PUBLICATION_VERSION) throw new Error("This case is not published.");
    await ensureCaseStatements(ctx, caseId, playableCase.generationJobId);
    return null;
  },
});

/** Restores the victim-body source omitted from older frozen lab rows. */
export const backfillPublishedBodyForensics = internalMutation({
  args: { caseId: v.id("cases") },
  returns: v.number(),
  handler: async (ctx, { caseId }) => {
    const playableCase = await ctx.db.get(caseId);
    if (!playableCase || playableCase.publicationVersion !== PUBLICATION_VERSION) throw new Error("This case is not published.");
    return await restoreBodyForensicSources(ctx, caseId, playableCase.generationJobId);
  },
});

export const listPassed = query({
  args: {},
  returns: v.array(v.object({
    generationJobId: v.id("generationJobs"),
    caseId: v.id("cases"),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    title: v.string(),
    description: v.string(),
    /** This detective's own history with the case: unplayed, in progress, given up, or solved with its best stars. */
    played: v.union(v.literal("new"), v.literal("in-progress"), v.literal("given-up"), v.literal("solved")),
    bestStars: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const authUserId = await requireUserId(ctx);
    const mine = new Map<string, { played: "in-progress" | "given-up" | "solved"; bestStars?: number }>();
    const order = { "in-progress": 0, "given-up": 1, solved: 2 } as const;
    for (const membership of await ctx.db.query("sessionPlayers").withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId)).order("desc").take(100)) {
      const session = await ctx.db.get(membership.sessionId);
      if (!session?.caseId || (session.expiresAt < Date.now() && session.closedAt === undefined && session.gaveUpAt === undefined)) continue;
      const accusation = await ctx.db.query("accusations").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).unique();
      const stars = accusation?.result?.totalStars;
      const played = stars !== undefined ? "solved" as const : session.gaveUpAt !== undefined ? "given-up" as const : "in-progress" as const;
      const before = mine.get(session.caseId);
      if (!before || order[played] > order[before.played] || (played === "solved" && (stars ?? 0) > (before.bestStars ?? 0))) mine.set(session.caseId, { played, ...(stars !== undefined ? { bestStars: Math.max(stars, before?.bestStars ?? 0) } : {}) });
    }
    const cases = [];
    for await (const playableCase of ctx.db.query("cases").withIndex("by_publicationVersion", (q) => q.eq("publicationVersion", PUBLICATION_VERSION))) {
      cases.push({
        generationJobId: playableCase.generationJobId,
        caseId: playableCase._id,
        difficulty: playableCase.difficulty,
        title: playableCase.title,
        description: playableCase.summary,
        ...(mine.get(playableCase._id) ?? { played: "new" as const }),
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
      cameras: cctv.cameras.map((camera) => ({ id: camera.sourceId, name: camera.name, faulty: camera.faulty, start: camera.startTime, end: camera.endTime })),
    } : null;
  },
});

/** Everything already watched on one camera's tape: which hours are loaded and the sightings in them. */
export const getCctvTape = query({
  args: { roomCode: v.string(), cameraId: v.string() },
  returns: v.union(v.null(), v.object({
    reviews: v.array(v.object({ minute: v.number(), ready: v.boolean() })),
    records: v.array(cctvRecord),
    labels: v.array(v.object({ recordId: v.string(), npcId: v.id("npcs"), name: v.string() })),
  })),
  handler: async (ctx, { roomCode, cameraId }) => {
    const cctv = await loadCctv(ctx, roomCode);
    const camera = cctv?.cameras.find((item) => item.sourceId === cameraId);
    if (!cctv || !camera) return null;
    const gameTime = cctv.member.session.gameTime ?? 0;
    const reviews = await ctx.db.query("cctvReviews")
      .withIndex("by_sessionId_and_cameraId_and_minute", (q) => q.eq("sessionId", cctv.member.session._id).eq("cameraId", camera._id))
      .take(200);
    // At the terminal the whole tape is visible; scrubbing is free and instant.
    const records = await ctx.db.query("cctvRecords").withIndex("by_cameraId_and_startTime", (q) => q.eq("cameraId", camera._id)).take(500);
    const labels = [];
    for await (const label of ctx.db.query("cctvLabels").withIndex("by_sessionId_and_recordEvidenceId", (q) => q.eq("sessionId", cctv.member.session._id))) {
      if (!records.some((record) => record.evidenceId === label.recordEvidenceId)) continue;
      const person = await ctx.db.get(label.npcId);
      if (person) labels.push({ recordId: label.recordEvidenceId, npcId: label.npcId, name: person.name });
    }
    return {
      labels,
      reviews: reviews.map((review) => ({ minute: review.minute, ready: review.completeGameTime <= gameTime })),
      records: records.map((record) => ({ id: record.evidenceId, cameraId, start: record.startTime, end: record.endTime, summary: record.description, kind: record.kind })),
    };
  },
});

/** Mark who the detectives think a sighting shows, or clear it. Shared with the partner; never graded. */
export const labelSighting = mutation({
  args: { roomCode: v.string(), recordId: v.string(), npcId: v.union(v.id("npcs"), v.null()) },
  returns: v.null(),
  handler: async (ctx, { roomCode, recordId, npcId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    const record = await ctx.db.query("cctvRecords").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", member.session.caseId!).eq("evidenceId", recordId)).unique();
    if (!record) throw new Error("That sighting is not part of this case.");
    if (npcId && !(await knownPeople(ctx, member.session)).has(npcId)) throw new Error("You have not come across this person yet.");
    const existing = await ctx.db.query("cctvLabels").withIndex("by_sessionId_and_recordEvidenceId", (q) => q.eq("sessionId", member.session._id).eq("recordEvidenceId", recordId)).unique();
    if (!npcId) { if (existing) await ctx.db.delete(existing._id); return null; }
    if (existing) await ctx.db.patch(existing._id, { npcId });
    else await ctx.db.insert("cctvLabels", { sessionId: member.session._id, recordEvidenceId: recordId, npcId });
    return null;
  },
});

export const getCctvWindow = query({
  args: { roomCode: v.string(), cameraId: v.string(), minute: v.number() },
  returns: v.union(v.null(), v.object({
    status: v.union(v.literal("available"), v.literal("pending"), v.literal("ready")),
    completeGameTime: v.optional(v.number()),
    records: v.array(cctvRecord),
  })),
  handler: async (ctx, { roomCode, cameraId, minute }) => {
    const cctv = await loadCctv(ctx, roomCode);
    const camera = cctv?.cameras.find((item) => item.sourceId === cameraId);
    if (!camera || !Number.isInteger(minute) || minute < camera.startTime || minute > camera.endTime) return null;
    const review = await ctx.db.query("cctvReviews")
      .withIndex("by_sessionId_and_cameraId_and_minute", (q) => q.eq("sessionId", cctv!.member.session._id).eq("cameraId", camera._id).eq("minute", minute))
      .unique();
    if (!review) return { status: "available" as const, records: [] };
    if (review.completeGameTime > (cctv!.member.session.gameTime ?? 0)) {
      return { status: "pending" as const, completeGameTime: review.completeGameTime, records: [] };
    }
    const records = [];
    for await (const record of ctx.db
      .query("cctvRecords")
      .withIndex("by_cameraId_and_startTime", (q) => q.eq("cameraId", camera._id).lte("startTime", minute + CCTV_HALF_WINDOW))) {
      if (record.endTime >= minute - CCTV_HALF_WINDOW) records.push(record);
    }
    return { status: "ready" as const, records: records.map((record) => ({
        id: record.evidenceId,
        cameraId,
        start: record.startTime,
        end: record.endTime,
        summary: record.description,
        kind: record.kind,
      })) };
  },
});

export const startCctvReview = mutation({
  args: { roomCode: v.string(), cameraId: v.string(), minute: v.number() },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, cameraId, minute }) => {
    const playing = await getPlayingRoomMember(ctx, roomCode);
    if (!playing?.session.caseId) throw new Error("Start the investigation first.");
    await requireInvestigationOpen(ctx, playing.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, playing.session, now);
    const access = await getCameraAccess(ctx, roomCode);
    if (!access) throw new Error("Visit this camera's access point first.");
    const member = access.member;
    const camera = await ctx.db.query("cctvCameras")
      .withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", member.session.caseId!).eq("sourceId", cameraId))
      .unique();
    if (!camera || !cameraAtAccessPoint(camera, access)) throw new Error("Visit this camera's access point first.");
    if (!Number.isInteger(minute) || minute < camera.startTime || minute > camera.endTime) throw new Error("Choose a valid camera time.");
    const existing = await ctx.db.query("cctvReviews")
      .withIndex("by_sessionId_and_cameraId_and_minute", (q) => q.eq("sessionId", member.session._id).eq("cameraId", camera._id).eq("minute", minute))
      .unique();
    // Watching tape is instant and free: scrubbing only records which hours the team has seen.
    const completeGameTime = (await ctx.db.get(member.session._id))?.gameTime ?? settled.gameTime;
    if (!existing) await ctx.db.insert("cctvReviews", { sessionId: member.session._id, cameraId: camera._id, minute, completeGameTime });
    return { completeGameTime };
  },
});

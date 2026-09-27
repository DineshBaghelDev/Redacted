import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { storySchema, textsSchema } from "../generation/core/schemas";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getDraft(ctx: MutationCtx, jobId: Id<"generationJobs">, stage: string) {
  return await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", stage)).unique();
}

export async function ensureCaseDevices(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  if (await ctx.db.query("devices").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first()) return;

  const [evidenceDraft, storyDraft, textsDraft] = await Promise.all([
    getDraft(ctx, generationJobId, "evidence"),
    getDraft(ctx, generationJobId, "story"),
    getDraft(ctx, generationJobId, "text"),
  ]);
  if (!isObject(evidenceDraft?.output) || !Array.isArray(evidenceDraft.output.evidence)) throw new Error("This case has no valid device records.");
  const story = storySchema.safeParse(storyDraft?.output);
  if (!story.success) throw new Error("This case has no valid communications.");
  const textResult = textsSchema.safeParse(textsDraft?.output);
  const rewritten = new Map(textResult.success ? textResult.data.texts.map((value) => [value.id, value.text]) : []);
  const comms = new Map(story.data.comms.map((value) => [value.id, value]));
  const people = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) people.push(person);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));
  const npcNames = new Map(people.map((person) => [person.sourceId, person.name]));
  const deviceIds = new Map<string, Id<"devices">>();

  for (const value of evidenceDraft.output.evidence) {
    if (!isObject(value) || value.type !== "device") continue;
    const data = value.data;
    if (typeof value.title !== "string" || typeof value.summary !== "string" || !isObject(data) || typeof data.deviceId !== "string" || typeof data.ownerId !== "string") throw new Error("This case has an invalid device.");
    const ownerNpcId = npcIds.get(data.ownerId);
    if (!ownerNpcId) throw new Error(`Device ${data.deviceId} names an unknown owner.`);
    deviceIds.set(data.deviceId, await ctx.db.insert("devices", {
      caseId,
      sourceId: data.deviceId,
      type: "phone",
      ownerNpcId,
      name: value.title,
      description: value.summary,
    }));
  }

  for (const value of evidenceDraft.output.evidence) {
    if (!isObject(value) || (value.type !== "call" && value.type !== "message")) continue;
    const access = value.access;
    const data = value.data;
    if (typeof value.id !== "string" || typeof value.summary !== "string" || typeof value.time !== "number" || !isObject(access) || access.tool !== "phone" || typeof access.deviceId !== "string" || !isObject(data) || typeof data.ownerId !== "string" || typeof data.from !== "string" || typeof data.to !== "string" || !Array.isArray(value.sourceIds) || typeof value.sourceIds[0] !== "string") throw new Error("This case has an invalid communication record.");
    const deviceId = deviceIds.get(access.deviceId);
    const otherSourceId = data.ownerId === data.from ? data.to : data.from;
    const otherPartyNpcId = npcIds.get(otherSourceId);
    if (!deviceId || !otherPartyNpcId) throw new Error(`Communication ${value.id} names an unknown phone or person.`);
    const direction = data.ownerId === data.from ? "outgoing" as const : "incoming" as const;
    const sourceId = value.sourceIds[0];
    if (value.type === "call") {
      await ctx.db.insert("callLogs", {
        caseId,
        evidenceId: value.id,
        deviceId,
        otherPartyNpcId,
        otherPartyLabel: npcNames.get(otherSourceId),
        timestamp: value.time,
        direction,
        durationSeconds: (comms.get(sourceId)?.durationMinutes ?? 1) * 60,
      });
    } else {
      await ctx.db.insert("messages", {
        caseId,
        evidenceId: value.id,
        deviceId,
        otherPartyNpcId,
        otherPartyLabel: npcNames.get(otherSourceId),
        timestamp: value.time,
        direction,
        body: rewritten.get(value.id) ?? rewritten.get(sourceId) ?? value.summary,
      });
    }
  }
}

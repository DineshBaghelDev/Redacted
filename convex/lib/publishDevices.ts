import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { storySchema, textsSchema } from "../generation/core/schemas";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getDraft(ctx: MutationCtx, jobId: Id<"generationJobs">, stage: string) {
  return await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", stage)).unique();
}

export async function ensureCaseDevices(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
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
  const people: Doc<"npcs">[] = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) people.push(person);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));
  const npcNames = new Map(people.map((person) => [person.sourceId, person.name]));
  const deviceIds = new Map<string, Id<"devices">>();
  const hasCommunications = Boolean(await ctx.db.query("callLogs").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first()
    || await ctx.db.query("messages").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first());

  for (const value of evidenceDraft.output.evidence) {
    if (!isObject(value) || value.type !== "device") continue;
    const data = value.data;
    if (typeof value.title !== "string" || typeof value.summary !== "string" || !isObject(data) || typeof data.deviceId !== "string" || typeof data.ownerId !== "string") throw new Error("This case has an invalid device.");
    const ownerNpcId = npcIds.get(data.ownerId);
    if (!ownerNpcId) throw new Error(`Device ${data.deviceId} names an unknown owner.`);
    const deviceSourceId = data.deviceId;
    let sourceItemId: Id<"caseItems"> | undefined;
    if (isObject(value.access) && value.access.tool === "search") {
      if (typeof value.id !== "string" || typeof value.access.roomId !== "string" || typeof value.access.slot !== "string") throw new Error(`Device ${data.deviceId} has an invalid search location.`);
      const evidenceId = value.id;
      const roomSourceId = value.access.roomId;
      const slot = value.access.slot;
      const existingItem = await ctx.db.query("caseItems").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).eq("evidenceId", evidenceId)).unique();
      if (existingItem) {
        const room = await ctx.db.get(existingItem.roomId);
        if (room && !room.searchable) await ctx.db.patch(room._id, { searchable: true });
        sourceItemId = existingItem._id;
      }
      else {
        const playableCase = await ctx.db.get(caseId);
        if (!playableCase?.cityId) throw new Error("This case has no playable world.");
        let location: { placeId: Id<"places">; roomId: Id<"rooms"> } | null = null;
        for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
          if (!place.buildingId) continue;
          const room = await ctx.db.query("rooms").withIndex("by_buildingId_and_sourceId", (q) => q.eq("buildingId", place.buildingId!).eq("sourceId", roomSourceId)).unique();
          if (room) {
            if (!room.searchable) await ctx.db.patch(room._id, { searchable: true });
            location = { placeId: place._id, roomId: room._id };
            break;
          }
        }
        if (!location) throw new Error(`Device ${data.deviceId} has no scene room.`);
        sourceItemId = await ctx.db.insert("caseItems", {
          caseId, evidenceId, sourceId: data.deviceId, name: value.title, description: value.summary,
          placeId: location.placeId, roomId: location.roomId, slot,
          discoverableBySearch: true, collectible: true, hidden: true, itemType: "device",
        });
      }
    }
    const existingDevice = await ctx.db.query("devices").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", caseId).eq("sourceId", deviceSourceId)).unique();
    if (existingDevice) {
      if (sourceItemId && existingDevice.sourceItemId !== sourceItemId) await ctx.db.patch(existingDevice._id, { sourceItemId });
      deviceIds.set(deviceSourceId, existingDevice._id);
    } else {
      deviceIds.set(deviceSourceId, await ctx.db.insert("devices", {
        caseId, sourceId: deviceSourceId, type: "phone", ownerNpcId, sourceItemId,
        name: value.title, description: value.summary,
      }));
    }
  }

  if (!hasCommunications) for (const value of evidenceDraft.output.evidence) {
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

  for (const item of story.data.items.filter((value) => value.kind === "device")) {
    const sourceItem = await ctx.db.query("caseItems").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", caseId).eq("sourceId", item.id)).unique();
    if (!sourceItem) throw new Error(`Device ${item.id} has no physical item.`);
    const existing = await ctx.db.query("devices").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", caseId).eq("sourceId", item.id)).unique();
    if (existing) continue;
    const deviceId = await ctx.db.insert("devices", {
      caseId, sourceId: item.id, type: "laptop", sourceItemId: sourceItem._id,
      ownerNpcId: item.ownerId ? npcIds.get(item.ownerId) : undefined,
      name: item.name, description: item.description,
    });
    for (const value of evidenceDraft.output.evidence) {
      if (!isObject(value) || value.type !== "file" || !isObject(value.access) || value.access.tool !== "device" || value.access.itemId !== item.id) continue;
      if (typeof value.id !== "string" || typeof value.title !== "string" || typeof value.summary !== "string") throw new Error(`Device ${item.id} has an invalid file.`);
      await ctx.db.insert("deviceFiles", { caseId, deviceId, evidenceId: value.id, title: value.title, body: rewritten.get(value.id) ?? value.summary });
    }
  }
}

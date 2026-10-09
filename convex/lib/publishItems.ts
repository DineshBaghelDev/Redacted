import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type ItemDraft = {
  evidenceId: string;
  sourceId?: string;
  name: string;
  description: string;
  roomSourceId: string;
  slot: string;
  itemType: string;
  collectible: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readItems(evidenceOutput: unknown, storyOutput: unknown): ItemDraft[] | null {
  if (!isObject(evidenceOutput) || !Array.isArray(evidenceOutput.evidence)) return null;
  if (!isObject(storyOutput) || !Array.isArray(storyOutput.items)) return null;

  const itemTypes = new Map<string, string>();
  for (const value of storyOutput.items) {
    if (isObject(value) && typeof value.id === "string" && typeof value.kind === "string") itemTypes.set(value.id, value.kind);
  }

  const items: ItemDraft[] = [];
  for (const value of evidenceOutput.evidence) {
    if (!isObject(value) || value.type !== "item" || typeof value.id !== "string" || typeof value.title !== "string" || typeof value.summary !== "string") continue;
    const access = value.access;
    const data = value.data;
    if (!isObject(access) || access.tool !== "search" || typeof access.roomId !== "string" || typeof access.slot !== "string" || !isObject(data)) return null;
    const sourceId = typeof data.itemId === "string" && data.itemId ? data.itemId : undefined;
    items.push({
      evidenceId: value.id,
      sourceId,
      name: value.title,
      description: value.summary,
      roomSourceId: access.roomId,
      slot: access.slot,
      itemType: sourceId ? itemTypes.get(sourceId) ?? "other" : "other",
      collectible: data.clutter !== true,
    });
  }
  return items;
}

async function getDraft(ctx: MutationCtx, jobId: Id<"generationJobs">, stage: string) {
  return await ctx.db
    .query("generationDrafts")
    .withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", stage))
    .unique();
}

export async function ensureCaseItems(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const existing = await ctx.db
    .query("caseItems")
    .withIndex("by_caseId", (q) => q.eq("caseId", caseId))
    .first();
  if (existing) return;

  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId) throw new Error("This case has no playable world.");
  const [evidenceDraft, storyDraft] = await Promise.all([
    getDraft(ctx, generationJobId, "evidence"),
    getDraft(ctx, generationJobId, "story"),
  ]);
  const items = readItems(evidenceDraft?.output, storyDraft?.output);
  if (!items) throw new Error("This case has no valid physical evidence.");

  const places = [];
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) places.push(place);
  const rooms = new Map<string, { roomId: Id<"rooms">; placeId: Id<"places"> }>();
  for (const place of places) {
    if (!place.buildingId) continue;
    const storedRooms = [];
    for await (const room of ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!))) storedRooms.push(room);
    for (const room of storedRooms) rooms.set(room.sourceId, { roomId: room._id, placeId: place._id });
  }

  for (const item of items) {
    const location = rooms.get(item.roomSourceId);
    if (!location) throw new Error(`Case item ${item.evidenceId} has an unknown room.`);
    await ctx.db.insert("caseItems", {
      caseId,
      evidenceId: item.evidenceId,
      sourceId: item.sourceId,
      name: item.name,
      description: item.description,
      placeId: location.placeId,
      roomId: location.roomId,
      slot: item.slot,
      discoverableBySearch: true,
      collectible: item.collectible,
      hidden: true,
      itemType: item.itemType,
    });
  }
}

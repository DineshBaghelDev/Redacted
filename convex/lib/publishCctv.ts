import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function ensureCaseCctv(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const existing = await ctx.db.query("cctvCameras").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first();
  if (existing) return;

  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId) throw new Error("This case has no playable world.");
  const draft = await ctx.db
    .query("generationDrafts")
    .withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "evidence"))
    .unique();
  if (!isObject(draft?.output) || !Array.isArray(draft.output.cameras) || !Array.isArray(draft.output.evidence)) {
    throw new Error("This case has no valid camera records.");
  }

  const places = [];
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) places.push(place);
  const placeIds = new Map(places.map((place) => [place.sourceId, place._id]));
  const roomIds = new Map<string, Id<"rooms">>();
  for (const place of places) {
    if (!place.buildingId) continue;
    const rooms = [];
    for await (const room of ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!))) rooms.push(room);
    for (const room of rooms) roomIds.set(room.sourceId, room._id);
  }
  const streets = [];
  for await (const street of ctx.db.query("placeConnections").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) streets.push(street);
  const streetIds = new Map(streets.map((street) => [street.sourceId, street]));
  const people = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) people.push(person);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));

  const recordsByCamera = new Map<string, Array<Record<string, unknown>>>();
  for (const value of draft.output.evidence) {
    if (!isObject(value) || value.type !== "cctv" || !isObject(value.access) || value.access.tool !== "cctv" || typeof value.access.cameraId !== "string") continue;
    const records = recordsByCamera.get(value.access.cameraId) ?? [];
    records.push(value);
    recordsByCamera.set(value.access.cameraId, records);
  }

  for (const value of draft.output.cameras) {
    if (!isObject(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.faulty !== "boolean") {
      throw new Error("This case has an invalid camera.");
    }
    const records = recordsByCamera.get(value.id) ?? [];
    const times = records.flatMap((record) => typeof record.time === "number" ? [record.time, typeof record.end === "number" ? record.end : record.time] : []);
    if (!times.length) throw new Error(`Camera ${value.id} has no case window.`);
    const street = typeof value.streetId === "string" ? streetIds.get(value.streetId) : undefined;
    const cameraId = await ctx.db.insert("cctvCameras", {
      caseId,
      sourceId: value.id,
      placeId: typeof value.placeId === "string" ? placeIds.get(value.placeId) : undefined,
      roomId: typeof value.roomId === "string" ? roomIds.get(value.roomId) : undefined,
      streetFromPlaceId: street?.fromPlaceId,
      streetToPlaceId: street?.toPlaceId,
      name: value.name,
      description: value.name,
      faulty: value.faulty,
      startTime: Math.min(...times),
      endTime: Math.max(...times),
    });

    for (const record of records) {
      const data = record.data;
      if (
        typeof record.id !== "string"
        || typeof record.summary !== "string"
        || typeof record.time !== "number"
        || !isObject(data)
        || (data.kind !== "stay" && data.kind !== "pass" && data.kind !== "offline")
        || !Array.isArray(record.aboutIds)
      ) throw new Error(`Camera ${value.id} has an invalid record.`);
      const linkedNpcIds = record.aboutIds.map((sourceId) => typeof sourceId === "string" ? npcIds.get(sourceId) : undefined);
      if (linkedNpcIds.some((npcId) => !npcId)) throw new Error(`Camera record ${record.id} names an unknown person.`);
      await ctx.db.insert("cctvRecords", {
        caseId,
        evidenceId: record.id,
        cameraId,
        startTime: record.time,
        endTime: typeof record.end === "number" ? record.end : record.time,
        npcIds: linkedNpcIds as Id<"npcs">[],
        vehicleIds: [],
        description: record.summary,
        kind: data.kind,
      });
    }
  }
}

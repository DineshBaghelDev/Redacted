import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const turnaround = {
  fingerprint: 60,
  footprint: 60,
  blood: 120,
  dna: 240,
  toxicology: 240,
  fiber: 120,
  ballistics: 180,
  autopsy: 240,
  other: 120,
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function testType(value: unknown): keyof typeof turnaround {
  if (value === "fingerprints") return "fingerprint";
  if (value === "footprints") return "footprint";
  if (value === "fibers") return "fiber";
  if (value === "blood" || value === "toxicology" || value === "ballistics" || value === "autopsy") return value;
  return "other";
}

export async function ensureCaseForensics(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  if (await ctx.db.query("forensicOutputs").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first()) return;
  const draft = await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "evidence")).unique();
  if (!isObject(draft?.output) || !Array.isArray(draft.output.evidence)) throw new Error("This case has no valid forensic records.");
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId) throw new Error("This case has no playable world.");
  const people = await ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).take(32);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));
  const items = await ctx.db.query("caseItems").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).take(256);
  const itemIds = new Map(items.filter((item) => item.sourceId).map((item) => [item.sourceId!, item._id]));
  const roomIds = new Map<string, Id<"rooms">>();
  const places = await ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!)).take(32);
  for (const place of places) {
    if (!place.buildingId) continue;
    const rooms = await ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).take(64);
    for (const room of rooms) roomIds.set(room.sourceId, room._id);
  }

  for (const value of draft.output.evidence) {
    if (!isObject(value) || value.type !== "forensic") continue;
    const data = value.data;
    if (typeof value.id !== "string" || typeof value.summary !== "string" || !Array.isArray(value.aboutIds) || !isObject(data) || typeof data.subjectId !== "string") throw new Error("This case has an invalid forensic record.");
    const linkedNpcIds = value.aboutIds.map((sourceId) => typeof sourceId === "string" ? npcIds.get(sourceId) : undefined);
    if (linkedNpcIds.some((npcId) => !npcId)) throw new Error(`Forensic record ${value.id} names an unknown person.`);
    const normalizedType = testType(data.test);
    await ctx.db.insert("forensicOutputs", {
      caseId,
      evidenceId: value.id,
      sourceItemId: data.subjectId.startsWith("item:") ? itemIds.get(data.subjectId.slice(5)) : undefined,
      sourceRoomId: data.subjectId.startsWith("room:") ? roomIds.get(data.subjectId.slice(5)) : undefined,
      testType: normalizedType,
      result: value.summary,
      linkedNpcIds: linkedNpcIds as Id<"npcs">[],
      turnaroundMinutes: turnaround[normalizedType],
    });
  }
}

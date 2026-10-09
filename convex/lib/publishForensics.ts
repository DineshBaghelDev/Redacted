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
  const people = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) people.push(person);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));
  const victimIds = new Map(people.filter((person) => person.role === "victim").map((person) => [person.sourceId, person._id]));
  const items = [];
  for await (const item of ctx.db.query("caseItems").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) items.push(item);
  const itemIds = new Map(items.filter((item) => item.sourceId).map((item) => [item.sourceId!, item._id]));
  const roomIds = new Map<string, Id<"rooms">>();
  const places = [];
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) places.push(place);
  for (const place of places) {
    if (!place.buildingId) continue;
    const rooms = [];
    for await (const room of ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!))) rooms.push(room);
    for (const room of rooms) roomIds.set(room.sourceId, room._id);
  }

  for (const value of draft.output.evidence) {
    if (!isObject(value) || value.type !== "forensic") continue;
    const data = value.data;
    if (typeof value.id !== "string" || typeof value.summary !== "string" || !Array.isArray(value.aboutIds) || !isObject(data) || typeof data.subjectId !== "string") throw new Error("This case has an invalid forensic record.");
    const linkedNpcIds = value.aboutIds.map((sourceId) => typeof sourceId === "string" ? npcIds.get(sourceId) : undefined);
    if (linkedNpcIds.some((npcId) => !npcId)) throw new Error(`Forensic record ${value.id} names an unknown person.`);
    const normalizedType = testType(data.test);
    const sourceItemId = data.subjectId.startsWith("item:") ? itemIds.get(data.subjectId.slice(5)) : undefined;
    const sourceRoomId = data.subjectId.startsWith("room:") ? roomIds.get(data.subjectId.slice(5)) : undefined;
    const sourceNpcId = data.subjectId.startsWith("body:") ? victimIds.get(data.subjectId.slice(5)) : undefined;
    if (!sourceItemId && !sourceRoomId && !sourceNpcId) throw new Error(`Forensic record ${value.id} has no playable source.`);
    await ctx.db.insert("forensicOutputs", {
      caseId,
      evidenceId: value.id,
      sourceItemId,
      sourceRoomId,
      sourceNpcId,
      testType: normalizedType,
      result: value.summary,
      linkedNpcIds: linkedNpcIds as Id<"npcs">[],
      turnaroundMinutes: turnaround[normalizedType],
    });
  }
}

export async function restoreBodyForensicSources(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const draft = await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "evidence")).unique();
  if (!isObject(draft?.output) || !Array.isArray(draft.output.evidence)) throw new Error("This case has no valid forensic records.");
  let repaired = 0;
  for await (const output of ctx.db.query("forensicOutputs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) {
    if (output.sourceItemId || output.sourceRoomId || output.sourceNpcId) continue;
    const matches = draft.output.evidence.filter((value) => isObject(value) && value.type === "forensic" && value.id === output.evidenceId);
    if (matches.length !== 1) throw new Error(`Forensic record ${output.evidenceId} has no unique draft source.`);
    const data = matches[0].data;
    const subjectId = isObject(data) ? data.subjectId : undefined;
    if (typeof subjectId !== "string" || !subjectId.startsWith("body:")) throw new Error(`Forensic record ${output.evidenceId} has no body source.`);
    const victim = await ctx.db.query("npcs").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", caseId).eq("sourceId", subjectId.slice(5))).unique();
    if (victim?.role !== "victim") throw new Error(`Forensic record ${output.evidenceId} has no matching victim.`);
    await ctx.db.patch(output._id, { sourceNpcId: victim._id });
    repaired++;
  }
  return repaired;
}

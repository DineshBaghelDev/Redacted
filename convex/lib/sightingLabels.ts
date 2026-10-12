import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

function clock(minute: number) {
  const within = ((minute % 1440) + 1440) % 1440;
  return `Day ${Math.floor(minute / 1440) + 1} ${String(Math.floor(within / 60)).padStart(2, "0")}:${String(within % 60).padStart(2, "0")}`;
}

/** The name on a sighting mark, whether it points at a known person or one of the team's unknown people. */
export async function markedName(ctx: QueryCtx, label: Doc<"cctvLabels">) {
  const marked = label.npcId ? await ctx.db.get(label.npcId) : label.unknownPersonId ? await ctx.db.get(label.unknownPersonId) : null;
  return marked?.name ?? null;
}

/** Camera sightings the team marked, per person or unknown person id: "Camera name · Day 2 21:40". */
export async function spottedBy(ctx: QueryCtx, session: Doc<"sessions">) {
  const spotted = new Map<string, string[]>();
  if (!session.caseId) return spotted;
  for await (const label of ctx.db.query("cctvLabels").withIndex("by_sessionId_and_recordEvidenceId", (q) => q.eq("sessionId", session._id))) {
    const who = label.npcId ?? label.unknownPersonId;
    if (!who) continue;
    const record = await ctx.db.query("cctvRecords").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", session.caseId!).eq("evidenceId", label.recordEvidenceId)).unique();
    const camera = record ? await ctx.db.get(record.cameraId) : null;
    if (record && camera) spotted.set(who, [...(spotted.get(who) ?? []), `${camera.name} · ${clock(record.startTime)}`]);
  }
  return spotted;
}

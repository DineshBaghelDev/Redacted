import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function recordType(kind: unknown) {
  if (kind === "address") return "person" as const;
  if (kind === "employment") return "employment" as const;
  if (kind === "criminal") return "criminal" as const;
  if (kind === "property") return "property" as const;
  if (kind === "company") return "business" as const;
  return "other" as const;
}

/** "Day 2 at 07:40": the time a card payment went through. */
function paidAt(time: unknown) {
  if (typeof time !== "number" || !Number.isFinite(time)) return "";
  const minute = Math.max(0, Math.floor(time));
  return ` Paid on Day ${Math.floor(minute / 1440) + 1} at ${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}.`;
}

/** Older cases stored card payments without their time; copy it from the frozen evidence once. */
export async function ensurePaymentTimes(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const cards = await ctx.db.query("publicRecords").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).gte("evidenceId", "card/").lt("evidenceId", "card/￿")).take(100);
  if (!cards.some((record) => record.type !== "payment")) return;
  const draft = await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "evidence")).unique();
  const evidence = isObject(draft?.output) && Array.isArray(draft.output.evidence) ? draft.output.evidence : [];
  for (const record of cards) {
    if (record.type === "payment") continue;
    const source = evidence.find((value): value is Record<string, unknown> => isObject(value) && value.id === record.evidenceId);
    await ctx.db.patch(record._id, { type: "payment", content: `${record.content}${paidAt(source?.time)}` });
  }
}

export async function ensureCaseRecords(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  if (await ctx.db.query("publicRecords").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first()) return;
  const draft = await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "evidence")).unique();
  if (!isObject(draft?.output) || !Array.isArray(draft.output.evidence)) throw new Error("This case has no valid public records.");
  const people = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) people.push(person);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));

  for (const value of draft.output.evidence) {
    if (!isObject(value) || (value.type !== "record" && value.type !== "card")) continue;
    const data = value.data;
    if (typeof value.id !== "string" || typeof value.title !== "string" || typeof value.summary !== "string" || !isObject(data)) throw new Error("This case has an invalid public record.");
    const personId = value.type === "record" ? data.personId : data.who;
    const subjectNpcId = typeof personId === "string" ? npcIds.get(personId) : undefined;
    if (!subjectNpcId) throw new Error(`Public record ${value.id} names an unknown person.`);
    await ctx.db.insert("publicRecords", {
      caseId,
      evidenceId: value.id,
      type: value.type === "card" ? "payment" : recordType(data.kind),
      subjectNpcId,
      title: value.title,
      content: value.type === "card" ? `${value.summary}${paidAt(value.time)}` : value.summary,
    });
  }
}

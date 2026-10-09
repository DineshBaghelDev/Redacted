import { z } from "zod";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { lieSchema, storySchema } from "../generation/core/schemas";

const knowledgeSchema = z.object({
  id: z.string(),
  how: z.enum(["took part", "saw", "sent", "received", "bought", "heard"]),
  time: z.number(),
  end: z.number().optional(),
  where: z.string().optional(),
  text: z.string(),
});

const scriptSchema = z.object({
  npcId: z.string(),
  personality: z.array(z.string()),
  job: z.string(),
  home: z.string(),
  relationshipToVictim: z.string(),
  secret: z.string().optional(),
  protects: z.string().optional(),
  knowledge: z.array(knowledgeSchema),
  lies: z.array(lieSchema),
  rules: z.array(z.string()),
});

async function getDraft(ctx: MutationCtx, jobId: Id<"generationJobs">, stage: string) {
  return await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", stage)).unique();
}

export async function ensureCaseNarrative(ctx: MutationCtx, caseId: Id<"cases">, generationJobId: Id<"generationJobs">) {
  const [event, script, storyDraft, scriptsDraft] = await Promise.all([
    ctx.db.query("caseEvents").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first(),
    ctx.db.query("npcScripts").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).first(),
    getDraft(ctx, generationJobId, "story"),
    getDraft(ctx, generationJobId, "scripts"),
  ]);
  if (event && script) return;
  const story = storySchema.safeParse(storyDraft?.output);
  const scripts = z.array(scriptSchema).safeParse(scriptsDraft?.output);
  if (!story.success || !scripts.success) throw new Error("This case has no valid private narrative.");
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId) throw new Error("This case has no playable world.");
  const people = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) people.push(person);
  const npcIds = new Map(people.map((person) => [person.sourceId, person._id]));

  if (!event) {
    for (const value of story.data.events) {
      const placeSourceId = value.roomId.split(":")[0];
      const place = await ctx.db.query("places").withIndex("by_cityId_and_sourceId", (q) => q.eq("cityId", playableCase.cityId!).eq("sourceId", placeSourceId)).unique();
      const room = place?.buildingId
        ? await ctx.db.query("rooms").withIndex("by_buildingId_and_sourceId", (q) => q.eq("buildingId", place.buildingId!).eq("sourceId", value.roomId)).unique()
        : null;
      const actorIds = value.actors.map((sourceId) => npcIds.get(sourceId));
      if (!place || !room || actorIds.some((id) => !id)) throw new Error(`Case event ${value.id} names an unknown room or person.`);
      await ctx.db.insert("caseEvents", {
        caseId,
        sourceId: value.id,
        startTime: value.start,
        endTime: value.end,
        npcIds: actorIds as Id<"npcs">[],
        placeId: place._id,
        roomId: room._id,
        description: value.action,
      });
    }
  }

  if (!script) {
    for (const value of scripts.data) {
      const npcId = npcIds.get(value.npcId);
      if (!npcId) throw new Error(`NPC script names unknown person ${value.npcId}.`);
      await ctx.db.insert("npcScripts", {
        caseId,
        npcId,
        personality: value.personality,
        job: value.job,
        home: value.home,
        relationshipToVictim: value.relationshipToVictim,
        secret: value.secret,
        protects: value.protects,
        knowledge: value.knowledge.map(({ id, ...knowledge }) => ({ sourceId: id, ...knowledge })),
        intentionalLies: value.lies.map((lie) => ({
          topic: lie.topic,
          claim: lie.claim,
          truthIds: lie.truthIds,
          reason: lie.reason,
          disprovingEvidenceIds: lie.disprovingEvidenceIds,
          whenCaught: lie.whenCaught,
          backupLie: lie.backupLie,
        })),
        behavioralRules: value.rules,
      });
    }
  }
}

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { generateJson, modelsFor } from "./generation/llm";
import { getPlayingRoomMember } from "./lib/auth";

const MAX_EXPLANATION = 2_000;
const MAX_EVIDENCE = 12;

const categoryResult = v.object({ star: v.boolean(), feedback: v.optional(v.string()) });
const resultValidator = v.object({
  killer: v.object({ star: v.boolean() }),
  motive: categoryResult,
  weapon: v.object({ star: v.boolean() }),
  evidence: categoryResult,
  method: categoryResult,
  totalStars: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)),
});

const semanticGradeSchema = z.object({
  motiveStar: z.boolean(),
  weaponStar: z.boolean(),
  evidenceStar: z.boolean(),
  methodStar: z.boolean(),
});

function explanation(value: string, label: string) {
  const trimmed = value.trim();
  if (trimmed.length < 10) throw new Error(`${label} needs a little more detail.`);
  if (trimmed.length > MAX_EXPLANATION) throw new Error(`${label} must be ${MAX_EXPLANATION} characters or fewer.`);
  return trimmed;
}

function shortText(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 200) throw new Error(`${label} must be 200 characters or fewer.`);
  return trimmed;
}

function sameText(a: string | undefined, b: string | undefined) {
  return !!a && !!b && a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

export const submit = mutation({
  args: {
    roomCode: v.string(),
    culpritNpcId: v.id("npcs"),
    motiveExplanation: v.string(),
    weaponItemId: v.optional(v.id("caseItems")),
    weaponDescription: v.optional(v.string()),
    evidenceIds: v.array(v.string()),
    evidenceExplanation: v.string(),
    methodExplanation: v.string(),
  },
  returns: v.id("accusations"),
  handler: async (ctx, args) => {
    const member = await getPlayingRoomMember(ctx, args.roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    const existing = await ctx.db
      .query("accusations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))
      .first();
    if (existing) throw new Error("This case has already been submitted.");

    const culprit = await ctx.db.get(args.culpritNpcId);
    if (!culprit || culprit.caseId !== member.session.caseId) throw new Error("Choose a person from this case.");
    const evidenceIds = [...new Set(args.evidenceIds.map((id) => id.trim()).filter(Boolean))];
    if (evidenceIds.length === 0) throw new Error("Choose at least one piece of evidence from the clueboard.");
    if (evidenceIds.length > MAX_EVIDENCE) throw new Error(`Choose no more than ${MAX_EVIDENCE} pieces of evidence.`);

    const boardNodes = await ctx.db
      .query("clueBoardNodes")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))
      .take(100);
    const boardEvidence = new Map(boardNodes
      .filter((node) => (node.type === "cctv" || node.type === "public_record" || node.type === "item" || node.type === "forensic") && node.referenceId)
      .map((node) => [node.referenceId!, node.type] as const));
    if (evidenceIds.some((id) => !boardEvidence.has(id))) {
      throw new Error("Choose only evidence pinned to this clueboard.");
    }
    const canonicalEvidenceIds: string[] = [];
    for (const id of evidenceIds) {
      const type = boardEvidence.get(id);
      if (type === "item") {
        const itemId = ctx.db.normalizeId("caseItems", id);
        const item = itemId ? await ctx.db.get(itemId) : null;
        if (!item || item.caseId !== member.session.caseId) throw new Error("That item is not part of this case.");
        canonicalEvidenceIds.push(item.evidenceId);
      } else if (type === "forensic") {
        const outputId = ctx.db.normalizeId("forensicOutputs", id);
        const output = outputId ? await ctx.db.get(outputId) : null;
        const request = outputId ? await ctx.db.query("forensicRequests").withIndex("by_sessionId_and_forensicOutputId", (q) => q.eq("sessionId", member.session._id).eq("forensicOutputId", outputId)).unique() : null;
        if (!output || output.caseId !== member.session.caseId || request?.viewedAt === undefined) throw new Error("View the lab result before using it as evidence.");
        canonicalEvidenceIds.push(output.evidenceId);
      } else canonicalEvidenceIds.push(id);
    }

    const weaponItemId = args.weaponItemId;
    if (weaponItemId) {
      const item = await ctx.db.get(weaponItemId);
      const known = await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", member.session._id).eq("itemId", weaponItemId)).unique();
      if (!item || item.caseId !== member.session.caseId || known?.collectedAt === undefined) throw new Error("Choose a weapon from shared inventory.");
    }
    const weaponDescription = shortText(args.weaponDescription, "Weapon");
    const now = Date.now();
    const accusationId = await ctx.db.insert("accusations", {
      sessionId: member.session._id,
      submittedByPlayerId: member.player._id,
      culpritNpcId: args.culpritNpcId,
      motiveExplanation: explanation(args.motiveExplanation, "Motive"),
      ...(weaponItemId ? { weaponItemId } : {}),
      ...(weaponDescription ? { weaponDescription } : {}),
      evidenceIds: [...new Set(canonicalEvidenceIds)],
      evidenceExplanation: explanation(args.evidenceExplanation, "Evidence explanation"),
      methodExplanation: explanation(args.methodExplanation, "Method"),
      status: "pending",
      attempts: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.caseClose.judge, { accusationId });
    return accusationId;
  },
});

export const retry = mutation({
  args: { roomCode: v.string() },
  returns: v.null(),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) throw new Error("Start the investigation first.");
    const accusation = await ctx.db
      .query("accusations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))
      .unique();
    if (!accusation?.error || accusation.status !== "pending") throw new Error("There is nothing to retry.");
    if (accusation.attempts >= 3) throw new Error("Judging is unavailable right now. Try again later.");
    await ctx.db.patch(accusation._id, { error: undefined, attempts: accusation.attempts + 1, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.caseClose.judge, { accusationId: accusation._id });
    return null;
  },
});

export const getResult = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    status: v.union(v.literal("pending"), v.literal("judging"), v.literal("complete")),
    result: v.optional(resultValidator),
    error: v.optional(v.string()),
  })),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) return null;
    const accusation = await ctx.db
      .query("accusations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))
      .unique();
    return accusation ? { status: accusation.status, result: accusation.result, error: accusation.error } : null;
  },
});

export const startJudging = internalMutation({
  args: { accusationId: v.id("accusations") },
  returns: v.boolean(),
  handler: async (ctx, { accusationId }) => {
    const accusation = await ctx.db.get(accusationId);
    if (!accusation || accusation.status !== "pending" || accusation.error) return false;
    await ctx.db.patch(accusationId, { status: "judging", updatedAt: Date.now() });
    return true;
  },
});

export const getJudgeInput = internalQuery({
  args: { accusationId: v.id("accusations") },
  returns: v.any(),
  handler: async (ctx, { accusationId }) => {
    const accusation = await ctx.db.get(accusationId);
    if (!accusation) return null;
    const session = await ctx.db.get(accusation.sessionId);
    if (!session?.caseId) return null;
    const [solution, submittedCulprit, canonicalWeapon] = await Promise.all([
      ctx.db.query("caseSolutions").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).unique(),
      ctx.db.get(accusation.culpritNpcId),
      ctx.db.query("caseItems").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", session.caseId!).eq("sourceId", "weapon")).unique(),
    ]);
    if (!solution || !submittedCulprit) return null;
    const canonicalCulprit = await ctx.db.get(solution.culpritNpcId);
    if (!canonicalCulprit) return null;
    return { accusation, solution, submittedCulpritName: submittedCulprit.name, canonicalCulpritName: canonicalCulprit.name, canonicalWeapon };
  },
});

export const finishJudging = internalMutation({
  args: { accusationId: v.id("accusations"), result: resultValidator },
  returns: v.null(),
  handler: async (ctx, { accusationId, result }) => {
    const accusation = await ctx.db.get(accusationId);
    if (accusation?.status === "judging") {
      await ctx.db.patch(accusationId, { status: "complete", result, error: undefined, updatedAt: Date.now() });
    }
    return null;
  },
});

export const failJudging = internalMutation({
  args: { accusationId: v.id("accusations") },
  returns: v.null(),
  handler: async (ctx, { accusationId }) => {
    const accusation = await ctx.db.get(accusationId);
    if (accusation?.status === "judging") {
      await ctx.db.patch(accusationId, { status: "pending", error: "Judging is unavailable right now.", updatedAt: Date.now() });
    }
    return null;
  },
});

export const judge = internalAction({
  args: { accusationId: v.id("accusations") },
  returns: v.null(),
  handler: async (ctx, { accusationId }) => {
    if (!await ctx.runMutation(internal.caseClose.startJudging, { accusationId })) return null;
    try {
      const input = await ctx.runQuery(internal.caseClose.getJudgeInput, { accusationId });
      if (!input) {
        await ctx.runMutation(internal.caseClose.failJudging, { accusationId });
        return null;
      }

      let semantic: z.infer<typeof semanticGradeSchema> | null = null;
      for (const model of modelsFor("caseClose")) {
        const call = await generateJson({
          model,
          schema: semanticGradeSchema,
          maxRetries: 0,
          timeoutMs: 90_000,
          system: "Grade a detective's final theory against private canonical case facts. Return booleans only. Judge meaning, not exact wording. Never reveal or quote the canonical answer.",
          prompt: JSON.stringify({
            canonical: {
              culprit: input.canonicalCulpritName,
              motive: input.solution.motive,
              weapon: input.solution.weaponDescription,
              method: input.solution.method,
              keyReasoningPoints: input.solution.keyReasoningPoints,
              evidenceGroups: input.solution.evidenceGroups,
            },
            submission: {
              culprit: input.submittedCulpritName,
              motive: input.accusation.motiveExplanation,
              weapon: input.accusation.weaponDescription,
              evidenceIds: input.accusation.evidenceIds,
              evidenceExplanation: input.accusation.evidenceExplanation,
              method: input.accusation.methodExplanation,
            },
          }),
        });
        if (call.problems.length === 0) {
          semantic = semanticGradeSchema.parse(call.output);
          break;
        }
      }
      if (!semantic) {
        await ctx.runMutation(internal.caseClose.failJudging, { accusationId });
        return null;
      }

      const selected = new Set<string>(input.accusation.evidenceIds);
      const evidenceGroupMatched = input.solution.evidenceGroups.some(
        (group: { requiredEvidenceIds: string[] }) => group.requiredEvidenceIds.every((id) => selected.has(id)),
      );
      const killer = input.accusation.culpritNpcId === input.solution.culpritNpcId;
      const weapon = input.canonicalWeapon
        ? input.accusation.weaponItemId === input.canonicalWeapon._id || sameText(input.accusation.weaponDescription, input.canonicalWeapon.name)
        : semantic.weaponStar;
      const motive = semantic.motiveStar;
      const evidence = evidenceGroupMatched && semantic.evidenceStar;
      const method = semantic.methodStar;
      const totalStars = [killer, motive, weapon, evidence, method].filter(Boolean).length as 0 | 1 | 2 | 3 | 4 | 5;
      await ctx.runMutation(internal.caseClose.finishJudging, {
        accusationId,
        result: {
          killer: { star: killer },
          motive: { star: motive, ...(motive ? {} : { feedback: "The motive does not fit the case." }) },
          weapon: { star: weapon },
          evidence: { star: evidence, ...(evidence ? {} : { feedback: "The selected evidence does not prove this theory." }) },
          method: { star: method, ...(method ? {} : { feedback: "The method does not fit the case." }) },
          totalStars,
        },
      });
    } catch {
      await ctx.runMutation(internal.caseClose.failJudging, { accusationId });
    }
    return null;
  },
});

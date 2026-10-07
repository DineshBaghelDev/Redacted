import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getBureauRoomMember, getPlayingRoomMember } from "./lib/auth";
import { bureauRoomId, settleActions } from "./world";

const publicRecord = v.object({
  id: v.string(),
  type: v.union(
    v.literal("person"),
    v.literal("property"),
    v.literal("vehicle"),
    v.literal("business"),
    v.literal("criminal"),
    v.literal("employment"),
    v.literal("other"),
  ),
  title: v.string(),
  content: v.string(),
});

function searchTerm(search: string) {
  const term = search.trim().replace(/\s+/g, " ").toLowerCase();
  if (term.length > 80) throw new Error("Search must be 80 characters or fewer.");
  return term;
}

async function matchingRecords(ctx: QueryCtx | MutationCtx, caseId: Id<"cases">, term: string) {
  return term
    ? await ctx.db.query("publicRecords").withSearchIndex("search_title", (q) => q.search("title", term).eq("caseId", caseId)).take(50)
    : await ctx.db.query("publicRecords").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).take(50);
}

export const search = query({
  args: { roomCode: v.string(), search: v.string() },
  returns: v.union(v.null(), v.object({
    status: v.union(v.literal("available"), v.literal("pending"), v.literal("ready")),
    records: v.array(publicRecord),
    savedTerms: v.array(v.string()),
  })),
  handler: async (ctx, { roomCode, search }) => {
    const member = await getBureauRoomMember(ctx, roomCode, "records");
    if (!member?.session.caseId) return null;
    const term = searchTerm(search);
    const [saved, request] = await Promise.all([
      ctx.db.query("publicRecordSearches").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).order("desc").take(10),
      ctx.db.query("publicRecordSearches").withIndex("by_sessionId_and_term", (q) => q.eq("sessionId", member.session._id).eq("term", term)).unique(),
    ]);
    const savedTerms = saved.map((row) => row.term);
    if (!request) return { status: "available" as const, records: [], savedTerms };
    if (request.completeGameTime > (member.session.gameTime ?? 0)) return { status: "pending" as const, records: [], savedTerms };
    const records = await matchingRecords(ctx, member.session.caseId, term);
    return { status: "ready" as const, savedTerms, records: records.map((record) => ({ id: record.evidenceId, type: record.type, title: record.title, content: record.content })) };
  },
});

export const performSearch = mutation({
  args: { roomCode: v.string(), search: v.string() },
  returns: v.object({ completeGameTime: v.number(), started: v.boolean() }),
  handler: async (ctx, { roomCode, search }) => {
    const playing = await getPlayingRoomMember(ctx, roomCode);
    if (!playing?.session.caseId) throw new Error("Start the investigation first.");
    const term = searchTerm(search);
    const now = Date.now();
    const settled = await settleActions(ctx, playing.session, now);
    const member = await getBureauRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Visit the bureau records terminal first.");
    const existing = await ctx.db.query("publicRecordSearches").withIndex("by_sessionId_and_term", (q) => q.eq("sessionId", member.session._id).eq("term", term)).unique();
    if (existing) return { completeGameTime: existing.completeGameTime, started: false };
    const roomId = await bureauRoomId(ctx, member.session.caseId, member.player);
    if (!roomId) throw new Error("The bureau records terminal is unavailable.");
    const records = await matchingRecords(ctx, member.session.caseId, term);
    if (settled.activeCount === 0) await ctx.db.patch(member.session._id, { gameTime: settled.gameTime, clockStartedAt: now });
    const completeGameTime = settled.gameTime + 10;
    await ctx.db.insert("publicRecordSearches", { sessionId: member.session._id, term, completeGameTime });
    for (const record of records) {
      const access = await ctx.db.query("sessionPublicRecords").withIndex("by_sessionId_and_recordId", (q) => q.eq("sessionId", member.session._id).eq("recordId", record._id)).unique();
      if (!access) await ctx.db.insert("sessionPublicRecords", { sessionId: member.session._id, recordId: record._id, completeGameTime });
      else if (access.completeGameTime > completeGameTime) await ctx.db.patch(access._id, { completeGameTime });
    }
    await ctx.db.insert("roomActions", { sessionId: member.session._id, playerId: member.player._id, kind: "records", roomId, startGameTime: settled.gameTime, completeGameTime, createdAt: now });
    return { completeGameTime, started: true };
  },
});

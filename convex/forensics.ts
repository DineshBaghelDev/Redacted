import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { entranceRoomId, GAME_MINUTE_MS, settleActions } from "./world";

async function labMember(ctx: QueryCtx | MutationCtx, roomCode: string) {
  const member = await getPlayingRoomMember(ctx, roomCode);
  if (!member?.session.caseId || !member.player.currentPlaceId) return null;
  const place = await ctx.db.get(member.player.currentPlaceId);
  if (place?.kind !== "lab") return null;
  if (await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique()) return null;
  return { ...member, place };
}

async function sourceName(ctx: QueryCtx | MutationCtx, sessionId: Id<"sessions">, output: Doc<"forensicOutputs">) {
  if (output.sourceItemId) {
    const [item, known] = await Promise.all([
      ctx.db.get(output.sourceItemId),
      ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", sessionId).eq("itemId", output.sourceItemId!)).unique(),
    ]);
    return item?.caseId === output.caseId && known?.collectedAt !== undefined ? item.name : null;
  }
  if (output.sourceRoomId) {
    const [room, searched] = await Promise.all([
      ctx.db.get(output.sourceRoomId),
      ctx.db.query("searchedRooms").withIndex("by_sessionId_and_roomId", (q) => q.eq("sessionId", sessionId).eq("roomId", output.sourceRoomId!)).unique(),
    ]);
    return room && searched ? room.name : null;
  }
  if (output.sourceNpcId) {
    const person = await ctx.db.get(output.sourceNpcId);
    return person?.caseId === output.caseId && person.role === "victim" ? "Victim" : null;
  }
  return output.testType === "autopsy" ? "Victim" : null;
}

export const getLab = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    placeName: v.string(),
    tests: v.array(v.object({
      id: v.id("forensicOutputs"),
      testType: v.string(),
      sourceName: v.string(),
      status: v.union(v.literal("available"), v.literal("pending"), v.literal("ready"), v.literal("viewed")),
      readyAtGameTime: v.optional(v.number()),
      result: v.optional(v.string()),
    })),
    action: v.union(v.null(), v.object({ startGameTime: v.number(), completeGameTime: v.number() })),
    clock: v.object({ gameTime: v.number(), clockStartedAt: v.union(v.null(), v.number()), minuteMs: v.number() }),
  })),
  handler: async (ctx, { roomCode }) => {
    const member = await labMember(ctx, roomCode);
    if (!member) return null;
    const requests = await ctx.db.query("forensicRequests").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).collect();
    const requested = new Map(requests.map((row) => [row.forensicOutputId, row]));
    const tests = [];
    for await (const output of ctx.db.query("forensicOutputs").withIndex("by_caseId", (q) => q.eq("caseId", member.session.caseId!))) {
      const source = await sourceName(ctx, member.session._id, output);
      if (!source) continue;
      const request = requested.get(output._id);
      const status = !request ? "available" as const
        : request.viewedAt !== undefined ? "viewed" as const
          : request.readyAtGameTime <= (member.session.gameTime ?? 0) ? "ready" as const : "pending" as const;
      tests.push({ id: output._id, testType: output.testType, sourceName: source, status,
        readyAtGameTime: request?.readyAtGameTime,
        result: status === "viewed" ? output.result : undefined });
    }
    const action = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    return {
      placeName: member.place.name,
      tests,
      action: action ? { startGameTime: action.startGameTime, completeGameTime: action.completeGameTime } : null,
      clock: { gameTime: member.session.gameTime ?? 0, clockStartedAt: member.session.clockStartedAt ?? null, minuteMs: GAME_MINUTE_MS },
    };
  },
});

export const request = mutation({
  args: { roomCode: v.string(), forensicOutputId: v.id("forensicOutputs") },
  returns: v.object({ readyAtGameTime: v.number() }),
  handler: async (ctx, { roomCode, forensicOutputId }) => {
    const member = await labMember(ctx, roomCode);
    if (!member) throw new Error("Visit the forensic lab first.");
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const activeRoom = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    if (activeRoom) throw new Error("Finish your current action first.");
    const output = await ctx.db.get(forensicOutputId);
    if (!output || output.caseId !== member.session.caseId) throw new Error("That test is unavailable in this case.");
    const source = await sourceName(ctx, member.session._id, output);
    if (!source) throw new Error("Bring the source evidence to the lab first.");
    const existing = await ctx.db.query("forensicRequests").withIndex("by_sessionId_and_forensicOutputId", (q) => q.eq("sessionId", member.session._id).eq("forensicOutputId", forensicOutputId)).unique();
    if (existing) throw new Error("This test has already been requested.");
    const currentRoomId = member.player.currentRoomId ?? await entranceRoomId(ctx, member.place._id);
    if (!currentRoomId) throw new Error("The lab room is unavailable.");
    if (settled.activeCount === 0) await ctx.db.patch(member.session._id, { gameTime: settled.gameTime, clockStartedAt: now });
    const readyAtGameTime = settled.gameTime + 5 + output.turnaroundMinutes;
    await ctx.db.insert("forensicRequests", { sessionId: member.session._id, forensicOutputId, requestedAtGameTime: settled.gameTime, readyAtGameTime });
    await ctx.db.insert("roomActions", { sessionId: member.session._id, playerId: member.player._id, kind: "forensic", roomId: currentRoomId, startGameTime: settled.gameTime, completeGameTime: settled.gameTime + 5, createdAt: now });
    return { readyAtGameTime };
  },
});

export const markViewed = mutation({
  args: { roomCode: v.string(), forensicOutputId: v.id("forensicOutputs") },
  returns: v.null(),
  handler: async (ctx, { roomCode, forensicOutputId }) => {
    const member = await labMember(ctx, roomCode);
    if (!member) throw new Error("Visit the forensic lab first.");
    const settled = await settleActions(ctx, member.session, Date.now());
    const request = await ctx.db.query("forensicRequests").withIndex("by_sessionId_and_forensicOutputId", (q) => q.eq("sessionId", member.session._id).eq("forensicOutputId", forensicOutputId)).unique();
    if (!request || request.readyAtGameTime > settled.gameTime) throw new Error("This result is not ready yet.");
    if (request.viewedAt === undefined) await ctx.db.patch(request._id, { viewedAt: Date.now() });
    return null;
  },
});

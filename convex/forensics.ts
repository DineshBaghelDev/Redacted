import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getPlayingRoomMember, requireInvestigationOpen } from "./lib/auth";
import { entranceRoomId, GAME_MINUTE_MS, settleActions } from "./world";

/** The full test menu. Detectives choose; a test that finds nothing still costs its time. */
export const TEST_TYPES = ["fingerprint", "footprint", "dna", "blood", "toxicology", "fiber", "ballistics", "autopsy"] as const;
const testType = v.union(...TEST_TYPES.map((type) => v.literal(type)));
const NO_RESULT_TURNAROUND = 30;
const NO_RESULT = "No usable result. The examination found nothing to report.";

async function labMember(ctx: QueryCtx | MutationCtx, roomCode: string) {
  const member = await getPlayingRoomMember(ctx, roomCode);
  if (!member?.session.caseId || !member.player.currentPlaceId) return null;
  const place = await ctx.db.get(member.player.currentPlaceId);
  if (place?.kind !== "lab") return null;
  if (await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique()) return null;
  return { ...member, place };
}

/** Sources the team can legitimately send for testing: collected objects, examined rooms, and the victim's body. */
async function labSources(ctx: QueryCtx | MutationCtx, session: Doc<"sessions">) {
  const sources: { key: string; name: string }[] = [{ key: "victim", name: "Victim's body" }];
  for await (const known of ctx.db.query("sessionItems").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))) {
    if (known.collectedAt === undefined) continue;
    const item = await ctx.db.get(known.itemId);
    if (item && item.caseId === session.caseId) sources.push({ key: `item:${item._id}`, name: item.name });
  }
  const outputs = await ctx.db.query("forensicOutputs").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).take(300);
  // Every room the team has searched can be swabbed; whether it holds anything is the lab's answer.
  for await (const searched of ctx.db.query("searchedRooms").withIndex("by_sessionId_and_roomId", (q) => q.eq("sessionId", session._id))) {
    const room = await ctx.db.get(searched.roomId);
    if (room) sources.push({ key: `room:${room._id}`, name: `${room.name} (room)` });
  }
  return { sources, outputs };
}

function outputSourceKey(output: Doc<"forensicOutputs">, victimId: Id<"npcs"> | undefined) {
  if (output.sourceItemId) return `item:${output.sourceItemId}`;
  if (output.sourceRoomId) return `room:${output.sourceRoomId}`;
  if ((output.sourceNpcId && output.sourceNpcId === victimId) || output.testType === "autopsy") return "victim";
  return null;
}

async function victimId(ctx: QueryCtx | MutationCtx, caseId: Id<"cases">) {
  const people = await ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).take(200);
  return people.find((person) => person.role === "victim")?._id;
}

export const getLab = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    placeName: v.string(),
    sources: v.array(v.object({ key: v.string(), name: v.string() })),
    testTypes: v.array(v.string()),
    requests: v.array(v.object({
      id: v.id("forensicRequests"),
      sourceKey: v.string(),
      testType: v.string(),
      status: v.union(v.literal("pending"), v.literal("ready"), v.literal("viewed")),
      readyAtGameTime: v.number(),
      outputId: v.optional(v.id("forensicOutputs")),
      result: v.optional(v.string()),
    })),
    action: v.union(v.null(), v.object({ startGameTime: v.number(), completeGameTime: v.number() })),
    clock: v.object({ gameTime: v.number(), clockStartedAt: v.union(v.null(), v.number()), minuteMs: v.number() }),
  })),
  handler: async (ctx, { roomCode }) => {
    const member = await labMember(ctx, roomCode);
    if (!member) return null;
    const { sources } = await labSources(ctx, member.session);
    const victim = await victimId(ctx, member.session.caseId!);
    const requests = [];
    for await (const request of ctx.db.query("forensicRequests").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))) {
      const output = request.forensicOutputId ? await ctx.db.get(request.forensicOutputId) : null;
      const sourceKey = request.sourceKey ?? (output ? outputSourceKey(output, victim) : null);
      const type = request.testType ?? output?.testType;
      if (!sourceKey || !type) continue;
      const status = request.viewedAt !== undefined ? "viewed" as const
        : request.readyAtGameTime <= (member.session.gameTime ?? 0) ? "ready" as const : "pending" as const;
      requests.push({ id: request._id, sourceKey, testType: type, status, readyAtGameTime: request.readyAtGameTime,
        outputId: output?._id,
        result: status === "viewed" ? output?.result ?? NO_RESULT : undefined });
    }
    const action = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    return {
      placeName: member.place.name,
      sources,
      testTypes: [...TEST_TYPES],
      requests,
      action: action ? { startGameTime: action.startGameTime, completeGameTime: action.completeGameTime } : null,
      clock: { gameTime: member.session.gameTime ?? 0, clockStartedAt: member.session.clockStartedAt ?? null, minuteMs: GAME_MINUTE_MS },
    };
  },
});

export const request = mutation({
  args: { roomCode: v.string(), sourceKey: v.string(), testType },
  returns: v.object({ readyAtGameTime: v.number() }),
  handler: async (ctx, { roomCode, sourceKey, testType: type }) => {
    const member = await labMember(ctx, roomCode);
    if (!member) throw new Error("Visit the forensic lab first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const activeRoom = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    if (activeRoom) throw new Error("Finish your current action first.");
    const { sources, outputs } = await labSources(ctx, member.session);
    if (!sources.some((source) => source.key === sourceKey)) throw new Error("Bring the source evidence to the lab first.");
    const victim = await victimId(ctx, member.session.caseId!);
    const output = outputs.find((row) => row.testType === type && outputSourceKey(row, victim) === sourceKey);
    const duplicate = await ctx.db.query("forensicRequests").withIndex("by_sessionId_and_sourceKey_and_testType", (q) => q.eq("sessionId", member.session._id).eq("sourceKey", sourceKey).eq("testType", type)).unique()
      ?? (output ? await ctx.db.query("forensicRequests").withIndex("by_sessionId_and_forensicOutputId", (q) => q.eq("sessionId", member.session._id).eq("forensicOutputId", output._id)).unique() : null);
    if (duplicate) throw new Error("This test has already been requested.");
    const currentRoomId = member.player.currentRoomId ?? await entranceRoomId(ctx, member.place._id);
    if (!currentRoomId) throw new Error("The lab room is unavailable.");
    if (settled.activeCount === 0) await ctx.db.patch(member.session._id, { gameTime: settled.gameTime, clockStartedAt: now });
    const readyAtGameTime = settled.gameTime + 5 + (output?.turnaroundMinutes ?? NO_RESULT_TURNAROUND);
    await ctx.db.insert("forensicRequests", { sessionId: member.session._id, ...(output ? { forensicOutputId: output._id } : {}), sourceKey, testType: type, requestedAtGameTime: settled.gameTime, readyAtGameTime });
    await ctx.db.insert("roomActions", { sessionId: member.session._id, playerId: member.player._id, kind: "forensic", roomId: currentRoomId, startGameTime: settled.gameTime, completeGameTime: settled.gameTime + 5, createdAt: now });
    return { readyAtGameTime };
  },
});

export const markViewed = mutation({
  args: { roomCode: v.string(), requestId: v.id("forensicRequests") },
  returns: v.null(),
  handler: async (ctx, { roomCode, requestId }) => {
    const member = await labMember(ctx, roomCode);
    if (!member) throw new Error("Visit the forensic lab first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const settled = await settleActions(ctx, member.session, Date.now());
    const request = await ctx.db.get(requestId);
    if (!request || request.sessionId !== member.session._id || request.readyAtGameTime > settled.gameTime) throw new Error("This result is not ready yet.");
    if (request.viewedAt === undefined) await ctx.db.patch(request._id, { viewedAt: Date.now() });
    return null;
  },
});

/** How many lab results are ready but unread, from anywhere, so the team hears when the lab calls. */
export const readyCount = query({
  args: { roomCode: v.string() },
  returns: v.number(),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) return 0;
    let ready = 0;
    for await (const request of ctx.db.query("forensicRequests").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))) {
      if (request.viewedAt === undefined && request.readyAtGameTime <= (member.session.gameTime ?? 0)) ready += 1;
    }
    return ready;
  },
});

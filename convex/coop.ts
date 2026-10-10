import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";

const MAX_PING = 200;
const activityLabels = {
  move: "Walking between rooms",
  search: "Searching",
  inspect: "Inspecting an object",
  device: "Reading a device",
  forensic: "Submitting a lab test",
  cctv: "Reviewing camera logs",
  records: "Searching public records",
  npc: "Questioning someone",
} as const;

/** Where the partner is and what they are doing, plus recent "look at this" pings sent to me. */
export const get = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    partners: v.array(v.object({ name: v.string(), place: v.string(), activity: v.string(), placeId: v.union(v.null(), v.string()) })),
    pings: v.array(v.object({ id: v.id("pings"), from: v.string(), text: v.string(), createdAt: v.number() })),
  })),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) return null;
    const players = await ctx.db.query("sessionPlayers").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).take(4);
    const partners = [];
    for (const player of players) {
      if (player._id === member.player._id) continue;
      const travel = await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", player._id)).unique();
      const action = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", player._id)).unique();
      const destination = travel ? await ctx.db.get(travel.destinationPlaceId) : null;
      const place = player.currentPlaceId ? await ctx.db.get(player.currentPlaceId) : null;
      const room = player.currentRoomId ? await ctx.db.get(player.currentRoomId) : null;
      partners.push({
        name: player.nickname,
        place: travel ? `On the way to ${destination?.name ?? "a place"}` : [place?.name, room && !room.isEntrance ? room.name : null].filter(Boolean).join(" · ") || "Bureau",
        activity: action ? activityLabels[action.kind] : travel ? "Travelling" : "Idle",
        placeId: travel ? null : place?.sourceId ?? null,
      });
    }
    const names = new Map(players.map((player) => [player._id, player.nickname]));
    const pings = (await ctx.db.query("pings").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).order("desc").take(10))
      .filter((ping) => ping.fromPlayerId !== member.player._id)
      .map((ping) => ({ id: ping._id, from: names.get(ping.fromPlayerId) ?? "Partner", text: ping.text, createdAt: ping.createdAt }));
    return { partners, pings };
  },
});

export const ping = mutation({
  args: { roomCode: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { roomCode, text }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) throw new Error("Join the investigation first.");
    const body = text.trim().slice(0, MAX_PING);
    if (!body) return null;
    await ctx.db.insert("pings", { sessionId: member.session._id, fromPlayerId: member.player._id, text: body, createdAt: Date.now() });
    return null;
  },
});

import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { collectDiscoveries } from "./lib/discoveries";

/** The shared notebook: a plain log of what the team has uncovered. It never draws conclusions. */
export const get = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.array(v.object({
    type: v.union(v.literal("item"), v.literal("forensic"), v.literal("cctv"), v.literal("public_record"), v.literal("device_file"), v.literal("call"), v.literal("message"), v.literal("statement")),
    referenceId: v.string(),
    title: v.string(),
    body: v.string(),
    time: v.optional(v.number()),
  }))),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;
    return await collectDiscoveries(ctx, member.session);
  },
});

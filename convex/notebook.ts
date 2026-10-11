import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { collectDiscoveries, type Discovery } from "./lib/discoveries";

const MAX_NOTE = 200;

/** The shared notebook: a plain log of what the team has uncovered, with the team's own one-line notes. It never draws conclusions. */
export const get = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.array(v.object({
    type: v.union(v.literal("item"), v.literal("forensic"), v.literal("cctv"), v.literal("public_record"), v.literal("device_file"), v.literal("call"), v.literal("message"), v.literal("statement")),
    referenceId: v.string(),
    title: v.string(),
    body: v.string(),
    time: v.optional(v.number()),
    note: v.optional(v.string()),
  }))),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;
    const notes = new Map((await ctx.db.query("notebookNotes").withIndex("by_sessionId_and_referenceId", (q) => q.eq("sessionId", member.session._id)).take(500)).map((row) => [row.referenceId, row.text]));
    return (await collectDiscoveries(ctx, member.session)).map((entry): Discovery & { note?: string } => {
      const note = notes.get(entry.referenceId);
      return note ? { ...entry, note } : entry;
    });
  },
});

/** Write, change, or clear (empty text) the team's note on one notebook entry. The note is reasoning only. */
export const setNote = mutation({
  args: { roomCode: v.string(), referenceId: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { roomCode, referenceId, text }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    const note = text.trim();
    if (note.length > MAX_NOTE) throw new Error(`Keep notes under ${MAX_NOTE} characters.`);
    if (!(await collectDiscoveries(ctx, member.session)).some((entry) => entry.referenceId === referenceId)) throw new Error("Find this first.");
    const existing = await ctx.db.query("notebookNotes").withIndex("by_sessionId_and_referenceId", (q) => q.eq("sessionId", member.session._id).eq("referenceId", referenceId)).unique();
    if (!note) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) await ctx.db.patch(existing._id, { text: note });
    else await ctx.db.insert("notebookNotes", { sessionId: member.session._id, referenceId, text: note });
    return null;
  },
});

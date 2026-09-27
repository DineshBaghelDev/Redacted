import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";

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

export const search = query({
  args: { roomCode: v.string(), search: v.string() },
  returns: v.union(v.null(), v.array(publicRecord)),
  handler: async (ctx, { roomCode, search }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;
    const term = search.trim();
    if (term.length > 80) throw new Error("Search must be 80 characters or fewer.");
    const records = term
      ? await ctx.db
          .query("publicRecords")
          .withSearchIndex("search_title", (q) => q.search("title", term).eq("caseId", member.session.caseId!))
          .take(50)
      : await ctx.db.query("publicRecords").withIndex("by_caseId", (q) => q.eq("caseId", member.session.caseId!)).take(50);
    return records.map((record) => ({ id: record.evidenceId, type: record.type, title: record.title, content: record.content }));
  },
});

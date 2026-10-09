import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";

const publicNpc = v.object({
  id: v.id("npcs"),
  name: v.string(),
  role: v.union(v.literal("victim"), v.literal("suspect"), v.literal("witness")),
  age: v.optional(v.number()),
  occupation: v.optional(v.string()),
  publicDescription: v.string(),
});

export const list = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.array(publicNpc)),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;

    const people = [];
    for await (const person of ctx.db
      .query("npcs")
      .withIndex("by_caseId", (q) => q.eq("caseId", member.session.caseId!))) {
      people.push(person);
    }
    return people.map((person) => ({
      id: person._id,
      name: person.name,
      role: person.role,
      age: person.age,
      occupation: person.occupation,
      publicDescription: person.publicDescription,
    }));
  },
});

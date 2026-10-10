import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { castSchema } from "./generation/core/schemas";

const publicNpc = v.object({
  id: v.id("npcs"),
  name: v.string(),
  role: v.union(v.literal("victim"), v.literal("suspect"), v.literal("witness")),
  age: v.optional(v.number()),
  occupation: v.optional(v.string()),
  publicDescription: v.string(),
  gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("nonbinary"))),
});

export const list = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.array(publicNpc)),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;

    const playableCase = await ctx.db.get(member.session.caseId);
    const castDraft = playableCase ? await ctx.db.query("generationDrafts")
      .withIndex("by_job_stage", (q) => q.eq("jobId", playableCase.generationJobId).eq("stage", "cast"))
      .unique() : null;
    const cast = castSchema.safeParse(castDraft?.output);
    const genders = new Map(cast.success ? cast.data.characters.map((character) => [character.id, character.gender] as const) : []);

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
      gender: genders.get(person.sourceId),
    }));
  },
});

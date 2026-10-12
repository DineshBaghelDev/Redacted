import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { knownPeople } from "./lib/discoveries";
import { spottedBy } from "./lib/sightingLabels";

const publicNpc = v.object({
  id: v.id("npcs"),
  name: v.string(),
  isVictim: v.boolean(),
  /** Where the detectives first came across this person. */
  firstSeenIn: v.string(),
  age: v.optional(v.number()),
  occupation: v.optional(v.string()),
  publicDescription: v.string(),
  gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("nonbinary"))),
  /** Camera sightings the detectives themselves marked as this person ("Camera name · Day 2 21:40"). Never checked. */
  spotted: v.array(v.string()),
  /** The team's own note on this person. */
  note: v.optional(v.string()),
});

const genders = new Set(["male", "female", "nonbinary"]);

/** Reads each character's gender without requiring the whole (possibly older) cast draft to match today's schema. */
function castGenders(output: unknown) {
  const characters = (output as { characters?: unknown } | undefined)?.characters;
  const result = new Map<string, "male" | "female" | "nonbinary">();
  if (!Array.isArray(characters)) return result;
  for (const character of characters as { id?: unknown; gender?: unknown }[]) {
    if (typeof character?.id === "string" && typeof character.gender === "string" && genders.has(character.gender)) {
      result.set(character.id, character.gender as "male" | "female" | "nonbinary");
    }
  }
  return result;
}

/** Only people the detectives have come across. Roles stay hidden except for the victim. */
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
    const gender = castGenders(castDraft?.output);
    const known = await knownPeople(ctx, member.session);
    const spotted = await spottedBy(ctx, member.session);
    const notes = new Map((await ctx.db.query("notebookNotes").withIndex("by_sessionId_and_referenceId", (q) => q.eq("sessionId", member.session._id)).take(500)).map((row) => [row.referenceId, row.text]));

    const people = [];
    for await (const person of ctx.db
      .query("npcs")
      .withIndex("by_caseId", (q) => q.eq("caseId", member.session.caseId!))) {
      const firstSeenIn = known.get(person._id);
      if (firstSeenIn) people.push({
        id: person._id,
        name: person.name,
        isVictim: person.role === "victim",
        firstSeenIn,
        age: person.age,
        occupation: person.occupation,
        publicDescription: person.publicDescription,
        gender: gender.get(person.sourceId),
        spotted: spotted.get(person._id) ?? [],
        note: notes.get(person._id),
      });
    }
    return people;
  },
});

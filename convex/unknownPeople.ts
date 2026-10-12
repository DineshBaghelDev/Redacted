import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { knownPeople } from "./lib/discoveries";
import { spottedBy } from "./lib/sightingLabels";

// Unknown people are the team's own placeholders for someone they keep seeing but cannot name yet.
// The game never fills them in: the team names them, tags sightings, and decides who they turn out to be.

const MAX_UNKNOWN = 40;
const MAX_NAME = 60;
const MAX_NOTE = 200;

function clean(name: string, note: string) {
  const result = { name: name.trim(), note: note.trim() };
  if (!result.name) throw new Error("Give them a name, like “Man in red jacket”.");
  if (result.name.length > MAX_NAME) throw new Error(`Keep the name under ${MAX_NAME} characters.`);
  if (result.note.length > MAX_NOTE) throw new Error(`Keep notes under ${MAX_NOTE} characters.`);
  return result;
}

async function ownUnknown(ctx: MutationCtx, roomCode: string, id: Id<"unknownPeople">) {
  const member = await getPlayingRoomMember(ctx, roomCode);
  if (!member?.session.caseId) throw new Error("Start the investigation first.");
  const unknown = await ctx.db.get(id);
  if (!unknown || unknown.sessionId !== member.session._id) throw new Error("That unknown person is not in this case.");
  return { member, unknown };
}

async function sightingsOf(ctx: MutationCtx, sessionId: Id<"sessions">, id: Id<"unknownPeople">) {
  const labels = [];
  for await (const label of ctx.db.query("cctvLabels").withIndex("by_sessionId_and_recordEvidenceId", (q) => q.eq("sessionId", sessionId))) {
    if (label.unknownPersonId === id) labels.push(label);
  }
  return labels;
}

export const list = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.array(v.object({ id: v.id("unknownPeople"), name: v.string(), note: v.string(), spotted: v.array(v.string()) }))),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;
    const spotted = await spottedBy(ctx, member.session);
    const rows = await ctx.db.query("unknownPeople").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).take(MAX_UNKNOWN);
    return rows.map((row) => ({ id: row._id, name: row.name, note: row.note, spotted: spotted.get(row._id) ?? [] }));
  },
});

export const add = mutation({
  args: { roomCode: v.string(), name: v.string(), note: v.string() },
  returns: v.id("unknownPeople"),
  handler: async (ctx, { roomCode, name, note }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    const existing = await ctx.db.query("unknownPeople").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).take(MAX_UNKNOWN);
    if (existing.length >= MAX_UNKNOWN) throw new Error(`You can keep up to ${MAX_UNKNOWN} unknown people.`);
    return await ctx.db.insert("unknownPeople", { sessionId: member.session._id, ...clean(name, note) });
  },
});

export const update = mutation({
  args: { roomCode: v.string(), id: v.id("unknownPeople"), name: v.string(), note: v.string() },
  returns: v.null(),
  handler: async (ctx, { roomCode, id, name, note }) => {
    await ownUnknown(ctx, roomCode, id);
    await ctx.db.patch(id, clean(name, note));
    return null;
  },
});

/** Throw away an unknown person and clear the sightings tagged with them. */
export const remove = mutation({
  args: { roomCode: v.string(), id: v.id("unknownPeople") },
  returns: v.null(),
  handler: async (ctx, { roomCode, id }) => {
    const { member } = await ownUnknown(ctx, roomCode, id);
    for (const label of await sightingsOf(ctx, member.session._id, id)) await ctx.db.delete(label._id);
    await ctx.db.delete(id);
    return null;
  },
});

/** The team decided who this was: their tagged sightings and note move to that person. Never checked. */
export const identify = mutation({
  args: { roomCode: v.string(), id: v.id("unknownPeople"), npcId: v.id("npcs") },
  returns: v.null(),
  handler: async (ctx, { roomCode, id, npcId }) => {
    const { member, unknown } = await ownUnknown(ctx, roomCode, id);
    const sessionId = member.session._id;
    if (!(await knownPeople(ctx, member.session)).has(npcId)) throw new Error("You have not come across this person yet.");
    for (const label of await sightingsOf(ctx, sessionId, id)) {
      await ctx.db.replace(label._id, { sessionId, recordEvidenceId: label.recordEvidenceId, npcId });
    }
    if (unknown.note) {
      const existing = await ctx.db.query("notebookNotes").withIndex("by_sessionId_and_referenceId", (q) => q.eq("sessionId", sessionId).eq("referenceId", npcId)).unique();
      const text = `${unknown.name}: ${unknown.note}`;
      if (existing) await ctx.db.patch(existing._id, { text: `${existing.text}\n${text}` });
      else await ctx.db.insert("notebookNotes", { sessionId, referenceId: npcId, text });
    }
    await ctx.db.delete(id);
    return null;
  },
});

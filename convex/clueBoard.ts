import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

const MAX_NODES = 100;
const MAX_EDGES = 200;
const MAX_NOTE_LENGTH = 500;
const stringColor = v.union(v.literal("red"), v.literal("gold"), v.literal("blue"), v.literal("green"));

async function requireBoard(ctx: QueryCtx | MutationCtx, roomCode: string) {
  const authUserId = await requireUserId(ctx);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
    .unique();
  if (!session || session.expiresAt < Date.now()) throw new Error("Room not found.");

  const player = await ctx.db
    .query("sessionPlayers")
    .withIndex("by_sessionId_authUserId", (q) => q.eq("sessionId", session._id).eq("authUserId", authUserId))
    .unique();
  if (!player) throw new Error("Join the room first.");
  return { session, player };
}

function noteText(text: string) {
  const value = text.trim();
  if (!value) throw new Error("Write something on the note.");
  if (value.length > MAX_NOTE_LENGTH) throw new Error("Keep notes under 500 characters.");
  return value;
}

function coordinate(value: number) {
  if (!Number.isFinite(value)) throw new Error("Invalid board position.");
  return Math.max(-5000, Math.min(5000, value));
}

export const getNodes = query({
  args: { roomCode: v.string() },
  returns: v.array(v.object({
    _id: v.id("clueBoardNodes"),
    text: v.string(),
    x: v.number(),
    y: v.number(),
  })),
  handler: async (ctx, { roomCode }) => {
    const { session } = await requireBoard(ctx, roomCode);
    const nodes = await ctx.db
      .query("clueBoardNodes")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(MAX_NODES);
    return nodes.map(({ _id, text, x, y }) => ({ _id, text, x, y }));
  },
});

export const getEdges = query({
  args: { roomCode: v.string() },
  returns: v.array(v.object({
    _id: v.id("clueBoardEdges"),
    sourceNodeId: v.id("clueBoardNodes"),
    targetNodeId: v.id("clueBoardNodes"),
    color: stringColor,
  })),
  handler: async (ctx, { roomCode }) => {
    const { session } = await requireBoard(ctx, roomCode);
    const edges = await ctx.db
      .query("clueBoardEdges")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(MAX_EDGES);
    return edges.map(({ _id, sourceNodeId, targetNodeId, color }) => ({ _id, sourceNodeId, targetNodeId, color }));
  },
});

export const createNoteNode = mutation({
  args: { roomCode: v.string(), text: v.string(), x: v.number(), y: v.number() },
  returns: v.id("clueBoardNodes"),
  handler: async (ctx, { roomCode, text, x, y }) => {
    const { session, player } = await requireBoard(ctx, roomCode);
    const nodes = await ctx.db
      .query("clueBoardNodes")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(MAX_NODES);
    if (nodes.length >= MAX_NODES) throw new Error("This board is full.");
    const now = Date.now();
    return await ctx.db.insert("clueBoardNodes", {
      sessionId: session._id,
      type: "note",
      text: noteText(text),
      x: coordinate(x),
      y: coordinate(y),
      createdByPlayerId: player._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateNode = mutation({
  args: {
    nodeId: v.id("clueBoardNodes"),
    text: v.optional(v.string()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { nodeId, text, x, y }) => {
    const node = await ctx.db.get(nodeId);
    if (!node) throw new Error("Note not found.");
    const session = await ctx.db.get(node.sessionId);
    if (!session) throw new Error("Room not found.");
    await requireBoard(ctx, session.roomCode);
    await ctx.db.patch(nodeId, {
      ...(text === undefined ? {} : { text: noteText(text) }),
      ...(x === undefined ? {} : { x: coordinate(x) }),
      ...(y === undefined ? {} : { y: coordinate(y) }),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteNode = mutation({
  args: { nodeId: v.id("clueBoardNodes") },
  returns: v.null(),
  handler: async (ctx, { nodeId }) => {
    const node = await ctx.db.get(nodeId);
    if (!node) return null;
    const session = await ctx.db.get(node.sessionId);
    if (!session) throw new Error("Room not found.");
    await requireBoard(ctx, session.roomCode);
    const [outgoing, incoming] = await Promise.all([
      ctx.db.query("clueBoardEdges").withIndex("by_sourceNodeId", (q) => q.eq("sourceNodeId", nodeId)).take(MAX_EDGES),
      ctx.db.query("clueBoardEdges").withIndex("by_targetNodeId", (q) => q.eq("targetNodeId", nodeId)).take(MAX_EDGES),
    ]);
    for (const edge of [...outgoing, ...incoming]) await ctx.db.delete(edge._id);
    await ctx.db.delete(nodeId);
    return null;
  },
});

export const createEdge = mutation({
  args: {
    roomCode: v.string(),
    sourceNodeId: v.id("clueBoardNodes"),
    targetNodeId: v.id("clueBoardNodes"),
    color: stringColor,
  },
  returns: v.id("clueBoardEdges"),
  handler: async (ctx, { roomCode, sourceNodeId, targetNodeId, color }) => {
    if (sourceNodeId === targetNodeId) throw new Error("Connect two different notes.");
    const { session, player } = await requireBoard(ctx, roomCode);
    const [source, target, edges] = await Promise.all([
      ctx.db.get(sourceNodeId),
      ctx.db.get(targetNodeId),
      ctx.db.query("clueBoardEdges").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).take(MAX_EDGES),
    ]);
    if (!source || !target || source.sessionId !== session._id || target.sessionId !== session._id) {
      throw new Error("Those notes are not on this board.");
    }
    if (edges.length >= MAX_EDGES) throw new Error("This board has too many strings.");
    const duplicate = edges.find((edge) =>
      (edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId)
      || (edge.sourceNodeId === targetNodeId && edge.targetNodeId === sourceNodeId));
    if (duplicate) {
      await ctx.db.patch(duplicate._id, { color });
      return duplicate._id;
    }
    return await ctx.db.insert("clueBoardEdges", {
      sessionId: session._id,
      sourceNodeId,
      targetNodeId,
      color,
      createdByPlayerId: player._id,
      createdAt: Date.now(),
    });
  },
});

export const deleteEdge = mutation({
  args: { edgeId: v.id("clueBoardEdges") },
  returns: v.null(),
  handler: async (ctx, { edgeId }) => {
    const edge = await ctx.db.get(edgeId);
    if (!edge) return null;
    const session = await ctx.db.get(edge.sessionId);
    if (!session) throw new Error("Room not found.");
    await requireBoard(ctx, session.roomCode);
    await ctx.db.delete(edgeId);
    return null;
  },
});

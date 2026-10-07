import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getRoomMember } from "./lib/auth";

const MAX_NODES = 100;
const MAX_EDGES = 200;
const MAX_NOTE_LENGTH = 500;
const MAX_LABEL_LENGTH = 80;
const stringColor = v.union(v.literal("red"), v.literal("gold"), v.literal("blue"), v.literal("green"));
const referenceType = v.union(v.literal("npc"), v.literal("cctv"), v.literal("place"), v.literal("public_record"), v.literal("item"));
const placeKinds = { home: "Residence", work: "Workplace", public: "Public place", bureau: "Bureau", lab: "Forensic lab" } as const;
const placeAreas = { northside: "Northside", midtown: "Midtown", eastside: "Eastside" } as const;

async function requireBoard(ctx: QueryCtx | MutationCtx, roomCode: string) {
  const member = await getRoomMember(ctx, roomCode);
  if (!member) throw new Error("Join the room first.");
  if (member.session.status !== "playing") throw new Error("Start the investigation first.");
  return member;
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
    type: v.union(v.literal("note"), v.literal("npc"), v.literal("cctv"), v.literal("place"), v.literal("public_record"), v.literal("item")),
    referenceId: v.optional(v.string()),
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
    return nodes.map(({ _id, type, referenceId, text, x, y }) => ({ _id, type, referenceId, text, x, y }));
  },
});

export const getEdges = query({
  args: { roomCode: v.string() },
  returns: v.array(v.object({
    _id: v.id("clueBoardEdges"),
    sourceNodeId: v.id("clueBoardNodes"),
    targetNodeId: v.id("clueBoardNodes"),
    label: v.optional(v.string()),
    color: stringColor,
  })),
  handler: async (ctx, { roomCode }) => {
    const { session } = await requireBoard(ctx, roomCode);
    const edges = await ctx.db
      .query("clueBoardEdges")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(MAX_EDGES);
    return edges.map(({ _id, sourceNodeId, targetNodeId, label, color }) => ({ _id, sourceNodeId, targetNodeId, label, color }));
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

export const createReferenceNode = mutation({
  args: {
    roomCode: v.string(),
    type: referenceType,
    referenceId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  returns: v.id("clueBoardNodes"),
  handler: async (ctx, { roomCode, type, referenceId, x, y }) => {
    const { session, player } = await requireBoard(ctx, roomCode);
    if (!session.caseId) throw new Error("This room has no case.");
    const nodes = await ctx.db
      .query("clueBoardNodes")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(MAX_NODES);
    const existing = nodes.find((node) => node.type === type && node.referenceId === referenceId);
    if (existing) return existing._id;
    if (nodes.length >= MAX_NODES) throw new Error("This board is full.");

    let text: string;
    if (type === "item") {
      const itemId = ctx.db.normalizeId("caseItems", referenceId);
      const item = itemId ? await ctx.db.get(itemId) : null;
      const discovered = itemId ? await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", session._id).eq("itemId", itemId)).unique() : null;
      if (!item || item.caseId !== session.caseId || !discovered) throw new Error("Find this item before pinning it.");
      text = `${item.name}\nFound object`;
    } else if (type === "npc") {
      const npcId = ctx.db.normalizeId("npcs", referenceId);
      const person = npcId ? await ctx.db.get(npcId) : null;
      if (!person || person.caseId !== session.caseId) throw new Error("That person is not part of this case.");
      text = `${person.name}\n${person.role}${person.occupation ? ` · ${person.occupation}` : ""}`;
    } else if (type === "place") {
      const playableCase = await ctx.db.get(session.caseId);
      const place = playableCase?.cityId
        ? await ctx.db
            .query("places")
            .withIndex("by_cityId_and_sourceId", (q) => q.eq("cityId", playableCase.cityId!).eq("sourceId", referenceId))
            .unique()
        : null;
      if (!place) throw new Error("That place is not part of this case.");
      text = `${place.name}\n${placeAreas[place.area]} · ${placeKinds[place.kind]}`;
    } else if (type === "public_record") {
      const record = await ctx.db
        .query("publicRecords")
        .withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", session.caseId!).eq("evidenceId", referenceId))
        .unique();
      if (!record) throw new Error("That record is not part of this case.");
      text = `${record.title}\n${record.content}`;
    } else {
      const record = await ctx.db
        .query("cctvRecords")
        .withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", session.caseId!).eq("evidenceId", referenceId))
        .unique();
      if (!record) throw new Error("That camera record is not part of this case.");
      const camera = await ctx.db.get(record.cameraId);
      if (!camera || camera.caseId !== session.caseId) throw new Error("That camera record is unavailable.");
      text = `${camera.name}\n${record.description}`;
    }

    const now = Date.now();
    return await ctx.db.insert("clueBoardNodes", {
      sessionId: session._id,
      type,
      referenceId,
      text,
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
    if (!node) throw new Error("Board item not found.");
    const session = await ctx.db.get(node.sessionId);
    if (!session) throw new Error("Room not found.");
    await requireBoard(ctx, session.roomCode);
    if (text !== undefined && node.type !== "note") throw new Error("Reference cards cannot be edited.");
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
    label: v.optional(v.string()),
  },
  returns: v.id("clueBoardEdges"),
  handler: async (ctx, { roomCode, sourceNodeId, targetNodeId, color, label }) => {
    if (sourceNodeId === targetNodeId) throw new Error("Connect two different board items.");
    const { session, player } = await requireBoard(ctx, roomCode);
    const [source, target, edges] = await Promise.all([
      ctx.db.get(sourceNodeId),
      ctx.db.get(targetNodeId),
      ctx.db.query("clueBoardEdges").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).take(MAX_EDGES),
    ]);
    if (!source || !target || source.sessionId !== session._id || target.sessionId !== session._id) {
      throw new Error("Those items are not on this board.");
    }
    if (edges.length >= MAX_EDGES) throw new Error("This board has too many strings.");
    const duplicate = edges.find((edge) =>
      (edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId)
      || (edge.sourceNodeId === targetNodeId && edge.targetNodeId === sourceNodeId));
    if (duplicate) {
      await ctx.db.patch(duplicate._id, { color, ...(label === undefined ? {} : { label: edgeLabel(label) }) });
      return duplicate._id;
    }
    return await ctx.db.insert("clueBoardEdges", {
      sessionId: session._id,
      sourceNodeId,
      targetNodeId,
      color,
      ...(label === undefined ? {} : { label: edgeLabel(label) }),
      createdByPlayerId: player._id,
      createdAt: Date.now(),
    });
  },
});

function edgeLabel(label: string) {
  const value = label.trim();
  if (value.length > MAX_LABEL_LENGTH) throw new Error(`Keep string labels under ${MAX_LABEL_LENGTH} characters.`);
  return value || undefined;
}

export const updateEdge = mutation({
  args: {
    edgeId: v.id("clueBoardEdges"),
    color: v.optional(stringColor),
    label: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { edgeId, color, label }) => {
    const edge = await ctx.db.get(edgeId);
    if (!edge) throw new Error("String not found.");
    const session = await ctx.db.get(edge.sessionId);
    if (!session) throw new Error("Room not found.");
    await requireBoard(ctx, session.roomCode);
    await ctx.db.patch(edgeId, {
      ...(color === undefined ? {} : { color }),
      ...(label === undefined ? {} : { label: edgeLabel(label) }),
    });
    return null;
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

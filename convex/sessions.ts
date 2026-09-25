import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib/auth";
import { ensureCaseForJob } from "./cases";

const MAX_PLAYERS = 2;
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a six-character uppercase alphanumeric room code.
 *
 * @returns A randomly generated room code
 */
function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const create = mutation({
  args: { nickname: v.string(), generationJobId: v.id("generationJobs") },
  returns: v.object({ sessionId: v.id("sessions"), playerId: v.id("sessionPlayers"), roomCode: v.string() }),
  handler: async (ctx, { nickname, generationJobId }) => {
    const authUserId = await requireUserId(ctx);
    const caseId = await ensureCaseForJob(ctx, generationJobId);
    const now = Date.now();
    let roomCode = makeRoomCode();

    while (
      await ctx.db
        .query("sessions")
        .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
        .first()
    ) {
      roomCode = makeRoomCode();
    }

    const sessionId = await ctx.db.insert("sessions", {
      caseId,
      roomCode,
      status: "waiting",
      createdAt: now,
      expiresAt: now + ROOM_TTL_MS,
    });
    const playerId = await ctx.db.insert("sessionPlayers", {
      sessionId,
      authUserId,
      nickname: nickname.trim() || "Detective",
      isReady: false,
      joinedAt: now,
    });

    return { sessionId, playerId, roomCode };
  },
});

export const join = mutation({
  args: { roomCode: v.string(), nickname: v.string() },
  handler: async (ctx, { roomCode, nickname }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { ok: false, message: "Room not found." };
    }
    if (session.status !== "waiting") {
      return { ok: false, message: "Investigation already started." };
    }

    const players = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    const existingPlayer = players.find((player) => player.authUserId === authUserId);

    if (existingPlayer) {
      return { ok: true, sessionId: session._id, playerId: existingPlayer._id, roomCode: session.roomCode };
    }
    if (players.length >= MAX_PLAYERS) {
      return { ok: false, message: "Room is full." };
    }

    const playerId = await ctx.db.insert("sessionPlayers", {
      sessionId: session._id,
      authUserId,
      nickname: nickname.trim() || "Detective",
      isReady: false,
      joinedAt: Date.now(),
    });
    if (players.length + 1 === MAX_PLAYERS) {
      await ctx.db.patch(session._id, { status: "playing" });
    }

    return { ok: true, sessionId: session._id, playerId, roomCode: session.roomCode };
  },
});

export const setReady = mutation({
  args: { roomCode: v.string(), isReady: v.boolean() },
  handler: async (ctx, { roomCode, isReady }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Room not found.");
    }

    const player = (
      await ctx.db
        .query("sessionPlayers")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect()
    ).find((row) => row.authUserId === authUserId);

    if (!player) {
      throw new Error("Join the room first.");
    }

    await ctx.db.patch(player._id, { isReady });
  },
});

export const start = mutation({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Room not found.");
    }

    const players = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    if (!players.some((player) => player.authUserId === authUserId)) {
      throw new Error("Join the room first.");
    }

    if (!players.length || players.some((player) => !player.isReady)) {
      throw new Error("Everyone must be ready first.");
    }

    await ctx.db.patch(session._id, { status: "playing" });
    return { roomCode: session.roomCode };
  },
});

export const leave = mutation({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session) {
      throw new Error("Room not found.");
    }

    const player = (
      await ctx.db
        .query("sessionPlayers")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect()
    ).find((row) => row.authUserId === authUserId);

    if (!player) {
      throw new Error("Join the room first.");
    }

    await ctx.db.delete(player._id);
  },
});

export const get = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    roomCode: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing")),
    caseTitle: v.string(),
    playerCount: v.number(),
    allReady: v.boolean(),
    meReady: v.boolean(),
    players: v.array(v.object({ name: v.string(), isReady: v.boolean() })),
  })),
  handler: async (ctx, { roomCode }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const currentPlayer = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId_authUserId", (q) => q.eq("sessionId", session._id).eq("authUserId", authUserId))
      .unique();
    if (!currentPlayer) return null;

    const players = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    return {
      roomCode: session.roomCode,
      status: session.status,
      caseTitle: session.caseId ? (await ctx.db.get(session.caseId))?.title ?? "Case" : "Case",
      playerCount: players.length,
      allReady: players.length > 0 && players.every((player) => player.isReady),
      meReady: players.some((player) => player.authUserId === authUserId && player.isReady),
      players: players.map((player) => ({
        name: player.nickname,
        isReady: player.isReady ?? false,
      })),
    };
  },
});

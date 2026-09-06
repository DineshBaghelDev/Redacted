import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const MAX_PLAYERS = 2;
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function requireUserId(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Sign in first.");
  }
  return identity.subject;
}

export const create = mutation({
  args: { nickname: v.string() },
  handler: async (ctx, { nickname }) => {
    const authUserId = await requireUserId(ctx);
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
  handler: async (ctx, { roomCode }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session) {
      return null;
    }

    const players = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    return {
      roomCode: session.roomCode,
      status: session.status,
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

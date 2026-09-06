import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

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

/**
 * Retrieves the authenticated user's identity.
 *
 * @returns The authenticated user's subject identifier.
 * @throws If no authenticated user is present.
 */
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
      throw new Error("Room not found.");
    }

    const players = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    const existingPlayer = players.find((player) => player.authUserId === authUserId);

    if (existingPlayer) {
      return { sessionId: session._id, playerId: existingPlayer._id, roomCode: session.roomCode };
    }
    if (players.length >= MAX_PLAYERS) {
      throw new Error("Room is full.");
    }

    const playerId = await ctx.db.insert("sessionPlayers", {
      sessionId: session._id,
      authUserId,
      nickname: nickname.trim() || "Detective",
      joinedAt: Date.now(),
    });
    if (players.length + 1 === MAX_PLAYERS) {
      await ctx.db.patch(session._id, { status: "playing" });
    }

    return { sessionId: session._id, playerId, roomCode: session.roomCode };
  },
});

export const get = query({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    await requireUserId(ctx);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
      .first();

    if (!session || session.expiresAt < Date.now()) {
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
    };
  },
});

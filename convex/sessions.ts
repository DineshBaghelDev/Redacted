import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isClosed, requireUserId } from "./lib/auth";
import { detectiveRank } from "./lib/rank";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ensureCaseOpening, PUBLICATION_VERSION } from "./cases";
import { cancelRoomAction } from "./lib/cancelRoomAction";
import { entranceRoomId, markVisited, settleActions } from "./world";

const MAX_PLAYERS = 2;
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Time allowed after the discovery: the best-route estimate plus half again, so the clock matters. */
function defaultDuration(estimate: number | undefined) {
  if (estimate === undefined || !Number.isSafeInteger(estimate) || estimate <= 0) {
    throw new Error("This case has no valid time estimate.");
  }
  return Math.ceil(estimate * 1.5);
}

async function bureauFor(ctx: QueryCtx, caseId: Id<"cases"> | undefined) {
  const playableCase = caseId ? await ctx.db.get(caseId) : null;
  if (!playableCase?.cityId) return null;
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) if (place.kind === "bureau") return place;
  return null;
}

/**
 * Generates a six-character uppercase alphanumeric room code.
 *
 * @returns A randomly generated room code
 */
function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createSession(ctx: MutationCtx, authUserId: string, nickname: string, caseId: Id<"cases">, startMinute: number, deadline: number) {
  const now = Date.now();
  let roomCode = makeRoomCode();

  while (await ctx.db.query("sessions").withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode)).first()) {
    roomCode = makeRoomCode();
  }

  const sessionId = await ctx.db.insert("sessions", {
    caseId,
    roomCode,
    status: "waiting",
    gameTime: startMinute,
    deadline,
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
}

export const createReplay = mutation({
  args: { nickname: v.string(), caseId: v.id("cases"), deadlineMinutes: v.optional(v.number()) },
  returns: v.object({ sessionId: v.id("sessions"), playerId: v.id("sessionPlayers"), roomCode: v.string() }),
  handler: async (ctx, { nickname, caseId, deadlineMinutes }) => {
    const authUserId = await requireUserId(ctx);
    await ensureCaseOpening(ctx, caseId);
    const playableCase = await ctx.db.get(caseId);
    if (!playableCase || playableCase.publicationVersion !== PUBLICATION_VERSION) throw new Error("This case is not ready to replay.");
    if (deadlineMinutes !== undefined && (!Number.isSafeInteger(deadlineMinutes) || deadlineMinutes <= 0)) {
      throw new Error("Choose a valid deadline in whole minutes.");
    }
    const startMinute = playableCase.discoveryMinute ?? 0;
    return await createSession(ctx, authUserId, nickname, caseId, startMinute, startMinute + (deadlineMinutes ?? defaultDuration(playableCase.estimatedOptimalMinutes)));
  },
});

/** Repairs a pre-deadline playing room without changing its investigation clock. */
export const backfillPlayingDeadline = internalMutation({
  args: { sessionId: v.id("sessions") },
  returns: v.number(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.status !== "playing" || !session.caseId) throw new Error("This room has no playable case.");
    const playableCase = await ctx.db.get(session.caseId);
    if (!playableCase || playableCase.publicationVersion !== PUBLICATION_VERSION) throw new Error("This case is not published.");
    if (session.deadline !== undefined) return session.deadline;
    const deadline = (playableCase.discoveryMinute ?? 0) + defaultDuration(playableCase.estimatedOptimalMinutes);
    await ctx.db.patch(sessionId, { deadline });
    return deadline;
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
    // A started room can be (re)joined while it has a free seat, so a crash or a mistaken Leave isn't the end.
    if (isClosed(session)) {
      return { ok: false, message: "That case is already closed." };
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

    // Joining a started room puts the detective at the bureau, ready to work.
    const bureau = session.status === "playing" ? await bureauFor(ctx, session.caseId) : null;
    const playerId = await ctx.db.insert("sessionPlayers", {
      sessionId: session._id,
      authUserId,
      nickname: nickname.trim() || "Detective",
      isReady: session.status === "playing",
      ...(bureau ? { currentPlaceId: bureau._id, currentRoomId: await entranceRoomId(ctx, bureau._id) } : {}),
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

    if (session.status !== "waiting") throw new Error("Investigation already started.");

    const players = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    if (!players.some((player) => player.authUserId === authUserId)) {
      throw new Error("Join the room first.");
    }

    // Pressing Start is the starter's own "ready"; everyone else must have said so.
    if (players.some((player) => player.authUserId !== authUserId && !player.isReady)) {
      throw new Error("Your partner isn't ready yet.");
    }

    if (session.caseId) await ensureCaseOpening(ctx, session.caseId);
    const playableCase = session.caseId ? await ctx.db.get(session.caseId) : null;
    const bureau = await bureauFor(ctx, session.caseId);
    // Cold open: both detectives arrive at the crime scene room when it is known.
    const scene = playableCase?.sceneRoomId ? await ctx.db.get(playableCase.sceneRoomId) : null;
    const sceneBuilding = scene ? await ctx.db.get(scene.buildingId) : null;
    const startPlaceId = sceneBuilding?.placeId ?? bureau?._id;
    const startRoomId = scene && sceneBuilding ? scene._id : bureau ? await entranceRoomId(ctx, bureau._id) : undefined;
    await Promise.all(players.map(async (player) => await ctx.db.patch(player._id, { currentPlaceId: startPlaceId, currentRoomId: startRoomId })));
    if (startRoomId) await markVisited(ctx, session._id, startRoomId);
    const startMinute = playableCase?.discoveryMinute ?? 0;
    await ctx.db.patch(session._id, { status: "playing", gameTime: startMinute, clockStartedAt: undefined, deadline: session.deadline !== undefined
      // Rooms created before story-time clocks counted from minute zero; keep their allowance.
      ? session.deadline + startMinute - (session.gameTime ?? 0)
      : startMinute + defaultDuration(playableCase?.estimatedOptimalMinutes) });
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

    const settled = await settleActions(ctx, session, Date.now());
    const journey = await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", player._id)).unique();
    const roomAction = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", player._id)).unique();
    if (journey || roomAction) {
      if (journey) await ctx.db.delete(journey._id);
      if (roomAction) {
        await cancelRoomAction(ctx, roomAction);
        await ctx.db.delete(roomAction._id);
      }
      if (settled.activeCount === 1) await ctx.db.patch(session._id, { gameTime: settled.gameTime, clockStartedAt: undefined });
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
    /** Start counts as the starter's own ready, so it only waits on the partner. */
    canStart: v.boolean(),
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
      canStart: players.every((player) => player.authUserId === authUserId || player.isReady),
      meReady: players.some((player) => player.authUserId === authUserId && player.isReady),
      players: players.map((player) => ({
        name: player.nickname,
        isReady: player.isReady ?? false,
      })),
    };
  },
});

export const listMine = query({
  args: {},
  returns: v.array(v.object({
    roomCode: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing")),
    caseTitle: v.string(),
    playerCount: v.number(),
    reportSubmitted: v.boolean(),
  })),
  handler: async (ctx) => {
    const authUserId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("sessionPlayers")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .order("desc")
      .take(12);
    const rooms = [];
    for (const membership of memberships) {
      const session = await ctx.db.get(membership.sessionId);
      if (!session || session.expiresAt < Date.now() || !session.caseId || isClosed(session)) continue;
      const playableCase = await ctx.db.get(session.caseId);
      if (playableCase?.publicationVersion !== PUBLICATION_VERSION) continue;
      const players = await ctx.db.query("sessionPlayers").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).take(2);
      const reportSubmitted = session.status === "playing" && (session.gaveUpAt !== undefined || Boolean(await ctx.db.query("accusations").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).unique()));
      rooms.push({
        roomCode: session.roomCode,
        status: session.status,
        caseTitle: playableCase.title,
        playerCount: players.length,
        reportSubmitted,
      });
    }
    return rooms;
  },
});

/** Start a fresh room on the same frozen case as a finished one, for the signed-in detective. */
export const replay = mutation({
  args: { roomCode: v.string(), nickname: v.string() },
  returns: v.object({ roomCode: v.string() }),
  handler: async (ctx, { roomCode, nickname }) => {
    const authUserId = await requireUserId(ctx);
    const session = await ctx.db.query("sessions").withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase())).unique();
    if (!session?.caseId || !(await ctx.db.query("sessionPlayers").withIndex("by_sessionId_authUserId", (q) => q.eq("sessionId", session._id).eq("authUserId", authUserId)).unique())) throw new Error("Room not found.");
    await ensureCaseOpening(ctx, session.caseId);
    const playableCase = await ctx.db.get(session.caseId);
    if (!playableCase || playableCase.publicationVersion !== PUBLICATION_VERSION) throw new Error("This case is not ready to replay.");
    const startMinute = playableCase.discoveryMinute ?? 0;
    const created = await createSession(ctx, authUserId, nickname, session.caseId, startMinute, startMinute + defaultDuration(playableCase.estimatedOptimalMinutes));
    return { roomCode: created.roomCode };
  },
});

const historyEntry = v.object({
  roomCode: v.string(),
  caseId: v.id("cases"),
  caseTitle: v.string(),
  difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
  outcome: v.union(v.literal("solved"), v.literal("given-up"), v.literal("judging")),
  stars: v.optional(v.number()),
  rank: v.optional(v.string()),
  tookMinutes: v.optional(v.number()),
  partner: v.optional(v.string()),
  closedAt: v.number(),
});

/** Every case this detective has filed or given up, newest first: the case history and its stats. */
export const listHistory = query({
  args: {},
  returns: v.array(historyEntry),
  handler: async (ctx) => {
    const authUserId = await requireUserId(ctx);
    const entries = [];
    for (const membership of await ctx.db.query("sessionPlayers").withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId)).order("desc").take(100)) {
      const session = await ctx.db.get(membership.sessionId);
      if (!session?.caseId || session.status !== "playing") continue;
      const accusation = await ctx.db.query("accusations").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).unique();
      if (!accusation && session.gaveUpAt === undefined) continue;
      const playableCase = await ctx.db.get(session.caseId);
      if (!playableCase) continue;
      const partner = (await ctx.db.query("sessionPlayers").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).take(2)).find((player) => player.authUserId !== authUserId);
      const filedAt = accusation?.submittedGameTime;
      const stars = accusation?.result?.totalStars;
      entries.push({
        roomCode: session.roomCode,
        caseId: playableCase._id,
        caseTitle: playableCase.title,
        difficulty: playableCase.difficulty,
        outcome: accusation ? (stars === undefined ? "judging" as const : "solved" as const) : "given-up" as const,
        ...(stars !== undefined ? { stars, rank: detectiveRank(stars, session.deadline === undefined || (filedAt ?? 0) <= session.deadline) } : {}),
        ...(filedAt !== undefined ? { tookMinutes: Math.max(0, filedAt - (playableCase.discoveryMinute ?? 0)) } : {}),
        ...(partner ? { partner: partner.nickname } : {}),
        closedAt: session.closedAt ?? accusation?.createdAt ?? session.gaveUpAt ?? session.createdAt,
      });
    }
    return entries;
  },
});

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getPlayingRoomMember, requireInvestigationOpen } from "./lib/auth";

const placeKind = v.union(v.literal("home"), v.literal("work"), v.literal("public"), v.literal("bureau"), v.literal("lab"));
const area = v.union(v.literal("northside"), v.literal("midtown"), v.literal("eastside"));
export const GAME_MINUTE_MS = 1_000;

export function currentGameTime(session: Pick<Doc<"sessions">, "gameTime" | "clockStartedAt">, now = Date.now()) {
  const baseline = session.gameTime ?? 0;
  return session.clockStartedAt === undefined
    ? baseline
    : baseline + Math.max(0, Math.floor((now - session.clockStartedAt) / GAME_MINUTE_MS));
}

function travelDistances(originId: Id<"places">, streets: Doc<"placeConnections">[]) {
  const distances = new Map<string, number>([[originId, 0]]);
  const pending = new Set<string>([originId, ...streets.flatMap((street) => [street.fromPlaceId, street.toPlaceId])]);
  while (pending.size) {
    let current: string | undefined;
    let distance = Number.POSITIVE_INFINITY;
    for (const candidate of pending) {
      const value = distances.get(candidate) ?? Number.POSITIVE_INFINITY;
      if (value < distance) [current, distance] = [candidate, value];
    }
    if (!current) break;
    pending.delete(current);
    for (const street of streets) {
      const next = street.fromPlaceId === current
        ? street.toPlaceId
        : street.bidirectional && street.toPlaceId === current
          ? street.fromPlaceId
          : null;
      if (!next || !pending.has(next)) continue;
      distances.set(next, Math.min(distances.get(next) ?? Number.POSITIVE_INFINITY, distance + street.travelMinutes));
    }
  }
  return distances;
}

export async function entranceRoomId(ctx: MutationCtx, placeId: Id<"places">) {
  const place = await ctx.db.get(placeId);
  return place?.buildingId
    ? (await ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect()).find((room) => room.isEntrance)?._id
    : undefined;
}

export async function bureauRoomId(ctx: MutationCtx, caseId: Id<"cases">, player: Pick<Doc<"sessionPlayers">, "currentPlaceId" | "currentRoomId">) {
  if (player.currentRoomId) return player.currentRoomId;
  if (player.currentPlaceId) return await entranceRoomId(ctx, player.currentPlaceId);
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId) return undefined;
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
    if (place.kind === "bureau") return await entranceRoomId(ctx, place._id);
  }
  return undefined;
}

export async function settleActions(ctx: MutationCtx, session: Doc<"sessions">, now: number) {
  const travel = await ctx.db.query("travelActions").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).collect();
  const room = await ctx.db.query("roomActions").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).collect();
  const requests = await ctx.db.query("forensicRequests").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).collect();
  const gameTime = currentGameTime(session, now);
  const dueTravel = travel.filter((action) => action.completeGameTime <= gameTime);
  const dueRoom = room.filter((action) => action.completeGameTime <= gameTime);
  const pendingRequests = requests.filter((request) => request.readyAtGameTime > (session.gameTime ?? 0));
  const dueRequests = pendingRequests.filter((request) => request.readyAtGameTime <= gameTime);
  for (const action of dueTravel) {
    await ctx.db.patch(action.playerId, { currentPlaceId: action.destinationPlaceId, currentRoomId: await entranceRoomId(ctx, action.destinationPlaceId) });
    await ctx.db.delete(action._id);
  }
  for (const action of dueRoom) {
    if (action.kind === "move") await ctx.db.patch(action.playerId, { currentRoomId: action.roomId });
    else if (action.kind === "npc" && action.npcTurnId) {
      const turn = await ctx.db.get(action.npcTurnId);
      if (turn?.status === "waiting") {
        if (turn.requestedPhoneId) {
          const device = await ctx.db.get(turn.requestedPhoneId);
          const conversation = await ctx.db.get(turn.conversationId);
          if (device && conversation && device.caseId === session.caseId && device.ownerNpcId === conversation.npcId && !device.sourceItemId) {
            const access = await ctx.db.query("sessionDevices").withIndex("by_sessionId_and_deviceId", q => q.eq("sessionId", session._id).eq("deviceId", device._id)).unique();
            if (!access) await ctx.db.insert("sessionDevices", { sessionId: session._id, deviceId: device._id, acquiredAt: now });
          }
        }
        if (turn.requestedStatements) {
          const conversation = await ctx.db.get(turn.conversationId);
          const script = conversation ? await ctx.db.query("npcScripts").withIndex("by_npcId", q => q.eq("npcId", conversation.npcId)).unique() : null;
          if (conversation && script && script.caseId === session.caseId) {
            const intentionalLies = script.intentionalLies;
            for await (const statement of ctx.db.query("witnessStatements").withIndex("by_witnessNpcId", q => q.eq("witnessNpcId", conversation.npcId))) {
              if (statement.caseId !== session.caseId || intentionalLies.some(lie => lie.truthIds.includes(statement.eventId))) continue;
              const heard = await ctx.db.query("sessionStatements").withIndex("by_sessionId_and_statementId", q => q.eq("sessionId", session._id).eq("statementId", statement._id)).unique();
              if (!heard) await ctx.db.insert("sessionStatements", { sessionId: session._id, statementId: statement._id, heardAt: now });
            }
            await ctx.db.patch(conversation._id, { statementStatus: "ready" });
          }
        }
        await ctx.db.patch(turn._id, { status: "queued" });
        await ctx.scheduler.runAfter(0, internal.npcConversations.processNext, { conversationId: turn.conversationId });
      }
    }
    else if (action.kind === "device" && action.deviceId) {
      const access = await ctx.db.query("sessionDevices").withIndex("by_sessionId_and_deviceId", q => q.eq("sessionId", session._id).eq("deviceId", action.deviceId!)).unique();
      if (access && access.readAt === undefined) await ctx.db.patch(access._id, { readAt: now });
    }
    else if ((action.kind === "inspect" || action.kind === "device") && action.itemId) {
      const known = await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", session._id).eq("itemId", action.itemId!)).unique();
      if (known && action.kind === "inspect" && known.inspectedAt === undefined) await ctx.db.patch(known._id, { inspectedAt: now });
      if (known && action.kind === "device" && known.readAt === undefined) await ctx.db.patch(known._id, { readAt: now });
    } else if (action.kind === "search" && !(await ctx.db.query("searchedRooms").withIndex("by_sessionId_and_roomId", (q) => q.eq("sessionId", session._id).eq("roomId", action.roomId)).unique())) {
      await ctx.db.insert("searchedRooms", { sessionId: session._id, roomId: action.roomId, searchedAt: now });
      for await (const item of ctx.db.query("caseItems").withIndex("by_roomId", (q) => q.eq("roomId", action.roomId))) {
        if (item.caseId !== session.caseId || !item.discoverableBySearch) continue;
        if (!(await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", session._id).eq("itemId", item._id)).unique())) {
          await ctx.db.insert("sessionItems", { sessionId: session._id, itemId: item._id, discoveredAt: now });
        }
      }
    }
    await ctx.db.delete(action._id);
  }
  const remaining = travel.length + room.length + pendingRequests.length - dueTravel.length - dueRoom.length - dueRequests.length;
  if (remaining === 0 && session.clockStartedAt !== undefined) {
    const pausedTime = Math.max(session.gameTime ?? 0, ...dueTravel.map((action) => action.completeGameTime), ...dueRoom.map((action) => action.completeGameTime), ...dueRequests.map((request) => request.readyAtGameTime));
    await ctx.db.patch(session._id, { gameTime: pausedTime, clockStartedAt: undefined });
    return { gameTime: pausedTime, activeCount: 0 };
  }
  if (remaining > 0 && session.clockStartedAt !== undefined && (dueTravel.length || dueRoom.length || dueRequests.length)) {
    await ctx.db.patch(session._id, { gameTime, clockStartedAt: session.clockStartedAt + (gameTime - (session.gameTime ?? 0)) * GAME_MINUTE_MS });
  }
  return { gameTime, activeCount: remaining };
}

export const getMap = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    places: v.array(v.object({
      id: v.string(),
      name: v.string(),
      kind: placeKind,
      area,
      x: v.number(),
      y: v.number(),
      hasInterior: v.boolean(),
      travelMinutes: v.optional(v.number()),
    })),
    streets: v.array(v.object({
      id: v.string(),
      a: v.string(),
      b: v.string(),
      minutes: v.number(),
      hasCamera: v.boolean(),
    })),
    currentPlaceId: v.union(v.null(), v.string()),
    activeTravel: v.union(v.null(), v.object({
      destinationId: v.string(),
      destinationName: v.string(),
      startGameTime: v.number(),
      completeGameTime: v.number(),
    })),
    busy: v.boolean(),
    nextCompletionGameTime: v.union(v.null(), v.number()),
    deadline: v.union(v.null(), v.number()),
    clock: v.object({
      gameTime: v.number(),
      clockStartedAt: v.union(v.null(), v.number()),
      minuteMs: v.number(),
    }),
  })),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;
    const playableCase = await ctx.db.get(member.session.caseId);
    if (!playableCase?.cityId) return null;
    const places = [];
    for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
      places.push(place);
    }
    const streets = [];
    for await (const street of ctx.db.query("placeConnections").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
      streets.push(street);
    }
    const sourceIds = new Map(places.map((place) => [place._id, place.sourceId]));
    const bureau = places.find((place) => place.kind === "bureau");
    const currentPlaceId = member.player.currentPlaceId ?? bureau?._id;
    const distances = currentPlaceId ? travelDistances(currentPlaceId, streets) : new Map<string, number>();
    const activeTravel = await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    const activeRoom = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    const [allTravel, allRoom, requests] = await Promise.all([
      ctx.db.query("travelActions").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).collect(),
      ctx.db.query("roomActions").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).collect(),
      ctx.db.query("forensicRequests").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).collect(),
    ]);
    const completions = [...allTravel.map((action) => action.completeGameTime), ...allRoom.map((action) => action.completeGameTime), ...requests.filter((request) => request.readyAtGameTime > (member.session.gameTime ?? 0)).map((request) => request.readyAtGameTime)];
    const destination = activeTravel ? places.find((place) => place._id === activeTravel.destinationPlaceId) : null;
    return {
      places: places.map((place) => ({
        id: place.sourceId,
        name: place.name,
        kind: place.kind,
        area: place.area,
        x: place.mapX,
        y: place.mapY,
        hasInterior: Boolean(place.buildingId),
        travelMinutes: distances.get(place._id),
      })),
      streets: streets.map((street) => ({
        id: street.sourceId,
        a: sourceIds.get(street.fromPlaceId)!,
        b: sourceIds.get(street.toPlaceId)!,
        minutes: street.travelMinutes,
        hasCamera: street.hasCamera,
      })),
      currentPlaceId: currentPlaceId ? sourceIds.get(currentPlaceId) ?? null : null,
      activeTravel: activeTravel && destination ? {
        destinationId: destination.sourceId,
        destinationName: destination.name,
        startGameTime: activeTravel.startGameTime,
        completeGameTime: activeTravel.completeGameTime,
      } : null,
      busy: Boolean(activeTravel || activeRoom),
      nextCompletionGameTime: completions.length ? Math.min(...completions) : null,
      deadline: member.session.deadline ?? null,
      clock: {
        gameTime: member.session.gameTime ?? 0,
        clockStartedAt: member.session.clockStartedAt ?? null,
        minuteMs: GAME_MINUTE_MS,
      },
    };
  },
});

export const startTravel = mutation({
  args: { roomCode: v.string(), destinationId: v.string() },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, destinationId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const player = await ctx.db.get(member.player._id);
    if (!player) throw new Error("Join the room first.");
    if (await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", player._id)).unique()
      || await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", player._id)).unique()) {
      throw new Error("Finish your current action first.");
    }
    const playableCase = await ctx.db.get(member.session.caseId);
    if (!playableCase?.cityId) throw new Error("The city map is unavailable for this room.");
    const places = await ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!)).collect();
    const destination = places.find((place) => place.sourceId === destinationId);
    const origin = player.currentPlaceId
      ? places.find((place) => place._id === player.currentPlaceId)
      : places.find((place) => place.kind === "bureau");
    if (!origin || !destination) throw new Error("That route is unavailable.");
    if (origin._id === destination._id) throw new Error("You are already there.");
    const streets = await ctx.db.query("placeConnections").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!)).collect();
    const minutes = travelDistances(origin._id, streets).get(destination._id);
    if (minutes === undefined) throw new Error("No route reaches that place.");
    if (settled.activeCount === 0) {
      await ctx.db.patch(member.session._id, { gameTime: settled.gameTime, clockStartedAt: now });
    }
    const completeGameTime = settled.gameTime + minutes;
    await ctx.db.insert("travelActions", {
      sessionId: member.session._id,
      playerId: player._id,
      destinationPlaceId: destination._id,
      startGameTime: settled.gameTime,
      completeGameTime,
      createdAt: now,
    });
    return { completeGameTime };
  },
});

export const finishTravel = mutation({
  args: { roomCode: v.string() },
  returns: v.object({ gameTime: v.number(), traveling: v.boolean() }),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) throw new Error("Start the investigation first.");
    const settled = await settleActions(ctx, member.session, Date.now());
    const active = await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    return { gameTime: settled.gameTime, traveling: Boolean(active) };
  },
});

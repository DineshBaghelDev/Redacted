import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getPlayingRoomMember, requireInvestigationOpen } from "./lib/auth";
import { CRACK_MINUTES, deviceCode } from "./lib/deviceCodes";
import { roomSpots, spotKey, SPOT_SEARCH_MINUTES } from "./lib/spots";
import { GAME_MINUTE_MS, settleActions } from "./world";

async function activeAction(ctx: MutationCtx, playerId: Id<"sessionPlayers">) {
  return Boolean(
    await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).unique()
    || await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).unique(),
  );
}

async function startRoomAction(ctx: MutationCtx, session: Doc<"sessions">, playerId: Id<"sessionPlayers">, kind: "move" | "search" | "inspect" | "device", roomId: Id<"rooms">, minutes: number, now: number, gameTime: number, activeCount: number, itemId?: Id<"caseItems">, slot?: string) {
  if (activeCount === 0) await ctx.db.patch(session._id, { gameTime, clockStartedAt: now });
  const completeGameTime = gameTime + minutes;
  await ctx.db.insert("roomActions", { sessionId: session._id, playerId, kind, roomId, itemId, slot, startGameTime: gameTime, completeGameTime, createdAt: now });
  return { completeGameTime };
}

/** Walking minutes from one room to every reachable room: 1 per door, 2 when the floor changes. */
function walkMinutes(fromId: Id<"rooms">, rooms: Doc<"rooms">[], connections: Doc<"roomConnections">[]) {
  const floorOf = new Map(rooms.map((room) => [room._id, room.floorId]));
  const minutes = new Map<Id<"rooms">, number>([[fromId, 0]]);
  const pending = new Set(rooms.map((room) => room._id));
  while (pending.size) {
    let current: Id<"rooms"> | undefined;
    for (const id of pending) if (minutes.has(id) && (current === undefined || minutes.get(id)! < minutes.get(current)!)) current = id;
    if (current === undefined) break;
    pending.delete(current);
    for (const edge of connections) {
      const next = edge.fromRoomId === current ? edge.toRoomId : edge.toRoomId === current ? edge.fromRoomId : null;
      if (!next || !pending.has(next)) continue;
      const cost = minutes.get(current)! + (floorOf.get(next) === floorOf.get(current) ? 1 : 2);
      if (cost < (minutes.get(next) ?? Number.POSITIVE_INFINITY)) minutes.set(next, cost);
    }
  }
  return minutes;
}

export const getPlace = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    placeName: v.string(),
    placeDescription: v.string(),
    currentRoomId: v.union(v.null(), v.id("rooms")),
    rooms: v.array(v.object({ id: v.id("rooms"), name: v.string(), floor: v.number(), searchable: v.boolean(), searched: v.boolean(), walkMinutes: v.optional(v.number()), hasCamera: v.boolean(), isEntrance: v.boolean(),
      spots: v.array(v.object({ key: v.string(), name: v.string(), searched: v.boolean() })) })),
    connections: v.array(v.object({ a: v.id("rooms"), b: v.id("rooms") })),
    partners: v.array(v.object({ name: v.string(), roomId: v.id("rooms") })),
    action: v.union(v.null(), v.object({ kind: v.union(v.literal("move"), v.literal("search"), v.literal("inspect"), v.literal("forensic"), v.literal("cctv"), v.literal("records"), v.literal("device"), v.literal("npc")), roomId: v.id("rooms"), slot: v.optional(v.string()), startGameTime: v.number(), completeGameTime: v.number() })),
    items: v.array(v.object({ id: v.id("caseItems"), name: v.string(), description: v.optional(v.string()), roomId: v.id("rooms"), slot: v.string(), spot: v.string(), collectible: v.boolean(), collected: v.boolean(), inspected: v.boolean(), device: v.optional(v.object({
      type: v.union(v.literal("phone"), v.literal("laptop")), read: v.boolean(),
      files: v.array(v.object({ id: v.string(), title: v.string(), body: v.string() })),
      calls: v.array(v.object({ id: v.id("callLogs"), time: v.number(), direction: v.union(v.literal("incoming"), v.literal("outgoing")), durationSeconds: v.number(), otherParty: v.string() })),
      messages: v.array(v.object({ id: v.id("messages"), time: v.number(), direction: v.union(v.literal("incoming"), v.literal("outgoing")), body: v.string(), otherParty: v.string() })),
    })) })),
    clock: v.object({ gameTime: v.number(), clockStartedAt: v.union(v.null(), v.number()), minuteMs: v.number() }),
  })),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId || !member.player.currentPlaceId) return null;
    if (await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique()) return null;
    const place = await ctx.db.get(member.player.currentPlaceId);
    if (!place?.buildingId) return null;
    const rooms = await ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect();
    const currentRoomId = member.player.currentRoomId ?? rooms.find((room) => room.isEntrance)?._id ?? null;
    const connections = await ctx.db.query("roomConnections").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect();
    const walk = currentRoomId ? walkMinutes(currentRoomId, rooms, connections) : new Map<Id<"rooms">, number>();
    const searched = new Set<string>();
    const searchedSpotKeys = new Set<string>();
    const roomItems = new Map<Id<"rooms">, Doc<"caseItems">[]>();
    for (const room of rooms) {
      if (await ctx.db.query("searchedRooms").withIndex("by_sessionId_and_roomId", (q) => q.eq("sessionId", member.session._id).eq("roomId", room._id)).unique()) searched.add(room._id);
      for await (const spot of ctx.db.query("searchedSpots").withIndex("by_sessionId_and_roomId_and_spot", (q) => q.eq("sessionId", member.session._id).eq("roomId", room._id))) searchedSpotKeys.add(`${room._id}:${spot.spot}`);
      const items = [];
      for await (const item of ctx.db.query("caseItems").withIndex("by_roomId", (q) => q.eq("roomId", room._id))) if (item.caseId === member.session.caseId) items.push(item);
      roomItems.set(room._id, items);
    }
    const partners = [];
    for await (const other of ctx.db.query("sessionPlayers").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))) {
      if (other._id !== member.player._id && other.currentPlaceId === place._id && other.currentRoomId) partners.push({ name: other.nickname, roomId: other.currentRoomId });
    }
    const knownItems = [];
    for await (const known of ctx.db.query("sessionItems").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))) {
      const item = await ctx.db.get(known.itemId);
      if (item && item.caseId === member.session.caseId && (item.roomId === currentRoomId || known.collectedAt !== undefined)) {
        const device = item.sourceId && item.itemType === "device"
          ? await ctx.db.query("devices").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", item.caseId).eq("sourceId", item.sourceId!)).unique() : null;
        const accessible = device?.sourceItemId === item._id;
        const files = accessible && device?.type === "laptop" && known.readAt !== undefined
          ? await ctx.db.query("deviceFiles").withIndex("by_deviceId", (q) => q.eq("deviceId", device._id)).take(100) : [];
        const calls = accessible && device?.type === "phone" && known.readAt !== undefined
          ? await ctx.db.query("callLogs").withIndex("by_deviceId_and_timestamp", (q) => q.eq("deviceId", device._id)).take(100) : [];
        const messages = accessible && device?.type === "phone" && known.readAt !== undefined
          ? await ctx.db.query("messages").withIndex("by_deviceId_and_timestamp", (q) => q.eq("deviceId", device._id)).take(100) : [];
        knownItems.push({ id: item._id, name: item.name, description: item.description, roomId: item.roomId, slot: item.slot, spot: spotKey(item.slot), collectible: true, collected: known.collectedAt !== undefined, inspected: known.inspectedAt !== undefined,
          device: accessible && device ? { type: device.type, read: known.readAt !== undefined,
            files: files.map((file) => ({ id: file.evidenceId, title: file.title, body: file.body })),
            calls: calls.map((call) => ({ id: call._id, time: call.timestamp, direction: call.direction, durationSeconds: call.durationSeconds, otherParty: call.otherPartyLabel ?? "Unknown" })),
            messages: messages.map((message) => ({ id: message._id, time: message.timestamp, direction: message.direction, body: message.body, otherParty: message.otherPartyLabel ?? "Unknown" })) } : undefined });
      }
    }
    const action = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    const floors = await Promise.all(rooms.map(async (room) => await ctx.db.get(room.floorId)));
    return {
      placeName: place.name,
      placeDescription: place.description,
      currentRoomId,
      rooms: rooms.map((room, index) => ({ id: room._id, name: room.name, floor: floors[index]?.floorNumber ?? 0, searchable: room.searchable, searched: searched.has(room._id), walkMinutes: walk.get(room._id), hasCamera: room.hasCamera, isEntrance: room.isEntrance,
        spots: room.searchable ? roomSpots(room, roomItems.get(room._id) ?? []).map((spot) => ({ ...spot, searched: searchedSpotKeys.has(`${room._id}:${spot.key}`) })) : [] })),
      connections: connections.map((edge) => ({ a: edge.fromRoomId, b: edge.toRoomId })),
      partners,
      action: action ? { kind: action.kind, roomId: action.roomId, slot: action.slot, startGameTime: action.startGameTime, completeGameTime: action.completeGameTime } : null,
      items: knownItems,
      clock: { gameTime: member.session.gameTime ?? 0, clockStartedAt: member.session.clockStartedAt ?? null, minuteMs: GAME_MINUTE_MS },
    };
  },
});

export const getInventory = query({
  args: { roomCode: v.string() },
  returns: v.array(v.object({ id: v.id("caseItems"), name: v.string() })),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return [];
    const items = [];
    for await (const known of ctx.db.query("sessionItems").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))) {
      if (known.collectedAt === undefined) continue;
      const item = await ctx.db.get(known.itemId);
      if (item?.caseId === member.session.caseId) items.push({ id: item._id, name: item.name });
    }
    return items;
  },
});

export const moveToRoom = mutation({
  args: { roomCode: v.string(), roomId: v.id("rooms") },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, roomId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.player.currentPlaceId) throw new Error("Travel to a place first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const place = await ctx.db.get(player.currentPlaceId!);
    const destination = await ctx.db.get(roomId);
    if (!place?.buildingId || !destination || destination.buildingId !== place.buildingId) throw new Error("That room is not at your location.");
    const rooms = await ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect();
    const current = rooms.find((room) => room._id === player.currentRoomId) ?? rooms.find((room) => room.isEntrance);
    if (!current || current._id === roomId) throw new Error("Choose another room.");
    const connections = await ctx.db.query("roomConnections").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect();
    const minutes = walkMinutes(current._id, rooms, connections).get(roomId);
    if (minutes === undefined) throw new Error("No way through the building reaches that room.");
    return await startRoomAction(ctx, member.session, player._id, "move", roomId, minutes, now, settled.gameTime, settled.activeCount);
  },
});

export const searchSpot = mutation({
  args: { roomCode: v.string(), spot: v.string() },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, spot }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.player.currentPlaceId) throw new Error("Travel to a place first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const room = player.currentRoomId ? await ctx.db.get(player.currentRoomId) : null;
    const place = await ctx.db.get(player.currentPlaceId!);
    if (!room?.searchable || !place?.buildingId || room.buildingId !== place.buildingId) throw new Error("This room cannot be searched.");
    const items = await ctx.db.query("caseItems").withIndex("by_roomId", (q) => q.eq("roomId", room._id)).take(100);
    if (!roomSpots(room, items.filter((item) => item.caseId === member.session.caseId)).some((entry) => entry.key === spot)) throw new Error("There is no such spot here.");
    if (await ctx.db.query("searchedSpots").withIndex("by_sessionId_and_roomId_and_spot", (q) => q.eq("sessionId", member.session._id).eq("roomId", room._id).eq("spot", spot)).unique()) throw new Error("This spot has already been searched.");
    const active = await ctx.db.query("roomActions").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).collect();
    if (active.some((action) => action.kind === "search" && action.roomId === room._id && action.slot === spot)) throw new Error("Your partner is already searching this spot.");
    return await startRoomAction(ctx, member.session, player._id, "search", room._id, SPOT_SEARCH_MINUTES, now, settled.gameTime, settled.activeCount, undefined, spot);
  },
});

export const finishAction = mutation({
  args: { roomCode: v.string() },
  returns: v.object({ gameTime: v.number(), busy: v.boolean() }),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member) throw new Error("Start the investigation first.");
    const settled = await settleActions(ctx, member.session, Date.now());
    return { gameTime: settled.gameTime, busy: await activeAction(ctx, member.player._id) };
  },
});

export const inspectItem = mutation({
  args: { roomCode: v.string(), itemId: v.id("caseItems") },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, itemId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const item = await ctx.db.get(itemId);
    const known = await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", member.session._id).eq("itemId", itemId)).unique();
    if (!item || item.caseId !== member.session.caseId || !known || (item.roomId !== player.currentRoomId && known.collectedAt === undefined)) throw new Error("That item is not available to inspect here.");
    if (known.inspectedAt !== undefined) throw new Error("You have already inspected this item.");
    return await startRoomAction(ctx, member.session, player._id, "inspect", item.roomId, 2, now, settled.gameTime, settled.activeCount, itemId);
  },
});

/** Unlock a found phone or laptop: type its 4-digit code (5 min) or have the lab crack it (60 min). */
export const readDevice = mutation({
  args: { roomCode: v.string(), itemId: v.id("caseItems"), code: v.optional(v.string()), crack: v.optional(v.boolean()) },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, itemId, code, crack }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    await requireInvestigationOpen(ctx, member.session._id);
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const item = await ctx.db.get(itemId);
    const known = await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", member.session._id).eq("itemId", itemId)).unique();
    if (!item || item.caseId !== member.session.caseId || !known || (item.roomId !== player.currentRoomId && known.collectedAt === undefined)) throw new Error("Find that device first.");
    if (known.readAt !== undefined) throw new Error("This device has already been read.");
    const actions = await ctx.db.query("roomActions").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).take(2);
    if (actions.some((action) => action.kind === "device" && action.itemId === itemId)) throw new Error("Your partner is already reading this device.");
    const device = item.sourceId ? await ctx.db.query("devices").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", item.caseId).eq("sourceId", item.sourceId!)).unique() : null;
    if (!device || device.sourceItemId !== itemId) throw new Error("That item has no readable records.");
    if (!crack && code?.trim() !== deviceCode(device)) throw new Error("Wrong code. The screen shakes.");
    const roomId = player.currentRoomId;
    if (!roomId) throw new Error("Enter a room to read the device.");
    return await startRoomAction(ctx, member.session, player._id, "device", roomId, crack ? CRACK_MINUTES : 5, now, settled.gameTime, settled.activeCount, itemId);
  },
});

export const collectItem = mutation({
  args: { roomCode: v.string(), itemId: v.id("caseItems") },
  handler: async (ctx, { roomCode, itemId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    await requireInvestigationOpen(ctx, member.session._id);
    await settleActions(ctx, member.session, Date.now());
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const item = await ctx.db.get(itemId);
    const known = await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", member.session._id).eq("itemId", itemId)).unique();
    if (!item || item.caseId !== member.session.caseId || !known || item.roomId !== player.currentRoomId) throw new Error("That item is not available to collect here.");
    if (known.collectedAt === undefined) await ctx.db.patch(known._id, { collectedAt: Date.now() });
  },
});

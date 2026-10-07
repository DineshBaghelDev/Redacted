import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";
import { GAME_MINUTE_MS, settleActions } from "./world";

async function activeAction(ctx: MutationCtx, playerId: Id<"sessionPlayers">) {
  return Boolean(
    await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).unique()
    || await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", playerId)).unique(),
  );
}

async function startRoomAction(ctx: MutationCtx, session: Doc<"sessions">, playerId: Id<"sessionPlayers">, kind: "move" | "search" | "inspect" | "device", roomId: Id<"rooms">, minutes: number, now: number, gameTime: number, activeCount: number, itemId?: Id<"caseItems">) {
  if (activeCount === 0) await ctx.db.patch(session._id, { gameTime, clockStartedAt: now });
  const completeGameTime = gameTime + minutes;
  await ctx.db.insert("roomActions", { sessionId: session._id, playerId, kind, roomId, itemId, startGameTime: gameTime, completeGameTime, createdAt: now });
  return { completeGameTime };
}

export const getPlace = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    placeName: v.string(),
    currentRoomId: v.union(v.null(), v.id("rooms")),
    rooms: v.array(v.object({ id: v.id("rooms"), name: v.string(), floor: v.number(), searchable: v.boolean(), searched: v.boolean(), adjacent: v.boolean() })),
    action: v.union(v.null(), v.object({ kind: v.union(v.literal("move"), v.literal("search"), v.literal("inspect"), v.literal("forensic"), v.literal("cctv"), v.literal("records"), v.literal("device")), roomId: v.id("rooms"), startGameTime: v.number(), completeGameTime: v.number() })),
    items: v.array(v.object({ id: v.id("caseItems"), name: v.string(), description: v.optional(v.string()), roomId: v.id("rooms"), collectible: v.boolean(), collected: v.boolean(), inspected: v.boolean(), device: v.optional(v.object({ read: v.boolean(), files: v.array(v.object({ id: v.string(), title: v.string(), body: v.string() })) })) })),
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
    const adjacent = new Set(connections.flatMap((edge) => edge.fromRoomId === currentRoomId
      ? [edge.toRoomId]
      : edge.toRoomId === currentRoomId ? [edge.fromRoomId] : []));
    const searched = new Set<string>();
    for (const room of rooms) {
      if (await ctx.db.query("searchedRooms").withIndex("by_sessionId_and_roomId", (q) => q.eq("sessionId", member.session._id).eq("roomId", room._id)).unique()) searched.add(room._id);
    }
    const knownItems = [];
    for await (const known of ctx.db.query("sessionItems").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id))) {
      const item = await ctx.db.get(known.itemId);
      if (item && item.caseId === member.session.caseId && (item.roomId === currentRoomId || known.collectedAt !== undefined)) {
        const device = item.sourceId && item.itemType === "device"
          ? await ctx.db.query("devices").withIndex("by_caseId_and_sourceId", (q) => q.eq("caseId", item.caseId).eq("sourceId", item.sourceId!)).unique() : null;
        const files = device?.type === "laptop" && known.readAt !== undefined
          ? await ctx.db.query("deviceFiles").withIndex("by_deviceId", (q) => q.eq("deviceId", device._id)).take(100) : [];
        knownItems.push({ id: item._id, name: item.name, description: known.inspectedAt === undefined ? undefined : item.description, roomId: item.roomId, collectible: item.collectible, collected: known.collectedAt !== undefined, inspected: known.inspectedAt !== undefined,
          device: device?.type === "laptop" ? { read: known.readAt !== undefined, files: files.map((file) => ({ id: file.evidenceId, title: file.title, body: file.body })) } : undefined });
      }
    }
    const action = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique();
    const floors = await Promise.all(rooms.map(async (room) => await ctx.db.get(room.floorId)));
    return {
      placeName: place.name,
      currentRoomId,
      rooms: rooms.map((room, index) => ({ id: room._id, name: room.name, floor: floors[index]?.floorNumber ?? 0, searchable: room.searchable, searched: searched.has(room._id), adjacent: adjacent.has(room._id) })),
      action: action ? { kind: action.kind, roomId: action.roomId, startGameTime: action.startGameTime, completeGameTime: action.completeGameTime } : null,
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
    if (!connections.some((edge) => (edge.fromRoomId === current._id && edge.toRoomId === roomId) || (edge.toRoomId === current._id && edge.fromRoomId === roomId))) throw new Error("Move through a connected room first.");
    const [fromFloor, toFloor] = await Promise.all([ctx.db.get(current.floorId), ctx.db.get(destination.floorId)]);
    return await startRoomAction(ctx, member.session, player._id, "move", roomId, fromFloor?.floorNumber === toFloor?.floorNumber ? 1 : 2, now, settled.gameTime, settled.activeCount);
  },
});

export const searchRoom = mutation({
  args: { roomCode: v.string() },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.player.currentPlaceId) throw new Error("Travel to a place first.");
    const now = Date.now();
    const settled = await settleActions(ctx, member.session, now);
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const room = player.currentRoomId ? await ctx.db.get(player.currentRoomId) : null;
    const place = await ctx.db.get(player.currentPlaceId!);
    if (!room?.searchable || !place?.buildingId || room.buildingId !== place.buildingId) throw new Error("This room cannot be searched.");
    if (await ctx.db.query("searchedRooms").withIndex("by_sessionId_and_roomId", (q) => q.eq("sessionId", member.session._id).eq("roomId", room._id)).unique()) throw new Error("This room has already been searched.");
    const activeSearches = await ctx.db.query("roomActions").withIndex("by_sessionId", (q) => q.eq("sessionId", member.session._id)).collect();
    if (activeSearches.some((action) => action.kind === "search" && action.roomId === room._id)) throw new Error("Your partner is already searching this room.");
    return await startRoomAction(ctx, member.session, player._id, "search", room._id, 15, now, settled.gameTime, settled.activeCount);
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

export const readDevice = mutation({
  args: { roomCode: v.string(), itemId: v.id("caseItems") },
  returns: v.object({ completeGameTime: v.number() }),
  handler: async (ctx, { roomCode, itemId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
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
    if (device?.type !== "laptop" || device.sourceItemId !== itemId) throw new Error("That item has no readable files.");
    const roomId = player.currentRoomId;
    if (!roomId) throw new Error("Enter a room to read the device.");
    return await startRoomAction(ctx, member.session, player._id, "device", roomId, 5, now, settled.gameTime, settled.activeCount, itemId);
  },
});

export const collectItem = mutation({
  args: { roomCode: v.string(), itemId: v.id("caseItems") },
  handler: async (ctx, { roomCode, itemId }) => {
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) throw new Error("Start the investigation first.");
    await settleActions(ctx, member.session, Date.now());
    const player = await ctx.db.get(member.player._id);
    if (!player || await activeAction(ctx, player._id)) throw new Error("Finish your current action first.");
    const item = await ctx.db.get(itemId);
    const known = await ctx.db.query("sessionItems").withIndex("by_sessionId_and_itemId", (q) => q.eq("sessionId", member.session._id).eq("itemId", itemId)).unique();
    if (!item || item.caseId !== member.session.caseId || !known || !item.collectible || item.roomId !== player.currentRoomId) throw new Error("That item is not available to collect here.");
    if (known.collectedAt === undefined) await ctx.db.patch(known._id, { collectedAt: Date.now() });
  },
});

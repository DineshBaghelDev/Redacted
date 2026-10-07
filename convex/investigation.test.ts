/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.useRealTimers());

test("partners search, inspect, and collect shared items without revealing hidden truth early", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(100_000);
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Search test", summary: "A case.", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    const placeId = await ctx.db.insert("places", { cityId, sourceId: "bureau", order: 0, name: "Bureau", type: "public_building", kind: "bureau", area: "midtown", description: "Bureau", mapX: 10, mapY: 10, crimeSceneAllowed: true, jobSlots: [] });
    const buildingId = await ctx.db.insert("buildings", { placeId, template: "institution", floorCount: 1, layoutSeed: "1" });
    await ctx.db.patch(placeId, { buildingId });
    const floorId = await ctx.db.insert("floors", { buildingId, floorNumber: 0 });
    const entrance = await ctx.db.insert("rooms", { buildingId, floorId, sourceId: "entrance", order: 0, name: "Lobby", type: "lobby", searchable: false, isEntrance: true, itemSlots: [], hasCamera: false });
    const office = await ctx.db.insert("rooms", { buildingId, floorId, sourceId: "office", order: 1, name: "Office", type: "office", searchable: true, isEntrance: false, itemSlots: ["desk"], hasCamera: false });
    await ctx.db.insert("roomConnections", { buildingId, order: 0, fromRoomId: entrance, toRoomId: office, type: "door" });
    const itemId = await ctx.db.insert("caseItems", { caseId, evidenceId: "evidence/note", name: "Note", description: "A handwritten appointment.", placeId, roomId: office, slot: "desk", discoverableBySearch: true, collectible: true, hidden: true, itemType: "document" });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "ABC123", status: "waiting", createdAt: 1, expiresAt: 1_000_000 });
    for (const authUserId of ["one", "two"]) await ctx.db.insert("sessionPlayers", { sessionId, authUserId, nickname: authUserId, isReady: true, joinedAt: 1 });
    return { entrance, office, itemId };
  });
  const one = t.withIdentity({ subject: "one" });
  const two = t.withIdentity({ subject: "two" });
  const roomCode = "ABC123";
  await one.mutation(api.sessions.start, { roomCode });
  expect((await one.query(api.world.getMap, { roomCode }))?.places[0].hasInterior).toBe(true);
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.currentRoomId).toBe(ids.entrance);
  await expect(one.mutation(api.clueBoard.createReferenceNode, { roomCode, type: "item", referenceId: ids.itemId, x: 0, y: 0 })).rejects.toThrow("Find this item");
  await expect(one.mutation(api.investigation.collectItem, { roomCode, itemId: ids.itemId })).rejects.toThrow("not available");
  expect(await one.mutation(api.investigation.moveToRoom, { roomCode, roomId: ids.office })).toEqual({ completeGameTime: 1 });
  expect(await two.mutation(api.investigation.moveToRoom, { roomCode, roomId: ids.office })).toEqual({ completeGameTime: 1 });
  await expect(one.mutation(api.investigation.searchRoom, { roomCode })).rejects.toThrow("Finish your current action");
  vi.advanceTimersByTime(1_000);
  await one.mutation(api.investigation.finishAction, { roomCode });
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.currentRoomId).toBe(ids.office);
  expect(await one.mutation(api.investigation.searchRoom, { roomCode })).toEqual({ completeGameTime: 16 });
  await expect(two.mutation(api.investigation.searchRoom, { roomCode })).rejects.toThrow("partner is already searching");
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.items).toHaveLength(0);
  vi.advanceTimersByTime(15_000);
  await one.mutation(api.investigation.finishAction, { roomCode });
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.items[0]).toMatchObject({ name: "Note", collected: false });
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.items[0]?.description).toBeUndefined();
  await one.mutation(api.clueBoard.createReferenceNode, { roomCode, type: "item", referenceId: ids.itemId, x: 0, y: 0 });
  expect((await two.query(api.clueBoard.getNodes, { roomCode }))[0].text).toBe("Note\nFound object");
  await expect(one.mutation(api.investigation.searchRoom, { roomCode })).rejects.toThrow("already been searched");
  await one.mutation(api.investigation.collectItem, { roomCode, itemId: ids.itemId });
  expect(await two.query(api.investigation.getInventory, { roomCode })).toEqual([{ id: ids.itemId, name: "Note" }]);
  expect((await two.query(api.investigation.getPlace, { roomCode }))?.items[0]).toMatchObject({ name: "Note", collected: true });
  expect(await two.mutation(api.investigation.inspectItem, { roomCode, itemId: ids.itemId })).toEqual({ completeGameTime: 18 });
  vi.advanceTimersByTime(2_000);
  await two.mutation(api.investigation.finishAction, { roomCode });
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.items[0]).toMatchObject({ description: "A handwritten appointment.", inspected: true });
  expect((await one.query(api.investigation.getPlace, { roomCode }))?.clock).toMatchObject({ gameTime: 18, clockStartedAt: null });
}, 15_000);

/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("building cameras are reviewed in their room while street cameras stay at the bureau", async () => {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Access", summary: "A case", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    const makePlace = async (name: string, kind: "bureau" | "public") => {
      const placeId = await ctx.db.insert("places", { cityId, sourceId: name, order: kind === "bureau" ? 0 : 1, name, type: "public_building", kind, area: "midtown", description: name, mapX: 0, mapY: 0, crimeSceneAllowed: false, jobSlots: [] });
      const buildingId = await ctx.db.insert("buildings", { placeId, template: "institution", floorCount: 1, layoutSeed: "1" });
      await ctx.db.patch(placeId, { buildingId });
      const floorId = await ctx.db.insert("floors", { buildingId, floorNumber: 0 });
      const roomId = await ctx.db.insert("rooms", { buildingId, floorId, sourceId: `${name}:entrance`, order: 0, name: "Entrance", type: "lobby", searchable: false, isEntrance: true, itemSlots: [], hasCamera: false });
      return { placeId, buildingId, floorId, roomId };
    };
    const bureau = await makePlace("Bureau", "bureau");
    const site = await makePlace("Station", "public");
    const cameraRoomId = await ctx.db.insert("rooms", { buildingId: site.buildingId, floorId: site.floorId, sourceId: "station:camera", order: 1, name: "Hall", type: "corridor", searchable: false, isEntrance: false, itemSlots: [], hasCamera: true });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "CAMERA", status: "playing", gameTime: 0, createdAt: 1, expiresAt: Date.now() + 1_000_000 });
    const playerId = await ctx.db.insert("sessionPlayers", { sessionId, authUserId: "detective", nickname: "Detective", currentPlaceId: bureau.placeId, currentRoomId: bureau.roomId, joinedAt: 1 });
    await ctx.db.insert("cctvCameras", { caseId, sourceId: "street", name: "Street", description: "Street", faulty: false, startTime: 0, endTime: 100 });
    const cameraId = await ctx.db.insert("cctvCameras", { caseId, sourceId: "station", placeId: site.placeId, roomId: cameraRoomId, name: "Station hall", description: "Station hall", faulty: false, startTime: 0, endTime: 100 });
    await ctx.db.insert("cctvRecords", { caseId, cameraId, evidenceId: "station/record", startTime: 10, endTime: 10, npcIds: [], vehicleIds: [], description: "A person passes the hall.", kind: "pass" });
    return { playerId, bureau, site, cameraRoomId, sessionId };
  });
  const detective = t.withIdentity({ subject: "detective" });
  const cameras = async () => (await detective.query(api.cases.getCctv, { roomCode: "CAMERA" }))?.cameras.map((camera) => camera.id);
  expect(await cameras()).toEqual(["street"]);
  await expect(detective.mutation(api.cases.startCctvReview, { roomCode: "CAMERA", cameraId: "station", minute: 10 })).rejects.toThrow("access point");
  await t.run(async (ctx) => ctx.db.patch(ids.playerId, { currentPlaceId: ids.site.placeId, currentRoomId: ids.site.roomId }));
  expect(await cameras()).toBeUndefined();
  await t.run(async (ctx) => ctx.db.patch(ids.playerId, { currentRoomId: ids.cameraRoomId }));
  expect(await cameras()).toEqual(["station"]);
  expect(await detective.query(api.cases.getCctvWindow, { roomCode: "CAMERA", cameraId: "street", minute: 10 })).toBeNull();
  await expect(detective.mutation(api.cases.startCctvReview, { roomCode: "CAMERA", cameraId: "street", minute: 10 })).rejects.toThrow("access point");
  await detective.mutation(api.cases.startCctvReview, { roomCode: "CAMERA", cameraId: "station", minute: 10 });
  expect((await detective.query(api.cases.getCctvWindow, { roomCode: "CAMERA", cameraId: "station", minute: 10 }))?.status).toBe("ready");
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.sessionId, { gameTime: 5, clockStartedAt: undefined });
    const action = await ctx.db.query("roomActions").withIndex("by_playerId", (q) => q.eq("playerId", ids.playerId)).unique();
    if (action) await ctx.db.delete(action._id);
    await ctx.db.patch(ids.playerId, { currentPlaceId: ids.bureau.placeId, currentRoomId: ids.bureau.roomId });
  });
  // A reviewed record is shared evidence: it can be pinned from anywhere, like the notebook.
  await expect(detective.mutation(api.clueBoard.createReferenceNode, { roomCode: "CAMERA", type: "cctv", referenceId: "station/record", x: 0, y: 0 })).resolves.toBeTruthy();
});

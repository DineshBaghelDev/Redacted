/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { settleActions } from "./world";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.useRealTimers());

test("partners travel in parallel and the shared clock pauses after the last journey", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(100_000);
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Travel test", summary: "A case.", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    const place = async (sourceId: string, order: number, kind: "bureau" | "public") => await ctx.db.insert("places", {
      cityId, sourceId, order, name: sourceId, type: "public_building", kind, area: "midtown", description: sourceId,
      mapX: 10 * order, mapY: 10, crimeSceneAllowed: true, jobSlots: [],
    });
    const bureau = await place("bureau", 0, "bureau");
    const station = await place("station", 1, "public");
    const hospital = await place("hospital", 2, "public");
    await ctx.db.insert("publicRecords", { caseId, evidenceId: "record/test", type: "person", title: "Address", content: "A test record." });
    await ctx.db.insert("cctvCameras", { caseId, sourceId: "camera/test", name: "Camera", description: "Bureau feed", faulty: false, startTime: 0, endTime: 20 });
    for (const [sourceId, fromPlaceId, toPlaceId, travelMinutes] of [
      ["bureau-station", bureau, station, 5],
      ["station-hospital", station, hospital, 3],
      ["bureau-hospital", bureau, hospital, 12],
    ] as const) {
      await ctx.db.insert("placeConnections", { cityId, sourceId, order: travelMinutes, fromPlaceId, toPlaceId, travelMinutes, bidirectional: true, hasCamera: false });
    }
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "ABC123", status: "waiting", createdAt: 1, expiresAt: 1_000_000 });
    for (const authUserId of ["one", "two"]) {
      await ctx.db.insert("sessionPlayers", { sessionId, authUserId, nickname: authUserId, isReady: true, joinedAt: 1 });
    }
  });
  const one = t.withIdentity({ subject: "one" });
  const two = t.withIdentity({ subject: "two" });
  await one.mutation(api.sessions.start, { roomCode: "ABC123" });
  await expect(one.mutation(api.sessions.start, { roomCode: "ABC123" })).rejects.toThrow("Investigation already started");
  expect((await one.query(api.world.getMap, { roomCode: "ABC123" }))?.currentPlaceId).toBe("bureau");
  expect(await one.query(api.publicRecords.search, { roomCode: "ABC123", search: "" })).toEqual({ status: "available", records: [], savedTerms: [] });
  expect((await one.query(api.cases.getCctv, { roomCode: "ABC123" }))?.cameras).toHaveLength(1);
  expect(await one.mutation(api.world.startTravel, { roomCode: "ABC123", destinationId: "hospital" })).toEqual({ completeGameTime: 8 });
  expect(await one.query(api.publicRecords.search, { roomCode: "ABC123", search: "" })).toBeNull();
  expect(await one.query(api.cases.getCctv, { roomCode: "ABC123" })).toBeNull();
  await expect(one.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "public_record", referenceId: "record/test", x: 0, y: 0 })).rejects.toThrow("Use the bureau terminal");
  expect(await two.mutation(api.world.startTravel, { roomCode: "ABC123", destinationId: "station" })).toEqual({ completeGameTime: 5 });
  await expect(one.mutation(api.world.startTravel, { roomCode: "ABC123", destinationId: "station" })).rejects.toThrow("Finish your current action");
  vi.advanceTimersByTime(5_000);
  expect(await two.mutation(api.world.finishTravel, { roomCode: "ABC123" })).toEqual({ gameTime: 5, traveling: false });
  expect((await two.query(api.world.getMap, { roomCode: "ABC123" }))?.currentPlaceId).toBe("station");
  expect(await two.query(api.publicRecords.search, { roomCode: "ABC123", search: "" })).toBeNull();
  vi.advanceTimersByTime(3_000);
  expect(await one.mutation(api.world.finishTravel, { roomCode: "ABC123" })).toEqual({ gameTime: 8, traveling: false });
  expect((await one.query(api.world.getMap, { roomCode: "ABC123" }))?.clock).toMatchObject({ gameTime: 8, clockStartedAt: null });
  vi.advanceTimersByTime(20_000);
  expect((await one.query(api.world.getMap, { roomCode: "ABC123" }))?.clock.gameTime).toBe(8);
  expect(await two.mutation(api.world.startTravel, { roomCode: "ABC123", destinationId: "hospital" })).toEqual({ completeGameTime: 11 });
  vi.advanceTimersByTime(3_000);
  expect(await two.mutation(api.world.finishTravel, { roomCode: "ABC123" })).toEqual({ gameTime: 11, traveling: false });
  expect((await two.query(api.world.getMap, { roomCode: "ABC123" }))?.currentPlaceId).toBe("hospital");
  expect(await one.mutation(api.world.startTravel, { roomCode: "ABC123", destinationId: "bureau" })).toEqual({ completeGameTime: 19 });
  vi.advanceTimersByTime(30_000);
  expect(await one.mutation(api.world.finishTravel, { roomCode: "ABC123" })).toEqual({ gameTime: 19, traveling: false });
  expect((await one.query(api.world.getMap, { roomCode: "ABC123" }))?.clock.gameTime).toBe(19);
  expect(await two.mutation(api.world.startTravel, { roomCode: "ABC123", destinationId: "bureau" })).toEqual({ completeGameTime: 27 });
  await two.mutation(api.sessions.leave, { roomCode: "ABC123" });
  expect((await one.query(api.world.getMap, { roomCode: "ABC123" }))?.clock).toMatchObject({ gameTime: 19, clockStartedAt: null });
}, 15_000);

test("a completed lab request advances the clock baseline while another remains pending", async () => {
  const t = convexTest(schema, modules);
  const sessionId = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Lab test", summary: "A case.", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    await ctx.db.insert("places", { cityId, sourceId: "bureau", order: 0, name: "Bureau", type: "public_building", kind: "bureau", area: "midtown", description: "Bureau", mapX: 0, mapY: 0, crimeSceneAllowed: true, jobSlots: [] });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "LAB123", status: "playing", gameTime: 0, clockStartedAt: 1_000, createdAt: 1, expiresAt: Date.now() + 60_000 });
    await ctx.db.insert("sessionPlayers", { sessionId, authUserId: "one", nickname: "one", joinedAt: 1 });
    for (const readyAtGameTime of [65, 125]) {
      const forensicOutputId = await ctx.db.insert("forensicOutputs", { caseId, evidenceId: `lab/${readyAtGameTime}`, testType: "autopsy", result: "A finding.", linkedNpcIds: [], turnaroundMinutes: readyAtGameTime });
      await ctx.db.insert("forensicRequests", { sessionId, forensicOutputId, requestedAtGameTime: 0, readyAtGameTime });
    }
    return sessionId;
  });

  await t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId);
    expect(await settleActions(ctx, session!, 66_500)).toEqual({ gameTime: 65, activeCount: 1 });
  });
  expect((await t.withIdentity({ subject: "one" }).query(api.world.getMap, { roomCode: "LAB123" }))?.nextCompletionGameTime).toBe(125);
  await t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId);
    expect(await settleActions(ctx, session!, 126_000)).toEqual({ gameTime: 125, activeCount: 0 });
  });
  expect((await t.withIdentity({ subject: "one" }).query(api.world.getMap, { roomCode: "LAB123" }))?.clock).toMatchObject({ gameTime: 125, clockStartedAt: null });
});

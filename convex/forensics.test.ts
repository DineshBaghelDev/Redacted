/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.useRealTimers());

test("lab tests need collected evidence and reveal stored results only after shared game time", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(100_000);
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Lab test", summary: "Case", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    const placeId = await ctx.db.insert("places", { cityId, sourceId: "lab", order: 0, name: "Forensic Lab", type: "public_building", kind: "lab", area: "midtown", description: "Lab", mapX: 10, mapY: 10, crimeSceneAllowed: false, jobSlots: [] });
    const buildingId = await ctx.db.insert("buildings", { placeId, template: "institution", floorCount: 1, layoutSeed: "1" });
    await ctx.db.patch(placeId, { buildingId });
    const floorId = await ctx.db.insert("floors", { buildingId, floorNumber: 0 });
    const roomId = await ctx.db.insert("rooms", { buildingId, floorId, sourceId: "lab-room", order: 0, name: "Lab Reception", type: "lab", searchable: true, isEntrance: true, itemSlots: ["desk"], hasCamera: false });
    const itemId = await ctx.db.insert("caseItems", { caseId, evidenceId: "item/note", name: "Note", description: "Secret", placeId, roomId, slot: "desk", discoverableBySearch: true, collectible: true, hidden: true, itemType: "paper" });
    const victimId = await ctx.db.insert("npcs", { caseId, sourceId: "victim", role: "victim", name: "Victim", publicDescription: "The deceased." });
    const outputId = await ctx.db.insert("forensicOutputs", { caseId, evidenceId: "lab/note", sourceItemId: itemId, testType: "fingerprint", result: "One set of prints.", linkedNpcIds: [], turnaroundMinutes: 60 });
    await ctx.db.insert("forensicOutputs", { caseId, evidenceId: "lab/autopsy", testType: "autopsy", result: "Cause of death.", linkedNpcIds: [], turnaroundMinutes: 120 });
    const bodyOutputId = await ctx.db.insert("forensicOutputs", { caseId, evidenceId: "lab/body", sourceNpcId: victimId, testType: "toxicology", result: "Frozen body result.", linkedNpcIds: [victimId], turnaroundMinutes: 10 });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "LAB123", status: "playing", gameTime: 0, createdAt: 1, expiresAt: 1_000_000 });
    for (const authUserId of ["one", "two"]) await ctx.db.insert("sessionPlayers", { sessionId, authUserId, nickname: authUserId, currentPlaceId: placeId, currentRoomId: roomId, joinedAt: 1 });
    return { sessionId, itemId, outputId, bodyOutputId, roomId };
  });
  const one = t.withIdentity({ subject: "one" });
  const two = t.withIdentity({ subject: "two" });
  const outsider = t.withIdentity({ subject: "outsider" });
  const roomCode = "LAB123";
  expect((await one.query(api.forensics.getLab, { roomCode }))?.tests.map((row) => row.testType)).toEqual(["autopsy", "toxicology"]);
  expect((await one.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.bodyOutputId)).toMatchObject({ sourceName: "Victim", status: "available" });
  await expect(one.mutation(api.forensics.request, { roomCode, forensicOutputId: ids.outputId })).rejects.toThrow("Bring the source evidence");
  expect(await outsider.query(api.forensics.getLab, { roomCode })).toBeNull();
  await t.run(async (ctx) => {
    await ctx.db.insert("sessionItems", { sessionId: ids.sessionId, itemId: ids.itemId, discoveredAt: 1, collectedAt: 2 });
    await ctx.db.insert("searchedRooms", { sessionId: ids.sessionId, roomId: ids.roomId, searchedAt: 1 });
  });
  expect(await one.mutation(api.forensics.request, { roomCode, forensicOutputId: ids.outputId })).toEqual({ readyAtGameTime: 65 });
  await expect(two.mutation(api.forensics.request, { roomCode, forensicOutputId: ids.outputId })).rejects.toThrow("already been requested");
  expect((await two.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.outputId)?.status).toBe("pending");
  expect((await two.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.outputId)?.result).toBeUndefined();
  await expect(two.mutation(api.forensics.markViewed, { roomCode, forensicOutputId: ids.outputId })).rejects.toThrow("not ready");
  await expect(one.mutation(api.clueBoard.createReferenceNode, { roomCode, type: "forensic", referenceId: ids.outputId, x: 0, y: 0 })).rejects.toThrow("View this lab result");
  vi.advanceTimersByTime(5_000);
  await one.mutation(api.investigation.finishAction, { roomCode });
  expect((await one.query(api.world.getMap, { roomCode }))?.clock.clockStartedAt).not.toBeNull();
  vi.advanceTimersByTime(60_000);
  await one.mutation(api.investigation.finishAction, { roomCode });
  expect((await one.query(api.world.getMap, { roomCode }))?.clock).toMatchObject({ gameTime: 65, clockStartedAt: null });
  expect((await two.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.outputId)?.status).toBe("ready");
  expect((await two.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.outputId)?.result).toBeUndefined();
  await two.mutation(api.forensics.markViewed, { roomCode, forensicOutputId: ids.outputId });
  expect((await one.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.outputId)).toMatchObject({ status: "viewed", result: "One set of prints." });
  await one.mutation(api.clueBoard.createReferenceNode, { roomCode, type: "forensic", referenceId: ids.outputId, x: 0, y: 0 });
  expect((await two.query(api.clueBoard.getNodes, { roomCode }))[0].text).toBe("fingerprint report\nOne set of prints.");
  expect(await one.mutation(api.forensics.request, { roomCode, forensicOutputId: ids.bodyOutputId })).toEqual({ readyAtGameTime: 80 });
  expect((await two.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.bodyOutputId)?.result).toBeUndefined();
  vi.advanceTimersByTime(15_000);
  await one.mutation(api.investigation.finishAction, { roomCode });
  await two.mutation(api.forensics.markViewed, { roomCode, forensicOutputId: ids.bodyOutputId });
  expect((await one.query(api.forensics.getLab, { roomCode }))?.tests.find((row) => row.id === ids.bodyOutputId)).toMatchObject({ status: "viewed", result: "Frozen body result." });
}, 15_000);

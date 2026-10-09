/// <reference types="vite/client" />

import agentTest from "@convex-dev/agent/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.useRealTimers());

async function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
  const t = convexTest(schema, modules);
  agentTest.register(t);
  const ids = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Cancellation", summary: "A case", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    const placeId = await ctx.db.insert("places", { cityId, sourceId: "bureau", order: 0, name: "Bureau", type: "public_building", kind: "bureau", area: "midtown", description: "Bureau", mapX: 0, mapY: 0, crimeSceneAllowed: false, jobSlots: [] });
    const buildingId = await ctx.db.insert("buildings", { placeId, template: "institution", floorCount: 1, layoutSeed: "1" });
    await ctx.db.patch(placeId, { buildingId });
    const floorId = await ctx.db.insert("floors", { buildingId, floorNumber: 0 });
    const roomId = await ctx.db.insert("rooms", { buildingId, floorId, sourceId: "bureau", order: 0, name: "Bureau", type: "office", searchable: false, isEntrance: true, itemSlots: [], hasCamera: false });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "CANCEL", status: "playing", gameTime: 0, createdAt: 1, expiresAt: 1_000_000 });
    for (const authUserId of ["one", "two"]) await ctx.db.insert("sessionPlayers", { sessionId, authUserId, nickname: authUserId, currentPlaceId: placeId, currentRoomId: roomId, joinedAt: 1 });
    const recordId = await ctx.db.insert("publicRecords", { caseId, evidenceId: "record/address", type: "person", title: "Address", content: "A shared record" });
    const cameraId = await ctx.db.insert("cctvCameras", { caseId, sourceId: "camera", name: "Camera", description: "Camera", faulty: false, startTime: 0, endTime: 100 });
    const npcId = await ctx.db.insert("npcs", { caseId, sourceId: "npc", role: "witness", name: "Witness", publicDescription: "A witness" });
    await ctx.db.insert("npcScripts", { caseId, npcId, personality: [], job: "clerk", home: "City", relationshipToVictim: "neighbor", knowledge: [], intentionalLies: [], behavioralRules: [] });
    return { caseId, sessionId, recordId, cameraId, npcId, placeId };
  });
  return { t, ids, one: t.withIdentity({ subject: "one" }), two: t.withIdentity({ subject: "two" }), roomCode: "CANCEL" };
}

test.each(["one", "two"])("canceling overlapping searches in order starting with %s preserves remaining access", async (first) => {
  const { t, ids, one, two, roomCode } = await setup();
  await one.mutation(api.publicRecords.performSearch, { roomCode, search: "" });
  vi.setSystemTime(102_000);
  await two.mutation(api.publicRecords.performSearch, { roomCode, search: "Address" });
  const access = () => t.run(async (ctx) => ctx.db.query("sessionPublicRecords").withIndex("by_sessionId_and_recordId", q => q.eq("sessionId", ids.sessionId).eq("recordId", ids.recordId)).unique());
  await (first === "one" ? one : two).mutation(api.sessions.leave, { roomCode });
  expect((await access())?.completeGameTime).toBe(first === "one" ? 12 : 10);
  expect(await t.run(async (ctx) => ctx.db.query("publicRecordSearches").collect())).toHaveLength(1);
  await (first === "one" ? two : one).mutation(api.sessions.leave, { roomCode });
  expect(await access()).toBeNull();
  expect(await t.run(async (ctx) => ctx.db.query("publicRecordSearches").collect())).toEqual([]);
  expect(await t.run(async (ctx) => ctx.db.query("roomActions").collect())).toEqual([]);
  expect((await t.run(async (ctx) => ctx.db.get(ids.sessionId)))?.clockStartedAt).toBeUndefined();
});

test.each([0, 30])("canceling a search preserves prior record access at minute %s", async (completeGameTime) => {
  const { t, ids, one, roomCode } = await setup();
  const accessId = await t.run(async (ctx) => ctx.db.insert("sessionPublicRecords", { sessionId: ids.sessionId, recordId: ids.recordId, completeGameTime }));
  await one.mutation(api.publicRecords.performSearch, { roomCode, search: "" });
  await one.mutation(api.sessions.leave, { roomCode });
  expect(await t.run(async (ctx) => ctx.db.get(accessId))).toMatchObject({ completeGameTime });
  expect((await t.run(async (ctx) => ctx.db.get(accessId)))?.sourceSearchId).toBeUndefined();
});

test("leaving removes only the owned CCTV review and allows a partner to restart it", async () => {
  const { t, ids, one, two, roomCode } = await setup();
  await one.mutation(api.cases.startCctvReview, { roomCode, cameraId: "camera", minute: 0 });
  await two.mutation(api.cases.startCctvReview, { roomCode, cameraId: "camera", minute: 50 });
  await one.mutation(api.sessions.leave, { roomCode });
  const reviews = await t.run(async (ctx) => ctx.db.query("cctvReviews").collect());
  expect(reviews).toMatchObject([{ cameraId: ids.cameraId, minute: 50 }]);
  vi.setSystemTime(106_000);
  await two.mutation(api.investigation.finishAction, { roomCode });
  await two.mutation(api.cases.startCctvReview, { roomCode, cameraId: "camera", minute: 0 });
  expect(await t.run(async (ctx) => ctx.db.query("cctvReviews").collect())).toHaveLength(2);
});

test("leaving after a search finishes preserves its results", async () => {
  const { t, one, roomCode } = await setup();
  await one.mutation(api.publicRecords.performSearch, { roomCode, search: "" });
  vi.setSystemTime(110_000);
  await one.mutation(api.sessions.leave, { roomCode });
  expect(await t.run(async (ctx) => ctx.db.query("publicRecordSearches").collect())).toHaveLength(1);
  expect(await t.run(async (ctx) => ctx.db.query("sessionPublicRecords").collect())).toHaveLength(1);
});

test("record search reports a busy action before checking bureau location", async () => {
  const { t, ids, one, roomCode } = await setup();
  await one.mutation(api.publicRecords.performSearch, { roomCode, search: "" });
  await expect(one.mutation(api.publicRecords.performSearch, { roomCode, search: "Address" })).rejects.toThrow("Finish your current action first.");
  vi.setSystemTime(110_000);
  await one.mutation(api.investigation.finishAction, { roomCode });
  await t.run(async (ctx) => ctx.db.patch(ids.placeId, { kind: "public" }));
  await expect(one.mutation(api.publicRecords.performSearch, { roomCode, search: "Address" })).rejects.toThrow("Visit the bureau records terminal first.");
});

test("leaving cancels an unpaid NPC turn and lets the partner's later turn advance", async () => {
  const { t, ids, one, two, roomCode } = await setup();
  await one.mutation(api.npcConversations.callToBureau, { roomCode, npcId: ids.npcId });
  await one.mutation(api.npcConversations.sendQuestion, { roomCode, npcId: ids.npcId, question: "What happened?", requestStatements: true });
  await one.mutation(api.sessions.leave, { roomCode });
  const conversation = await t.run(async (ctx) => ctx.db.query("npcConversations").first());
  const turns = await t.run(async (ctx) => ctx.db.query("npcPendingMessages").collect());
  expect(turns).toMatchObject([{ status: "failed", canceled: true, error: expect.stringContaining("canceled") }]);
  expect(conversation?.statementStatus).toBeUndefined();
  await expect(two.mutation(api.npcConversations.retryFailed, { roomCode, npcId: ids.npcId })).rejects.toThrow("no failed answer");
  expect(await t.mutation(internal.npcConversations.claimNext, { conversationId: conversation!._id })).toBeNull();
  await two.mutation(api.npcConversations.sendQuestion, { roomCode, npcId: ids.npcId, question: "Where were you?" });
  vi.setSystemTime(103_000);
  await two.mutation(api.investigation.finishAction, { roomCode });
  const claimed = await t.mutation(internal.npcConversations.claimNext, { conversationId: conversation!._id });
  expect(claimed).toMatchObject({ npcId: ids.npcId });
  expect(await t.run(async (ctx) => ctx.db.get(claimed!.turnId))).toMatchObject({ sequence: 1, status: "processing" });
});

/// <reference types="vite/client" />

import agentTest from "@convex-dev/agent/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modelState = vi.hoisted(() => ({ failNext: false }));

vi.mock("./generation/llm", async () => {
  const { MockLanguageModelV4 } = await import("ai/test");
  return { npcLanguageModel: () => ({ model: new MockLanguageModelV4({ doGenerate: async ({ providerOptions }) => {
    expect(providerOptions).toMatchObject({ moonshot: { thinking: { type: "disabled" } } });
    if (modelState.failNext) {
      modelState.failNext = false;
      throw new Error("Provider unavailable");
    }
    return {
      content: [{ type: "text" as const, text: "I saw him leave work." }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } },
      warnings: [],
    };
  } }), providerOptions: { moonshot: { thinking: { type: "disabled" } } } }) };
});

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.useRealTimers());

test("only a bureau detective can start a shared, timed NPC interview", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(100_000);
  const t = convexTest(schema, modules);
  agentTest.register(t);
  const ids = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Interview test", summary: "A case.", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    const placeId = await ctx.db.insert("places", { cityId, sourceId: "bureau", order: 0, name: "Bureau", type: "public_building", kind: "bureau", area: "midtown", description: "Bureau", mapX: 0, mapY: 0, crimeSceneAllowed: true, jobSlots: [] });
    const buildingId = await ctx.db.insert("buildings", { placeId, template: "institution", floorCount: 1, layoutSeed: "1" });
    await ctx.db.patch(placeId, { buildingId });
    const floorId = await ctx.db.insert("floors", { buildingId, floorNumber: 0 });
    const roomId = await ctx.db.insert("rooms", { buildingId, floorId, sourceId: "bureau:interview", order: 0, name: "Interview room", type: "office", searchable: false, isEntrance: true, itemSlots: [], hasCamera: false });
    const npcId = await ctx.db.insert("npcs", { caseId, sourceId: "mara", role: "suspect", name: "Mara", publicDescription: "A conductor." });
    const phoneId = await ctx.db.insert("devices", { caseId, sourceId: "phone:mara", type: "phone", ownerNpcId: npcId, name: "Mara's phone", description: "A mobile phone." });
    const messageId = await ctx.db.insert("messages", { caseId, deviceId: phoneId, evidenceId: "message/secret", timestamp: 44, direction: "outgoing", otherPartyLabel: "Unknown", body: "Meet me at the station." });
    await ctx.db.insert("npcScripts", { caseId, npcId, personality: ["guarded"], job: "conductor", home: "Station Road", relationshipToVictim: "colleague", knowledge: [{ sourceId: "event/1", how: "saw", time: 30, text: "Saw the victim leave work." }], intentionalLies: [{ topic: "whereabouts", claim: "I stayed at work.", truthIds: ["event/1"], reason: "Protect a friend", disprovingEvidenceIds: ["item/ticket"], whenCaught: "backup-lie", backupLie: { claim: "I went straight home.", disprovingEvidenceIds: ["item/receipt"] } }, { topic: "secret", claim: "I never sent a message.", truthIds: ["event/1"], reason: "Hide a meeting", disprovingEvidenceIds: ["message/secret"], whenCaught: "admit-shown" }], behavioralRules: ["Answer briefly."] });
    await ctx.db.insert("witnessStatements", { caseId, witnessNpcId: npcId, evidenceId: "witness/mara/safe", eventId: "event/2", title: "Station sighting", text: "I saw the station door open." });
    await ctx.db.insert("witnessStatements", { caseId, witnessNpcId: npcId, evidenceId: "witness/mara/lied", eventId: "event/1", title: "Hidden sighting", text: "I saw the victim leave work." });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "ABC123", status: "playing", gameTime: 0, createdAt: 1, expiresAt: 1_000_000 });
    for (const authUserId of ["one", "two"]) await ctx.db.insert("sessionPlayers", { sessionId, authUserId, nickname: authUserId, isReady: true, currentPlaceId: placeId, currentRoomId: roomId, joinedAt: 1 });
    const itemId = await ctx.db.insert("caseItems", { caseId, evidenceId: "item/ticket", name: "Ticket", description: "A ticket", placeId, roomId, slot: "desk", discoverableBySearch: true, collectible: true, hidden: true, itemType: "paper" });
    const otherSessionId = await ctx.db.insert("sessions", { caseId, roomCode: "OTHER1", status: "playing", gameTime: 0, createdAt: 1, expiresAt: 1_000_000 });
    const otherNodeId = await ctx.db.insert("clueBoardNodes", { sessionId: otherSessionId, type: "item", referenceId: itemId, text: "Ticket", x: 0, y: 0, createdByPlayerId: (await ctx.db.query("sessionPlayers").withIndex("by_sessionId", q => q.eq("sessionId", sessionId)).first())!._id, createdAt: 1, updatedAt: 1 });
    return { npcId, sessionId, itemId, otherNodeId, phoneId, messageId };
  });
  const one = t.withIdentity({ subject: "one" });
  const two = t.withIdentity({ subject: "two" });
  const outsider = t.withIdentity({ subject: "outsider" });
  await expect(outsider.mutation(api.npcConversations.callToBureau, { roomCode: "ABC123", npcId: ids.npcId })).rejects.toThrow("bureau");
  await expect(outsider.mutation(api.npcConversations.readPhone, { roomCode: "ABC123", npcId: ids.npcId })).rejects.toThrow("Start the investigation");
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Where were you?" })).rejects.toThrow("Call this person");
  await one.mutation(api.npcConversations.callToBureau, { roomCode: "ABC123", npcId: ids.npcId });
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Explain this", proofNodeId: ids.otherNodeId })).rejects.toThrow("this case's clueboard");
  expect(await one.query(api.npcConversations.listAvailableProof, { roomCode: "ABC123" })).toEqual([]);
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Explain this", proofReference: { type: "item", referenceId: ids.itemId } })).rejects.toThrow("Find this item");
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "You sent this?", proofReference: { type: "message", referenceId: ids.messageId } })).rejects.toThrow("Read this phone");
  const guessedNodeId = await t.run(async ctx => await ctx.db.insert("clueBoardNodes", { sessionId: ids.sessionId, type: "item", referenceId: ids.itemId, text: "Ticket", x: 0, y: 0, createdByPlayerId: (await ctx.db.query("sessionPlayers").withIndex("by_sessionId", q => q.eq("sessionId", ids.sessionId)).first())!._id, createdAt: 1, updatedAt: 1 }));
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Explain this", proofNodeId: guessedNodeId })).rejects.toThrow("Find this item");
  expect((await two.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.bureauPresent).toBe(true);
  expect(await one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Where were you?" })).toEqual({ completeGameTime: 3 });
  expect(await two.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Who saw you?" })).toEqual({ completeGameTime: 3 });
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Again?" })).rejects.toThrow("Finish your current action");
  expect((await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.turns.map((turn) => turn.status)).toEqual(["waiting", "waiting"]);
  vi.advanceTimersByTime(3_000);
  await one.mutation(api.world.finishTravel, { roomCode: "ABC123" });
  const interview = await two.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId });
  expect(interview?.turns.map((turn) => turn.status)).toEqual(["queued", "queued"]);
  expect(JSON.stringify(interview)).not.toContain("Saw the victim leave work");
  const conversationId = await t.run(async (ctx) => (await ctx.db.query("npcConversations").withIndex("by_sessionId_and_npcId", (q) => q.eq("sessionId", ids.sessionId).eq("npcId", ids.npcId)).unique())!._id);
  const first = await t.mutation(internal.npcConversations.claimNext, { conversationId });
  expect(first?.npcId).toBe(ids.npcId);
  expect(await t.mutation(internal.npcConversations.claimNext, { conversationId })).toBeNull();
  await t.mutation(internal.npcConversations.finishTurn, { turnId: first!.turnId });
  await t.action(internal.npcConversations.processNext, { conversationId });
  expect((await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.turns.map((turn) => turn.status)).toEqual(["complete", "complete"]);
  const messages = await one.query(api.npcConversations.listMessages, { roomCode: "ABC123", threadId: interview!.threadId!, paginationOpts: { cursor: null, numItems: 10 } });
  expect(messages.page.some((message: { text: string }) => message.text.includes("I saw him leave work."))).toBe(true);
  expect(JSON.stringify(messages)).not.toContain("Saw the victim leave work");
  await expect(outsider.query(api.npcConversations.listMessages, { roomCode: "ABC123", threadId: interview!.threadId!, paginationOpts: { cursor: null, numItems: 10 } })).rejects.toThrow("Join this interview");
  await one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Anything else?" });
  vi.advanceTimersByTime(3_000);
  await one.mutation(api.world.finishTravel, { roomCode: "ABC123" });
  modelState.failNext = true;
  await t.action(internal.npcConversations.processNext, { conversationId });
  expect((await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.turns.at(-1)?.status).toBe("failed");
  await one.mutation(api.npcConversations.retryFailed, { roomCode: "ABC123", npcId: ids.npcId });
  expect((await one.query(api.world.getMap, { roomCode: "ABC123" }))?.clock.gameTime).toBe(6);
  await t.action(internal.npcConversations.processNext, { conversationId });
  expect((await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.turns.at(-1)?.status).toBe("complete");
  await t.run(async ctx => {
    await ctx.db.insert("sessionItems", { sessionId: ids.sessionId, itemId: ids.itemId, discoveredAt: 6 });
  });
  expect(await two.query(api.npcConversations.listAvailableProof, { roomCode: "ABC123" })).toContainEqual({ type: "item", referenceId: ids.itemId, label: "Item · Ticket" });
  await one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Explain this", proofReference: { type: "item", referenceId: ids.itemId } });
  const exposed = await t.run(async ctx => await ctx.db.query("npcExposedLies").first());
  expect(exposed?.mainExposedAt).toBe(4);
  expect(exposed?.backupExposedAt).toBeUndefined();
  const turns = await t.run(async ctx => await ctx.db.query("npcPendingMessages").withIndex("by_conversationId_and_sequence", q => q.eq("conversationId", conversationId)).take(10));
  expect((await t.query(internal.npcConversations.getNpcContext, { turnId: turns[0]._id }))?.lies[0].state).toBe("unexposed");
  expect((await t.query(internal.npcConversations.getNpcContext, { turnId: turns.at(-1)!._id }))?.lies[0].state).toBe("exposed");
  expect(JSON.stringify(await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))).not.toContain("I stayed at work");
  const beforePhone = await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId });
  expect(beforePhone?.phone).toMatchObject({ acquired: false, read: false, messages: [] });
  expect(await one.query(api.npcConversations.listAvailableProof, { roomCode: "ABC123" })).not.toContainEqual(expect.objectContaining({ referenceId: ids.messageId }));
  await expect(one.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "message", referenceId: ids.messageId, x: 0, y: 0 })).rejects.toThrow("Read this phone");
  await two.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "May I examine your phone?", requestPhone: true });
  expect((await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.phone?.requesting).toBe(true);
  const phoneTranscript = await two.query(api.npcConversations.listMessages, { roomCode: "ABC123", threadId: interview!.threadId!, paginationOpts: { cursor: null, numItems: 30 } });
  expect(JSON.stringify(phoneTranscript)).not.toContain("server has confirmed");
  vi.advanceTimersByTime(3_000);
  await one.mutation(api.npcConversations.readPhone, { roomCode: "ABC123", npcId: ids.npcId });
  expect((await one.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.phone).toMatchObject({ acquired: true, read: false, messages: [] });
  await expect(two.mutation(api.npcConversations.readPhone, { roomCode: "ABC123", npcId: ids.npcId })).rejects.toThrow("partner is already reading");
  vi.advanceTimersByTime(5_000);
  await two.mutation(api.world.finishTravel, { roomCode: "ABC123" });
  expect((await two.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.phone?.messages[0]?.body).toBe("Meet me at the station.");
  expect(await two.query(api.npcConversations.listAvailableProof, { roomCode: "ABC123" })).toContainEqual({ type: "message", referenceId: ids.messageId, label: "Message · Meet me at the station." });
  const messageNodeId = await one.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "message", referenceId: ids.messageId, x: 0, y: 0 });
  await two.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "You sent this, didn't you?", proofNodeId: messageNodeId });
  const exposedAfterPhone = await t.run(async ctx => await ctx.db.query("npcExposedLies").withIndex("by_conversationId_and_lieIndex", q => q.eq("conversationId", conversationId).eq("lieIndex", 1)).unique());
  expect(exposedAfterPhone?.mainExposedAt).toBeDefined();
  await expect(one.mutation(api.npcConversations.readPhone, { roomCode: "ABC123", npcId: ids.npcId })).rejects.toThrow("already been read");
  await expect(one.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "statement", referenceId: "witness/mara/safe", x: 0, y: 0 })).rejects.toThrow("Hear this statement");
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Show this", proofReference: { type: "statement", referenceId: "witness/mara/safe" } })).rejects.toThrow("Hear this statement");
  expect((await two.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.statements).toEqual([]);
  await one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "What did you witness?", requestStatements: true });
  expect((await two.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.statementStatus).toBe("requested");
  await expect(two.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "What did you witness?", requestStatements: true })).rejects.toThrow("already been asked");
  vi.advanceTimersByTime(3_000);
  await one.mutation(api.world.finishTravel, { roomCode: "ABC123" });
  expect((await two.query(api.npcConversations.getInterview, { roomCode: "ABC123", npcId: ids.npcId }))?.statements).toEqual([{ id: "witness/mara/safe", title: "Station sighting", text: "I saw the station door open." }]);
  expect(await two.query(api.npcConversations.listAvailableProof, { roomCode: "ABC123" })).toContainEqual({ type: "statement", referenceId: "witness/mara/safe", label: "Statement · Station sighting" });
  expect(JSON.stringify(await two.query(api.npcConversations.listAvailableProof, { roomCode: "ABC123" }))).not.toContain("witness/mara/lied");
  await expect(one.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "statement", referenceId: "witness/mara/lied", x: 0, y: 0 })).rejects.toThrow("Hear this statement");
  await expect(one.mutation(api.npcConversations.sendQuestion, { roomCode: "ABC123", npcId: ids.npcId, question: "Show this", proofReference: { type: "statement", referenceId: "witness/mara/lied" } })).rejects.toThrow("Hear this statement");
  const statementNode = await two.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "statement", referenceId: "witness/mara/safe", x: 0, y: 0 });
  expect((await one.query(api.clueBoard.getNodes, { roomCode: "ABC123" }))!.some(node => node._id === statementNode)).toBe(true);
}, 30_000);

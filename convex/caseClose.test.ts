/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { generateJson, modelsFor } from "./generation/llm";
import schema from "./schema";

vi.mock("./generation/llm", () => ({ generateJson: vi.fn(), modelsFor: vi.fn(() => ["fake"]) }));
const fakeAi = vi.mocked(generateJson);
vi.mocked(modelsFor).mockReturnValue(["fake"]);
const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.useRealTimers();
  fakeAi.mockReset();
});

test("case close grades privately from session-owned evidence", async () => {
  fakeAi.mockResolvedValue({
    output: { motiveStar: true, weaponStar: false, evidenceStar: true, methodStar: true },
    problems: [], model: "fake", mode: "strict", rawText: "{}", ms: 1,
  });
  const t = convexTest(schema, modules);
  const setup = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "player-1", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", {
      generationJobId, difficulty: "easy", title: "Case", summary: "Summary", initialFacts: [], publicationVersion: 1, createdAt: 1,
    });
    const culpritNpcId = await ctx.db.insert("npcs", {
      caseId, sourceId: "culprit", role: "suspect", name: "Mara Vale", publicDescription: "A conductor.",
    });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    const placeId = await ctx.db.insert("places", {
      cityId, sourceId: "station", order: 1, name: "Station", type: "public_building", kind: "public", area: "midtown",
      description: "Station", mapX: 0, mapY: 0, crimeSceneAllowed: true, jobSlots: [],
    });
    const buildingId = await ctx.db.insert("buildings", { placeId, template: "institution", floorCount: 1, layoutSeed: "1" });
    const floorId = await ctx.db.insert("floors", { buildingId, floorNumber: 0 });
    const roomId = await ctx.db.insert("rooms", {
      buildingId,
      floorId,
      sourceId: "station:room", order: 1, name: "Room", type: "office", searchable: true, isEntrance: true, itemSlots: ["desk"], hasCamera: false,
    });
    const itemId = await ctx.db.insert("caseItems", {
      caseId, evidenceId: "item/weapon", sourceId: "weapon", name: "Cast-iron doorstop", description: "Heavy doorstop",
      placeId, roomId, slot: "desk", discoverableBySearch: true, collectible: true, hidden: true, itemType: "weapon",
    });
    const uncollectedItemId = await ctx.db.insert("caseItems", {
      caseId, evidenceId: "item/hidden", name: "Hidden knife", description: "Not found", placeId, roomId, slot: "desk",
      discoverableBySearch: true, collectible: true, hidden: true, itemType: "weapon",
    });
    const laptopItemId = await ctx.db.insert("caseItems", {
      caseId, evidenceId: "item/laptop", sourceId: "laptop", name: "Work laptop", description: "Open laptop",
      placeId, roomId, slot: "desk", discoverableBySearch: true, collectible: true, hidden: true, itemType: "device",
    });
    const deviceId = await ctx.db.insert("devices", { caseId, sourceId: "laptop", type: "laptop", sourceItemId: laptopItemId, name: "Work laptop", description: "Open laptop" });
    await ctx.db.insert("deviceFiles", { caseId, deviceId, evidenceId: "file/laptop/0", title: "Accounts", body: "A payment record." });
    const phoneItemId = await ctx.db.insert("caseItems", { caseId, evidenceId: "device/phone:victim", sourceId: "phone:victim", name: "Victim phone", description: "A phone", placeId, roomId, slot: "on the body", discoverableBySearch: true, collectible: true, hidden: true, itemType: "device" });
    const phoneId = await ctx.db.insert("devices", { caseId, sourceId: "phone:victim", type: "phone", sourceItemId: phoneItemId, name: "Victim phone", description: "A phone" });
    const callId = await ctx.db.insert("callLogs", { caseId, evidenceId: "call/victim/0", deviceId: phoneId, timestamp: 120, direction: "incoming", durationSeconds: 60, otherPartyLabel: "Mara" });
    const messageId = await ctx.db.insert("messages", { caseId, evidenceId: "message/victim/0", deviceId: phoneId, timestamp: 130, direction: "outgoing", body: "Meet me outside.", otherPartyLabel: "Mara" });
    const statementId = await ctx.db.insert("witnessStatements", { caseId, witnessNpcId: culpritNpcId, evidenceId: "witness/mara/sighting", eventId: "event/sighting", title: "Station sighting", text: "I saw the station door open." });
    const outputId = await ctx.db.insert("forensicOutputs", { caseId, evidenceId: "lab/weapon", sourceItemId: itemId, testType: "fingerprint", result: "Prints on the doorstop.", linkedNpcIds: [], turnaroundMinutes: 60 });
    await ctx.db.insert("caseSolutions", {
      caseId, culpritNpcId, motive: "To conceal stolen company money.", weaponDescription: "Cast-iron doorstop",
      method: "Struck the victim with the doorstop.", canonicalExplanation: "Private answer.",
      keyReasoningPoints: ["The address record links the suspect."],
      evidenceGroups: [{ description: "Decisive evidence", requiredEvidenceIds: ["record/address"] }],
    });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "ABC123", status: "playing", createdAt: 1, expiresAt: Date.now() + 60_000 });
    await ctx.db.insert("sessionItems", { sessionId, itemId, discoveredAt: 1, collectedAt: 2 });
    await ctx.db.insert("sessionItems", { sessionId, itemId: laptopItemId, discoveredAt: 1, readAt: 2 });
    await ctx.db.insert("sessionItems", { sessionId, itemId: phoneItemId, discoveredAt: 1, readAt: 2 });
    await ctx.db.insert("forensicRequests", { sessionId, forensicOutputId: outputId, requestedAtGameTime: 0, readyAtGameTime: 65, viewedAt: 3 });
    const playerId = await ctx.db.insert("sessionPlayers", { sessionId, authUserId: "player-1", nickname: "Detective", joinedAt: 1 });
    await ctx.db.insert("clueBoardNodes", {
      sessionId, type: "public_record", referenceId: "record/address", text: "Address record", x: 0, y: 0,
      createdByPlayerId: playerId, createdAt: 1, updatedAt: 1,
    });
    await ctx.db.insert("clueBoardNodes", { sessionId, type: "statement", referenceId: "witness/mara/sighting", text: "Forged statement card", x: 0, y: 0, createdByPlayerId: playerId, createdAt: 1, updatedAt: 1 });
    return { culpritNpcId, itemId, uncollectedItemId, outputId, sessionId, callId, messageId, statementId };
  });

  const player = t.withIdentity({ subject: "player-1" });
  await player.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "item", referenceId: setup.itemId, x: 0, y: 0 });
  await player.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "forensic", referenceId: setup.outputId, x: 0, y: 0 });
  await player.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "device_file", referenceId: "file/laptop/0", x: 0, y: 0 });
  await player.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "call", referenceId: setup.callId, x: 0, y: 0 });
  await player.mutation(api.clueBoard.createReferenceNode, { roomCode: "ABC123", type: "message", referenceId: setup.messageId, x: 0, y: 0 });
  await expect(player.mutation(api.caseClose.submit, {
    roomCode: "ABC123", culpritNpcId: setup.culpritNpcId, motiveExplanation: "A detailed motive that fits the theory.", weaponDescription: "Doorstop",
    evidenceIds: ["not-on-board"], evidenceExplanation: "An unowned record supports this theory.", methodExplanation: "A detailed method that fits the theory.",
  })).rejects.toThrow("pinned to this clueboard");
  await expect(player.mutation(api.caseClose.submit, {
    roomCode: "ABC123", culpritNpcId: setup.culpritNpcId, motiveExplanation: "A detailed motive that fits the theory.", weaponItemId: setup.uncollectedItemId, weaponDescription: "Hidden knife",
    evidenceIds: ["record/address"], evidenceExplanation: "The address record supports the theory.", methodExplanation: "A detailed method that fits the theory.",
  })).rejects.toThrow("shared inventory");
  await expect(player.mutation(api.caseClose.submit, {
    roomCode: "ABC123", culpritNpcId: setup.culpritNpcId, motiveExplanation: "A detailed motive that fits the theory.", weaponDescription: "Doorstop",
    evidenceIds: ["witness/mara/sighting"], evidenceExplanation: "The statement supports the theory.", methodExplanation: "A detailed method that fits the theory.",
  })).rejects.toThrow("Hear this statement");
  await t.run(async ctx => { await ctx.db.insert("sessionStatements", { sessionId: setup.sessionId, statementId: setup.statementId, heardAt: 3 }); });
  await player.mutation(api.caseClose.submit, {
    roomCode: "ABC123",
    culpritNpcId: setup.culpritNpcId,
    motiveExplanation: "Mara wanted to conceal the stolen company money.",
    weaponDescription: "Cast-iron doorstop",
    weaponItemId: setup.itemId,
    evidenceIds: ["record/address", setup.itemId, setup.outputId, "file/laptop/0", setup.callId, setup.messageId, "witness/mara/sighting"],
    evidenceExplanation: "The address record ties Mara to the relevant place.",
    methodExplanation: "Mara struck the victim with the cast-iron doorstop.",
  });
  const submitted = await t.run(async (ctx) => await ctx.db.query("accusations").withIndex("by_sessionId", (q) => q.eq("sessionId", setup.sessionId)).unique());
  expect(submitted?.evidenceIds).toEqual(["record/address", "item/weapon", "lab/weapon", "file/laptop/0", "call/victim/0", "message/victim/0", "witness/mara/sighting"]);
  vi.useFakeTimers();
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  vi.useRealTimers();

  expect(await player.query(api.caseClose.getResult, { roomCode: "ABC123" })).toEqual({
    status: "complete",
    result: {
      killer: { star: true }, motive: { star: true }, weapon: { star: true }, evidence: { star: true }, method: { star: true }, totalStars: 5,
    },
    error: undefined,
  });
  expect(JSON.stringify(await player.query(api.caseClose.getResult, { roomCode: "ABC123" }))).not.toContain("Private answer");
  await expect(player.mutation(api.caseClose.submit, {
    roomCode: "ABC123", culpritNpcId: setup.culpritNpcId, motiveExplanation: "Another detailed motive.", weaponDescription: "Doorstop",
    evidenceIds: ["record/address"], evidenceExplanation: "The address record supports it.", methodExplanation: "Another detailed method.",
  })).rejects.toThrow("already been submitted");
});

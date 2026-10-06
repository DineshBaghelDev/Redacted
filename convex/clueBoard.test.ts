/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("room partners share notes, positions, and colored strings", async () => {
  const t = convexTest(schema, modules);
  const npcId = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", {
      seed: 1,
      difficulty: "easy",
      createdBy: "player-1",
      createdAt: 1,
    });
    const caseId = await ctx.db.insert("cases", {
      generationJobId,
      difficulty: "easy",
      title: "Test case",
      summary: "Test summary",
      initialFacts: [],
      publicationVersion: 1,
      createdAt: 1,
    });
    const sessionId = await ctx.db.insert("sessions", {
      caseId,
      roomCode: "ABC123",
      status: "playing",
      createdAt: 1,
      expiresAt: Date.now() + 60_000,
    });
    await ctx.db.insert("sessionPlayers", {
      sessionId,
      authUserId: "player-1",
      nickname: "Detective",
      joinedAt: 1,
    });
    await ctx.db.insert("publicRecords", {
      caseId,
      evidenceId: "record/address",
      type: "person",
      title: "Address record",
      content: "Lives on Keel Street.",
    });
    const cameraId = await ctx.db.insert("cctvCameras", {
      caseId,
      sourceId: "camera/station",
      name: "Station camera",
      description: "Main concourse",
      faulty: false,
      startTime: 100,
      endTime: 200,
    });
    await ctx.db.insert("cctvRecords", {
      caseId,
      evidenceId: "cctv/station/1",
      cameraId,
      startTime: 120,
      endTime: 125,
      npcIds: [],
      vehicleIds: [],
      description: "A person crossed the concourse.",
      kind: "pass",
    });
    const cityId = await ctx.db.insert("cities", { caseId, name: "Test City", seed: "test", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    await ctx.db.insert("places", {
      cityId,
      sourceId: "union-station",
      order: 0,
      name: "Union Station",
      type: "public_building",
      kind: "public",
      area: "midtown",
      description: "The city's central station.",
      mapX: 50,
      mapY: 50,
      crimeSceneAllowed: true,
      jobSlots: [],
    });
    return await ctx.db.insert("npcs", {
      caseId,
      sourceId: "mara",
      role: "suspect",
      name: "Mara Vale",
      occupation: "Conductor",
      publicDescription: "A railway conductor.",
    });
  });

  const player = t.withIdentity({ subject: "player-1" });
  const first = await player.mutation(api.clueBoard.createNoteNode, {
    roomCode: "ABC123", text: "Victim left at nine", x: 20, y: 30,
  });
  const second = await player.mutation(api.clueBoard.createNoteNode, {
    roomCode: "ABC123", text: "Train arrived at nine", x: 240, y: 30,
  });
  const record = await player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "public_record", referenceId: "record/address", x: 20, y: 220,
  });
  const cctv = await player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "cctv", referenceId: "cctv/station/1", x: 240, y: 220,
  });
  const person = await player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "npc", referenceId: npcId, x: 460, y: 220,
  });
  const place = await player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "place", referenceId: "union-station", x: 460, y: 400,
  });
  expect(await player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "cctv", referenceId: "cctv/station/1", x: 0, y: 0,
  })).toBe(cctv);
  expect(await player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "place", referenceId: "union-station", x: 0, y: 0,
  })).toBe(place);
  await expect(player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "public_record", referenceId: "record/other-case", x: 0, y: 0,
  })).rejects.toThrow("not part of this case");
  await expect(player.mutation(api.clueBoard.createReferenceNode, {
    roomCode: "ABC123", type: "place", referenceId: "other-case-place", x: 0, y: 0,
  })).rejects.toThrow("not part of this case");
  const edge = await player.mutation(api.clueBoard.createEdge, {
    roomCode: "ABC123", sourceNodeId: first, targetNodeId: second, color: "red",
  });

  await player.mutation(api.clueBoard.updateNode, { nodeId: first, x: 80, y: 90 });
  await player.mutation(api.clueBoard.createEdge, {
    roomCode: "ABC123", sourceNodeId: second, targetNodeId: first, color: "blue",
  });
  await player.mutation(api.clueBoard.updateEdge, { edgeId: edge, color: "gold", label: "same train" });

  expect(await player.query(api.clueBoard.getNodes, { roomCode: "ABC123" })).toEqual(expect.arrayContaining([
    expect.objectContaining({ _id: first, x: 80, y: 90 }),
    expect.objectContaining({ _id: record, type: "public_record", referenceId: "record/address", text: "Address record\nLives on Keel Street." }),
    expect.objectContaining({ _id: cctv, type: "cctv", referenceId: "cctv/station/1", text: "Station camera\nA person crossed the concourse." }),
    expect.objectContaining({ _id: person, type: "npc", referenceId: npcId, text: "Mara Vale\nsuspect · Conductor" }),
    expect.objectContaining({ _id: place, type: "place", referenceId: "union-station", text: "Union Station\nMidtown · Public place" }),
  ]));
  await expect(player.mutation(api.clueBoard.updateNode, { nodeId: record, text: "Changed" })).rejects.toThrow("cannot be edited");
  await expect(player.mutation(api.clueBoard.updateNode, { nodeId: place, text: "Changed" })).rejects.toThrow("cannot be edited");
  expect(await player.query(api.clueBoard.getEdges, { roomCode: "ABC123" })).toEqual([
    expect.objectContaining({ _id: edge, color: "gold", label: "same train" }),
  ]);

  await player.mutation(api.clueBoard.deleteNode, { nodeId: first });
  expect(await player.query(api.clueBoard.getEdges, { roomCode: "ABC123" })).toEqual([]);

  const stranger = t.withIdentity({ subject: "player-2" });
  await expect(stranger.query(api.clueBoard.getNodes, { roomCode: "ABC123" })).rejects.toThrow("Join the room first");
});

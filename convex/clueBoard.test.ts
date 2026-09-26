/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("room partners share notes, positions, and colored strings", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const sessionId = await ctx.db.insert("sessions", {
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
  });

  const player = t.withIdentity({ subject: "player-1" });
  const first = await player.mutation(api.clueBoard.createNoteNode, {
    roomCode: "ABC123", text: "Victim left at nine", x: 20, y: 30,
  });
  const second = await player.mutation(api.clueBoard.createNoteNode, {
    roomCode: "ABC123", text: "Train arrived at nine", x: 240, y: 30,
  });
  const edge = await player.mutation(api.clueBoard.createEdge, {
    roomCode: "ABC123", sourceNodeId: first, targetNodeId: second, color: "red",
  });

  await player.mutation(api.clueBoard.updateNode, { nodeId: first, x: 80, y: 90 });
  await player.mutation(api.clueBoard.createEdge, {
    roomCode: "ABC123", sourceNodeId: second, targetNodeId: first, color: "blue",
  });

  expect(await player.query(api.clueBoard.getNodes, { roomCode: "ABC123" })).toEqual(expect.arrayContaining([
    expect.objectContaining({ _id: first, x: 80, y: 90 }),
  ]));
  expect(await player.query(api.clueBoard.getEdges, { roomCode: "ABC123" })).toEqual([
    expect.objectContaining({ _id: edge, color: "blue" }),
  ]);

  await player.mutation(api.clueBoard.deleteNode, { nodeId: first });
  expect(await player.query(api.clueBoard.getEdges, { roomCode: "ABC123" })).toEqual([]);

  const stranger = t.withIdentity({ subject: "player-2" });
  await expect(stranger.query(api.clueBoard.getNodes, { roomCode: "ABC123" })).rejects.toThrow("Join the room first");
});

/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("an unknown person collects tagged sightings and hands them over when the team names them", async () => {
  const t = convexTest(schema, modules);
  const { npcId } = await t.run(async (ctx) => {
    const generationJobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1 });
    const caseId = await ctx.db.insert("cases", { generationJobId, difficulty: "easy", title: "Unknown", summary: "A case", initialFacts: [], publicationVersion: 1, createdAt: 1 });
    const sessionId = await ctx.db.insert("sessions", { caseId, roomCode: "UNKNWN", status: "playing", gameTime: 0, createdAt: 1, expiresAt: Date.now() + 1_000_000 });
    await ctx.db.insert("sessionPlayers", { sessionId, authUserId: "detective", nickname: "Detective", joinedAt: 1 });
    const cameraId = await ctx.db.insert("cctvCameras", { caseId, sourceId: "street", name: "Street", description: "Street", faulty: false, startTime: 0, endTime: 100 });
    await ctx.db.insert("cctvRecords", { caseId, cameraId, evidenceId: "street/1", startTime: 10, endTime: 10, npcIds: [], vehicleIds: [], description: "A man in a red jacket passes.", kind: "pass" });
    const npcId = await ctx.db.insert("npcs", { caseId, sourceId: "ray", role: "suspect", name: "Ray Holt", publicDescription: "Tall" });
    await ctx.db.insert("sessionKnownPeople", { sessionId, npcId, firstSeenIn: "Interview" });
    return { npcId };
  });
  const detective = t.withIdentity({ subject: "detective" });
  const roomCode = "UNKNWN";

  const id = await detective.mutation(api.unknownPeople.add, { roomCode, name: "Man in red jacket", note: "Near the pier" });
  await detective.mutation(api.cases.labelSighting, { roomCode, recordId: "street/1", npcId: null, unknownPersonId: id });
  expect(await detective.query(api.unknownPeople.list, { roomCode })).toEqual([{ id, name: "Man in red jacket", note: "Near the pier", spotted: ["Street · Day 1 00:10"] }]);

  await detective.mutation(api.unknownPeople.identify, { roomCode, id, npcId });
  expect(await detective.query(api.unknownPeople.list, { roomCode })).toEqual([]);
  const ray = (await detective.query(api.npcs.list, { roomCode }))?.find((person) => person.id === npcId);
  expect(ray?.spotted).toEqual(["Street · Day 1 00:10"]);
  expect(ray?.note).toBe("Man in red jacket: Near the pier");

  // Someone in another room cannot touch this team's unknown people.
  const other = await detective.mutation(api.unknownPeople.add, { roomCode, name: "Woman with umbrella", note: "" });
  await expect(t.withIdentity({ subject: "stranger" }).mutation(api.unknownPeople.remove, { roomCode, id: other })).rejects.toThrow();
});

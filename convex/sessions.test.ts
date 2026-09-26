/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("a lobby keeps the selected passed case", async () => {
  const t = convexTest(schema, modules);
  const generationJobId = await t.run(async (ctx) => {
    const jobId = await ctx.db.insert("generationJobs", {
      seed: 7,
      difficulty: "easy",
      createdBy: "tester",
      createdAt: 1,
      status: "passed",
      finishedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "brief",
      output: { title: "The Selected Case", summary: "A specific mystery.", initialFacts: ["One fact."] },
      checkErrors: [],
      source: "llm",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "evidence",
      output: {
        cameras: [{ id: "cam:station", name: "Union Station · concourse", faulty: false }],
        evidence: [{
          id: "cctv/1",
          type: "cctv",
          title: "Hidden title",
          summary: "Tall person in a dark coat: crosses the concourse.",
          access: { tool: "cctv", cameraId: "cam:station" },
          time: 120,
          end: 125,
          aboutIds: ["hidden-person-id"],
          sourceIds: ["hidden-event-id"],
          data: { placeId: "station", kind: "pass" },
        }],
      },
      checkErrors: [],
      source: "code",
      updatedAt: 2,
    });
    return jobId;
  });

  const user = t.withIdentity({ subject: "player-1" });
  const listed = await user.query(api.cases.listPassed, {});
  expect(listed).toMatchObject([{
    generationJobId,
    title: "The Selected Case",
    description: "A specific mystery.",
  }]);

  const created = await user.mutation(api.sessions.create, { nickname: "Detective", generationJobId });
  expect(await user.query(api.sessions.get, { roomCode: created.roomCode })).toMatchObject({
    caseTitle: "The Selected Case",
  });
  expect(await user.query(api.cases.getBrief, { roomCode: created.roomCode })).toEqual({
    title: "The Selected Case",
    summary: "A specific mystery.",
    initialFacts: ["One fact."],
  });
  expect(await user.query(api.cases.getCctv, { roomCode: created.roomCode })).toEqual({
    caseTitle: "The Selected Case",
    start: 120,
    end: 125,
    cameras: [{ id: "cam:station", name: "Union Station · concourse", faulty: false }],
    records: [{
      id: "cctv/1",
      cameraId: "cam:station",
      start: 120,
      end: 125,
      summary: "Tall person in a dark coat: crosses the concourse.",
      kind: "pass",
    }],
  });

  const stranger = t.withIdentity({ subject: "player-2" });
  expect(await stranger.query(api.sessions.get, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getBrief, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getCctv, { roomCode: created.roomCode })).toBeNull();
});

/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { ensureCaseCctv } from "./publishCctv";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("an empty camera remains available for the whole case window", async () => {
  const t = convexTest(schema, modules);
  const cameras = await t.run(async (ctx) => {
    const jobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1, status: "passed" });
    const caseId = await ctx.db.insert("cases", { generationJobId: jobId, difficulty: "easy", title: "Case", summary: "Case", initialFacts: [], createdAt: 1 });
    const cityId = await ctx.db.insert("cities", { caseId, name: "City", seed: "1", version: 1 });
    await ctx.db.patch(caseId, { cityId });
    await ctx.db.insert("generationDrafts", { jobId, stage: "timeline", output: { windowStart: 0, windowEnd: 20 }, checkErrors: [], source: "code", updatedAt: 1 });
    await ctx.db.insert("generationDrafts", {
      jobId, stage: "evidence", source: "code", checkErrors: [], updatedAt: 1,
      output: {
        cameras: [
          { id: "empty", name: "Quiet street", faulty: false },
          { id: "busy", name: "Station", faulty: false },
        ],
        evidence: [{ id: "cctv/one", type: "cctv", summary: "Someone passed.", access: { tool: "cctv", cameraId: "busy" }, time: 5, aboutIds: [], data: { kind: "pass" } }],
      },
    });
    await ensureCaseCctv(ctx, caseId, jobId);
    return await ctx.db.query("cctvCameras").withIndex("by_caseId", (q) => q.eq("caseId", caseId)).collect();
  });
  expect(cameras.map((camera) => ({ id: camera.sourceId, start: camera.startTime, end: camera.endTime }))).toEqual([
    { id: "empty", start: 0, end: 20 },
    { id: "busy", start: 0, end: 20 },
  ]);
});

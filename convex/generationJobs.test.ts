/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.useRealTimers());

test("publication failure persists separately and rolls back partial published data", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const jobId = await t.run(async (ctx) => {
    const jobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1, status: "running" });
    await ctx.db.insert("generationDrafts", { jobId, stage: "brief", output: { title: "Incomplete", summary: "Missing world", initialFacts: [] }, checkErrors: [], source: "code", updatedAt: 1 });
    return jobId;
  });
  await t.mutation(internal.generation.jobs.setStatus, { jobId, status: "passed" });
  expect((await t.run(async (ctx) => ctx.db.get(jobId)))?.status).toBe("passed");
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const failed = await t.run(async (ctx) => ctx.db.get(jobId));
  expect(failed).toMatchObject({ status: "failed", failedStage: "publish", error: expect.any(String), finishedAt: expect.any(Number) });
  expect(failed?.error).not.toBe("");
  expect(await t.run(async (ctx) => ctx.db.query("cases").collect())).toEqual([]);
});

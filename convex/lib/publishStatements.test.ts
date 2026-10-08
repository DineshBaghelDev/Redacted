/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("published witness statements are frozen before replay and can be backfilled once", async () => {
  const t = convexTest(schema, modules);
  const { caseId, draftId } = await t.run(async ctx => {
    const jobId = await ctx.db.insert("generationJobs", { seed: 1, difficulty: "easy", createdBy: "tester", createdAt: 1, status: "passed" });
    const caseId = await ctx.db.insert("cases", { generationJobId: jobId, difficulty: "easy", title: "Case", summary: "A case", initialFacts: [], estimatedOptimalMinutes: 120, publicationVersion: 1, createdAt: 1 });
    await ctx.db.insert("npcs", { caseId, sourceId: "maya", role: "witness", name: "Maya", publicDescription: "A witness" });
    await ctx.db.insert("generationDrafts", { jobId, stage: "evidence", output: { evidence: [{ id: "witness/maya/cafe", type: "witness", title: "Maya at the cafe", summary: "Maya saw someone leave.", access: { tool: "interrogation", witnessId: "maya" }, data: { witnessId: "maya", eventId: "cafe" } }] }, checkErrors: [], source: "code", updatedAt: 1 });
    const draftId = await ctx.db.insert("generationDrafts", { jobId, stage: "text", output: { texts: [{ id: "witness/maya/cafe", text: "I saw someone leave the cafe." }] }, checkErrors: [], source: "llm", updatedAt: 1 });
    return { caseId, draftId };
  });
  const player = t.withIdentity({ subject: "detective" });
  expect(await t.mutation(internal.cases.backfillPublishedStatements, { caseId })).toBeNull();
  expect(await t.run(ctx => ctx.db.query("witnessStatements").withIndex("by_caseId_and_evidenceId", q => q.eq("caseId", caseId)).take(10))).toEqual([
    expect.objectContaining({ evidenceId: "witness/maya/cafe", eventId: "cafe", text: "I saw someone leave the cafe." }),
  ]);
  await t.run(ctx => ctx.db.patch(draftId, { output: { texts: [{ id: "witness/maya/cafe", text: "Changed draft." }] } }));
  expect(await t.mutation(internal.cases.backfillPublishedStatements, { caseId })).toBeNull();
  await player.mutation(api.sessions.createReplay, { nickname: "Detective", caseId });
  const statements = await t.run(ctx => ctx.db.query("witnessStatements").withIndex("by_caseId_and_evidenceId", q => q.eq("caseId", caseId)).take(10));
  expect(statements).toHaveLength(1);
  expect(statements[0].text).toBe("I saw someone leave the cafe.");
});

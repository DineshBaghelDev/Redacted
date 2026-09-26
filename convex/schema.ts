import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Where a "Run all" generation job is. */
export const jobStatus = v.union(v.literal("queued"), v.literal("running"), v.literal("passed"), v.literal("failed"), v.literal("stopped"));

export default defineSchema({
  cases: defineTable({
    generationJobId: v.id("generationJobs"),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    title: v.string(),
    summary: v.string(),
    initialFacts: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_generationJobId", ["generationJobId"]),
  sessions: defineTable({
    caseId: v.optional(v.id("cases")),
    roomCode: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_roomCode", ["roomCode"])
    .index("by_expiresAt", ["expiresAt"]),
  sessionPlayers: defineTable({
    sessionId: v.id("sessions"),
    authUserId: v.string(),
    nickname: v.string(),
    isReady: v.optional(v.boolean()),
    joinedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_authUserId", ["sessionId", "authUserId"])
    .index("by_authUserId", ["authUserId"]),
  clueBoardNodes: defineTable({
    sessionId: v.id("sessions"),
    type: v.literal("note"),
    text: v.string(),
    x: v.number(),
    y: v.number(),
    createdByPlayerId: v.id("sessionPlayers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sessionId", ["sessionId"]),
  clueBoardEdges: defineTable({
    sessionId: v.id("sessions"),
    sourceNodeId: v.id("clueBoardNodes"),
    targetNodeId: v.id("clueBoardNodes"),
    color: v.union(v.literal("red"), v.literal("gold"), v.literal("blue"), v.literal("green")),
    createdByPlayerId: v.id("sessionPlayers"),
    createdAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sourceNodeId", ["sourceNodeId"])
    .index("by_targetNodeId", ["targetNodeId"]),

  // Case generation (dev tester + pipeline). Drafts hold hidden case data: never expose outside dev tools.
  generationJobs: defineTable({
    seed: v.number(),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    createdBy: v.string(),
    createdAt: v.number(),
    /** Set while an AI stage runs in the background: which stage and which try (0 = first, then repairs). */
    running: v.optional(v.object({ stage: v.string(), attempt: v.number() })),
    /** "Run all" only; single-stage tester runs leave these empty. */
    status: v.optional(jobStatus),
    failedStage: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    workflowId: v.optional(v.string()),
    /** Test runs: the jobs started together share this label. */
    batch: v.optional(v.string()),
  })
    .index("by_batch", ["batch"])
    .index("by_status", ["status"]),
  generationDrafts: defineTable({
    jobId: v.id("generationJobs"),
    stage: v.string(),
    output: v.any(),
    checkErrors: v.array(v.string()),
    source: v.union(v.literal("hand-written"), v.literal("code"), v.literal("llm")),
    updatedAt: v.number(),
  })
    .index("by_job_stage", ["jobId", "stage"])
    .index("by_stage", ["stage"]),
  // Every AI call made while generating, kept for debugging and cost tracking.
  generationLogs: defineTable({
    jobId: v.id("generationJobs"),
    stage: v.string(),
    model: v.string(),
    mode: v.union(v.literal("strict"), v.literal("json")),
    system: v.string(),
    prompt: v.string(),
    rawText: v.string(),
    problems: v.array(v.string()),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    ms: v.number(),
    /** 0 = first try, then 1, 2 for repairs. */
    attempt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_job", ["jobId"]),
});

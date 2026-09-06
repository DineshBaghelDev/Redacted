import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
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
    .index("by_authUserId", ["authUserId"]),
});

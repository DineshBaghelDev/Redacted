import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Undo only the pending work owned by this action, before removing the action. */
export async function cancelRoomAction(ctx: MutationCtx, action: Doc<"roomActions">) {
  if (action.npcTurnId) {
    const turn = await ctx.db.get(action.npcTurnId);
    if (turn?.status === "waiting") {
      await ctx.db.patch(turn._id, { status: "failed", canceled: true, error: "Interview canceled because the detective left." });
      if (turn.requestedStatements) {
        const conversation = await ctx.db.get(turn.conversationId);
        if (conversation?.statementStatus === "requested") await ctx.db.patch(conversation._id, { statementStatus: undefined });
      }
      await ctx.scheduler.runAfter(0, internal.npcConversations.processNext, { conversationId: turn.conversationId });
    }
  }
  if (action.cctvReviewId) await ctx.db.delete(action.cctvReviewId);
  if (action.recordSearchId) {
    const search = await ctx.db.get(action.recordSearchId);
    if (!search) return;
    await ctx.db.delete(search._id);
    for (const recordId of search.recordIds ?? []) {
      const access = await ctx.db.query("sessionPublicRecords").withIndex("by_sessionId_and_recordId", (q) => q.eq("sessionId", action.sessionId).eq("recordId", recordId)).unique();
      if (access?.sourceSearchId !== search._id) continue;
      // A partner's overlapping search may have relied on this earlier access row.
      let replacement: Doc<"publicRecordSearches"> | undefined;
      for await (const other of ctx.db.query("publicRecordSearches").withIndex("by_sessionId", (q) => q.eq("sessionId", action.sessionId))) {
        if (other.recordIds?.includes(recordId) && (!replacement || other.completeGameTime < replacement.completeGameTime)) replacement = other;
      }
      if (replacement && (access.previousCompleteGameTime === undefined || replacement.completeGameTime < access.previousCompleteGameTime)) {
        await ctx.db.patch(access._id, { completeGameTime: replacement.completeGameTime, sourceSearchId: replacement._id });
      } else if (access.previousCompleteGameTime !== undefined) {
        await ctx.db.patch(access._id, { completeGameTime: access.previousCompleteGameTime, sourceSearchId: undefined, previousCompleteGameTime: undefined });
      } else {
        await ctx.db.delete(access._id);
      }
    }
  }
}

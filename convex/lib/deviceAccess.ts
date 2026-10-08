import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Records are visible only after the found or handed-over device has been read. */
export async function hasReadDevice(ctx: QueryCtx | MutationCtx, sessionId: Id<"sessions">, device: Doc<"devices">) {
  if (device.sourceItemId) {
    const item = await ctx.db.query("sessionItems")
      .withIndex("by_sessionId_and_itemId", q => q.eq("sessionId", sessionId).eq("itemId", device.sourceItemId!))
      .unique();
    return item?.readAt !== undefined;
  }
  const access = await ctx.db.query("sessionDevices")
    .withIndex("by_sessionId_and_deviceId", q => q.eq("sessionId", sessionId).eq("deviceId", device._id))
    .unique();
  return access?.readAt !== undefined;
}

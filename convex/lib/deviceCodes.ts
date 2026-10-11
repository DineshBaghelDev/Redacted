import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const PREFIX = "code/";
export const CRACK_MINUTES = 60;

/** A found phone or laptop's 4-digit lock code, derived from its ID so every replay of the case agrees. */
export function deviceCode(deviceId: string) {
  let seed = 2166136261;
  for (const character of deviceId) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return String((seed >>> 0) % 10000).padStart(4, "0");
}

/**
 * Hides one sticky note with each found device's code in the same building, preferring a different
 * room than the device. Plain seeded code; the note never says what the digits unlock.
 */
export async function ensureDeviceNotes(ctx: MutationCtx, caseId: Id<"cases">) {
  for await (const device of ctx.db.query("devices").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) {
    if (!device.sourceItemId) continue;
    const evidenceId = `${PREFIX}${device.sourceId}`;
    if (await ctx.db.query("caseItems").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).eq("evidenceId", evidenceId)).first()) continue;
    const item = await ctx.db.get(device.sourceItemId);
    const room = item ? await ctx.db.get(item.roomId) : null;
    if (!item || !room) continue;
    const rooms = (await ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", room.buildingId)).take(200))
      .filter((candidate) => candidate.searchable && candidate.itemSlots.length);
    const others = rooms.filter((candidate) => candidate._id !== room._id);
    const pool = others.length ? others : rooms;
    if (!pool.length) continue;
    const pick = Number(deviceCode(`${device._id}:room`));
    const target = pool[pick % pool.length];
    await ctx.db.insert("caseItems", {
      caseId,
      evidenceId,
      name: "Sticky note",
      description: `A yellow sticky note with four digits pressed hard into it: ${deviceCode(device._id)}.`,
      placeId: item.placeId,
      roomId: target._id,
      slot: target.itemSlots[pick % target.itemSlots.length],
      discoverableBySearch: true,
      collectible: true,
      hidden: true,
      itemType: "document",
    });
  }
}

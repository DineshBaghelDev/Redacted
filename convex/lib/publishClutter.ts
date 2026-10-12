import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { RoomKind } from "../generation/core/buildings";
import { fitSlot, POOL } from "../generation/core/evidence/clutter";

const PREFIX = "scatter/";

/** Small deterministic random generator seeded from text, so a case always gets the same scatter. */
function seeded(text: string) {
  let seed = 2166136261;
  for (const character of text) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909) >>> 0;
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Scatters everyday objects through every searchable room in the city, once per case. Plain seeded
 * code, no generation: it only makes sure that finding something never means the room matters.
 */
export async function ensureCaseClutter(ctx: MutationCtx, caseId: Id<"cases">) {
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId) return;
  const done = await ctx.db.query("caseItems")
    .withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).gte("evidenceId", PREFIX).lt("evidenceId", `${PREFIX}￿`))
    .first();
  if (done) {
    await refreshClutterText(ctx, caseId);
    return;
  }
  const random = seeded(caseId);
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
    if (!place.buildingId) continue;
    // Each everyday object appears at most once per building, so searching feels like new rooms, not copies.
    const usedHere = new Set<string>();
    for await (const room of ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!))) {
      const pool = POOL[room.type as RoomKind];
      if (!room.searchable || !room.itemSlots.length || !pool?.length) continue;
      // Many rooms hold nothing worth noting; most of the rest one object.
      const count = random() < 0.4 ? 0 : random() < 0.85 ? 1 : 2;
      // Never the same everyday object twice in one room (the case's own clutter may already be there).
      const present = new Set((await ctx.db.query("caseItems").withIndex("by_roomId", (q) => q.eq("roomId", room._id)).take(50)).map((item) => item.name));
      const picks = [...pool].filter(([name]) => !present.has(name) && !usedHere.has(name)).sort(() => random() - 0.5).slice(0, count);
      for (const [name, description] of picks) {
        usedHere.add(name);
        await ctx.db.insert("caseItems", {
          caseId,
          evidenceId: `${PREFIX}${room.sourceId}/${name.toLowerCase().replace(/\s+/g, "-")}`,
          name,
          description,
          placeId: place._id,
          roomId: room._id,
          slot: fitSlot(name, room.itemSlots, (from) => from[Math.floor(random() * from.length)]),
          discoverableBySearch: true,
          collectible: true,
          hidden: true,
          itemType: "other",
        });
      }
    }
  }
}

/** Keeps everyday objects' wording current, so their descriptions read as fully as the case's own evidence. */
async function refreshClutterText(ctx: MutationCtx, caseId: Id<"cases">) {
  const text = new Map(Object.values(POOL).flatMap((pool) => pool ?? []));
  for (const prefix of [PREFIX, "clutter/"]) {
    for await (const item of ctx.db.query("caseItems").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).gte("evidenceId", prefix).lt("evidenceId", `${prefix}￿`))) {
      const description = text.get(item.name);
      if (description && description !== item.description) await ctx.db.patch(item._id, { description });
    }
  }
}

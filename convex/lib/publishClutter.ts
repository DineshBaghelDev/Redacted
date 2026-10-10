import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { RoomKind } from "../generation/core/buildings";
import { POOL } from "../generation/core/evidence/clutter";

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
  if (done) return;
  const random = seeded(caseId);
  for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
    if (!place.buildingId) continue;
    for await (const room of ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!))) {
      const pool = POOL[room.type as RoomKind];
      if (!room.searchable || !room.itemSlots.length || !pool?.length) continue;
      // Most rooms get one object, some two, some none.
      const count = random() < 0.25 ? 0 : random() < 0.7 ? 1 : 2;
      const picks = [...pool].sort(() => random() - 0.5).slice(0, count);
      for (const [name, description] of picks) {
        await ctx.db.insert("caseItems", {
          caseId,
          evidenceId: `${PREFIX}${room.sourceId}/${name.toLowerCase().replace(/\s+/g, "-")}`,
          name,
          description,
          placeId: place._id,
          roomId: room._id,
          slot: room.itemSlots[Math.floor(random() * room.itemSlots.length)],
          discoverableBySearch: true,
          collectible: true,
          hidden: true,
          itemType: "other",
        });
      }
    }
  }
}

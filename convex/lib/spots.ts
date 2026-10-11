import type { Doc } from "../_generated/dataModel";

const leadingWords = new Set(["on", "in", "inside", "under", "underneath", "behind", "beside", "near", "at", "by", "the", "a", "an"]);

/** Template slots and generated item slots name the same spot differently ("On the body" / "The body"). */
export function spotKey(name: string) {
  const words = name.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  while (words.length > 1 && leadingWords.has(words[0])) words.shift();
  return words.join(" ");
}

/** Searchable spots in a room: its template slots plus any generated item slot that names a new spot. */
export function roomSpots(room: Pick<Doc<"rooms">, "itemSlots">, items: Pick<Doc<"caseItems">, "slot" | "discoverableBySearch">[]) {
  const spots = new Map<string, string>();
  for (const slot of room.itemSlots) if (!spots.has(spotKey(slot))) spots.set(spotKey(slot), slot);
  for (const item of items) if (item.discoverableBySearch && !spots.has(spotKey(item.slot))) spots.set(spotKey(item.slot), item.slot);
  return [...spots].map(([key, name]) => ({ key, name }));
}

export const SPOT_SEARCH_MINUTES = 4;

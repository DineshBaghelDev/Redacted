import type { RoomKind } from "../buildings";
import type { City } from "../city";
import type { Rng } from "../rng";
import type { Evidence } from "./types";

// Everyday objects that make searches feel real. They prove nothing.
const POOL: Partial<Record<RoomKind, [string, string][]>> = {
  living: [
    ["TV remote", "A remote with a sticky volume button."],
    ["Stack of magazines", "Old home and garden magazines."],
    ["Board game", "A dusty box of Scrabble with missing tiles."],
  ],
  kitchen: [
    ["Electricity bill", "An unpaid electricity bill, due next week."],
    ["Takeaway menu", "A menu from a noodle place, a few dishes circled."],
    ["Coffee jar", "A half-empty jar of instant coffee."],
  ],
  bedroom: [
    ["Paperback novel", "A crime paperback with a bus ticket as a bookmark."],
    ["Photo album", "An old album of family holidays."],
    ["Phone charger", "A spare phone charger with a frayed cable."],
  ],
  bathroom: [
    ["Allergy tablets", "A half-used pack of allergy tablets."],
    ["Razor", "A disposable razor."],
  ],
  garage: [
    ["Toolbox", "A rusty toolbox full of mismatched spanners."],
    ["Car wax", "A tin of car wax, nearly empty."],
  ],
  yard: [
    ["Garden gloves", "Muddy gardening gloves."],
    ["Plant pots", "A stack of cracked plant pots."],
  ],
  unit: [
    ["Pizza box", "An empty pizza box from last week."],
    ["Gym bag", "A gym bag with a damp towel inside."],
    ["Rent reminder", "A polite letter from the landlord about late rent."],
    ["Houseplant", "A wilting houseplant."],
  ],
  office: [
    ["Memo", "A coffee-stained memo about the new printer rules."],
    ["Desk calendar", "A printed calendar with meetings scribbled in."],
    ["Sticky notes", "A pad of sticky notes, the top one blank."],
  ],
  storage: [
    ["Box of receipts", "A shoebox of old receipts."],
    ["Cleaning supplies", "Bleach, sponges and a mop bucket."],
    ["Spare bulbs", "A box of spare light bulbs."],
  ],
  shopfloor: [
    ["Umbrella", "A black umbrella from the lost-and-found."],
    ["Crumpled receipt", "A crumpled receipt for two coffees."],
  ],
  outdoor: [
    ["Soda can", "An empty soda can."],
    ["Torn flyer", "A rain-soaked flyer for a jazz night."],
    ["Cigarette butts", "A few cigarette butts, days old."],
  ],
  special: [
    ["Clipboard", "A clipboard with a blank form."],
    ["Box of gloves", "A box of disposable gloves."],
  ],
};

const PER_PLACE = { easy: 2, normal: 3, hard: 5 } as const;

/**
 * Scatters everyday objects in rooms of the places that matter to the case, so searches don't only
 * turn up clues. More clutter at higher difficulty.
 *
 * @param placeRooms - For each relevant place, the rooms that may hold clutter.
 */
export function buildClutter(
  city: City,
  placeRooms: Map<string, string[]>,
  difficulty: keyof typeof PER_PLACE,
  rng: Rng,
): Evidence[] {
  const out: Evidence[] = [];
  for (const [placeId, roomIds] of placeRooms) {
    const place = city.places.find((p) => p.id === placeId);
    if (!place) continue;
    const options = place.building.rooms
      .filter((r) => roomIds.includes(r.id) && r.itemSlots.length && POOL[r.kind])
      .flatMap((r) => POOL[r.kind]!.map(([name, description]) => ({ room: r, name, description })));
    for (const pick of rng.shuffle(options).slice(0, PER_PLACE[difficulty])) {
      out.push({
        id: `clutter/${pick.room.id}/${pick.name.toLowerCase().replace(/\s+/g, "-")}`,
        type: "item",
        title: pick.name,
        summary: pick.description,
        access: { tool: "search", roomId: pick.room.id, slot: rng.pick(pick.room.itemSlots) },
        aboutIds: [],
        sourceIds: [],
        data: { itemId: "", proves: [], clutter: true },
      });
    }
  }
  return out;
}

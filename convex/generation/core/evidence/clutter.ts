import type { RoomKind } from "../buildings";
import type { City } from "../city";
import type { Rng } from "../rng";
import type { Evidence } from "./types";

// Everyday objects that make searches feel real. They prove nothing.
export const POOL: Partial<Record<RoomKind, [string, string][]>> = {
  living: [
    ["TV remote", "A remote with a sticky volume button, its battery cover held on with a strip of tape."],
    ["Stack of magazines", "Old home and garden magazines, a few pages folded down at kitchen makeovers nobody started."],
    ["Board game", "A dusty box of Scrabble with missing tiles and a score sheet from a game abandoned halfway."],
    ["Knitted blanket", "A knitted blanket thrown over the arm of the sofa, a loose thread pulled long at one corner."],
  ],
  kitchen: [
    ["Electricity bill", "An electricity bill, due next week, with the total underlined twice in pencil."],
    ["Takeaway menu", "A menu from a noodle place on the high street, a few dishes circled and one crossed out."],
    ["Coffee jar", "A half-empty jar of instant coffee, the lid not quite screwed on and the spoon still inside."],
    ["Shopping list", "A shopping list on the back of an envelope: milk, bin bags, batteries, something for Sunday."],
  ],
  bedroom: [
    ["Paperback novel", "A crime paperback with a bus ticket as a bookmark, about two thirds of the way through."],
    ["Photo album", "An old album of family holidays, a few photos missing and the gaps left as they were."],
    ["Phone charger", "A spare phone charger with a frayed cable, wrapped in tape where it meets the plug."],
    ["Odd socks", "A small pile of odd socks waiting for partners that have clearly gone for good."],
  ],
  bathroom: [
    ["Allergy tablets", "A half-used pack of allergy tablets, the expiry date a few months off."],
    ["Razor", "A disposable razor left on the edge of the sink, rinsed but not dried."],
    ["Hand towel", "A damp hand towel folded over the radiator, faded from too many washes."],
  ],
  garage: [
    ["Toolbox", "A rusty toolbox full of mismatched spanners and a tape measure that no longer retracts."],
    ["Car wax", "A tin of car wax, nearly empty, with a stiff cloth pushed in under the lid."],
    ["Bike pump", "A bike pump with a cracked hose, propped against the wall beside a deflated football."],
  ],
  yard: [
    ["Garden gloves", "Muddy gardening gloves, one finger worn through, left drying on an upturned pot."],
    ["Plant pots", "A stack of cracked plant pots with old compost still caked inside the bottom one."],
    ["Watering can", "A green plastic watering can with a split rose, half full of rainwater."],
  ],
  unit: [
    ["Pizza box", "An empty pizza box from last week, the receipt still taped to the lid."],
    ["Gym bag", "A gym bag with a damp towel inside and a membership card clipped to the strap."],
    ["Rent reminder", "A polite letter from the landlord about late rent, opened and refolded along its creases."],
    ["Houseplant", "A wilting houseplant on the windowsill, its saucer dry and its lower leaves gone yellow."],
    ["Takeaway cups", "Two takeaway coffee cups from the station kiosk, both drained, lids pushed back on."],
  ],
  office: [
    ["Memo", "A coffee-stained memo about the new printer rules, signed by facilities and pinned up twice."],
    ["Desk calendar", "A printed desk calendar with routine meetings and a colleague's birthday scribbled in."],
    ["Sticky notes", "A pad of sticky notes, the top one blank, the next few pressed with faint handwriting."],
    ["Lanyard", "A spare visitor lanyard with a blank pass, tangled around a stapler."],
  ],
  storage: [
    ["Box of receipts", "A shoebox of old receipts held together with elastic bands, sorted loosely by month."],
    ["Cleaning supplies", "Bleach, sponges and a mop bucket with a crust of dried grey water around the rim."],
    ["Spare bulbs", "A box of spare light bulbs, two of them blown and put back in the box anyway."],
    ["Archive boxes", "Cardboard archive boxes labelled by year, the oldest ones softened and sagging at the corners."],
  ],
  shopfloor: [
    ["Umbrella", "A black umbrella from the lost-and-found, one spoke bent, a paper tag tied to the handle."],
    ["Crumpled receipt", "A crumpled receipt for two coffees and a pastry, paid in cash just after opening."],
    ["Price gun", "A price gun loaded with orange labels, a few misprinted stickers stuck along its side."],
  ],
  outdoor: [
    ["Soda can", "An empty soda can, crushed flat and kicked under the edge of a bench."],
    ["Torn flyer", "A rain-soaked flyer for a jazz night, the date half washed away."],
    ["Cigarette butts", "A few cigarette butts, days old, ground into the gap between the paving stones."],
    ["Lost glove", "A child's lost glove, bright yellow, pushed onto a railing so its owner might spot it."],
  ],
  special: [
    ["Clipboard", "A clipboard with a blank form and a biro tied to it with string."],
    ["Box of gloves", "A box of disposable gloves, the top few pulled half out and left hanging."],
    ["Visitor log", "A visitor log for routine deliveries, the last page filled with the same few couriers' scrawls."],
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

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { spotKey } from "./spots";

const PREFIX = "code/";
export const CRACK_MINUTES = 60;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Lock = Pick<Doc<"devices">, "_id" | "ownerNpcId">;

function hash(text: string) {
  let seed = 2166136261;
  for (const character of text) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

/** Which kind of clue hides the code. A birthday needs a known owner, so ownerless devices get a reversed note. */
function lockKind(device: Lock) {
  const kind = (["note", "reversed", "birthday", "keepsake"] as const)[hash(`${device._id}:kind`) % 4];
  return kind === "birthday" && !device.ownerNpcId ? "reversed" : kind;
}

/** A date as day and month, both 1-based; used by the birthday and keepsake clues. */
function lockDate(device: Lock) {
  const value = hash(`${device._id}:date`);
  return { day: 1 + (value % 28), month: 1 + ((value >>> 8) % 12) };
}

const pad = (value: number) => String(value).padStart(2, "0");
const ordinal = (day: number) => `${day}${day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th"}`;

/** A found phone or laptop's 4-digit lock code, derived from its ID so every replay of the case agrees. */
export function deviceCode(device: Lock) {
  const kind = lockKind(device);
  if (kind === "birthday" || kind === "keepsake") {
    const { day, month } = lockDate(device);
    return `${pad(day)}${pad(month)}`;
  }
  return String(hash(device._id) % 10000).padStart(4, "0");
}

/** The object that gives the code away. It never says what it unlocks; the player has to make the link. */
function clue(device: Lock, owner: Doc<"npcs"> | null) {
  const kind = lockKind(device);
  const code = deviceCode(device);
  const { day, month } = lockDate(device);
  if (kind === "birthday") {
    const first = owner?.name.split(" ")[0] ?? "you";
    return { name: "Birthday card", description: `A birthday card, kept rather than thrown away. Inside: "Happy birthday, ${first}! The ${ordinal(day)} of ${MONTHS[month - 1]} again already. Love from all of us."` };
  }
  if (kind === "keepsake") return { name: "Engraved keyring", description: `A worn brass keyring tag. The engraving on the back reads: "Always · ${pad(day)}.${pad(month)}".` };
  if (kind === "reversed") return { name: "Torn scrap of paper", description: `A torn scrap of paper with "${[...code].reverse().join("")}" scrawled on it, and a small arrow drawn under the digits, pointing from right to left.` };
  return { name: "Sticky note", description: `A yellow sticky note stuck out of sight. Four digits pressed hard into it and nothing else: ${code}.` };
}

/**
 * Hides each found device's code clue in the same room as the device, in a different spot when the room
 * has one. Plain seeded code, no generation call. Rewrites older notes so existing cases pick up the change.
 */
export async function ensureDeviceNotes(ctx: MutationCtx, caseId: Id<"cases">) {
  for await (const device of ctx.db.query("devices").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) {
    if (!device.sourceItemId) continue;
    const item = await ctx.db.get(device.sourceItemId);
    const room = item ? await ctx.db.get(item.roomId) : null;
    if (!item || !room) continue;
    const otherSlots = room.itemSlots.filter((slot) => spotKey(slot) !== spotKey(item.slot));
    const slots = otherSlots.length ? otherSlots : [item.slot];
    const owner = device.ownerNpcId ? await ctx.db.get(device.ownerNpcId) : null;
    const note = { ...clue(device, owner), roomId: room._id, placeId: item.placeId, slot: slots[hash(`${device._id}:slot`) % slots.length] };
    const evidenceId = `${PREFIX}${device.sourceId}`;
    const existing = await ctx.db.query("caseItems").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).eq("evidenceId", evidenceId)).first();
    if (existing) {
      if (existing.description !== note.description || existing.roomId !== note.roomId) await ctx.db.patch(existing._id, note);
      continue;
    }
    await ctx.db.insert("caseItems", { caseId, evidenceId, ...note, discoverableBySearch: true, collectible: true, hidden: true, itemType: "document" });
  }
}

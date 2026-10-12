import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Bump when the filler below changes, so cases opened earlier get the new set on their next replay. */
const FILLER_VERSION = 4;
const PREFIX = "filler/";

/** Small deterministic random generator seeded from text, so a case always gets the same filler. */
function seeded(text: string) {
  let seed = 2166136261;
  for (const character of text) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909) >>> 0;
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

const pick = <T,>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];

// Ordinary phone life. Labels are never case names or family, so filler never adds anyone to People
// and never invents a relative the story did not write.
const MESSAGES: [string, "incoming" | "outgoing", string][] = [
  ["Riverside Dental", "incoming", "Reminder: your check-up is booked for next month. Reply C to cancel."],
  ["Pizza Palace", "incoming", "Your order is on its way! Estimated arrival 25 minutes."],
  ["Bank alert", "incoming", "Your statement is ready to view. We will never ask for your PIN by text."],
  ["Gym", "incoming", "We miss you! Come back this month and your next class is free."],
  ["Landlord", "incoming", "Plumber is coming Tuesday morning about the boiler. Please leave the key with the neighbour."],
  ["Parcel service", "incoming", "We tried to deliver your parcel today. Rebook your delivery online."],
  ["Unknown number", "incoming", "Hi, is this still the number for the bike you were selling?"],
  ["Work rota", "incoming", "Shift swaps for next week need to be in by Friday please."],
];
const CALLERS: [string, "incoming" | "outgoing"][] = [["Unknown number", "incoming"], ["Riverside Dental", "outgoing"], ["Taxi", "outgoing"], ["Landlord", "incoming"], ["Pizza Palace", "outgoing"]];
// Family filler written before version 3, swapped in place so notes and pins on those entries survive.
const FAMILY = new Set(["Mum", "Sis"]);
const isFiller = (row: { evidenceId: string }) => row.evidenceId.startsWith(PREFIX);

/** The victim cannot text or call after dying: filler they send stays at or before their last real send. */
async function lastRealSend(ctx: MutationCtx, device: Doc<"devices">, start: number) {
  const owner = device.ownerNpcId ? await ctx.db.get(device.ownerNpcId) : null;
  if (owner?.role !== "victim") return undefined;
  let last = start;
  for (const table of ["messages", "callLogs"] as const) {
    for (const row of await ctx.db.query(table).withIndex("by_deviceId_and_timestamp", (q) => q.eq("deviceId", device._id)).order("desc").take(200)) {
      if (row.direction === "outgoing" && !isFiller(row)) { last = Math.max(last, row.timestamp); break; }
    }
  }
  return last;
}

const FILES: [string, string][] = [
  ["Packing list", "Passport, chargers, sun cream, the good walking shoes, book for the train."],
  ["Lentil soup", "1 onion, 2 carrots, 200g red lentils, stock, cumin. Simmer 25 minutes, blend half."],
  ["Car insurance renewal", "Renewal quote attached. Same cover as last year, premium up by 8%. Decide by end of month."],
  ["Notes from the course", "Week 3: keep sentences short, read it out loud, cut the first paragraph."],
];

// Passers-by in the same "appearance: movement" shape as the case's own sightings, so the tape reads like a real street.
const HEIGHTS = ["5'2\"", "5'4\"", "5'5\"", "5'7\"", "5'8\"", "5'10\"", "5'11\"", "6'1\"", "6'2\""];
const BUILDS = ["slim", "average build", "heavyset", "wiry", "broad-shouldered"];
const PEOPLE = ["man", "woman"];
const CLOTHES = [
  "beige raincoat, shopping bags", "dark puffer jacket, headphones", "hi-vis cycling vest, helmet", "navy suit, umbrella",
  "denim jacket, backpack", "green parka, hood up", "tracksuit, gym bag", "long black coat, briefcase",
  "checked shirt, toolbelt", "red scarf, pushchair", "school uniform, rucksack", "delivery uniform, insulated box",
];

/**
 * Passers-by must never pass for someone in the case: no height or clothing word any cast member's public
 * description uses. They are crowd, not characters, and never touch a lie, the score, or People.
 */
export function crowdFor(descriptions: string[]) {
  const cast = descriptions.join(" ").toLowerCase();
  const castWords = new Set(cast.match(/[a-z]{4,}/g) ?? []);
  return {
    heights: HEIGHTS.filter((height) => !cast.includes(height.toLowerCase())),
    clothes: CLOTHES.filter((outfit) => !(outfit.toLowerCase().match(/[a-z]{4,}/g) ?? []).some((word) => castWords.has(word))),
  };
}

/**
 * The case's regulars: a handful of passers-by, each with one fixed look, so the same outfit on two
 * tapes is always the same stranger and never changes height or gender between cameras.
 */
export function crowdRoster(random: () => number, crowd: ReturnType<typeof crowdFor>) {
  return [...crowd.clothes].sort(() => random() - 0.5).slice(0, 8)
    .map((outfit) => `${pick(random, crowd.heights)} ${pick(random, PEOPLE)}, ${pick(random, BUILDS)}, ${outfit}`);
}

/**
 * Ordinary noise for phones, laptops, and cameras, once per case. Plain seeded code, no generation:
 * a device or tape that holds only the case's own evidence would point straight at it.
 */
export async function ensureCaseFiller(ctx: MutationCtx, caseId: Id<"cases">) {
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase || (playableCase.fillerVersion ?? 0) >= FILLER_VERSION) return;
  const firstTime = (playableCase.fillerVersion ?? 0) < 1;
  // Nothing ordinary arrives after the body is found: the case opens then.
  const end = playableCase.discoveryMinute || 2 * 1440;
  const start = Math.max(0, end - 2 * 1440);
  const between = (random: () => number, from: number, to: number) => from + Math.floor(random() * Math.max(1, to - from));

  // Device filler is written once (version 1); version 3 repairs it in place.
  for await (const device of ctx.db.query("devices").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) {
    const random = seeded(`${device._id}:filler`);
    if (device.type === "laptop") {
      if (firstTime) for (const [title, body] of [...FILES].sort(() => random() - 0.5).slice(0, 2)) {
        await ctx.db.insert("deviceFiles", { caseId, deviceId: device._id, evidenceId: `${PREFIX}${device.sourceId}/${title.toLowerCase().replace(/\s+/g, "-")}`, title, body });
      }
      continue;
    }
    const lastSend = await lastRealSend(ctx, device, start);
    const timeFor = (direction: "incoming" | "outgoing") => direction === "outgoing" && lastSend !== undefined ? between(random, start, lastSend) : between(random, start, end);
    if (firstTime) {
      const messages = [...MESSAGES].sort(() => random() - 0.5).slice(0, 3 + Math.floor(random() * 3));
      for (const [index, [label, direction, body]] of messages.entries()) {
        await ctx.db.insert("messages", { caseId, deviceId: device._id, evidenceId: `${PREFIX}${device.sourceId}/message-${index}`, otherPartyLabel: label, direction, body, timestamp: timeFor(direction) });
      }
      const calls = [...CALLERS].sort(() => random() - 0.5).slice(0, 2 + Math.floor(random() * 3));
      for (const [index, [label, direction]] of calls.entries()) {
        await ctx.db.insert("callLogs", { caseId, deviceId: device._id, evidenceId: `${PREFIX}${device.sourceId}/call-${index}`, otherPartyLabel: label, direction, durationSeconds: 20 + Math.floor(random() * 600), timestamp: timeFor(direction) });
      }
      continue;
    }
    for (const message of (await ctx.db.query("messages").withIndex("by_deviceId_and_timestamp", (q) => q.eq("deviceId", device._id)).take(200)).filter(isFiller)) {
      const [label, direction, body] = FAMILY.has(message.otherPartyLabel ?? "") ? pick(random, MESSAGES) : [message.otherPartyLabel, message.direction, message.body];
      const late = message.timestamp > end || (direction === "outgoing" && lastSend !== undefined && message.timestamp > lastSend);
      await ctx.db.patch(message._id, { otherPartyLabel: label, direction, body, timestamp: late ? timeFor(direction) : message.timestamp });
    }
    for (const call of (await ctx.db.query("callLogs").withIndex("by_deviceId_and_timestamp", (q) => q.eq("deviceId", device._id)).take(200)).filter(isFiller)) {
      const [label, direction] = FAMILY.has(call.otherPartyLabel ?? "") ? pick(random, CALLERS) : [call.otherPartyLabel, call.direction];
      const late = call.timestamp > end || (direction === "outgoing" && lastSend !== undefined && call.timestamp > lastSend);
      await ctx.db.patch(call._id, { otherPartyLabel: label, direction, timestamp: late ? timeFor(direction) : call.timestamp });
    }
  }

  const placeNames = new Map<Id<"places">, string>();
  const placeName = async (id?: Id<"places">) => {
    if (!id) return "";
    if (!placeNames.has(id)) placeNames.set(id, (await ctx.db.get(id))?.name ?? "");
    return placeNames.get(id)!;
  };
  // Redo the crowd: same evidence IDs, so any marks or pins on a passer-by still point at a record.
  const oldCrowd = await ctx.db.query("cctvRecords").withIndex("by_caseId_and_evidenceId", (q) => q.eq("caseId", caseId).gte("evidenceId", PREFIX).lt("evidenceId", `${PREFIX}￿`)).take(1000);
  for (const old of oldCrowd) await ctx.db.delete(old._id);
  const descriptions: string[] = [];
  for await (const person of ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) descriptions.push(person.publicDescription);
  const crowd = crowdFor(descriptions);
  const roster = crowd.heights.length ? crowdRoster(seeded(`${caseId}:crowd`), crowd) : [];
  const cameras: Doc<"cctvCameras">[] = [];
  for await (const camera of ctx.db.query("cctvCameras").withIndex("by_caseId", (q) => q.eq("caseId", caseId))) cameras.push(camera);
  for (const camera of cameras) {
    if (camera.faulty || !roster.length) continue;
    const random = seeded(`${camera._id}:filler`);
    const from = await placeName(camera.streetFromPlaceId);
    const to = await placeName(camera.streetToPlaceId);
    const street = Boolean(from && to);
    const count = street ? 6 + Math.floor(random() * 6) : 2 + Math.floor(random() * 3);
    for (let index = 0; index < count; index++) {
      const time = between(random, Math.max(camera.startTime, start), Math.min(camera.endTime, end));
      const movement = street ? (random() < 0.5 ? `walking from ${from} towards ${to}` : `walking from ${to} towards ${from}`) : pick(random, ["passing through", "walking past", "waiting briefly, then leaving"]);
      await ctx.db.insert("cctvRecords", { caseId, cameraId: camera._id, evidenceId: `${PREFIX}${camera.sourceId}/${index}`, startTime: time, endTime: time + 1, npcIds: [], vehicleIds: [], description: `${pick(random, roster)}: ${movement}`, kind: "pass" });
    }
  }
  await ctx.db.patch(caseId, { fillerVersion: FILLER_VERSION });
}

/**
 * The victim's home and workplace are what any detective knows at minute one. Adds them to the brief's
 * known details from the frozen cast, once. Public information only; no suspect is named.
 */
export async function ensureVictimLeads(ctx: MutationCtx, caseId: Id<"cases">, cast: unknown) {
  const playableCase = await ctx.db.get(caseId);
  if (!playableCase?.cityId || playableCase.initialFacts.some((fact) => fact.startsWith("Victim's home:"))) return;
  const characters = (cast as { characters?: unknown } | undefined)?.characters;
  if (!Array.isArray(characters)) return;
  const victim = characters.find((person): person is { homeUnitId?: unknown; job?: { placeId?: unknown } } => typeof person === "object" && person !== null && (person as { role?: unknown }).role === "victim");
  if (!victim) return;
  const facts: string[] = [];
  const placeBySource = async (sourceId: string) => await ctx.db.query("places").withIndex("by_cityId_and_sourceId", (q) => q.eq("cityId", playableCase.cityId!).eq("sourceId", sourceId)).unique();
  if (typeof victim.homeUnitId === "string") {
    const home = await placeBySource(victim.homeUnitId.split(":")[0]);
    const unit = home?.buildingId ? await ctx.db.query("rooms").withIndex("by_buildingId_and_sourceId", (q) => q.eq("buildingId", home.buildingId!).eq("sourceId", victim.homeUnitId as string)).unique() : null;
    if (home) facts.push(`Victim's home: ${unit && unit.type === "unit" ? `${unit.name}, ` : ""}${home.name}`);
  }
  if (typeof victim.job?.placeId === "string") {
    const work = await placeBySource(victim.job.placeId);
    if (work) facts.push(`Victim's workplace: ${work.name}`);
  }
  if (facts.length) await ctx.db.patch(caseId, { initialFacts: [...playableCase.initialFacts, ...facts] });
}

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** A camera review covers half an hour either side of its chosen minute (one hour block). */
export const CCTV_HALF_WINDOW = 30;

export type DiscoveryType = "item" | "forensic" | "cctv" | "public_record" | "device_file" | "call" | "message" | "statement";
export type Discovery = { type: DiscoveryType; referenceId: string; title: string; body: string; time?: number };

/**
 * Everything this session has legitimately uncovered, as plain readable entries.
 * Shared by the notebook, interview proof, and people discovery. Each source is capped at 100.
 */
export async function collectDiscoveries(ctx: QueryCtx, session: Doc<"sessions">) {
  const caseId = session.caseId;
  if (!caseId) return [];
  const gameTime = session.gameTime ?? 0;
  const entries: Discovery[] = [];
  for (const heard of await ctx.db.query("sessionStatements").withIndex("by_sessionId", q => q.eq("sessionId", session._id)).take(100)) {
    const statement = await ctx.db.get(heard.statementId);
    if (statement?.caseId !== caseId) continue;
    const witness = await ctx.db.get(statement.witnessNpcId);
    entries.push({ type: "statement", referenceId: statement.evidenceId, title: `Statement of ${witness?.name ?? "a witness"}`, body: statement.text });
  }
  const foundItems = await ctx.db.query("sessionItems").withIndex("by_sessionId", q => q.eq("sessionId", session._id)).take(100);
  for (const found of foundItems) {
    const item = await ctx.db.get(found.itemId);
    if (!item || item.caseId !== caseId) continue;
    entries.push({ type: "item", referenceId: item._id, title: item.name, body: item.description });
  }
  for (const request of await ctx.db.query("forensicRequests").withIndex("by_sessionId", q => q.eq("sessionId", session._id)).take(100)) {
    if (request.viewedAt === undefined || !request.forensicOutputId) continue;
    const output = await ctx.db.get(request.forensicOutputId);
    if (!output || output.caseId !== caseId) continue;
    entries.push({ type: "forensic", referenceId: output._id, title: `Lab · ${output.testType.replaceAll("_", " ")} report`, body: output.result });
  }
  for (const access of await ctx.db.query("sessionPublicRecords").withIndex("by_sessionId_and_recordId", q => q.eq("sessionId", session._id)).take(100)) {
    if (access.completeGameTime > gameTime) continue;
    const record = await ctx.db.get(access.recordId);
    if (record?.caseId === caseId) entries.push({ type: "public_record", referenceId: record.evidenceId, title: record.title, body: record.content });
  }
  const reviewed = new Set<string>();
  for (const review of await ctx.db.query("cctvReviews").withIndex("by_sessionId_and_cameraId_and_minute", q => q.eq("sessionId", session._id)).take(100)) {
    if (review.completeGameTime > gameTime) continue;
    const camera = await ctx.db.get(review.cameraId);
    if (!camera || camera.caseId !== caseId) continue;
    for (const record of await ctx.db.query("cctvRecords").withIndex("by_cameraId_and_startTime", q => q.eq("cameraId", camera._id).lte("startTime", review.minute + CCTV_HALF_WINDOW)).order("desc").take(100)) {
      if (record.endTime < review.minute - CCTV_HALF_WINDOW || reviewed.has(record.evidenceId)) continue;
      reviewed.add(record.evidenceId);
      const label = await ctx.db.query("cctvLabels").withIndex("by_sessionId_and_recordEvidenceId", q => q.eq("sessionId", session._id).eq("recordEvidenceId", record.evidenceId)).unique();
      const marked = label ? await ctx.db.get(label.npcId) : null;
      entries.push({ type: "cctv", referenceId: record.evidenceId, title: camera.name, body: marked ? `${record.description}\nYou marked: looks like ${marked.name}` : record.description, time: record.startTime });
    }
  }
  const readDevices = new Set<Id<"devices">>();
  for (const access of await ctx.db.query("sessionDevices").withIndex("by_sessionId", q => q.eq("sessionId", session._id)).take(100)) if (access.readAt !== undefined) readDevices.add(access.deviceId);
  const devices = await ctx.db.query("devices").withIndex("by_caseId", q => q.eq("caseId", caseId)).take(100);
  for (const found of foundItems) {
    if (found.readAt === undefined) continue;
    for (const device of devices) if (device.sourceItemId === found.itemId) readDevices.add(device._id);
  }
  for (const deviceId of readDevices) {
    const device = await ctx.db.get(deviceId);
    if (!device || device.caseId !== caseId) continue;
    for (const file of await ctx.db.query("deviceFiles").withIndex("by_deviceId", q => q.eq("deviceId", device._id)).take(100)) entries.push({ type: "device_file", referenceId: file.evidenceId, title: `${device.name} · ${file.title}`, body: file.body });
    for (const call of await ctx.db.query("callLogs").withIndex("by_deviceId_and_timestamp", q => q.eq("deviceId", device._id)).take(100)) {
      entries.push({ type: "call", referenceId: call._id, title: `Call ${call.direction === "incoming" ? "from" : "to"} ${call.otherPartyLabel ?? "Unknown"}`, body: `${device.name} · ${Math.round(call.durationSeconds / 60)} min`, time: call.timestamp });
    }
    for (const message of await ctx.db.query("messages").withIndex("by_deviceId_and_timestamp", q => q.eq("deviceId", device._id)).take(100)) {
      entries.push({ type: "message", referenceId: message._id, title: `Message ${message.direction === "incoming" ? "from" : "to"} ${message.otherPartyLabel ?? "Unknown"}`, body: message.body, time: message.timestamp });
    }
  }
  return entries;
}

function mentions(text: string, word: string) {
  return new RegExp(`(^|[^a-z])${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(text.toLowerCase());
}

/** Matches a person's full name, or a first or last name that is unique in the cast. */
export function namesPerson(people: Doc<"npcs">[]) {
  const firstNames = new Map<string, number>();
  const lastNames = new Map<string, number>();
  for (const person of people) {
    const parts = person.name.trim().split(/\s+/);
    firstNames.set(parts[0].toLowerCase(), (firstNames.get(parts[0].toLowerCase()) ?? 0) + 1);
    if (parts.length > 1) lastNames.set(parts.at(-1)!.toLowerCase(), (lastNames.get(parts.at(-1)!.toLowerCase()) ?? 0) + 1);
  }
  return (person: Doc<"npcs">, text: string) => {
    const parts = person.name.trim().split(/\s+/);
    const first = parts[0];
    const last = parts.length > 1 ? parts.at(-1)! : "";
    return mentions(text, person.name)
      || (firstNames.get(first.toLowerCase()) === 1 && first.length >= 3 && mentions(text, first))
      || (Boolean(last) && lastNames.get(last.toLowerCase()) === 1 && last.length >= 3 && mentions(text, last));
  };
}

/**
 * People the detectives know about: the victim, anyone the brief names, anyone named in something
 * they have uncovered, and anyone already called in. Returns where each was first seen.
 */
export async function knownPeople(ctx: QueryCtx, session: Doc<"sessions">, discoveries?: Discovery[]) {
  const known = new Map<Id<"npcs">, string>();
  if (!session.caseId) return known;
  const playableCase = await ctx.db.get(session.caseId);
  if (!playableCase) return known;
  const people = await ctx.db.query("npcs").withIndex("by_caseId", q => q.eq("caseId", session.caseId!)).take(200);
  const named = namesPerson(people);
  const brief = [playableCase.summary, ...playableCase.initialFacts].join("\n");
  for (const person of people) {
    if (person.role === "victim" || named(person, brief)) known.set(person._id, "Case brief");
  }
  for await (const conversation of ctx.db.query("npcConversations").withIndex("by_sessionId_and_npcId", q => q.eq("sessionId", session._id))) {
    if (!known.has(conversation.npcId)) known.set(conversation.npcId, "Interview");
  }
  for await (const row of ctx.db.query("sessionKnownPeople").withIndex("by_sessionId_and_npcId", q => q.eq("sessionId", session._id))) {
    if (!known.has(row.npcId)) known.set(row.npcId, row.firstSeenIn);
  }
  for (const entry of discoveries ?? await collectDiscoveries(ctx, session)) {
    const text = `${entry.title}\n${entry.body}`;
    for (const person of people) if (!known.has(person._id) && named(person, text)) known.set(person._id, entry.title);
  }
  return known;
}

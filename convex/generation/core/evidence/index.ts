import { findRoom, homeRooms, type City } from "../city";
import { crimeEvent, crimeKind } from "../crimes";
import { createRng } from "../rng";
import { formatTime, type Cast, type CrimeBase, type Story } from "../schemas";
import type { Timeline } from "../timeline";
import { buildCctv } from "./cctv";
import { buildClutter } from "./clutter";
import type { Evidence, EvidenceSet } from "./types";

type Difficulty = "easy" | "normal" | "hard";

/**
 * Builds every piece of evidence from the checked timeline: CCTV, phone records, card payments,
 * forensics, items, devices, public records and witness statements. Deterministic for a seed.
 */
export function buildEvidence(
  city: City,
  crime: CrimeBase,
  cast: Cast,
  story: Story,
  timeline: Timeline,
  difficulty: Difficulty,
  seed: number,
): EvidenceSet {
  const people = cast.characters;
  const kind = crimeKind(crime);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;
  const placeName = (id: string) => city.places.find((p) => p.id === id)?.name ?? id;
  const roomName = (id: string) => {
    const found = findRoom(city, id);
    return found ? `${found.place.name}, ${found.room.name}` : id;
  };

  const { cameras, rows } = buildCctv(city, people, timeline, difficulty, createRng(seed), crime.disabledCamera ?? undefined);
  const evidence: Evidence[] = [...rows];

  // Phone records: both phones keep a copy.
  for (const c of story.comms) {
    for (const ownerId of [c.from, c.to]) {
      const outgoing = ownerId === c.from;
      const other = nameOf(outgoing ? c.to : c.from);
      evidence.push({
        id: `${c.type}/${c.id}/${ownerId}`,
        type: c.type,
        title: `${c.type === "call" ? "Call" : "Message"} ${outgoing ? "to" : "from"} ${other}`,
        summary: c.type === "call" ? `${outgoing ? "Outgoing" : "Incoming"} call, ${c.durationMinutes ?? 1} min.` : c.gist,
        access: { tool: "phone", deviceId: `phone:${ownerId}` },
        time: c.time,
        aboutIds: [c.from, c.to],
        sourceIds: [c.id],
        data: { ownerId, from: c.from, to: c.to, proves: c.proves },
      });
    }
  }

  // Devices: people hand their phone over when questioned; the kind may put the victim's elsewhere (a murder victim's is on the body).
  for (const p of people) {
    evidence.push({
      id: `device/phone:${p.id}`,
      type: "device",
      title: `${p.name}'s phone`,
      summary: `${p.name}'s mobile phone.`,
      access: (p.id === crime.victimId && kind.victimPhone?.(crime)) || { tool: "interrogation", witnessId: p.id },
      aboutIds: [p.id],
      sourceIds: [],
      data: { deviceId: `phone:${p.id}`, ownerId: p.id },
    });
  }

  // Card payments (cash leaves nothing).
  for (const b of story.purchases.filter((b) => b.payment === "card")) {
    evidence.push({
      id: `card/${b.id}`,
      type: "card",
      title: `Card payment · ${nameOf(b.who)}`,
      summary: `${nameOf(b.who)} paid by card at ${placeName(b.placeId)}: ${b.item}.`,
      access: { tool: "records" },
      time: b.time,
      aboutIds: [b.who],
      sourceIds: [b.id],
      data: { who: b.who, placeId: b.placeId },
    });
  }

  // Public records: employment and address for everyone, plus each person's own records.
  for (const p of people) {
    const home = city.places.flatMap((pl) => pl.building.homeUnits).find((u) => u.id === p.homeUnitId);
    const base = { access: { tool: "records" as const }, aboutIds: [p.id], sourceIds: [] };
    evidence.push({
      ...base,
      id: `record/${p.id}/address`,
      type: "record",
      title: `Address · ${p.name}`,
      summary: `${p.name} lives at ${home ? roomName(home.roomId).split(",")[0] + (home.label.startsWith("Flat") || home.label.startsWith("Room") ? `, ${home.label}` : "") : "an unknown address"}.`,
      data: { personId: p.id, kind: "address", proves: [] },
    });
    if (p.job) {
      evidence.push({
        ...base,
        id: `record/${p.id}/employment`,
        type: "record",
        title: `Employment · ${p.name}`,
        summary: `${p.name} works as ${p.job.title} at ${placeName(p.job.placeId)}.`,
        data: { personId: p.id, kind: "employment", proves: [] },
      });
    }
    p.records.forEach((r, i) =>
      evidence.push({
        ...base,
        id: `record/${p.id}/${i}`,
        type: "record",
        title: `${r.kind[0].toUpperCase()}${r.kind.slice(1)} record · ${p.name}`,
        summary: r.summary,
        data: { personId: p.id, kind: r.kind, proves: r.proves },
      }),
    );
  }

  // Story items where they end up. A spot the room doesn't have becomes the room's first spot: which
  // drawer doesn't change the case, so it isn't worth a repair.
  for (const item of story.items) {
    const slots = findRoom(city, item.finalRoomId)?.room.itemSlots ?? [];
    evidence.push({
      id: `item/${item.id}`,
      type: "item",
      title: item.name,
      summary: item.description,
      access: { tool: "search", roomId: item.finalRoomId, slot: slots.includes(item.finalSlot) ? item.finalSlot : (slots[0] ?? item.finalSlot) },
      aboutIds: item.ownerId ? [item.ownerId] : [],
      sourceIds: [item.id],
      data: { itemId: item.id, ownerId: item.ownerId, proves: item.proves },
    });
  }

  // Files on devices (laptops etc.), readable once the device is found.
  for (const item of story.items.filter((i) => i.kind === "device")) {
    item.contents.forEach((file, n) =>
      evidence.push({
        id: `file/${item.id}/${n}`,
        type: "file",
        title: `${item.name} · ${file.title}`,
        summary: file.text,
        access: { tool: "device", itemId: item.id },
        aboutIds: item.ownerId ? [item.ownerId] : [],
        sourceIds: [item.id],
        data: { itemId: item.id, proves: file.proves },
      }),
    );
  }

  evidence.push(...forensics(city, crime, cast, story, kind.keyItemIds, nameOf));
  evidence.push(...kind.evidence({ city, crime, cast, story }, difficulty, nameOf));
  evidence.push(...witnessStatements(crime, story, timeline, nameOf));
  evidence.push(...buildClutter(city, relevantRooms(city, cast, story), difficulty, createRng(seed + 1)));
  return { cameras, evidence };
}

/** Rooms that matter to the case, grouped by place: story rooms, homes and workplaces of the cast. */
function relevantRooms(city: City, cast: Cast, story: Story) {
  const rooms = new Set<string>([
    ...story.events.map((e) => e.roomId),
    ...story.items.flatMap((i) => [i.startRoomId, i.finalRoomId]),
  ]);
  for (const c of cast.characters) {
    homeRooms(city, c.homeUnitId).forEach((r) => rooms.add(r));
    if (c.job?.roomId) rooms.add(c.job.roomId);
  }
  const byPlace = new Map<string, string[]>();
  for (const id of rooms) {
    const placeId = id.split(":")[0];
    byPlace.set(placeId, [...(byPlace.get(placeId) ?? []), id]);
  }
  return byPlace;
}

/**
 * Physical traces any crime leaves: prints on story items (the kind's key items are wiped by a
 * "wipe-prints" cover-up), shoe prints at side doors the culprit used, and prints and clothing fibers
 * at the scene.
 */
function forensics(city: City, crime: CrimeBase, cast: Cast, story: Story, keyItemIds: string[], nameOf: (id: string) => string): Evidence[] {
  const out: Evidence[] = [];
  const wiped = crime.coverUp.includes("wipe-prints");
  const act = crimeEvent(crime, story);
  const actIds = act ? [act.id] : [];
  // Clothing the culprit wore during the crime sheds fibers at the scene.
  const culpritClothing = story.items.filter((i) => i.kind === "clothing" && i.ownerId === crime.culpritId && act?.itemsUsed.includes(i.id));
  const handlers = (itemId: string) => [
    ...new Set([
      ...story.items.filter((i) => i.id === itemId && i.ownerId).map((i) => i.ownerId!),
      ...story.events.filter((e) => e.itemsUsed.includes(itemId)).flatMap((e) => e.actors),
    ]),
  ];
  const lab = (subjectId: string) => ({ tool: "lab" as const, subjectId });
  const list = (ids: string[]) => ids.map(nameOf).join(", ");

  for (const item of story.items) {
    const subjectId = `item:${item.id}`;
    const prints = wiped && keyItemIds.includes(item.id) ? [] : handlers(item.id);
    out.push({
      id: `forensic/${item.id}/prints`,
      type: "forensic",
      title: `Fingerprints · ${item.name}`,
      summary: prints.length ? `Fingerprints match: ${list(prints)}.` : "No usable fingerprints. The surface was wiped clean.",
      access: lab(subjectId),
      aboutIds: prints,
      sourceIds: [item.id],
      data: { test: "fingerprints", subjectId, printsOf: prints },
    });
  }

  // Footprints at doors the culprit used at the scene building.
  const shoes = cast.characters.find((c) => c.id === crime.culpritId)?.appearance.shoes;
  const scenePlace = crime.sceneRoomId.split(":")[0];
  const doors = new Set(
    story.events
      .filter((e) => e.actors.includes(crime.culpritId) && e.roomId.startsWith(`${scenePlace}:`))
      .flatMap((e) => [e.enteredVia, e.leftVia])
      .filter((d): d is string => !!d),
  );
  for (const door of shoes ? doors : []) {
    out.push({
      id: `forensic/footprints/${door}`,
      type: "forensic",
      title: "Shoe prints",
      summary: `Fresh shoe prints by the ${door.split(":")[1].replace(/-/g, " ")}: ${shoes}.`,
      access: lab(`room:${door}`),
      aboutIds: [crime.culpritId],
      sourceIds: actIds,
      data: { test: "footprints", subjectId: `room:${door}`, printsOf: [crime.culpritId] },
    });
  }

  // The scene itself.
  const sceneId = `room:${crime.sceneRoomId}`;
  // Only people whose home includes the scene room: every room of a house, but just the one flat or hotel room.
  const residents = cast.characters.filter((c) => homeRooms(city, c.homeUnitId).has(crime.sceneRoomId)).map((c) => c.id);
  const visitors = story.events.filter((e) => e.roomId === crime.sceneRoomId && e.start <= crime.discovery.time).flatMap((e) => e.actors);
  const scenePrints = [...new Set([...residents, ...visitors])].filter((id) => !(wiped && id === crime.culpritId));
  out.push({
    id: "forensic/scene/prints",
    type: "forensic",
    title: "Fingerprints · crime scene",
    summary: `Fingerprints at the scene match: ${list(scenePrints)}.`,
    access: lab(sceneId),
    aboutIds: scenePrints,
    sourceIds: actIds,
    data: { test: "fingerprints", subjectId: sceneId, printsOf: scenePrints },
  });
  for (const cloth of culpritClothing) {
    out.push({
      id: `forensic/scene/fibers/${cloth.id}`,
      type: "forensic",
      title: "Fibers · crime scene",
      summary: `Fibers found at the scene match the ${cloth.name.toLowerCase()}.`,
      access: lab(sceneId),
      aboutIds: [cloth.ownerId!],
      sourceIds: [cloth.id, ...actIds],
      data: { test: "fibers", subjectId: sceneId, fibersFromItemId: cloth.id },
    });
  }
  return out;
}

/** People who saw a public story event: other people in it, plus anyone at the same place then. */
function witnessStatements(crime: CrimeBase, story: Story, timeline: Timeline, nameOf: (id: string) => string): Evidence[] {
  const out: Evidence[] = [];
  for (const e of story.events.filter((e) => e.visibility === "public")) {
    const placeId = e.roomId.split(":")[0];
    const bystanders = timeline.entries
      .filter((t) => t.placeId === placeId && t.start < e.end && e.start < t.end && !e.actors.includes(t.actorId))
      .map((t) => t.actorId);
    const witnesses = [...new Set([...e.actors, ...bystanders])].filter((w) => w !== crime.victimId);
    for (const w of witnesses) {
      const about = e.actors.filter((a) => a !== w);
      if (about.length === 0) continue;
      out.push({
        id: `witness/${w}/${e.id}`,
        type: "witness",
        title: `${nameOf(w)} saw ${about.map(nameOf).join(", ")}`,
        summary: `${formatTime(e.start)}–${formatTime(e.end)}: ${e.action}`,
        access: { tool: "interrogation", witnessId: w },
        time: e.start,
        end: e.end,
        aboutIds: about,
        sourceIds: [e.id],
        data: { witnessId: w, eventId: e.id, placeId },
      });
    }
  }
  return out;
}

/**
 * Problems with the evidence setup that the timeline checks can't see.
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function evidenceProblems(crime: CrimeBase, timeline: Timeline, set: EvidenceSet) {
  const problems: string[] = [];
  const wantsCamera = crime.coverUp.includes("disable-camera");
  const off = crime.disabledCamera;
  if (wantsCamera && !off) problems.push("Cover-up says a camera was switched off, but not which one or when.");
  if (!wantsCamera && off) problems.push("A camera is switched off but the cover-up doesn't mention it.");
  if (off) {
    const camera = set.cameras.find((c) => c.id === off.cameraId);
    if (!camera) problems.push(`Switched-off camera ${off.cameraId} doesn't exist.`);
    if (off.to <= off.from) problems.push("Camera is switched back on before it is switched off.");
    const placeIds = camera?.placeId ? [camera.placeId] : (camera?.streetId?.split("~") ?? []);
    const culprits = [crime.culpritId, ...(crime.accomplice ? [crime.accomplice.id] : [])];
    const there = timeline.entries.some(
      (e) => culprits.includes(e.actorId) && placeIds.includes(e.placeId) && e.start <= off.from && e.end >= off.from - 30,
    );
    if (camera && !there) {
      problems.push(
        `Nobody from the crime is at ${camera.name} to switch it off at ${formatTime(off.from)}: give the culprit${crime.accomplice ? " or the accomplice" : ""} an event at ${placeIds.join(" or ")} that covers ${formatTime(off.from)} (up to 30 minutes before is fine), in which they switch it off.`,
      );
    }
  }
  return problems;
}

import { findRoom, streetRoute, type City } from "./city";
import { createRng } from "./rng";
import { castProblems, crimeProblems } from "./crimeCast";
import { buildRoutine } from "./routine";
import { formatTime, type Cast, type CrimeCore, type Story } from "./schemas";

const MIN_BLOCK = 5;

export type TimelineEntry = {
  id: string;
  actorId: string;
  placeId: string;
  roomId: string;
  start: number;
  end: number;
  action: string;
  source: "routine" | "story";
  storyEventId?: string;
  visibility: "public" | "private";
  enteredVia?: string;
  leftVia?: string;
};

export type Timeline = { windowStart: number; windowEnd: number; entries: TimelineEntry[] };

const placeOf = (roomId: string) => roomId.split(":")[0];

/**
 * Builds the full timeline: everyone's routine, with story events cut in and routine trimmed so there is
 * always time to travel. Story events are never moved; clashes between them are left for checkTimeline.
 */
export function buildTimeline(city: City, crime: CrimeCore, cast: Cast, story: Story, seed: number): Timeline {
  const windowStart = crime.windowStart;
  const windowEnd = crime.discovery.time;
  const entries: TimelineEntry[] = [];

  for (const character of cast.characters) {
    const rng = createRng(seed + hash(character.id));
    const isVictim = character.id === crime.victimId;
    const routineEnd = isVictim ? crime.timeOfDeath : windowEnd;

    const storyEntries: TimelineEntry[] = story.events
      .filter((e) => e.actors.includes(character.id))
      .map((e) => ({
        id: `${e.id}/${character.id}`,
        actorId: character.id,
        placeId: placeOf(e.roomId),
        roomId: e.roomId,
        start: e.start,
        end: e.end,
        action: e.action,
        source: "story",
        storyEventId: e.id,
        visibility: e.visibility,
        enteredVia: e.enteredVia,
        leftVia: e.leftVia,
      }));

    // Routine minus story time.
    let routine = buildRoutine(city, character, windowStart, routineEnd, rng).flatMap((block) => {
      let pieces = [{ ...block }];
      for (const s of storyEntries) {
        pieces = pieces.flatMap((p) =>
          s.end <= p.start || s.start >= p.end
            ? [p]
            : [
                { ...p, end: s.start },
                { ...p, start: s.end },
              ].filter((x) => x.end - x.start >= MIN_BLOCK),
        );
      }
      return pieces;
    });

    // Trim routine next to anything in another place so there is time to travel.
    let changed = true;
    while (changed) {
      changed = false;
      const all = [...routine.map((r) => ({ ...r, isRoutine: true })), ...storyEntries.map((s) => ({ ...s, isRoutine: false }))].sort(
        (a, b) => a.start - b.start,
      );
      for (let i = 0; i + 1 < all.length; i++) {
        const [a, b] = [all[i], all[i + 1]];
        const need = travelMinutes(city, placeOf(a.roomId), placeOf(b.roomId));
        if (b.start - a.end >= need) continue;
        const target = a.isRoutine ? routine.find((r) => r.start === a.start && r.roomId === a.roomId) : b.isRoutine ? routine.find((r) => r.start === b.start && r.roomId === b.roomId) : null;
        if (!target) continue;
        if (a.isRoutine) target.end = b.start - need;
        else target.start = a.end + need;
        routine = routine.filter((r) => r.end - r.start >= MIN_BLOCK);
        changed = true;
        break;
      }
    }

    routine.forEach((r, i) =>
      entries.push({
        id: `routine/${character.id}/${i}`,
        actorId: character.id,
        placeId: placeOf(r.roomId),
        roomId: r.roomId,
        start: r.start,
        end: r.end,
        action: r.action,
        source: "routine",
        visibility: "public",
      }),
    );
    entries.push(...storyEntries);
  }

  entries.sort((a, b) => a.start - b.start || a.actorId.localeCompare(b.actorId));
  return { windowStart, windowEnd, entries };
}

function travelMinutes(city: City, from: string, to: string) {
  if (from === to) return 0;
  return streetRoute(city, from, to)?.minutes ?? Infinity;
}

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

/**
 * Checks the crime, cast, story and merged timeline against each other and the city.
 *
 * @returns Plain problem descriptions; empty when everything fits.
 */
export function checkTimeline(city: City, crime: CrimeCore, cast: Cast, story: Story, timeline: Timeline) {
  const problems: string[] = [];
  const people = new Map(cast.characters.map((c) => [c.id, c]));
  const nameOf = (id: string) => people.get(id)?.name ?? id;
  const itemIds = new Set(story.items.map((i) => i.id));
  const roomOk = (id: string) => !!findRoom(city, id);
  const covering = (actorId: string, time: number) =>
    timeline.entries.filter((e) => e.actorId === actorId && e.start <= time && time <= e.end);

  // Crime core and cast on their own
  problems.push(...crimeProblems(city, crime), ...castProblems(city, crime, cast));

  // Story references
  for (const e of story.events) {
    const where = findRoom(city, e.roomId);
    if (!where) problems.push(`Event "${e.id}" happens in unknown room ${e.roomId}.`);
    for (const via of [e.enteredVia, e.leftVia]) {
      if (!via) continue;
      const door = findRoom(city, via);
      if (!door?.room.isEntrance || door.place.id !== where?.place.id) problems.push(`Event "${e.id}" uses ${via}, which isn't an entrance of that building.`);
    }
    for (const a of e.actors) if (!people.has(a)) problems.push(`Event "${e.id}" has "${a}", who isn't a cast id. Use one of: ${[...people.keys()].join(", ")}.`);
    for (const i of e.itemsUsed) if (!itemIds.has(i)) problems.push(`Event "${e.id}" uses unknown item ${i}.`);
    if (e.end <= e.start) {
      problems.push(`Event "${e.id}" (start ${e.start}, end ${e.end}) must last at least 1 minute: end has to be after start, e.g. a quick action lasts 2–5 minutes.`);
    }
    if (e.start < timeline.windowStart || e.start > timeline.windowEnd) problems.push(`Event "${e.id}" is outside the story window.`);
  }
  for (const c of story.comms) {
    for (const who of [c.from, c.to]) {
      if (!people.has(who)) problems.push(`Call/message "${c.id}" has "${who}", who isn't a cast id. Use one of: ${[...people.keys()].join(", ")}.`);
    }
  }
  for (const p of story.purchases) {
    if (!people.has(p.who)) problems.push(`Purchase "${p.id}" has "${p.who}", who isn't a cast id. Use one of: ${[...people.keys()].join(", ")}.`);
    if (!city.places.some((pl) => pl.id === p.placeId)) problems.push(`Purchase "${p.id}" is at an unknown place.`);
  }
  for (const item of story.items) {
    if (!roomOk(item.startRoomId) || !roomOk(item.finalRoomId)) problems.push(`Item "${item.id}" is in an unknown room.`);
    const finalRoom = findRoom(city, item.finalRoomId)?.room;
    // A wrong spot in a room that has spots is fixed by the evidence builder (it uses the first one).
    if (finalRoom && finalRoom.itemSlots.length === 0) {
      problems.push(`Item "${item.id}" ends in ${finalRoom.name} (${finalRoom.id}), which has nowhere to leave an item; end it in another room.`);
    }
    if (item.startRoomId !== item.finalRoomId && !story.events.some((e) => e.roomId === item.finalRoomId && e.itemsUsed.includes(item.id))) {
      problems.push(
        `Nothing in the story takes "${item.name}" (${item.id}) from ${item.startRoomId} to ${item.finalRoomId}: add an event in ${item.finalRoomId} with "${item.id}" in itemsUsed, or end it where it starts.`,
      );
    }
  }

  // Each person: no double booking, enough travel time
  for (const c of cast.characters) {
    const mine = timeline.entries.filter((e) => e.actorId === c.id).sort((a, b) => a.start - b.start);
    const what = (e: TimelineEntry) => `"${e.action}" (${e.storyEventId ?? "everyday routine"}, ${formatTime(e.start)}–${formatTime(e.end)})`;
    for (let i = 0; i + 1 < mine.length; i++) {
      const [a, b] = [mine[i], mine[i + 1]];
      if (b.start < a.end) {
        problems.push(`${c.name} is in two places at once: ${what(a)} overlaps ${what(b)}. Move or shorten one of your events.`);
        continue;
      }
      const need = travelMinutes(city, a.placeId, b.placeId);
      if (b.start - a.end < need) {
        // Exact target times: repairs fix this far more reliably than from the shortfall alone.
        problems.push(
          `${c.name} can't get from ${a.placeId} to ${b.placeId} in time (needs ${need} min, has ${b.start - a.end}): ${what(a)} then ${what(b)}. Start the second at ${formatTime(a.end + need)} or later, or end the first by ${formatTime(b.start - need)}.`,
        );
      }
    }
  }

  // The crime itself
  const tod = crime.timeOfDeath;
  const atScene = (id: string) => covering(id, tod).some((e) => e.roomId === crime.sceneRoomId && e.source === "story");
  if (!atScene(crime.killerId)) problems.push(`The killer isn't in the crime scene at ${formatTime(tod)}.`);
  if (!atScene(crime.victimId)) problems.push(`The victim isn't in the crime scene at ${formatTime(tod)}.`);
  if (timeline.entries.some((e) => e.actorId === crime.victimId && e.start > tod)) problems.push("The victim does something after dying.");
  if (story.comms.some((c) => c.from === crime.victimId && c.time > tod)) problems.push("The victim calls or messages someone after dying.");
  if (story.purchases.some((p) => p.who === crime.victimId && p.time > tod)) problems.push("The victim buys something after dying.");

  const weapon = story.items.find((i) => i.id === "weapon");
  if (!weapon) problems.push('The story has no item with id "weapon".');
  else {
    if (weapon.startRoomId !== crime.weapon.originRoomId) problems.push("The weapon starts somewhere other than the crime says.");
    const used = story.events.some((e) => e.roomId === crime.sceneRoomId && e.itemsUsed.includes("weapon") && e.start <= tod && tod <= e.end);
    if (!used) problems.push("No event uses the weapon at the crime scene at the time of death.");
  }

  if (crime.accomplice) {
    const { id: acc } = crime.accomplice;
    const linked =
      story.comms.some((c) => [c.from, c.to].includes(acc) && [c.from, c.to].includes(crime.killerId)) ||
      story.events.some((e) => e.actors.includes(acc) && e.actors.includes(crime.killerId));
    if (!linked) problems.push("The killer and accomplice never talk or meet.");
  }


  const finder = crime.discovery.byId;
  if (!covering(finder, crime.discovery.time).some((e) => e.roomId === crime.sceneRoomId)) {
    problems.push(`${nameOf(finder)} isn't at the crime scene when the body is found.`);
  }

  return problems;
}

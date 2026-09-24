import type { Building } from "./buildings";

export type Area = "northside" | "midtown" | "eastside";

export type Place = {
  id: string;
  name: string;
  area: Area;
  kind: "home" | "work" | "public" | "bureau" | "lab";
  /** Jobs a case can fill with characters. */
  jobSlots: string[];
  crimeSceneAllowed: boolean;
  /** Position on the city map, 0–100 on both axes. */
  map: { x: number; y: number };
  building: Building;
};

export type Street = { id: string; a: string; b: string; minutes: number; hasCamera: boolean };

export type City = { version: number; places: Place[]; streets: Street[] };

/**
 * Fastest street route between two places (Dijkstra; ties broken by street order, so results are stable).
 *
 * @returns Places visited in order, streets used, total minutes and camera streets passed; null when unreachable.
 */
export function streetRoute(city: City, from: string, to: string) {
  const minutes = new Map<string, number>([[from, 0]]);
  const via = new Map<string, Street>();
  const done = new Set<string>();

  while (true) {
    let current: string | null = null;
    for (const [id, m] of minutes) {
      if (!done.has(id) && (current === null || m < minutes.get(current)!)) current = id;
    }
    if (current === null) return null;
    if (current === to) break;
    done.add(current);
    for (const s of city.streets) {
      const next = s.a === current ? s.b : s.b === current ? s.a : null;
      if (!next || done.has(next)) continue;
      const m = minutes.get(current)! + s.minutes;
      if (m < (minutes.get(next) ?? Infinity)) {
        minutes.set(next, m);
        via.set(next, s);
      }
    }
  }

  const streets: Street[] = [];
  const path = [to];
  for (let at = to; at !== from; ) {
    const s = via.get(at)!;
    streets.unshift(s);
    at = s.a === at ? s.b : s.a;
    path.unshift(at);
  }
  return {
    path,
    streets: streets.map((s) => s.id),
    minutes: minutes.get(to)!,
    cameraStreets: streets.filter((s) => s.hasCamera).map((s) => s.id),
  };
}

/**
 * Shortest room-to-room path inside one building (fewest doors; ties broken by door order).
 *
 * @returns Room ids in order and the camera rooms passed; null when unreachable.
 */
export function roomRoute(building: Building, from: string, to: string) {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (at === to) break;
    for (const [a, b] of building.doors) {
      const next = a === at ? b : b === at ? a : null;
      if (next && !prev.has(next)) {
        prev.set(next, at);
        queue.push(next);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let at: string | null = to; at !== null; at = prev.get(at)!) path.unshift(at);
  return { path, cameraRooms: path.filter((id) => building.cameraRoomIds.includes(id)) };
}

/**
 * Checks the city is usable: unique ids, valid streets, connected, every room reachable from an entrance.
 *
 * @returns Plain problem descriptions; empty when the city is fine.
 */
export function checkCity(city: City) {
  const problems: string[] = [];
  const placeIds = new Set(city.places.map((p) => p.id));
  if (placeIds.size !== city.places.length) problems.push("Two places share an id.");
  if (city.places.length < 10) problems.push(`City has ${city.places.length} places; needs at least 10.`);

  for (const s of city.streets) {
    if (!placeIds.has(s.a) || !placeIds.has(s.b)) problems.push(`Street ${s.id} leads to an unknown place.`);
    if (s.minutes <= 0) problems.push(`Street ${s.id} has no travel time.`);
  }
  const first = city.places[0]?.id;
  for (const p of city.places) {
    if (first && p.id !== first && !streetRoute(city, first, p.id)) problems.push(`${p.name} can't be reached by street.`);
  }

  const roomIds = new Set<string>();
  for (const p of city.places) {
    const { rooms, doors, cameraRoomIds, homeUnits } = p.building;
    for (const r of rooms) {
      if (roomIds.has(r.id)) problems.push(`Room id ${r.id} is used twice.`);
      roomIds.add(r.id);
    }
    const local = new Set(rooms.map((r) => r.id));
    for (const [a, b] of doors) {
      if (!local.has(a) || !local.has(b)) problems.push(`${p.name} has a door to an unknown room (${a} / ${b}).`);
    }
    for (const id of [...cameraRoomIds, ...homeUnits.map((u) => u.roomId)]) {
      if (!local.has(id)) problems.push(`${p.name} refers to unknown room ${id}.`);
    }
    const entrance = rooms.find((r) => r.isEntrance);
    if (!entrance) {
      problems.push(`${p.name} has no entrance.`);
      continue;
    }
    for (const r of rooms) {
      if (!roomRoute(p.building, entrance.id, r.id)) problems.push(`${p.name}: ${r.name} can't be reached from the entrance.`);
    }
  }
  return problems;
}

/** Finds a room and its place by room id; null when unknown. */
export function findRoom(city: City, roomId: string) {
  const place = city.places.find((p) => roomId.startsWith(`${p.id}:`));
  const room = place?.building.rooms.find((r) => r.id === roomId);
  return place && room ? { place, room } : null;
}

/** Totals used to check a case fits the city. */
export function cityCapacity(city: City) {
  return {
    homeUnits: city.places.filter((p) => p.kind === "home").reduce((n, p) => n + p.building.homeUnits.length, 0),
    hotelRooms: city.places.filter((p) => p.kind !== "home").reduce((n, p) => n + p.building.homeUnits.length, 0),
    jobSlots: city.places.reduce((n, p) => n + p.jobSlots.length, 0),
    crimeScenes: city.places.filter((p) => p.crimeSceneAllowed).length,
    streetCameras: city.streets.filter((s) => s.hasCamera).length,
    roomCameras: city.places.reduce((n, p) => n + p.building.cameraRoomIds.length, 0),
  };
}

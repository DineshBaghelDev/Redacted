import type { RoomKind } from "./buildings";
import { findRoom, type City } from "./city";
import type { Rng } from "./rng";
import type { Character } from "./schemas";

type Spot = "home" | "work" | "hangout";

// Daily routine templates: [spot, start, end] in minutes of the day.
const TEMPLATES: Record<Character["routine"], [Spot, number, number][]> = {
  office: [
    ["home", 0, 480],
    ["work", 540, 1050],
    ["home", 1110, 1440],
  ],
  "night-shift": [
    ["work", 0, 360],
    ["home", 420, 1260],
    ["work", 1320, 1440],
  ],
  shop: [
    ["home", 0, 420],
    ["work", 480, 1200],
    ["home", 1245, 1440],
  ],
  unemployed: [
    ["home", 0, 720],
    ["hangout", 780, 960],
    ["home", 1020, 1440],
  ],
  student: [
    ["home", 0, 540],
    ["hangout", 600, 900],
    ["home", 960, 1440],
  ],
};

const SPOT_ACTION: Record<Spot, string> = { home: "At home", work: "At work", hangout: "Out" };

// Room kinds people normally spend time in, best first.
const STAY_KINDS: RoomKind[] = ["shopfloor", "office", "special", "storage", "garage", "unit", "outdoor", "hall", "living"];

export type RoutineBlock = { actorId: string; roomId: string; start: number; end: number; action: string };

function stayRoom(city: City, placeId: string, rng: Rng) {
  const place = city.places.find((p) => p.id === placeId);
  if (!place) throw new Error(`Unknown place ${placeId}`);
  for (const kind of STAY_KINDS) {
    const rooms = place.building.rooms.filter((r) => r.kind === kind && !r.isEntrance);
    if (rooms.length) return rng.pick(rooms).id;
  }
  return place.building.rooms[0].id;
}

/**
 * Builds a character's everyday routine over [from, to): home, work and hangout blocks, nudged by the seed.
 * Travel between blocks is fixed later when the timeline is merged.
 */
export function buildRoutine(city: City, character: Character, from: number, to: number, rng: Rng): RoutineBlock[] {
  const home = city.places.flatMap((p) => p.building.homeUnits).find((u) => u.id === character.homeUnitId);
  if (!home) return [];
  const rooms: Record<Spot, string | null> = {
    home: home.roomId,
    work: character.job ? (character.job.roomId ?? stayRoom(city, character.job.placeId, rng)) : null,
    hangout: character.hangoutPlaceId ? stayRoom(city, character.hangoutPlaceId, rng) : null,
  };
  if (rooms.work && !findRoom(city, rooms.work)) rooms.work = null;

  const blocks: RoutineBlock[] = [];
  for (let dayStart = Math.floor(from / 1440) * 1440; dayStart < to; dayStart += 1440) {
    for (const [spot, s, e] of TEMPLATES[character.routine]) {
      const roomId = rooms[spot] ?? rooms.home!;
      const jitter = () => rng.int(-3, 3) * 5;
      const start = Math.max(from, dayStart + (s === 0 ? 0 : s + jitter()));
      const end = Math.min(to, dayStart + (e === 1440 ? 1440 : e + jitter()));
      if (end <= start) continue;
      const last = blocks.at(-1);
      if (last && last.roomId === roomId && last.end === start) {
        last.end = end; // join home blocks across midnight
      } else {
        blocks.push({ actorId: character.id, roomId, start, end, action: SPOT_ACTION[rooms[spot] ? spot : "home"] });
      }
    }
  }
  return blocks;
}

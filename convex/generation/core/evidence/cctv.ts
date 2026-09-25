import type { Building } from "../buildings";
import { findRoom, roomRoute, streetRoute, type City } from "../city";
import type { Rng } from "../rng";
import { formatTime, type Character } from "../schemas";
import type { Timeline, TimelineEntry } from "../timeline";
import type { Camera, Evidence } from "./types";

type CctvEvidence = Extract<Evidence, { type: "cctv" }>;

const FAULTY_BY_DIFFICULTY = { easy: 1, normal: 2, hard: 4 } as const;

/** Every working camera in the city (none faulty yet). */
export function listCameras(city: City): Camera[] {
  const byId = new Map(city.places.map((p) => [p.id, p]));
  return [
    ...city.streets
      .filter((s) => s.hasCamera)
      .map((s) => ({
        id: `cam:${s.id}`,
        name: `Street camera · ${byId.get(s.a)!.name} – ${byId.get(s.b)!.name}`,
        streetId: s.id,
        faulty: false,
      })),
    ...city.places.flatMap((p) =>
      p.building.cameraRoomIds.map((roomId) => ({
        id: `cam:${roomId}`,
        name: `${p.name} · ${p.building.rooms.find((r) => r.id === roomId)!.name}`,
        placeId: p.id,
        roomId,
        faulty: false,
      })),
    ),
  ];
}

/** How a person looks on camera: never their name. */
export function lookOf(c: Character) {
  const noun = { male: "man", female: "woman", nonbinary: "person" }[c.gender];
  const { height, build, clothing } = c.appearance;
  return `${height[0].toUpperCase()}${height.slice(1)} ${noun}, ${build}, ${clothing}`;
}

function nearestEntrance(building: Building, roomId: string) {
  let best: { id: string; steps: number } | null = null;
  for (const room of building.rooms.filter((r) => r.isEntrance)) {
    const route = roomRoute(building, room.id, roomId);
    if (route && (!best || route.path.length < best.steps)) best = { id: room.id, steps: route.path.length };
  }
  return best?.id ?? roomId;
}

/**
 * Camera records for everyone's movements: stays in camera rooms, passes through camera rooms and
 * streets while travelling. Then marks some cameras faulty (never ones that saw a story event) and
 * drops their records.
 */
export function buildCctv(
  city: City,
  people: Character[],
  timeline: Timeline,
  difficulty: keyof typeof FAULTY_BY_DIFFICULTY,
  rng: Rng,
  disabled?: { cameraId: string; from: number; to: number },
) {
  const cameras = listCameras(city);
  const cameraByRoom = new Map(cameras.filter((c) => c.roomId).map((c) => [c.roomId!, c]));
  const cameraByStreet = new Map(cameras.filter((c) => c.streetId).map((c) => [c.streetId!, c]));
  const placeName = new Map(city.places.map((p) => [p.id, p.name]));
  const rows: CctvEvidence[] = [];

  function row(camera: Camera, entry: TimelineEntry, placeId: string, kind: "stay" | "pass", text: string, time: number, end = time) {
    const person = people.find((p) => p.id === entry.actorId)!;
    rows.push({
      id: `cctv/${rows.length + 1}`,
      type: "cctv",
      title: `${camera.name} · ${formatTime(time)}`,
      summary: `${lookOf(person)}: ${text}`,
      access: { tool: "cctv", cameraId: camera.id },
      time,
      end,
      aboutIds: [person.id],
      sourceIds: [entry.storyEventId ?? entry.id],
      data: { placeId, kind },
    });
  }

  function passRooms(entry: TimelineEntry, building: Building, from: string, to: string, time: number, skip: string) {
    const route = roomRoute(building, from, to);
    for (const roomId of route?.cameraRooms ?? []) {
      if (roomId === skip) continue;
      const room = findRoom(city, roomId)!.room;
      const text = room.isEntrance ? (roomId === from ? "comes in" : "goes out") : "passes through";
      row(cameraByRoom.get(roomId)!, entry, entry.placeId, "pass", text, time);
    }
  }

  for (const person of people) {
    const entries = timeline.entries.filter((e) => e.actorId === person.id).sort((a, b) => a.start - b.start);
    entries.forEach((b, i) => {
      const a = entries[i - 1];
      if (a) {
        const buildingA = findRoom(city, a.roomId)!.place.building;
        const buildingB = findRoom(city, b.roomId)!.place.building;
        if (a.placeId === b.placeId) {
          passRooms(b, buildingB, a.roomId, b.roomId, a.end, b.roomId);
        } else {
          const exit = a.leftVia ?? nearestEntrance(buildingA, a.roomId);
          passRooms(a, buildingA, a.roomId, exit, a.end, a.roomId);
          const trip = streetRoute(city, a.placeId, b.placeId)!;
          let minute = a.end;
          trip.path.slice(1).forEach((placeId, s) => {
            const street = city.streets.find((st) => st.id === trip.streets[s])!;
            const camera = cameraByStreet.get(street.id);
            if (camera) {
              const text = `walking from ${placeName.get(trip.path[s])} towards ${placeName.get(placeId)}`;
              row(camera, b, trip.path[s], "pass", text, minute + Math.round(street.minutes / 2));
            }
            minute += street.minutes;
          });
          const entrance = b.enteredVia ?? nearestEntrance(buildingB, b.roomId);
          passRooms(b, buildingB, entrance, b.roomId, a.end + trip.minutes, b.roomId);
        }
      }
      const stayCamera = cameraByRoom.get(b.roomId);
      if (stayCamera) row(stayCamera, b, b.placeId, "stay", "is here", b.start, b.end);
    });
  }

  // Faulty cameras: only ones that recorded nothing from the story.
  const storyCams = new Set(rows.filter((r) => !r.sourceIds[0].startsWith("routine/")).map((r) => r.access.cameraId));
  const candidates = cameras.filter((c) => !storyCams.has(c.id) && c.id !== disabled?.cameraId);
  const faulty = new Set(rng.shuffle(candidates).slice(0, FAULTY_BY_DIFFICULTY[difficulty]).map((c) => c.id));
  for (const c of cameras) c.faulty = faulty.has(c.id);

  const offline: CctvEvidence[] = cameras
    .filter((c) => c.faulty)
    .map((c) => ({
      id: `cctv/offline/${c.id}`,
      type: "cctv",
      title: `${c.name} · offline`,
      summary: "No recordings: this camera was faulty for the whole period.",
      access: { tool: "cctv", cameraId: c.id },
      time: timeline.windowStart,
      end: timeline.windowEnd,
      aboutIds: [],
      sourceIds: [],
      data: { placeId: c.placeId ?? c.streetId!.split("~")[0], kind: "offline" },
    }));

  // Camera switched off as a cover-up: its records in that window are gone, the outage is logged.
  const switchedOff = (r: CctvEvidence) =>
    disabled && r.access.cameraId === disabled.cameraId && r.time! <= disabled.to && (r.end ?? r.time!) >= disabled.from;
  const disabledCamera = cameras.find((c) => c.id === disabled?.cameraId);
  if (disabled && disabledCamera) {
    offline.push({
      id: `cctv/switched-off/${disabledCamera.id}`,
      type: "cctv",
      title: `${disabledCamera.name} · no signal`,
      summary: `Camera was switched off from ${formatTime(disabled.from)} to ${formatTime(disabled.to)}.`,
      access: { tool: "cctv", cameraId: disabledCamera.id },
      time: disabled.from,
      end: disabled.to,
      aboutIds: [],
      sourceIds: ["disable-camera"],
      data: { placeId: disabledCamera.placeId ?? disabledCamera.streetId!.split("~")[0], kind: "offline" },
    });
  }

  const kept = rows.filter((r) => !faulty.has(r.access.cameraId) && !switchedOff(r)).sort((x, y) => x.time! - y.time!);
  return { cameras, rows: [...kept, ...offline] };
}

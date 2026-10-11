"use client";

import type { CSSProperties } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { GameIcon } from "./game-icon";
import { HoldButton } from "./gestures";
import { InvestigationIcon } from "./investigation-icon";
import { FurnitureSprite } from "./furniture-sprite";

type Place = NonNullable<FunctionReturnType<typeof api.investigation.getPlace>>;
type Room = Place["rooms"][number];

/** Where furniture sits in a room, as % of its width/height. Kept off the walls so doors stay clear. */
const SPOT_ANCHORS = [[24, 30], [52, 26], [78, 32], [30, 70], [58, 72], [80, 66], [44, 48], [16, 52]];
// Bottom wall last: the stairs and lift buttons sit in the bottom-left corner.
const WALLS = ["right", "left", "top", "bottom"] as const;

function neighbours(place: Place, roomId: string) {
  return place.connections.flatMap((edge) => edge.a === roomId ? [edge.b] : edge.b === roomId ? [edge.a] : [])
    .map((id) => place.rooms.find((room) => room.id === id))
    .filter((room): room is Room => Boolean(room));
}

/** Stairs and lifts are rooms on the ground floor joined to every floor's corridor; they read as floor buttons, not doors. */
const isHub = (room: Room) => room.type === "stairs" || room.type === "lift";

/** The floors a stairwell or lift reaches, and which room you step out into on each. */
function floorStops(place: Place, hub: Room) {
  const stops = new Map<number, string>([[hub.floor, hub.id]]);
  for (const next of neighbours(place, hub.id)) if (!stops.has(next.floor)) stops.set(next.floor, next.id);
  return [...stops].sort(([a], [b]) => a - b).map(([floor, roomId]) => ({ floor, roomId }));
}

const floorName = (floor: number) => (floor === 0 ? "G" : String(floor));

/** Where a door sits on a wall: walls are filled in turn, doors spread evenly along each wall. */
function doorStyle(index: number, total: number): CSSProperties {
  const wall = WALLS[index % WALLS.length];
  const onWall = Math.ceil((total - (index % WALLS.length)) / WALLS.length);
  const slot = Math.floor(index / WALLS.length);
  const along = `${((slot + 1) / (onWall + 1)) * 100}%`;
  if (wall === "right") return { "--dx": "100%", "--dy": along, "--tx": "-100%", "--ty": "-50%" } as CSSProperties;
  if (wall === "left") return { "--dx": "0%", "--dy": along, "--tx": "0%", "--ty": "-50%" } as CSSProperties;
  if (wall === "bottom") return { "--dx": along, "--dy": "100%", "--tx": "-50%", "--ty": "-100%" } as CSSProperties;
  return { "--dx": along, "--dy": "0%", "--tx": "-50%", "--ty": "0%" } as CSSProperties;
}

/**
 * The room you are standing in, seen from above: furniture you can press and hold to search, doors in the walls
 * to the rooms next door, and floor buttons when stairs or a lift are at hand.
 */
export function RoomView({ place, room, busy, searchingKey, walkingTo, foundBySpot, onSearch, onWalk, onCamera }: {
  place: Place;
  room: Room;
  busy: boolean;
  searchingKey: string | null;
  walkingTo: Room | null;
  foundBySpot: Map<string, number>;
  onSearch: (spot: string) => void;
  onWalk: (roomId: string) => void;
  onCamera: () => void;
}) {
  const around = neighbours(place, room.id);
  const hubs = isHub(room) ? [room] : around.filter(isHub);
  const doors = around.filter((next) => !isHub(next) && !(isHub(room) && next.floor !== room.floor));
  return (
    <div className="room-floor relative flex flex-wrap content-start gap-2 p-4 animate-in fade-in zoom-in-95 duration-300 sm:block sm:aspect-[16/9] sm:p-0" data-room-type={room.type} key={room.id}>
      {room.spots.map((spot, index) => {
        const [x, y] = SPOT_ANCHORS[index % SPOT_ANCHORS.length];
        const found = foundBySpot.get(spot.key) ?? 0;
        const style = { "--x": `${x}%`, "--y": `${y}%` } as CSSProperties;
        return (
          <div className="w-[calc(50%-0.25rem)] sm:absolute sm:left-[var(--x)] sm:top-[var(--y)] sm:w-36 sm:-translate-x-1/2 sm:-translate-y-1/2" key={spot.key} style={style}>
            {spot.searched ? (
              <a className="room-spot block text-[#c8d8d2]/80" href={`#spot-${spot.key}`}>
                {spot.name === "on the body" || spot.name === "shed" ? <InvestigationIcon className="size-14" name="room" /> : <FurnitureSprite searched spot={spot.name} />}
                <span className="room-spot-label">{spot.name}</span>
                <span className="block text-[0.65rem] normal-case">{found ? `✓ ${found} found` : "✓ Nothing here"}</span>
              </a>
            ) : (
              <HoldButton className="room-spot text-center normal-case" disabled={busy} label={searchingKey === spot.key ? "Searching..." : "Hold to search · 4 min"} onDone={() => onSearch(spot.key)}>
                {spot.name === "on the body" || spot.name === "shed" ? <InvestigationIcon className="size-14" name="room" /> : <FurnitureSprite searched={false} spot={spot.name} />}
                <span className="room-spot-label">{spot.name}</span>
              </HoldButton>
            )}
          </div>
        );
      })}
      {!room.spots.length ? <p className="w-full text-center text-sm text-[#c8d8d2]/60 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">Nothing to search here. Try a door.</p> : null}

      {doors.map((next, index) => {
        const level = next.floor === room.floor ? "" : next.floor > room.floor ? " · upstairs" : " · downstairs";
        return (
          <button
            className="room-door w-full sm:absolute sm:left-[var(--dx)] sm:top-[var(--dy)] sm:w-auto sm:translate-x-[var(--tx)] sm:translate-y-[var(--ty)]"
            disabled={busy}
            key={next.id}
            onClick={() => onWalk(next.id)}
            style={doorStyle(index, doors.length)}
            title={`Walk through · ${next.walkMinutes ?? 1} min`}
            type="button"
          >
            <span>▯ {next.name}{level}</span>
            <span className="text-[0.6rem] normal-case text-[#c8d8d2]/60">{next.walkMinutes ?? 1} min{place.partners.some((partner) => partner.roomId === next.id) ? " · ◆ partner" : ""}</span>
          </button>
        );
      })}

      {hubs.length ? (
        <div className="flex w-full flex-col gap-1 sm:absolute sm:bottom-3 sm:left-3 sm:w-auto">
          {hubs.map((hub) => (
            <div className="room-door" key={hub.id} style={{ flexDirection: "row", gap: "0.4rem" }}>
              <span>{hub.type === "lift" ? "▤ Lift" : "▤ Stairs"}</span>
              {floorStops(place, hub).map((stop) => (
                <button aria-label={`${hub.type === "lift" ? "Lift" : "Stairs"} to floor ${floorName(stop.floor)}`} className="min-w-7 border border-current px-1.5 py-0.5 disabled:border-[#e8ac51] disabled:bg-[#e8ac51] disabled:text-[#14120c]" disabled={busy || stop.floor === room.floor} key={stop.floor} onClick={() => onWalk(stop.roomId)} title={place.rooms.find((item) => item.id === stop.roomId)?.name} type="button">{floorName(stop.floor)}</button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {room.hasCamera ? (
        <button className="absolute right-2 top-2 flex items-center gap-1 text-[0.65rem] uppercase text-[#f1c987] hover:text-white" onClick={onCamera} title="Check this room's camera" type="button">
          <GameIcon className="size-7" name="cctv" /><span className="hidden sm:inline">Camera</span>
        </button>
      ) : null}
      {walkingTo ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 text-sm uppercase tracking-widest text-[#f1c987] animate-in fade-in" role="status">Walking to {walkingTo.name}…</div> : null}
    </div>
  );
}

/** Lays a floor out in columns by doors from its first room, for the small building map. */
function mapLayout(rooms: Room[], connections: Place["connections"]) {
  const ids = new Set(rooms.map((room) => room.id));
  const edges = connections.filter((edge) => ids.has(edge.a) && ids.has(edge.b));
  const start = rooms.find((room) => room.isEntrance) ?? rooms[0];
  const depth = new Map<string, number>(start ? [[start.id, 0]] : []);
  const queue = start ? [start.id] : [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
      if (next && !depth.has(next)) { depth.set(next, depth.get(current)! + 1); queue.push(next); }
    }
  }
  const rows = new Map<number, number>();
  const positions = new Map<string, { column: number; row: number }>();
  for (const room of rooms) {
    const column = depth.get(room.id) ?? Math.max(0, ...depth.values()) + 1;
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    positions.set(room.id, { column, row });
  }
  return { positions, edges, columns: Math.max(1, ...[...positions.values()].map((point) => point.column + 1)), rows: Math.max(1, ...rows.values()) };
}

const CELL_W = 68;
const CELL_H = 30;
const GAP = 10;

/**
 * A small paper map of one floor. Every room is named; rooms either detective has been in are inked in solid.
 * Tap any room to walk there by the shortest way.
 */
export function BuildingMap({ place, floor, floors, busy, onFloor, onWalk }: { place: Place; floor: number; floors: number[]; busy: boolean; onFloor: (floor: number) => void; onWalk: (roomId: string) => void }) {
  const visited = new Set(place.rooms.filter((room) => room.visited).map((room) => room.id));
  const rooms = place.rooms.filter((room) => room.floor === floor);
  const layout = mapLayout(rooms, place.connections);
  const width = layout.columns * (CELL_W + GAP) - GAP;
  const height = layout.rows * (CELL_H + GAP) - GAP;
  const at = (id: string) => {
    const point = layout.positions.get(id)!;
    return { x: point.column * (CELL_W + GAP), y: point.row * (CELL_H + GAP) };
  };
  const explored = place.rooms.filter((room) => room.visited).length;
  return (
    <div className="building-map p-3">
      <div className="flex items-center gap-2">
        <p className="mr-auto text-[0.65rem] uppercase tracking-[0.18em] text-[#5d4d3d]">Explored {explored}/{place.rooms.length}</p>
        {floors.length > 1 ? floors.map((number) => <button aria-pressed={number === floor} className="border border-[#8b7355]/60 px-1.5 text-[0.6rem] uppercase text-[#5d4d3d] aria-pressed:border-red-900 aria-pressed:text-red-900" key={number} onClick={() => onFloor(number)} type="button">{number === 0 ? "G" : number}</button>) : null}
      </div>
      <div className="mt-2 overflow-auto">
        <div className="relative" style={{ width, height }}>
          <svg aria-hidden="true" className="absolute inset-0" height={height} width={width}>
            {layout.edges.map((edge) => {
              const a = at(edge.a);
              const b = at(edge.b);
              return <line key={`${edge.a}-${edge.b}`} stroke="#6d5138" strokeDasharray="3 3" strokeWidth="1.5" x1={a.x + CELL_W / 2} x2={b.x + CELL_W / 2} y1={a.y + CELL_H / 2} y2={b.y + CELL_H / 2} />;
            })}
          </svg>
          {rooms.map((room) => {
            const point = at(room.id);
            const current = room.id === place.currentRoomId;
            const known = visited.has(room.id);
            const partner = place.partners.some((item) => item.roomId === room.id);
            const done = room.spots.length > 0 && room.spots.every((spot) => spot.searched);
            return (
              <button
                aria-label={`${room.name}${current ? " (you are here)" : ""}`}
                className="map-room"
                data-current={current}
                data-known={known}
                disabled={busy || current || room.walkMinutes === undefined}
                key={room.id}
                onClick={() => onWalk(room.id)}
                style={{ left: point.x, top: point.y, width: CELL_W, height: CELL_H }}
                title={current ? "You are here" : `Walk here · ${room.walkMinutes ?? "?"} min`}
                type="button"
              >
                <span className="line-clamp-2">{current ? "● " : partner ? "◆ " : ""}{room.name}{done ? " ✓" : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

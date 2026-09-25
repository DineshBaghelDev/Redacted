// Building templates. Layouts are fixed per building (no randomness): the city never changes between cases.

export type Room = {
  id: string;
  placeId: string;
  name: string;
  kind: RoomKind;
  floor: number;
  /** People can enter/leave the building here. */
  isEntrance: boolean;
  /** Places where a case can put items. Contents are decided per case. */
  itemSlots: string[];
};

export type RoomKind =
  | "entrance"
  | "hall"
  | "stairs"
  | "lift"
  | "corridor"
  | "living"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "garage"
  | "yard"
  | "unit"
  | "office"
  | "storage"
  | "shopfloor"
  | "outdoor"
  | "special";

export type Door = [string, string];

/** A home a case can assign to a household (a house, a flat, a hotel room). */
export type HomeUnit = { id: string; placeId: string; roomId: string; label: string };

export type Building = {
  rooms: Room[];
  doors: Door[];
  homeUnits: HomeUnit[];
  /** Room ids that have a working camera. */
  cameraRoomIds: string[];
};

const SLOTS: Partial<Record<RoomKind, string[]>> = {
  living: ["sofa cushions", "bookshelf", "side table drawer"],
  kitchen: ["kitchen drawer", "bin", "fridge"],
  bedroom: ["wardrobe", "bedside drawer", "under the bed"],
  bathroom: ["cabinet", "bin"],
  garage: ["workbench", "tool shelf"],
  yard: ["shed", "flower bed"],
  unit: ["wardrobe", "kitchen drawer", "bin", "desk"],
  office: ["desk drawer", "filing cabinet", "bin"],
  storage: ["shelves", "boxes", "bin"],
  shopfloor: ["under the counter", "bin"],
  outdoor: ["bushes", "bin"],
  special: ["cabinet", "bin"],
};

function makeRoom(placeId: string, key: string, name: string, kind: RoomKind, floor = 0, isEntrance = false): Room {
  return { id: `${placeId}:${key}`, placeId, name, kind, floor, isEntrance, itemSlots: SLOTS[kind] ?? [] };
}

function door(a: Room, b: Room): Door {
  return [a.id, b.id];
}

function camerasFor(rooms: Room[], keys: string[], placeId: string) {
  const ids = keys.map((key) => `${placeId}:${key}`);
  const missing = ids.filter((id) => !rooms.some((r) => r.id === id));
  if (missing.length) throw new Error(`Camera on unknown room: ${missing.join(", ")}`);
  return ids;
}

export function house(
  placeId: string,
  label: string,
  opts: { bedrooms: number; extra: "garage" | "yard"; cameras: ("front-door" | "back-door")[] },
): Building {
  const front = makeRoom(placeId, "front-door", "Front door", "entrance", 0, true);
  const hall = makeRoom(placeId, "hall", "Hallway", "hall");
  const living = makeRoom(placeId, "living", "Living room", "living");
  const kitchen = makeRoom(placeId, "kitchen", "Kitchen", "kitchen");
  const bath = makeRoom(placeId, "bathroom", "Bathroom", "bathroom");
  const back = makeRoom(placeId, "back-door", "Back door", "entrance", 0, true);
  const bedrooms = Array.from({ length: opts.bedrooms }, (_, i) =>
    makeRoom(placeId, `bedroom-${i + 1}`, i === 0 ? "Main bedroom" : `Bedroom ${i + 1}`, "bedroom", 1),
  );
  const extra =
    opts.extra === "garage"
      ? makeRoom(placeId, "garage", "Garage", "garage", 0, true)
      : makeRoom(placeId, "yard", "Backyard", "yard");

  const rooms = [front, hall, living, kitchen, bath, back, ...bedrooms, extra];
  const doors: Door[] = [
    door(front, hall),
    door(hall, living),
    door(hall, kitchen),
    door(hall, bath),
    door(kitchen, back),
    ...bedrooms.map((b) => door(hall, b)),
    opts.extra === "garage" ? door(hall, extra) : door(back, extra),
  ];
  return {
    rooms,
    doors,
    homeUnits: [{ id: `${placeId}:home`, placeId, roomId: hall.id, label }],
    cameraRoomIds: camerasFor(rooms, opts.cameras, placeId),
  };
}

export function apartment(
  placeId: string,
  opts: {
    floors: number;
    unitsPerFloor: number;
    unitLabel: "Flat" | "Room";
    /** Local keys: "lobby", "lift", "stairs", "service-door", "corridors". */
    cameras: string[];
  },
): Building {
  const lobby = makeRoom(placeId, "lobby", "Lobby", "entrance", 0, true);
  const service = makeRoom(placeId, "service-door", "Service door", "entrance", 0, true);
  const stairs = makeRoom(placeId, "stairs", "Stairs", "stairs");
  const lift = makeRoom(placeId, "lift", "Lift", "lift");
  const rooms: Room[] = [lobby, service, stairs, lift];
  const doors: Door[] = [door(lobby, stairs), door(lobby, lift), door(service, stairs)];
  const homeUnits: HomeUnit[] = [];

  for (let floor = 1; floor <= opts.floors; floor++) {
    const corridor = makeRoom(placeId, `corridor-${floor}`, `Floor ${floor} corridor`, "corridor", floor);
    rooms.push(corridor);
    doors.push(door(stairs, corridor), door(lift, corridor));
    for (let n = 0; n < opts.unitsPerFloor; n++) {
      const label = `${opts.unitLabel} ${floor}${String.fromCharCode(65 + n)}`;
      const unit = makeRoom(placeId, `unit-${floor}${String.fromCharCode(97 + n)}`, label, "unit", floor);
      rooms.push(unit);
      doors.push(door(corridor, unit));
      homeUnits.push({ id: unit.id, placeId, roomId: unit.id, label });
    }
  }

  const cameraKeys = opts.cameras.flatMap((key) =>
    key === "corridors" ? Array.from({ length: opts.floors }, (_, i) => `corridor-${i + 1}`) : [key],
  );
  return { rooms, doors, homeUnits, cameraRoomIds: camerasFor(rooms, cameraKeys, placeId) };
}

export function office(
  placeId: string,
  opts: {
    /** Extra rooms on the ground floor, as [key, name, kind]. */
    ground: [string, string, RoomKind][];
    /** Rooms for each upper floor. */
    upper: [string, string, RoomKind][][];
    /** Local keys: "reception", "loading-door", "stairs", "lift", "corridors" or any room key. */
    cameras: string[];
  },
): Building {
  const reception = makeRoom(placeId, "reception", "Reception", "entrance", 0, true);
  const loading = makeRoom(placeId, "loading-door", "Loading door", "entrance", 0, true);
  const stairs = makeRoom(placeId, "stairs", "Stairs", "stairs");
  const lift = makeRoom(placeId, "lift", "Lift", "lift");
  const rooms: Room[] = [reception, loading, stairs, lift];
  const doors: Door[] = [door(reception, stairs), door(reception, lift), door(loading, stairs)];

  for (const [key, name, kind] of opts.ground) {
    const room = makeRoom(placeId, key, name, kind);
    rooms.push(room);
    doors.push(door(reception, room));
  }
  opts.upper.forEach((floorRooms, i) => {
    const floor = i + 1;
    const corridor = makeRoom(placeId, `corridor-${floor}`, `Floor ${floor} corridor`, "corridor", floor);
    rooms.push(corridor);
    doors.push(door(stairs, corridor), door(lift, corridor));
    for (const [key, name, kind] of floorRooms) {
      const room = makeRoom(placeId, key, name, kind, floor);
      rooms.push(room);
      doors.push(door(corridor, room));
    }
  });

  const cameraKeys = opts.cameras.flatMap((key) =>
    key === "corridors" ? opts.upper.map((_, i) => `corridor-${i + 1}`) : [key],
  );
  return { rooms, doors, homeUnits: [], cameraRoomIds: camerasFor(rooms, cameraKeys, placeId) };
}

export function shop(
  placeId: string,
  opts: {
    /** Extra rooms off the back room, as [key, name, kind, isEntrance?]. */
    extras?: [string, string, RoomKind, boolean?][];
    /** Local keys: "front", "counter", "back-door" or any extra room key. */
    cameras: string[];
  },
): Building {
  const front = makeRoom(placeId, "front", "Front", "entrance", 0, true);
  const counter = makeRoom(placeId, "counter", "Counter", "shopfloor");
  const restroom = makeRoom(placeId, "restroom", "Restroom", "bathroom");
  const backRoom = makeRoom(placeId, "back-room", "Back room", "storage");
  const officeRoom = makeRoom(placeId, "office", "Office", "office");
  const back = makeRoom(placeId, "back-door", "Back door", "entrance", 0, true);
  const rooms: Room[] = [front, counter, restroom, backRoom, officeRoom, back];
  const doors: Door[] = [
    door(front, counter),
    door(front, restroom),
    door(counter, backRoom),
    door(backRoom, officeRoom),
    door(backRoom, back),
  ];
  for (const [key, name, kind, isEntrance] of opts.extras ?? []) {
    const room = makeRoom(placeId, key, name, kind, 0, isEntrance ?? false);
    rooms.push(room);
    doors.push(door(backRoom, room));
  }
  return { rooms, doors, homeUnits: [], cameraRoomIds: camerasFor(rooms, opts.cameras, placeId) };
}

/** Open public place (park, station): explicit zones and connections. */
export function publicPlace(
  placeId: string,
  opts: {
    zones: [string, string, RoomKind, boolean?][];
    links: [string, string][];
    cameras: string[];
  },
): Building {
  const rooms = opts.zones.map(([key, name, kind, isEntrance]) => makeRoom(placeId, key, name, kind, 0, isEntrance ?? false));
  const doors: Door[] = opts.links.map(([a, b]) => [`${placeId}:${a}`, `${placeId}:${b}`]);
  return { rooms, doors, homeUnits: [], cameraRoomIds: camerasFor(rooms, opts.cameras, placeId) };
}

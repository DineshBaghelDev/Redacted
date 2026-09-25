import { apartment, house, office, publicPlace, shop, type Building } from "../generation/core/buildings";
import type { Area, City, Place, Street } from "../generation/core/city";

// V1 city. PERMANENT: cases store these ids, so never edit v1 in place. A changed city becomes version 2.
// The city holds no people: owners, staff and residents are case characters filling job slots and home units.

// Map positions (0–100). Northside top, Midtown middle/left, Eastside bottom right.
const MAP: Record<string, [number, number]> = {
  "keel-14": [10, 10],
  "harlow-3": [28, 8],
  "marlow-27": [46, 8],
  "gable-row": [64, 10],
  "quik-stop": [80, 18],
  "calder-park": [12, 28],
  "linden-court": [30, 26],
  "carver-towers": [50, 26],
  "ember-cafe": [78, 40],
  "union-station": [30, 44],
  "meridian-tower": [40, 56],
  "regent-hotel": [40, 88],
  "st-clare-clinic": [66, 58],
  "civic-bank": [42, 66],
  "police-bureau": [50, 74],
  "forensic-lab": [58, 64],
  "blue-lantern": [66, 84],
  "route-9-diner": [80, 90],
  "rusk-garage": [92, 80],
  "pier-9": [94, 64],
};

function place(
  id: string,
  name: string,
  area: Area,
  kind: Place["kind"],
  build: (id: string) => Building,
  jobSlots: string[] = [],
): Place {
  const crimeSceneAllowed = kind !== "bureau" && kind !== "lab";
  const [x, y] = MAP[id];
  return { id, name, area, kind, jobSlots, crimeSceneAllowed, map: { x, y }, building: build(id) };
}

export const places: Place[] = [
  // Northside
  place("keel-14", "14 Keel Street", "northside", "home", (id) =>
    house(id, "14 Keel Street", { bedrooms: 2, extra: "garage", cameras: ["front-door"] }),
  ),
  place("harlow-3", "3 Harlow Lane", "northside", "home", (id) =>
    house(id, "3 Harlow Lane", { bedrooms: 3, extra: "yard", cameras: [] }),
  ),
  place("marlow-27", "27 Marlow Road", "northside", "home", (id) =>
    house(id, "27 Marlow Road", { bedrooms: 1, extra: "yard", cameras: [] }),
  ),
  place("linden-court", "Linden Court", "northside", "home", (id) =>
    apartment(id, { floors: 4, unitsPerFloor: 2, unitLabel: "Flat", cameras: ["lobby"] }),
  ),
  place("carver-towers", "Carver Towers", "northside", "home", (id) =>
    apartment(id, { floors: 6, unitsPerFloor: 2, unitLabel: "Flat", cameras: ["lobby", "lift", "corridors"] }),
  ),
  place("gable-row", "Gable Row Flats", "northside", "home", (id) =>
    apartment(id, { floors: 3, unitsPerFloor: 2, unitLabel: "Flat", cameras: [] }),
  ),
  place("calder-park", "Calder Park", "northside", "public", (id) =>
    publicPlace(id, {
      zones: [
        ["north-gate", "North gate", "entrance", true],
        ["south-gate", "South gate", "entrance", true],
        ["main-path", "Main path", "outdoor"],
        ["benches", "Benches", "outdoor"],
        ["pond", "Pond", "outdoor"],
        ["restrooms", "Restroom block", "bathroom"],
      ],
      links: [
        ["north-gate", "main-path"],
        ["south-gate", "main-path"],
        ["main-path", "benches"],
        ["main-path", "pond"],
        ["benches", "restrooms"],
      ],
      cameras: ["north-gate"],
    }),
  ),
  place("quik-stop", "Quik Stop", "northside", "work", (id) => shop(id, { cameras: ["front", "counter"] }), [
    "owner",
    "cashier",
  ]),

  // Midtown
  place("ember-cafe", "Ember Café", "midtown", "public", (id) => shop(id, { cameras: ["counter"] }), [
    "owner",
    "barista",
    "waiter",
  ]),
  place("union-station", "Union Station", "midtown", "public", (id) =>
    publicPlace(id, {
      zones: [
        ["ticket-hall", "Ticket hall", "entrance", true],
        ["side-exit", "Side exit", "entrance", true],
        ["concourse", "Concourse", "hall"],
        ["platform-1", "Platform 1", "outdoor"],
        ["platform-2", "Platform 2", "outdoor"],
        ["platform-3", "Platform 3", "outdoor"],
        ["restrooms", "Restrooms", "bathroom"],
      ],
      links: [
        ["ticket-hall", "concourse"],
        ["side-exit", "concourse"],
        ["concourse", "platform-1"],
        ["concourse", "platform-2"],
        ["concourse", "platform-3"],
        ["concourse", "restrooms"],
      ],
      cameras: ["concourse", "platform-1", "platform-2", "platform-3"],
    }),
    ["ticket clerk", "security guard"],
  ),
  place("meridian-tower", "Meridian Tower", "midtown", "work", (id) =>
    office(id, {
      ground: [["mailroom", "Mailroom", "storage"]],
      upper: [
        [
          ["law-office", "Law office", "office"],
          ["meeting-room", "Meeting room", "office"],
        ],
        [
          ["accounts", "Accounts office", "office"],
          ["it-room", "Server room", "special"],
        ],
        [
          ["exec-suite", "Executive suite", "office"],
          ["archive", "Archive", "storage"],
        ],
      ],
      cameras: ["reception", "lift", "loading-door"],
    }),
    ["executive", "accountant", "secretary", "lawyer", "IT technician"],
  ),
  place("civic-bank", "First Civic Bank", "midtown", "work", (id) =>
    office(id, {
      ground: [
        ["banking-hall", "Banking hall", "shopfloor"],
        ["vault", "Vault", "special"],
      ],
      upper: [
        [
          ["manager-office", "Manager's office", "office"],
          ["records", "Records room", "storage"],
        ],
      ],
      cameras: ["reception", "loading-door", "stairs", "lift", "corridors", "banking-hall", "vault"],
    }),
    ["manager", "teller", "security guard"],
  ),
  place("st-clare-clinic", "St. Clare Clinic", "midtown", "work", (id) =>
    office(id, {
      ground: [
        ["exam-1", "Exam room 1", "special"],
        ["exam-2", "Exam room 2", "special"],
        ["pharmacy-store", "Pharmacy store", "storage"],
      ],
      upper: [
        [
          ["doctor-office", "Doctor's office", "office"],
          ["ward", "Ward", "special"],
        ],
      ],
      cameras: ["reception", "pharmacy-store"],
    }),
    ["doctor", "nurse", "pharmacist", "receptionist"],
  ),
  place("regent-hotel", "Regent Hotel", "midtown", "public", (id) =>
    apartment(id, { floors: 4, unitsPerFloor: 3, unitLabel: "Room", cameras: ["lobby", "lift", "corridors"] }),
    ["manager", "receptionist", "housekeeper"],
  ),
  place("police-bureau", "Police Bureau", "midtown", "bureau", (id) =>
    office(id, {
      ground: [
        ["interrogation", "Interrogation room", "special"],
        ["records-terminal", "Records terminal", "office"],
      ],
      upper: [[["evidence-room", "Evidence room", "storage"]]],
      cameras: ["reception", "loading-door", "stairs", "lift", "corridors", "interrogation", "evidence-room"],
    }),
  ),
  place("forensic-lab", "Forensic Lab", "midtown", "lab", (id) =>
    office(id, {
      ground: [
        ["lab", "Lab", "special"],
        ["morgue", "Morgue", "special"],
      ],
      upper: [],
      cameras: ["reception", "loading-door", "lab", "morgue"],
    }),
  ),

  // Eastside
  place("blue-lantern", "Blue Lantern Bar", "eastside", "public", (id) => shop(id, { cameras: ["front", "counter"] }), [
    "owner",
    "bartender",
    "waiter",
    "bouncer",
  ]),
  place("route-9-diner", "Route 9 Diner", "eastside", "public", (id) => shop(id, { cameras: ["front"] }), [
    "owner",
    "cook",
    "waiter",
  ]),
  place("rusk-garage", "Rusk Auto Garage", "eastside", "work", (id) =>
    shop(id, { extras: [["workshop", "Workshop", "garage", true]], cameras: ["workshop"] }),
    ["owner", "mechanic", "mechanic"],
  ),
  place("pier-9", "Pier 9 Warehouse", "eastside", "work", (id) =>
    shop(id, {
      extras: [
        ["bay-1", "Storage bay 1", "storage"],
        ["bay-2", "Storage bay 2", "storage"],
        ["bay-3", "Storage bay 3", "storage"],
        ["loading-dock", "Loading dock", "entrance", true],
      ],
      cameras: ["loading-dock"],
    }),
    ["foreman", "loader", "loader", "night guard"],
  ),
];

function street(a: string, b: string, minutes: number, hasCamera = false): Street {
  return { id: `${a}~${b}`, a, b, minutes, hasCamera };
}

export const streets: Street[] = [
  // Northside
  street("keel-14", "harlow-3", 4),
  street("harlow-3", "marlow-27", 5),
  street("marlow-27", "gable-row", 5),
  street("gable-row", "quik-stop", 3),
  street("keel-14", "calder-park", 6),
  street("harlow-3", "linden-court", 6),
  street("calder-park", "linden-court", 4),
  street("linden-court", "carver-towers", 3, true),
  street("carver-towers", "quik-stop", 4),
  // Northside to Midtown
  street("calder-park", "union-station", 8, true),
  street("quik-stop", "ember-cafe", 7, true),
  // Midtown
  street("ember-cafe", "union-station", 4),
  street("union-station", "meridian-tower", 5, true),
  street("union-station", "regent-hotel", 4, true),
  street("meridian-tower", "civic-bank", 3),
  street("civic-bank", "police-bureau", 4, true),
  street("police-bureau", "forensic-lab", 2),
  street("meridian-tower", "st-clare-clinic", 5),
  street("ember-cafe", "st-clare-clinic", 6),
  street("police-bureau", "regent-hotel", 5),
  // Midtown to Eastside
  street("regent-hotel", "blue-lantern", 6),
  street("st-clare-clinic", "blue-lantern", 7),
  // Eastside
  street("blue-lantern", "route-9-diner", 5, true),
  street("route-9-diner", "rusk-garage", 4, true),
  street("rusk-garage", "pier-9", 6),
];

export const city: City = { version: 1, places, streets };

import { describe, expect, it } from "vitest";
import { city } from "../../fixtures/city";
import { checkCity, cityCapacity, roomRoute, streetRoute, type City } from "./city";

const building = (id: string) => city.places.find((p) => p.id === id)!.building;

describe("V1 city", () => {
  it("has no problems", () => {
    expect(checkCity(city)).toEqual([]);
  });

  it("has 20 places and fits a hard case", () => {
    const capacity = cityCapacity(city);
    expect(city.places).toHaveLength(20);
    expect(capacity.homeUnits).toBeGreaterThanOrEqual(20);
    expect(capacity.jobSlots).toBeGreaterThanOrEqual(20);
  });

  it("draws with no crossing streets on the map", () => {
    const at = new Map(city.places.map((p) => [p.id, p.map]));
    type Pt = { x: number; y: number };
    const side = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const crossings: string[] = [];
    city.streets.forEach((s, i) =>
      city.streets.slice(i + 1).forEach((t) => {
        if ([s.a, s.b].some((id) => id === t.a || id === t.b)) return;
        const [a, b, c, d] = [at.get(s.a)!, at.get(s.b)!, at.get(t.a)!, at.get(t.b)!];
        if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) crossings.push(`${s.id} x ${t.id}`);
      }),
    );
    expect(crossings).toEqual([]);
  });

  it("never changes by accident (cases store these ids)", () => {
    expect(city).toMatchSnapshot();
  });
});

describe("streetRoute", () => {
  it("finds the fastest route with its cameras", () => {
    expect(streetRoute(city, "police-bureau", "pier-9")).toEqual({
      path: ["police-bureau", "regent-hotel", "blue-lantern", "route-9-diner", "rusk-garage", "pier-9"],
      streets: [
        "police-bureau~regent-hotel",
        "regent-hotel~blue-lantern",
        "blue-lantern~route-9-diner",
        "route-9-diner~rusk-garage",
        "rusk-garage~pier-9",
      ],
      minutes: 26,
      cameraStreets: ["blue-lantern~route-9-diner", "route-9-diner~rusk-garage"],
    });
  });

  it("returns zero minutes for the same place", () => {
    expect(streetRoute(city, "keel-14", "keel-14")?.minutes).toBe(0);
  });
});

describe("roomRoute", () => {
  it("passes lobby and lift cameras on the way to a flat", () => {
    const route = roomRoute(building("carver-towers"), "carver-towers:lobby", "carver-towers:unit-3a");
    expect(route?.path).toEqual([
      "carver-towers:lobby",
      "carver-towers:stairs",
      "carver-towers:corridor-3",
      "carver-towers:unit-3a",
    ]);
    expect(route?.cameraRooms).toEqual(["carver-towers:lobby", "carver-towers:corridor-3"]);
  });

  it("uses the unwatched back door of the bar", () => {
    const route = roomRoute(building("blue-lantern"), "blue-lantern:back-door", "blue-lantern:office");
    expect(route?.cameraRooms).toEqual([]);
  });
});

describe("checkCity catches broken cities", () => {
  it("reports a street to nowhere", () => {
    const broken: City = { ...city, streets: [...city.streets, { id: "x", a: "keel-14", b: "nowhere", minutes: 3, hasCamera: false }] };
    expect(checkCity(broken)).toContain("Street x leads to an unknown place.");
  });

  it("reports a place cut off from the streets", () => {
    const broken: City = { ...city, streets: city.streets.filter((s) => s.id !== "rusk-garage~pier-9") };
    expect(checkCity(broken)).toContain("Pier 9 Warehouse can't be reached by street.");
  });

  it("reports a room with no way in", () => {
    const place = city.places.find((p) => p.id === "keel-14")!;
    const cut = { ...place, building: { ...place.building, doors: place.building.doors.filter(([, b]) => b !== "keel-14:kitchen") } };
    const broken: City = { ...city, places: city.places.map((p) => (p.id === "keel-14" ? cut : p)) };
    expect(checkCity(broken)).toContain("14 Keel Street: Kitchen can't be reached from the entrance.");
  });
});

import { streetRoute, type City } from "../core/city";
import { listCameras } from "../core/evidence/cctv";

// Compact city descriptions for prompts. Built from the same city data the checks use.

/** Every place with its rooms: "keel-14 · 14 Keel Street (home): keel-14:kitchen Kitchen, …". */
export function roomsText(city: City) {
  return city.places
    .map((p) => `${p.id} · ${p.name} (${p.kind}${p.crimeSceneAllowed ? "" : ", no crimes here"}): ${p.building.rooms.map((r) => `${r.id} ${r.name}`).join(", ")}`)
    .join("\n");
}

export function camerasText(city: City) {
  return listCameras(city)
    .map((c) => `${c.id} ${c.name}`)
    .join("\n");
}

/** Home ids with their address. */
export function homesText(city: City) {
  return city.places
    .flatMap((p) => p.building.homeUnits.map((u) => `${u.id} · ${p.name}${u.label && u.label !== p.name ? `, ${u.label}` : ""}`))
    .join("\n");
}

/** Places with job titles and how many openings each has ("cashier ×2"), plus their room ids. */
export function jobsText(city: City) {
  return city.places
    .filter((p) => p.jobSlots.length)
    .map((p) => {
      const counts = [...new Set(p.jobSlots)].map((t) => `${t} ×${p.jobSlots.filter((s) => s === t).length}`);
      return `${p.id} · ${p.name}: jobs [${counts.join(", ")}]; rooms [${p.building.rooms.map((r) => r.id).join(", ")}]`;
    })
    .join("\n");
}

export function publicPlacesText(city: City) {
  return city.places
    .filter((p) => p.kind === "public")
    .map((p) => `${p.id} · ${p.name}`)
    .join("\n");
}

/**
 * Rooms for writing story events, kept short: the name only when it says more than the id, entrances
 * marked, and rooms where nothing can be left marked [no items]. Wrong search spots are fixed by code.
 */
export function storyRoomsText(city: City) {
  const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const room = (r: City["places"][number]["building"]["rooms"][number]) => {
    const name = plain(r.name) === plain(r.id.split(":")[1]) ? "" : ` ${r.name}`;
    return `${r.id}${name}${r.isEntrance ? " [entrance]" : ""}${r.itemSlots.length ? "" : " [no items]"}`;
  };
  return city.places.map((p) => `${p.id} · ${p.name}: ${p.building.rooms.map(room).join(", ")}`).join("\n");
}

/** Travel minutes between every pair of places (shortest street route). */
export function travelText(city: City) {
  // Routes take the same time both ways, so each pair is listed once (under the earlier place).
  return city.places
    .slice(0, -1)
    .map((a, i) => `${a.id}: ${city.places.slice(i + 1).map((b) => `${b.id} ${streetRoute(city, a.id, b.id)?.minutes ?? "?"}`).join(", ")}`)
    .join("\n");
}

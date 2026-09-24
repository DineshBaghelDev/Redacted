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

/** Rooms with entrances marked and search spots, for writing story events. */
export function storyRoomsText(city: City) {
  const room = (r: City["places"][number]["building"]["rooms"][number]) =>
    `  ${r.id} ${r.name}${r.isEntrance ? " [entrance]" : ""}${r.itemSlots.length ? ` {spots: ${r.itemSlots.join(", ")}}` : ""}`;
  return city.places.map((p) => `${p.id} · ${p.name}:\n${p.building.rooms.map(room).join("\n")}`).join("\n");
}

/** Travel minutes between every pair of places (shortest street route). */
export function travelText(city: City) {
  return city.places
    .map((a) => `${a.id}: ${city.places.filter((b) => b.id !== a.id).map((b) => `${b.id} ${streetRoute(city, a.id, b.id)?.minutes ?? "?"}`).join(", ")}`)
    .join("\n");
}

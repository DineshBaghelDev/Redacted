import type { City } from "../core/city";
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

/** Places with job titles (repeated titles = several openings) and their room ids. */
export function jobsText(city: City) {
  return city.places
    .filter((p) => p.jobSlots.length)
    .map((p) => `${p.id} · ${p.name}: jobs [${p.jobSlots.join(", ")}]; rooms [${p.building.rooms.map((r) => r.id).join(", ")}]`)
    .join("\n");
}

export function publicPlacesText(city: City) {
  return city.places
    .filter((p) => p.kind === "public")
    .map((p) => `${p.id} · ${p.name}`)
    .join("\n");
}

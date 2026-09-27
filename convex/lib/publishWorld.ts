import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { city } from "../fixtures/city";
import type { Place } from "../generation/core/city";

type PlaceType = "residence" | "office" | "hospital" | "police_station" | "shop" | "restaurant" | "warehouse" | "hotel" | "park" | "public_building" | "other";
type BuildingTemplate = "house" | "apartment" | "office" | "hotel" | "commercial" | "warehouse" | "institution";

function placeType(place: Place): PlaceType {
  if (place.kind === "home") return "residence";
  if (place.kind === "bureau") return "police_station";
  if (place.kind === "lab" || place.id === "st-clare-clinic") return "hospital";
  if (place.id === "regent-hotel") return "hotel";
  if (place.id === "calder-park") return "park";
  if (place.id === "pier-9") return "warehouse";
  if (["ember-cafe", "blue-lantern", "route-9-diner"].includes(place.id)) return "restaurant";
  if (["quik-stop", "rusk-garage"].includes(place.id)) return "shop";
  if (place.kind === "work") return "office";
  return "public_building";
}

function buildingTemplate(place: Place): BuildingTemplate {
  if (place.kind === "home") return place.building.homeUnits.length === 1 ? "house" : "apartment";
  if (place.id === "regent-hotel") return "hotel";
  if (place.id === "pier-9") return "warehouse";
  if (place.kind === "bureau" || place.kind === "lab") return "institution";
  if (place.building.rooms.some((room) => room.kind === "shopfloor")) return "commercial";
  return "office";
}

function connectionType(from: string, to: string, roomKinds: Map<string, string>) {
  if (roomKinds.get(from) === "stairs" || roomKinds.get(to) === "stairs") return "stairs" as const;
  if (roomKinds.get(from) === "lift" || roomKinds.get(to) === "lift") return "elevator" as const;
  return "door" as const;
}

export async function ensureCaseWorld(ctx: MutationCtx, caseId: Id<"cases">) {
  const existing = await ctx.db
    .query("cities")
    .withIndex("by_caseId", (q) => q.eq("caseId", caseId))
    .unique();
  if (existing) {
    const playableCase = await ctx.db.get(caseId);
    if (playableCase && playableCase.cityId !== existing._id) await ctx.db.patch(caseId, { cityId: existing._id });
    return existing._id;
  }

  const cityId = await ctx.db.insert("cities", {
    caseId,
    name: "Redacted City",
    seed: `fixture:v${city.version}`,
    version: city.version,
  });
  const placeIds = new Map<string, Id<"places">>();

  for (const [placeOrder, place] of city.places.entries()) {
    const placeId = await ctx.db.insert("places", {
      cityId,
      sourceId: place.id,
      order: placeOrder,
      name: place.name,
      type: placeType(place),
      kind: place.kind,
      area: place.area,
      description: `${place.name}, ${place.area}.`,
      mapX: place.map.x,
      mapY: place.map.y,
      crimeSceneAllowed: place.crimeSceneAllowed,
      jobSlots: place.jobSlots,
    });
    placeIds.set(place.id, placeId);

    const floorNumbers = [...new Set(place.building.rooms.map((room) => room.floor))].sort((a, b) => a - b);
    const buildingId = await ctx.db.insert("buildings", {
      placeId,
      template: buildingTemplate(place),
      floorCount: floorNumbers.length,
      layoutSeed: `city-v${city.version}:${place.id}`,
    });
    await ctx.db.patch(placeId, { buildingId });

    const floorIds = new Map<number, Id<"floors">>();
    for (const floorNumber of floorNumbers) {
      floorIds.set(floorNumber, await ctx.db.insert("floors", { buildingId, floorNumber }));
    }

    const roomIds = new Map<string, Id<"rooms">>();
    const roomKinds = new Map(place.building.rooms.map((room) => [room.id, room.kind]));
    for (const [roomOrder, room] of place.building.rooms.entries()) {
      const floorId = floorIds.get(room.floor);
      if (!floorId) throw new Error(`Missing floor ${room.floor} for ${place.id}.`);
      roomIds.set(room.id, await ctx.db.insert("rooms", {
        buildingId,
        floorId,
        sourceId: room.id,
        order: roomOrder,
        name: room.name,
        type: room.kind,
        searchable: room.itemSlots.length > 0,
        isEntrance: room.isEntrance,
        itemSlots: room.itemSlots,
        hasCamera: place.building.cameraRoomIds.includes(room.id),
      }));
    }

    for (const [connectionOrder, [from, to]] of place.building.doors.entries()) {
      const fromRoomId = roomIds.get(from);
      const toRoomId = roomIds.get(to);
      if (!fromRoomId || !toRoomId) throw new Error(`Invalid room connection in ${place.id}.`);
      await ctx.db.insert("roomConnections", {
        buildingId,
        order: connectionOrder,
        fromRoomId,
        toRoomId,
        type: connectionType(from, to, roomKinds),
      });
    }

    for (const unit of place.building.homeUnits) {
      const roomId = roomIds.get(unit.roomId);
      if (!roomId) throw new Error(`Invalid home unit ${unit.id}.`);
      await ctx.db.insert("homeUnits", { cityId, buildingId, roomId, sourceId: unit.id, label: unit.label });
    }
  }

  for (const [streetOrder, street] of city.streets.entries()) {
    const fromPlaceId = placeIds.get(street.a);
    const toPlaceId = placeIds.get(street.b);
    if (!fromPlaceId || !toPlaceId) throw new Error(`Invalid street ${street.id}.`);
    await ctx.db.insert("placeConnections", {
      cityId,
      sourceId: street.id,
      order: streetOrder,
      fromPlaceId,
      toPlaceId,
      travelMinutes: street.minutes,
      bidirectional: true,
      hasCamera: street.hasCamera,
    });
  }

  await ctx.db.patch(caseId, { cityId });
  return cityId;
}

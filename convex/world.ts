import { v } from "convex/values";
import { city } from "./fixtures/city";
import { query } from "./_generated/server";
import { getRoomMember } from "./lib/auth";

const placeKind = v.union(v.literal("home"), v.literal("work"), v.literal("public"), v.literal("bureau"), v.literal("lab"));
const area = v.union(v.literal("northside"), v.literal("midtown"), v.literal("eastside"));

export const getMap = query({
  args: { roomCode: v.string() },
  returns: v.union(v.null(), v.object({
    places: v.array(v.object({
      id: v.string(),
      name: v.string(),
      kind: placeKind,
      area,
      x: v.number(),
      y: v.number(),
    })),
    streets: v.array(v.object({
      id: v.string(),
      a: v.string(),
      b: v.string(),
      minutes: v.number(),
      hasCamera: v.boolean(),
    })),
  })),
  handler: async (ctx, { roomCode }) => {
    if (!await getRoomMember(ctx, roomCode)) return null;
    return {
      places: city.places.map((place) => ({
        id: place.id,
        name: place.name,
        kind: place.kind,
        area: place.area,
        x: place.map.x,
        y: place.map.y,
      })),
      streets: city.streets,
    };
  },
});

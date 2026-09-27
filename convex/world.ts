import { v } from "convex/values";
import { query } from "./_generated/server";
import { getPlayingRoomMember } from "./lib/auth";

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
    const member = await getPlayingRoomMember(ctx, roomCode);
    if (!member?.session.caseId) return null;
    const playableCase = await ctx.db.get(member.session.caseId);
    if (!playableCase?.cityId) return null;
    const places = [];
    for await (const place of ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
      places.push(place);
    }
    const streets = [];
    for await (const street of ctx.db.query("placeConnections").withIndex("by_cityId_and_order", (q) => q.eq("cityId", playableCase.cityId!))) {
      streets.push(street);
    }
    const sourceIds = new Map(places.map((place) => [place._id, place.sourceId]));
    return {
      places: places.map((place) => ({
        id: place.sourceId,
        name: place.name,
        kind: place.kind,
        area: place.area,
        x: place.mapX,
        y: place.mapY,
      })),
      streets: streets.map((street) => ({
        id: street.sourceId,
        a: sourceIds.get(street.fromPlaceId)!,
        b: sourceIds.get(street.toPlaceId)!,
        minutes: street.travelMinutes,
        hasCamera: street.hasCamera,
      })),
    };
  },
});

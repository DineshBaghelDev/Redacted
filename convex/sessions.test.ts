/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { cast, crimeCore } from "./fixtures/caseEasy";
import { city } from "./fixtures/city";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("a lobby keeps the selected passed case", async () => {
  const t = convexTest(schema, modules);
  const generationJobId = await t.run(async (ctx) => {
    const jobId = await ctx.db.insert("generationJobs", {
      seed: 7,
      difficulty: "easy",
      createdBy: "tester",
      createdAt: 1,
      status: "passed",
      finishedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "crime",
      output: crimeCore,
      checkErrors: [],
      source: "hand-written",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "cast",
      output: cast,
      checkErrors: [],
      source: "hand-written",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "facts",
      output: {
        facts: [
          { id: "culprit-at-scene", kind: "culprit", text: "Private culprit marker", evidenceIds: ["evidence/culprit"] },
          { id: "motive", kind: "motive", text: "Private motive marker", evidenceIds: ["evidence/motive"] },
        ],
        decisiveIds: ["evidence/culprit"],
      },
      checkErrors: [],
      source: "code",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "brief",
      output: { title: "The Selected Case", summary: "A specific mystery.", initialFacts: ["One fact."] },
      checkErrors: [],
      source: "llm",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "evidence",
      output: {
        cameras: [{ id: "cam:station", name: "Union Station · concourse", faulty: false }],
        evidence: [
          {
            id: "cctv/1",
            type: "cctv",
            title: "Hidden title",
            summary: "Tall person in a dark coat: crosses the concourse.",
            access: { tool: "cctv", cameraId: "cam:station" },
            time: 120,
            end: 125,
            aboutIds: ["hidden-person-id"],
            sourceIds: ["hidden-event-id"],
            data: { placeId: "station", kind: "pass" },
          },
          {
            id: "cctv/2",
            type: "cctv",
            title: "Later record",
            summary: "Short person with an umbrella: waits by the doors.",
            access: { tool: "cctv", cameraId: "cam:station" },
            time: 300,
            end: 305,
            aboutIds: ["another-hidden-person"],
            sourceIds: ["another-hidden-event"],
            data: { placeId: "station", kind: "stay" },
          },
        ],
      },
      checkErrors: [],
      source: "code",
      updatedAt: 2,
    });
    return jobId;
  });

  const user = t.withIdentity({ subject: "player-1" });
  const listed = await user.query(api.cases.listPassed, {});
  expect(listed).toMatchObject([{
    generationJobId,
    title: "The Selected Case",
    description: "A specific mystery.",
  }]);

  const created = await user.mutation(api.sessions.create, { nickname: "Detective", generationJobId });
  await user.mutation(api.sessions.create, { nickname: "Detective", generationJobId });
  const frozen = await t.run(async (ctx) => {
    const session = await ctx.db.get(created.sessionId);
    const solution = session?.caseId
      ? await ctx.db.query("caseSolutions").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).unique()
      : null;
    const culprit = solution ? await ctx.db.get(solution.culpritNpcId) : null;
    const npcs = session?.caseId
      ? await ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const storedCase = session?.caseId ? await ctx.db.get(session.caseId) : null;
    const storedCity = storedCase?.cityId ? await ctx.db.get(storedCase.cityId) : null;
    const caseCity = session?.caseId
      ? await ctx.db.query("cities").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).unique()
      : null;
    const places = storedCase?.cityId
      ? await ctx.db.query("places").withIndex("by_cityId_and_order", (q) => q.eq("cityId", storedCase.cityId!)).collect()
      : [];
    const streets = storedCase?.cityId
      ? await ctx.db.query("placeConnections").withIndex("by_cityId_and_order", (q) => q.eq("cityId", storedCase.cityId!)).collect()
      : [];
    let buildingCount = 0;
    let floorCount = 0;
    let roomCount = 0;
    let roomConnectionCount = 0;
    let homeUnitCount = 0;
    let cameraRoom = null;
    for (const place of places) {
      if (!place.buildingId) continue;
      buildingCount += 1;
      floorCount += (await ctx.db.query("floors").withIndex("by_buildingId_and_floorNumber", (q) => q.eq("buildingId", place.buildingId!)).collect()).length;
      const rooms = await ctx.db.query("rooms").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect();
      roomCount += rooms.length;
      roomConnectionCount += (await ctx.db.query("roomConnections").withIndex("by_buildingId_and_order", (q) => q.eq("buildingId", place.buildingId!)).collect()).length;
      homeUnitCount += (await ctx.db.query("homeUnits").withIndex("by_buildingId", (q) => q.eq("buildingId", place.buildingId!)).collect()).length;
      cameraRoom ??= rooms.find((room) => room.sourceId === "carver-towers:corridor-6") ?? null;
    }
    return {
      solution,
      culprit,
      npcs,
      storedCase,
      storedCity,
      caseCity,
      places,
      streets,
      buildingCount,
      floorCount,
      roomCount,
      roomConnectionCount,
      homeUnitCount,
      cameraRoom,
    };
  });
  expect(frozen.culprit).toMatchObject({ sourceId: crimeCore.culpritId, role: "suspect" });
  expect(frozen.npcs).toHaveLength(cast.characters.length);
  expect(frozen.storedCase?.cityId).toBe(frozen.storedCity?._id);
  expect(frozen.caseCity?._id).toBe(frozen.storedCity?._id);
  expect(frozen.storedCity).toMatchObject({ version: city.version, seed: `fixture:v${city.version}` });
  expect(frozen.places.map((place) => place.sourceId)).toEqual(city.places.map((place) => place.id));
  expect(frozen.streets.map((street) => street.sourceId)).toEqual(city.streets.map((street) => street.id));
  expect(frozen.buildingCount).toBe(city.places.length);
  expect(frozen.floorCount).toBe(city.places.reduce((count, place) => count + new Set(place.building.rooms.map((room) => room.floor)).size, 0));
  expect(frozen.roomCount).toBe(city.places.reduce((count, place) => count + place.building.rooms.length, 0));
  expect(frozen.roomConnectionCount).toBe(city.places.reduce((count, place) => count + place.building.doors.length, 0));
  expect(frozen.homeUnitCount).toBe(city.places.reduce((count, place) => count + place.building.homeUnits.length, 0));
  expect(frozen.cameraRoom).toMatchObject({ floorId: expect.any(String), hasCamera: true, type: "corridor" });
  expect(frozen.solution).toMatchObject({
    motive: crimeCore.motive.details,
    method: crimeCore.method,
    weaponDescription: crimeCore.weapon.name,
    evidenceGroups: expect.arrayContaining([
      { description: "Decisive evidence", requiredEvidenceIds: ["evidence/culprit"] },
    ]),
  });
  const publicPeople = await user.query(api.npcs.list, { roomCode: created.roomCode });
  expect(publicPeople).toHaveLength(cast.characters.length);
  expect(publicPeople?.find((person) => person.id === frozen.culprit?._id)).toMatchObject({
    name: frozen.culprit?.name,
    role: "suspect",
  });
  expect(JSON.stringify(publicPeople)).not.toContain("sourceId");
  expect(await user.query(api.sessions.get, { roomCode: created.roomCode })).toMatchObject({
    caseTitle: "The Selected Case",
  });
  expect(await user.query(api.cases.getBrief, { roomCode: created.roomCode })).toEqual({
    title: "The Selected Case",
    summary: "A specific mystery.",
    initialFacts: ["One fact."],
  });
  expect(JSON.stringify(await user.query(api.cases.listPassed, {}))).not.toContain(crimeCore.motive.details);
  expect(JSON.stringify(await user.query(api.cases.getBrief, { roomCode: created.roomCode }))).not.toContain(crimeCore.method);
  expect(await user.query(api.cases.getCctv, { roomCode: created.roomCode })).toEqual({
    caseTitle: "The Selected Case",
    start: 120,
    end: 305,
    cameras: [{ id: "cam:station", name: "Union Station · concourse", faulty: false }],
  });
  expect(await user.query(api.cases.getCctvWindow, {
    roomCode: created.roomCode,
    cameraId: "cam:station",
    minute: 120,
  })).toEqual([{
      id: "cctv/1",
      cameraId: "cam:station",
      start: 120,
      end: 125,
      summary: "Tall person in a dark coat: crosses the concourse.",
      kind: "pass",
  }]);
  const cityMap = await user.query(api.world.getMap, { roomCode: created.roomCode });
  expect(cityMap?.places).toHaveLength(20);
  expect(cityMap?.places.find((place) => place.id === "police-bureau")).toMatchObject({
    name: "Police Bureau",
    kind: "bureau",
  });
  expect(cityMap?.streets.some((street) => street.a === "police-bureau" && street.b === "forensic-lab" && street.minutes === 2)).toBe(true);
  expect(cityMap?.streets).toEqual(city.streets);

  const stranger = t.withIdentity({ subject: "player-2" });
  expect(await stranger.query(api.sessions.get, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getBrief, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getCctv, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getCctvWindow, { roomCode: created.roomCode, cameraId: "cam:station", minute: 120 })).toBeNull();
  expect(await stranger.query(api.world.getMap, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.npcs.list, { roomCode: created.roomCode })).toBeNull();
});

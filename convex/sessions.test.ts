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
      stage: "story",
      output: {
        events: [{
          id: "station-meeting",
          actors: [crimeCore.culpritId],
          roomId: "keel-14:kitchen",
          start: 70,
          end: 75,
          action: "Waited in the kitchen.",
          visibility: "private",
          itemsUsed: [],
        }],
        comms: [
          { id: "call-1", from: crimeCore.culpritId, to: crimeCore.victimId, time: 90, type: "call", durationMinutes: 2, gist: "", proves: [] },
          { id: "message-1", from: crimeCore.victimId, to: crimeCore.culpritId, time: 95, type: "message", gist: "Meet me there.", proves: [] },
        ],
        purchases: [{ id: "purchase-1", who: crimeCore.culpritId, placeId: "station", time: 80, item: "Train ticket", payment: "card" }],
        items: [{
          id: "ledger",
          name: "Private ledger",
          kind: "document",
          description: "A ledger hidden in the kitchen.",
          startRoomId: "keel-14:kitchen",
          finalRoomId: "keel-14:kitchen",
          finalSlot: "kitchen drawer",
          proves: ["motive"],
          contents: [],
        }],
      },
      checkErrors: [],
      source: "hand-written",
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
            id: `device/phone:${crimeCore.culpritId}`,
            type: "device",
            title: "Suspect phone",
            summary: "A mobile phone.",
            access: { tool: "interrogation", witnessId: crimeCore.culpritId },
            aboutIds: [crimeCore.culpritId],
            sourceIds: [],
            data: { deviceId: `phone:${crimeCore.culpritId}`, ownerId: crimeCore.culpritId },
          },
          {
            id: `device/phone:${crimeCore.victimId}`,
            type: "device",
            title: "Victim phone",
            summary: "A mobile phone.",
            access: { tool: "search", roomId: "keel-14:kitchen", slot: "kitchen drawer" },
            aboutIds: [crimeCore.victimId],
            sourceIds: [],
            data: { deviceId: `phone:${crimeCore.victimId}`, ownerId: crimeCore.victimId },
          },
          ...[crimeCore.culpritId, crimeCore.victimId].flatMap((ownerId) => [
            {
              id: `call/call-1/${ownerId}`,
              type: "call",
              title: "Call",
              summary: "Two minute call.",
              access: { tool: "phone", deviceId: `phone:${ownerId}` },
              time: 90,
              aboutIds: [crimeCore.culpritId, crimeCore.victimId],
              sourceIds: ["call-1"],
              data: { ownerId, from: crimeCore.culpritId, to: crimeCore.victimId, proves: [] },
            },
            {
              id: `message/message-1/${ownerId}`,
              type: "message",
              title: "Message",
              summary: "Meet me there.",
              access: { tool: "phone", deviceId: `phone:${ownerId}` },
              time: 95,
              aboutIds: [crimeCore.culpritId, crimeCore.victimId],
              sourceIds: ["message-1"],
              data: { ownerId, from: crimeCore.victimId, to: crimeCore.culpritId, proves: [] },
            },
          ]),
          {
            id: `record/${crimeCore.culpritId}/address`,
            type: "record",
            title: "Address record",
            summary: "Lives at Keel Street.",
            access: { tool: "records" },
            aboutIds: [crimeCore.culpritId],
            sourceIds: [],
            data: { personId: crimeCore.culpritId, kind: "address", proves: [] },
          },
          {
            id: "card/purchase-1",
            type: "card",
            title: "Card payment",
            summary: "Paid for a train ticket.",
            access: { tool: "records" },
            time: 80,
            aboutIds: [crimeCore.culpritId],
            sourceIds: ["purchase-1"],
            data: { who: crimeCore.culpritId, placeId: "station" },
          },
          {
            id: "forensic/scene/prints",
            type: "forensic",
            title: "Fingerprints",
            summary: "Fingerprints match the suspect.",
            access: { tool: "lab", subjectId: "room:keel-14:kitchen" },
            aboutIds: [crimeCore.culpritId],
            sourceIds: ["hidden-event-id"],
            data: { test: "fingerprints", subjectId: "room:keel-14:kitchen", printsOf: [crimeCore.culpritId] },
          },
          {
            id: "item/ledger",
            type: "item",
            title: "Private ledger",
            summary: "A ledger hidden in the kitchen.",
            access: { tool: "search", roomId: "keel-14:kitchen", slot: "kitchen drawer" },
            aboutIds: [crimeCore.culpritId],
            sourceIds: ["ledger"],
            data: { itemId: "ledger", proves: ["motive"] },
          },
          {
            id: "cctv/1",
            type: "cctv",
            title: "Hidden title",
            summary: "Tall person in a dark coat: crosses the concourse.",
            access: { tool: "cctv", cameraId: "cam:station" },
            time: 120,
            end: 125,
            aboutIds: [crimeCore.culpritId],
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
            aboutIds: [crimeCore.victimId],
            sourceIds: ["another-hidden-event"],
            data: { placeId: "station", kind: "stay" },
          },
        ],
      },
      checkErrors: [],
      source: "code",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "text",
      output: { texts: [{ id: "message-1", text: "Meet me by the station." }] },
      checkErrors: [],
      source: "llm",
      updatedAt: 2,
    });
    await ctx.db.insert("generationDrafts", {
      jobId,
      stage: "scripts",
      output: cast.characters.filter((character) => character.role !== "victim").map((character) => ({
        npcId: character.id,
        name: character.name,
        age: character.age,
        gender: character.gender,
        job: character.job?.title ?? "no job",
        home: character.homeUnitId,
        personality: character.traits,
        relationshipToVictim: character.relationshipToVictim,
        secret: character.secret,
        protects: character.protects,
        knowledge: character.id === crimeCore.culpritId
          ? [{ id: "station-meeting", how: "took part", time: 70, end: 75, where: "14 Keel Street, Kitchen", text: "Waited in the kitchen." }]
          : [],
        lies: [],
        rules: ["Only discuss known events."],
      })),
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
  const invalidJobId = await t.run(async (ctx) => {
    const jobId = await ctx.db.insert("generationJobs", {
      seed: 8,
      difficulty: "easy",
      createdBy: "tester",
      createdAt: 3,
      status: "passed",
      finishedAt: 4,
    });
    for await (const draft of ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId))) {
      await ctx.db.insert("generationDrafts", {
        jobId,
        stage: draft.stage,
        output: draft.stage === "facts" ? { facts: [], decisiveIds: [] } : draft.output,
        checkErrors: [],
        source: draft.source,
        updatedAt: 4,
      });
    }
    return jobId;
  });
  await expect(user.mutation(api.sessions.create, { nickname: "Detective", generationJobId: invalidJobId })).rejects.toThrow("no decisive evidence");
  expect(await t.run(async (ctx) => ctx.db.query("cases").withIndex("by_generationJobId", (q) => q.eq("generationJobId", invalidJobId)).unique())).toBeNull();
  await t.run(async (ctx) => ctx.db.patch(invalidJobId, { status: "failed" }));
  const frozen = await t.run(async (ctx) => {
    const session = await ctx.db.get(created.sessionId);
    const solution = session?.caseId
      ? await ctx.db.query("caseSolutions").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).unique()
      : null;
    const culprit = solution ? await ctx.db.get(solution.culpritNpcId) : null;
    const npcs = session?.caseId
      ? await ctx.db.query("npcs").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const items = session?.caseId
      ? await ctx.db.query("caseItems").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const cameras = session?.caseId
      ? await ctx.db.query("cctvCameras").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const cameraRecords = cameras[0]
      ? await ctx.db.query("cctvRecords").withIndex("by_cameraId_and_startTime", (q) => q.eq("cameraId", cameras[0]._id)).collect()
      : [];
    const devices = session?.caseId
      ? await ctx.db.query("devices").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const calls = session?.caseId
      ? await ctx.db.query("callLogs").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const messages = session?.caseId
      ? await ctx.db.query("messages").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const records = session?.caseId
      ? await ctx.db.query("publicRecords").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const forensics = session?.caseId
      ? await ctx.db.query("forensicOutputs").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const events = session?.caseId
      ? await ctx.db.query("caseEvents").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
      : [];
    const scripts = session?.caseId
      ? await ctx.db.query("npcScripts").withIndex("by_caseId", (q) => q.eq("caseId", session.caseId!)).collect()
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
      items,
      cameras,
      cameraRecords,
      devices,
      calls,
      messages,
      records,
      forensics,
      events,
      scripts,
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
  expect(frozen.items).toHaveLength(1);
  expect(frozen.items[0]).toMatchObject({
    evidenceId: "item/ledger",
    sourceId: "ledger",
    slot: "kitchen drawer",
    itemType: "document",
    discoverableBySearch: true,
    collectible: true,
    hidden: true,
  });
  expect(frozen.cameras).toHaveLength(1);
  expect(frozen.cameraRecords).toHaveLength(2);
  expect(frozen.cameraRecords[0].npcIds).toContain(frozen.culprit?._id);
  expect(frozen.devices).toHaveLength(2);
  expect(frozen.calls).toHaveLength(2);
  expect(frozen.calls.map((call) => call.durationSeconds)).toEqual([120, 120]);
  expect(frozen.messages).toHaveLength(2);
  expect(frozen.messages.map((message) => message.body)).toEqual(["Meet me by the station.", "Meet me by the station."]);
  expect(frozen.records).toHaveLength(2);
  expect(frozen.records).toEqual(expect.arrayContaining([
    expect.objectContaining({ evidenceId: `record/${crimeCore.culpritId}/address`, type: "person", title: "Address record" }),
    expect.objectContaining({ evidenceId: "card/purchase-1", type: "other", title: "Card payment" }),
  ]));
  expect(frozen.forensics).toEqual([
    expect.objectContaining({
      evidenceId: "forensic/scene/prints",
      sourceRoomId: expect.any(String),
      testType: "fingerprint",
      linkedNpcIds: [frozen.culprit?._id],
      turnaroundMinutes: 60,
    }),
  ]);
  expect(frozen.events).toEqual([
    expect.objectContaining({ sourceId: "station-meeting", startTime: 70, endTime: 75, description: "Waited in the kitchen." }),
  ]);
  expect(frozen.scripts).toHaveLength(cast.characters.filter((character) => character.role !== "victim").length);
  expect(frozen.scripts.find((script) => script.npcId === frozen.culprit?._id)).toMatchObject({
    knowledge: [expect.objectContaining({ sourceId: "station-meeting", how: "took part" })],
    behavioralRules: ["Only discuss known events."],
  });
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
  expect(await user.query(api.publicRecords.search, { roomCode: created.roomCode, search: "Address" })).toBeNull();
  await t.run(async (ctx) => ctx.db.patch(created.sessionId, { status: "playing" }));
  expect(await user.query(api.publicRecords.search, { roomCode: created.roomCode, search: "Address" })).toEqual([
    expect.objectContaining({ type: "person", title: "Address record", content: "Lives at Keel Street." }),
  ]);
  expect(JSON.stringify(await user.query(api.publicRecords.search, { roomCode: created.roomCode, search: "Address" }))).not.toContain("subjectNpcId");
  await t.run(async (ctx) => ctx.db.patch(created.sessionId, { status: "waiting" }));
  await t.run(async (ctx) => {
    const evidenceDraft = await ctx.db
      .query("generationDrafts")
      .withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "evidence"))
      .unique();
    if (evidenceDraft) await ctx.db.patch(evidenceDraft._id, { output: { cameras: [], evidence: [] } });
  });
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
  await t.run(async (ctx) => {
    const job = await ctx.db.get(generationJobId);
    if (job) await ctx.db.patch(job._id, { status: "failed" });
    const briefDraft = await ctx.db.query("generationDrafts").withIndex("by_job_stage", (q) => q.eq("jobId", generationJobId).eq("stage", "brief")).unique();
    if (briefDraft) await ctx.db.patch(briefDraft._id, { output: { title: "Changed draft", summary: "Changed.", initialFacts: [] } });
  });
  const publishedCaseId = await t.run(async (ctx) => (await ctx.db.get(created.sessionId))?.caseId);
  expect(publishedCaseId).toBeTruthy();
  expect(await user.query(api.cases.listPassed, {})).toEqual([
    expect.objectContaining({
      generationJobId,
      caseId: publishedCaseId,
      difficulty: "easy",
      title: "The Selected Case",
      description: "A specific mystery.",
    }),
  ]);
  const replayed = await user.mutation(api.sessions.createReplay, { nickname: "Detective", caseId: publishedCaseId! });
  expect(replayed.sessionId).not.toBe(created.sessionId);
  expect(await t.run(async (ctx) => {
    const [first, second] = await Promise.all([ctx.db.get(created.sessionId), ctx.db.get(replayed.sessionId)]);
    return first?.caseId === second?.caseId;
  })).toBe(true);
  const unpublishedCaseId = await t.run(async (ctx) => ctx.db.insert("cases", {
    generationJobId: invalidJobId,
    difficulty: "easy",
    title: "Incomplete case",
    summary: "Not ready.",
    initialFacts: [],
    createdAt: 5,
  }));
  await expect(user.mutation(api.sessions.createReplay, { nickname: "Detective", caseId: unpublishedCaseId })).rejects.toThrow("not ready to replay");
  expect(await user.query(api.sessions.listMine, {})).toEqual(expect.arrayContaining([
    expect.objectContaining({ roomCode: created.roomCode, caseTitle: "The Selected Case", status: "waiting" }),
    expect.objectContaining({ roomCode: replayed.roomCode, caseTitle: "The Selected Case", status: "waiting" }),
  ]));
  const cityMap = await user.query(api.world.getMap, { roomCode: created.roomCode });
  expect(cityMap?.places).toHaveLength(20);
  expect(cityMap?.places.find((place) => place.id === "police-bureau")).toMatchObject({
    name: "Police Bureau",
    kind: "bureau",
  });
  expect(cityMap?.streets.some((street) => street.a === "police-bureau" && street.b === "forensic-lab" && street.minutes === 2)).toBe(true);
  expect(cityMap?.streets).toEqual(city.streets);

  const stranger = t.withIdentity({ subject: "player-2" });
  expect(await stranger.query(api.sessions.listMine, {})).toEqual([]);
  expect(await stranger.query(api.sessions.get, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getBrief, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.publicRecords.search, { roomCode: created.roomCode, search: "Address" })).toBeNull();
  expect(await stranger.query(api.cases.getCctv, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.cases.getCctvWindow, { roomCode: created.roomCode, cameraId: "cam:station", minute: 120 })).toBeNull();
  expect(await stranger.query(api.world.getMap, { roomCode: created.roomCode })).toBeNull();
  expect(await stranger.query(api.npcs.list, { roomCode: created.roomCode })).toBeNull();
}, 15_000);

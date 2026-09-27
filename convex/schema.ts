import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Where a "Run all" generation job is. */
export const jobStatus = v.union(v.literal("queued"), v.literal("running"), v.literal("passed"), v.literal("failed"), v.literal("stopped"));

export default defineSchema({
  cases: defineTable({
    generationJobId: v.id("generationJobs"),
    cityId: v.optional(v.id("cities")),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    title: v.string(),
    summary: v.string(),
    initialFacts: v.array(v.string()),
    publicationVersion: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_generationJobId", ["generationJobId"])
    .index("by_publicationVersion", ["publicationVersion"]),
  cities: defineTable({
    caseId: v.id("cases"),
    name: v.string(),
    seed: v.string(),
    version: v.number(),
  }).index("by_caseId", ["caseId"]),
  places: defineTable({
    cityId: v.id("cities"),
    sourceId: v.string(),
    order: v.number(),
    name: v.string(),
    type: v.union(
      v.literal("residence"),
      v.literal("office"),
      v.literal("hospital"),
      v.literal("police_station"),
      v.literal("shop"),
      v.literal("restaurant"),
      v.literal("warehouse"),
      v.literal("hotel"),
      v.literal("park"),
      v.literal("public_building"),
      v.literal("other"),
    ),
    kind: v.union(v.literal("home"), v.literal("work"), v.literal("public"), v.literal("bureau"), v.literal("lab")),
    area: v.union(v.literal("northside"), v.literal("midtown"), v.literal("eastside")),
    description: v.string(),
    mapX: v.number(),
    mapY: v.number(),
    crimeSceneAllowed: v.boolean(),
    jobSlots: v.array(v.string()),
    buildingId: v.optional(v.id("buildings")),
  })
    .index("by_cityId_and_order", ["cityId", "order"])
    .index("by_cityId_and_sourceId", ["cityId", "sourceId"]),
  placeConnections: defineTable({
    cityId: v.id("cities"),
    sourceId: v.string(),
    order: v.number(),
    fromPlaceId: v.id("places"),
    toPlaceId: v.id("places"),
    travelMinutes: v.number(),
    bidirectional: v.boolean(),
    hasCamera: v.boolean(),
  }).index("by_cityId_and_order", ["cityId", "order"]),
  buildings: defineTable({
    placeId: v.id("places"),
    template: v.union(
      v.literal("house"),
      v.literal("apartment"),
      v.literal("office"),
      v.literal("hotel"),
      v.literal("commercial"),
      v.literal("warehouse"),
      v.literal("institution"),
    ),
    floorCount: v.number(),
    layoutSeed: v.string(),
  }).index("by_placeId", ["placeId"]),
  floors: defineTable({
    buildingId: v.id("buildings"),
    floorNumber: v.number(),
  }).index("by_buildingId_and_floorNumber", ["buildingId", "floorNumber"]),
  rooms: defineTable({
    buildingId: v.id("buildings"),
    floorId: v.id("floors"),
    sourceId: v.string(),
    order: v.number(),
    name: v.string(),
    type: v.string(),
    searchable: v.boolean(),
    isEntrance: v.boolean(),
    itemSlots: v.array(v.string()),
    hasCamera: v.boolean(),
  })
    .index("by_buildingId_and_order", ["buildingId", "order"])
    .index("by_buildingId_and_sourceId", ["buildingId", "sourceId"])
    .index("by_floorId", ["floorId"]),
  roomConnections: defineTable({
    buildingId: v.id("buildings"),
    order: v.number(),
    fromRoomId: v.id("rooms"),
    toRoomId: v.id("rooms"),
    type: v.union(v.literal("door"), v.literal("corridor"), v.literal("stairs"), v.literal("elevator")),
  }).index("by_buildingId_and_order", ["buildingId", "order"]),
  homeUnits: defineTable({
    cityId: v.id("cities"),
    buildingId: v.id("buildings"),
    roomId: v.id("rooms"),
    sourceId: v.string(),
    label: v.string(),
  })
    .index("by_buildingId", ["buildingId"])
    .index("by_cityId_and_sourceId", ["cityId", "sourceId"]),
  caseItems: defineTable({
    caseId: v.id("cases"),
    evidenceId: v.string(),
    sourceId: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    placeId: v.id("places"),
    roomId: v.id("rooms"),
    slot: v.string(),
    discoverableBySearch: v.boolean(),
    collectible: v.boolean(),
    hidden: v.boolean(),
    itemType: v.string(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_evidenceId", ["caseId", "evidenceId"])
    .index("by_caseId_and_sourceId", ["caseId", "sourceId"])
    .index("by_roomId", ["roomId"]),
  forensicOutputs: defineTable({
    caseId: v.id("cases"),
    evidenceId: v.string(),
    sourceItemId: v.optional(v.id("caseItems")),
    sourceRoomId: v.optional(v.id("rooms")),
    testType: v.union(
      v.literal("fingerprint"),
      v.literal("footprint"),
      v.literal("dna"),
      v.literal("blood"),
      v.literal("toxicology"),
      v.literal("fiber"),
      v.literal("ballistics"),
      v.literal("autopsy"),
      v.literal("other"),
    ),
    result: v.string(),
    linkedNpcIds: v.array(v.id("npcs")),
    turnaroundMinutes: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_evidenceId", ["caseId", "evidenceId"]),
  vehicles: defineTable({
    caseId: v.id("cases"),
    registration: v.string(),
    make: v.string(),
    model: v.string(),
    description: v.string(),
    ownerNpcId: v.optional(v.id("npcs")),
  }).index("by_caseId", ["caseId"]),
  cctvCameras: defineTable({
    caseId: v.id("cases"),
    sourceId: v.string(),
    placeId: v.optional(v.id("places")),
    roomId: v.optional(v.id("rooms")),
    streetFromPlaceId: v.optional(v.id("places")),
    streetToPlaceId: v.optional(v.id("places")),
    name: v.string(),
    description: v.string(),
    faulty: v.boolean(),
    startTime: v.number(),
    endTime: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_sourceId", ["caseId", "sourceId"]),
  cctvRecords: defineTable({
    caseId: v.id("cases"),
    evidenceId: v.string(),
    cameraId: v.id("cctvCameras"),
    startTime: v.number(),
    endTime: v.number(),
    npcIds: v.array(v.id("npcs")),
    vehicleIds: v.array(v.id("vehicles")),
    description: v.string(),
    kind: v.union(v.literal("stay"), v.literal("pass"), v.literal("offline")),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_evidenceId", ["caseId", "evidenceId"])
    .index("by_cameraId_and_startTime", ["cameraId", "startTime"]),
  devices: defineTable({
    caseId: v.id("cases"),
    sourceId: v.string(),
    type: v.union(v.literal("phone"), v.literal("laptop")),
    ownerNpcId: v.optional(v.id("npcs")),
    name: v.string(),
    description: v.string(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_sourceId", ["caseId", "sourceId"]),
  callLogs: defineTable({
    caseId: v.id("cases"),
    evidenceId: v.string(),
    deviceId: v.id("devices"),
    otherPartyNpcId: v.optional(v.id("npcs")),
    otherPartyLabel: v.optional(v.string()),
    timestamp: v.number(),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    durationSeconds: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_deviceId_and_timestamp", ["deviceId", "timestamp"]),
  messages: defineTable({
    caseId: v.id("cases"),
    evidenceId: v.string(),
    deviceId: v.id("devices"),
    otherPartyNpcId: v.optional(v.id("npcs")),
    otherPartyLabel: v.optional(v.string()),
    timestamp: v.number(),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    body: v.string(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_deviceId_and_timestamp", ["deviceId", "timestamp"]),
  publicRecords: defineTable({
    caseId: v.id("cases"),
    evidenceId: v.string(),
    type: v.union(
      v.literal("person"),
      v.literal("property"),
      v.literal("vehicle"),
      v.literal("business"),
      v.literal("criminal"),
      v.literal("employment"),
      v.literal("other"),
    ),
    subjectNpcId: v.optional(v.id("npcs")),
    subjectVehicleId: v.optional(v.id("vehicles")),
    title: v.string(),
    content: v.string(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_evidenceId", ["caseId", "evidenceId"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["caseId"] }),
  npcs: defineTable({
    caseId: v.id("cases"),
    sourceId: v.string(),
    role: v.union(v.literal("victim"), v.literal("suspect"), v.literal("witness")),
    name: v.string(),
    age: v.optional(v.number()),
    occupation: v.optional(v.string()),
    publicDescription: v.string(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_sourceId", ["caseId", "sourceId"]),
  // Canonical answers never receive a public query. Only case-close internals may read them.
  caseSolutions: defineTable({
    caseId: v.id("cases"),
    culpritNpcId: v.id("npcs"),
    motive: v.string(),
    weaponDescription: v.optional(v.string()),
    method: v.string(),
    canonicalExplanation: v.string(),
    keyReasoningPoints: v.array(v.string()),
    evidenceGroups: v.array(v.object({
      description: v.string(),
      requiredEvidenceIds: v.array(v.string()),
    })),
  }).index("by_caseId", ["caseId"]),
  caseEvents: defineTable({
    caseId: v.id("cases"),
    sourceId: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    npcIds: v.array(v.id("npcs")),
    placeId: v.id("places"),
    roomId: v.optional(v.id("rooms")),
    description: v.string(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_sourceId", ["caseId", "sourceId"]),
  npcScripts: defineTable({
    caseId: v.id("cases"),
    npcId: v.id("npcs"),
    personality: v.array(v.string()),
    job: v.string(),
    home: v.string(),
    relationshipToVictim: v.string(),
    secret: v.optional(v.string()),
    protects: v.optional(v.string()),
    knowledge: v.array(v.object({
      sourceId: v.string(),
      how: v.union(v.literal("took part"), v.literal("saw"), v.literal("sent"), v.literal("received"), v.literal("bought"), v.literal("heard")),
      time: v.number(),
      end: v.optional(v.number()),
      where: v.optional(v.string()),
      text: v.string(),
    })),
    intentionalLies: v.array(v.object({
      topic: v.union(v.literal("whereabouts"), v.literal("relationship"), v.literal("motive"), v.literal("item"), v.literal("secret")),
      claim: v.string(),
      truthIds: v.array(v.string()),
      reason: v.string(),
      disprovingEvidenceIds: v.array(v.string()),
      whenCaught: v.union(v.literal("full-truth"), v.literal("admit-shown"), v.literal("backup-lie")),
      backupLie: v.optional(v.object({ claim: v.string(), disprovingEvidenceIds: v.array(v.string()) })),
    })),
    behavioralRules: v.array(v.string()),
  })
    .index("by_caseId", ["caseId"])
    .index("by_npcId", ["npcId"]),
  sessions: defineTable({
    caseId: v.optional(v.id("cases")),
    roomCode: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_roomCode", ["roomCode"])
    .index("by_expiresAt", ["expiresAt"]),
  sessionPlayers: defineTable({
    sessionId: v.id("sessions"),
    authUserId: v.string(),
    nickname: v.string(),
    isReady: v.optional(v.boolean()),
    joinedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_authUserId", ["sessionId", "authUserId"])
    .index("by_authUserId", ["authUserId"]),
  clueBoardNodes: defineTable({
    sessionId: v.id("sessions"),
    type: v.union(v.literal("note"), v.literal("cctv"), v.literal("public_record")),
    referenceId: v.optional(v.string()),
    text: v.string(),
    x: v.number(),
    y: v.number(),
    createdByPlayerId: v.id("sessionPlayers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sessionId", ["sessionId"]),
  clueBoardEdges: defineTable({
    sessionId: v.id("sessions"),
    sourceNodeId: v.id("clueBoardNodes"),
    targetNodeId: v.id("clueBoardNodes"),
    color: v.union(v.literal("red"), v.literal("gold"), v.literal("blue"), v.literal("green")),
    createdByPlayerId: v.id("sessionPlayers"),
    createdAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sourceNodeId", ["sourceNodeId"])
    .index("by_targetNodeId", ["targetNodeId"]),

  // Case generation (dev tester + pipeline). Drafts hold hidden case data: never expose outside dev tools.
  generationJobs: defineTable({
    seed: v.number(),
    difficulty: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard")),
    createdBy: v.string(),
    createdAt: v.number(),
    /** Set while an AI stage runs in the background: which stage and which try (0 = first, then repairs). */
    running: v.optional(v.object({ stage: v.string(), attempt: v.number() })),
    /** "Run all" only; single-stage tester runs leave these empty. */
    status: v.optional(jobStatus),
    failedStage: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    workflowId: v.optional(v.string()),
    /** Test runs: the jobs started together share this label. */
    batch: v.optional(v.string()),
  })
    .index("by_batch", ["batch"])
    .index("by_status", ["status"]),
  generationDrafts: defineTable({
    jobId: v.id("generationJobs"),
    stage: v.string(),
    output: v.any(),
    checkErrors: v.array(v.string()),
    source: v.union(v.literal("hand-written"), v.literal("code"), v.literal("llm")),
    updatedAt: v.number(),
  })
    .index("by_job_stage", ["jobId", "stage"])
    .index("by_stage", ["stage"]),
  // Every AI call made while generating, kept for debugging and cost tracking.
  generationLogs: defineTable({
    jobId: v.id("generationJobs"),
    stage: v.string(),
    model: v.string(),
    mode: v.union(v.literal("strict"), v.literal("json")),
    system: v.string(),
    prompt: v.string(),
    rawText: v.string(),
    problems: v.array(v.string()),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    ms: v.number(),
    /** 0 = first try, then 1, 2 for repairs. */
    attempt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_job", ["jobId"]),
});

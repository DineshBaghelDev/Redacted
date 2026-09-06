# Database — Convex Schema

The schema is normalized. Generated truth and mutable session state are deliberately separated.

IDs below represent Convex document IDs such as `Id<"npcs">`.

## Case generation and metadata

### `cases`

```ts
{
  schemaVersion: 1,
  seed: string,
  caseCode: string,
  title: string,
  genre: string,
  difficulty: "easy" | "medium" | "hard",
  expectedLength: "short" | "medium" | "long",
  status: "generating" | "validating" | "repairing" | "ready" | "failed",
  cityId?: Id<"cities">,
  estimatedOptimalMinutes?: number,
  generationRunId?: Id<"generationRuns">,
  createdAt: number,
}
```

Indexes:

- `by_caseCode`
- `by_status`

### `generationRuns`

```ts
{
  caseId: Id<"cases">,
  stage:
    | "crime_skeleton"
    | "timeline"
    | "characters"
    | "city_assignment"
    | "physical_evidence"
    | "records"
    | "forensics"
    | "brief"
    | "time_estimate"
    | "validation"
    | "repair"
    | "complete",
  status: "running" | "failed" | "complete",
  repairAttempts: number,
  startedAt: number,
  completedAt?: number,
  error?: string,
}
```

### `caseBriefs`

```ts
{
  caseId: Id<"cases">,
  incidentType: string,
  locationId: Id<"places">,
  incidentTime: number,
  reportedByNpcId?: Id<"npcs">,
  reportedByText?: string,
  summary: string,
  initialFacts: string[],
}
```

### `caseSolutions` — server-only

```ts
{
  caseId: Id<"cases">,
  culpritNpcId: Id<"npcs">,
  motive: string,
  weaponItemId?: Id<"caseItems">,
  weaponDescription?: string,
  method: string,
  canonicalExplanation: string,
  keyReasoningPoints: string[],
  evidenceGroups: Array<{
    description: string,
    requiredEvidenceIds: string[],
  }>,
}
```

### `caseEvents` — server-only canonical timeline

```ts
{
  caseId: Id<"cases">,
  startTime: number,
  endTime?: number,
  npcIds: Id<"npcs">[],
  placeId: Id<"places">,
  roomId?: Id<"rooms">,
  description: string,
}
```

## City/world

### `cities`

```ts
{
  caseId: Id<"cases">,
  name: string,
  seed: string,
}
```

### `places`

At least 10 per city.

```ts
{
  cityId: Id<"cities">,
  name: string,
  type:
    | "residence"
    | "office"
    | "hospital"
    | "police_station"
    | "shop"
    | "restaurant"
    | "warehouse"
    | "hotel"
    | "park"
    | "public_building"
    | "other",
  description: string,
  buildingId?: Id<"buildings">,
}
```

### `placeConnections`

```ts
{
  cityId: Id<"cities">,
  fromPlaceId: Id<"places">,
  toPlaceId: Id<"places">,
  travelMinutes: number,
  bidirectional: boolean,
}
```

### `buildings`

```ts
{
  placeId: Id<"places">,
  template:
    | "house"
    | "apartment"
    | "office"
    | "hotel"
    | "commercial"
    | "warehouse"
    | "institution",
  floorCount: number,
  layoutSeed: string,
}
```

### `floors`

```ts
{
  buildingId: Id<"buildings">,
  floorNumber: number,
}
```

### `rooms`

```ts
{
  floorId: Id<"floors">,
  name: string,
  type: string,
  searchable: boolean,
}
```

### `roomConnections`

Corridors are normally edges, not rooms.

```ts
{
  buildingId: Id<"buildings">,
  fromRoomId: Id<"rooms">,
  toRoomId: Id<"rooms">,
  type: "door" | "corridor" | "stairs" | "elevator",
}
```

Create an actual corridor room only if the corridor itself is searchable/interactable.

## NPCs

### `npcs`

```ts
{
  caseId: Id<"cases">,
  name: string,
  age?: number,
  occupation?: string,
  homePlaceId?: Id<"places">,
  workplaceId?: Id<"places">,
  publicDescription: string,
}
```

### `npcScripts` — server-only

```ts
{
  caseId: Id<"cases">,
  npcId: Id<"npcs">,
  personality: string,
  goals: string[],
  experiences: string[],
  knowledge: string[],
  secrets: string[],
  intentionalLies: string[],
  behavioralRules: string[],
}
```

Logical relation: one NPC to one private script.

## Physical objects and search

### `caseItems`

Physical recoverable/inspectable objects only. Forensic conclusions do not belong here.

```ts
{
  caseId: Id<"cases">,
  name: string,
  description: string,
  placeId: Id<"places">,
  roomId?: Id<"rooms">,
  discoverableBySearch: boolean,
  collectible: boolean,
  hidden: boolean,
  itemType: string,
}
```

## Forensics

### `forensicOutputs`

Pre-generated truth.

```ts
{
  caseId: Id<"cases">,
  sourceItemId?: Id<"caseItems">,
  sourceRoomId?: Id<"rooms">,
  testType:
    | "fingerprint"
    | "footprint"
    | "dna"
    | "blood"
    | "toxicology"
    | "fiber"
    | "ballistics"
    | "autopsy"
    | "other",
  result: string,
  linkedNpcIds: Id<"npcs">[],
  turnaroundMinutes: number,
}
```

### `forensicRequests`

Mutable per session.

```ts
{
  sessionId: Id<"sessions">,
  forensicOutputId: Id<"forensicOutputs">,
  requestedAtGameTime: number,
  readyAtGameTime: number,
  status: "pending" | "ready" | "viewed",
}
```

## CCTV

### `cctvCameras`

```ts
{
  caseId: Id<"cases">,
  placeId: Id<"places">,
  roomId?: Id<"rooms">,
  name: string,
  description: string,
}
```

### `cctvRecords`

```ts
{
  caseId: Id<"cases">,
  cameraId: Id<"cctvCameras">,
  startTime: number,
  endTime: number,
  npcIds: Id<"npcs">[],
  vehicleIds: Id<"vehicles">[],
  description: string,
}
```

## Vehicles

### `vehicles`

```ts
{
  caseId: Id<"cases">,
  registration: string,
  make: string,
  model: string,
  description: string,
  ownerNpcId?: Id<"npcs">,
}
```

## Devices and digital records

### `devices`

```ts
{
  caseId: Id<"cases">,
  type: "phone" | "laptop",
  ownerNpcId?: Id<"npcs">,
  name: string,
  description: string,
}
```

### `callLogs`

This replaces the earlier incorrect `contacts` concept.

```ts
{
  caseId: Id<"cases">,
  deviceId: Id<"devices">,
  otherPartyNpcId?: Id<"npcs">,
  otherPartyLabel?: string,
  timestamp: number,
  direction: "incoming" | "outgoing",
  durationSeconds: number,
}
```

### `messages`

```ts
{
  caseId: Id<"cases">,
  deviceId: Id<"devices">,
  otherPartyNpcId?: Id<"npcs">,
  otherPartyLabel?: string,
  timestamp: number,
  direction: "incoming" | "outgoing",
  body: string,
}
```

There is no social-post table in V1.

## Public records

### `publicRecords`

```ts
{
  caseId: Id<"cases">,
  type:
    | "person"
    | "property"
    | "vehicle"
    | "business"
    | "criminal"
    | "employment"
    | "other",
  subjectNpcId?: Id<"npcs">,
  subjectVehicleId?: Id<"vehicles">,
  title: string,
  content: string,
}
```

## Sessions and multiplayer

### `sessions`

```ts
{
  caseId: Id<"cases">,
  roomCode: string,
  status: "generating" | "waiting" | "playing" | "judging" | "completed" | "expired",
  gameTime: number,
  deadline: number,
  deadlineOverrideMinutes?: number,
  createdAt: number,
  expiresAt: number,
  endedAt?: number,
}
```

Indexes:

- `by_roomCode`
- `by_caseId`
- `by_expiresAt`

Abandoned sessions expire after 7 days.

### `sessionPlayers`

```ts
{
  sessionId: Id<"sessions">,
  authUserId: string,
  nickname: string,
  reconnectSecretHash: string,
  currentPlaceId: Id<"places">,
  currentRoomId?: Id<"rooms">,
  joinedAt: number,
}
```

Enforce maximum 2 players in mutation logic.

### `sessionState`

Fast current snapshot. Keep it small.

```ts
{
  sessionId: Id<"sessions">,
  version: number,
  discoveredItemIds: Id<"caseItems">[],
  inventoryItemIds: Id<"caseItems">[],
  updatedAt: number,
}
```

No `phase` field exists.

### `sessionEvents`

Append-only audit/debug log of meaningful game mutations.

```ts
{
  sessionId: Id<"sessions">,
  version: number,
  actorPlayerId?: Id<"sessionPlayers">,
  type: string,
  payload: unknown,
  createdAt: number,
}
```

Examples: player joined, traveled, searched, item acquired, forensic requested, NPC message sent, board changed, accusation submitted, reset, ended.

Do not log ordinary UI navigation.

## Presence

### `presence`

```ts
{
  sessionId: Id<"sessions">,
  playerId: Id<"sessionPlayers">,
  lastSeenAt: number,
}
```

## NPC conversations and memory

### `npcConversations`

```ts
{
  sessionId: Id<"sessions">,
  npcId: Id<"npcs">,
  threadId: string,
  activeGeneration: boolean,
  nextSequence: number,
}
```

Logical uniqueness: `(sessionId, npcId)`.

If `@convex-dev/agent` owns message persistence, do not duplicate its message table unless required.

### `npcPendingMessages`

Use if the selected conversation library does not provide exactly the queue semantics required.

```ts
{
  conversationId: Id<"npcConversations">,
  playerId: Id<"sessionPlayers">,
  sequence: number,
  body: string,
  status: "queued" | "processing" | "complete" | "failed",
  createdAt: number,
}
```

### `npcMemories`

```ts
{
  sessionId: Id<"sessions">,
  npcId: Id<"npcs">,
  type: "player_claim" | "npc_statement" | "interaction",
  content: string,
  sourceMessageIds: string[],
  createdAt: number,
}
```

Player claims must remain claims, not canonical facts.

## Clue board

### `clueBoardNodes`

```ts
{
  sessionId: Id<"sessions">,
  type:
    | "note"
    | "npc"
    | "item"
    | "message"
    | "call"
    | "cctv"
    | "forensic"
    | "vehicle"
    | "place"
    | "public_record",
  referenceId?: string,
  text?: string,
  x: number,
  y: number,
  createdByPlayerId: Id<"sessionPlayers">,
  createdAt: number,
  updatedAt: number,
}
```

### `clueBoardEdges`

```ts
{
  sessionId: Id<"sessions">,
  sourceNodeId: Id<"clueBoardNodes">,
  targetNodeId: Id<"clueBoardNodes">,
  label?: string,
  createdByPlayerId: Id<"sessionPlayers">,
  createdAt: number,
}
```

## Case close

### `accusations`

```ts
{
  sessionId: Id<"sessions">,
  submittedByPlayerId: Id<"sessionPlayers">,
  culpritNpcId: Id<"npcs">,
  motiveExplanation: string,
  weaponItemId?: Id<"caseItems">,
  weaponDescription?: string,
  evidenceIds: string[],
  evidenceExplanation: string,
  methodExplanation: string,
  status: "pending" | "judging" | "complete",
  result?: {
    killer: { star: boolean },
    motive: { star: boolean, feedback?: string },
    weapon: { star: boolean },
    evidence: { star: boolean, feedback?: string },
    method: { star: boolean, feedback?: string },
    totalStars: 0 | 1 | 2 | 3 | 4 | 5,
  },
  createdAt: number,
}
```

## LLM telemetry

### `llmCalls`

```ts
{
  task:
    | "case_generation"
    | "case_repair"
    | "npc_reply"
    | "npc_memory"
    | "accusation_judge",
  caseId?: Id<"cases">,
  sessionId?: Id<"sessions">,
  npcId?: Id<"npcs">,
  provider: string,
  model: string,
  inputTokens?: number,
  outputTokens?: number,
  latencyMs: number,
  success: boolean,
  errorType?: string,
  createdAt: number,
}
```

Do not persist full prompts by default.

## High-level relations

```text
case
|- 1 brief
|- 1 private solution
|- N private canonical events
|- 1 city
|  |- >=10 places
|  |  |- optional building
|  |     |- N floors
|  |        |- N rooms
|  |           `- room connections
|  `- place connections
|- N NPCs
|  `- 1 private NPC script
|- N physical items
|- N forensic outputs
|- N CCTV cameras -> N CCTV records
|- N vehicles
|- N devices -> calls/messages
|- N public records
`- N sessions
   |- <=2 players
   |- 1 small state snapshot
   |- N append-only events
   |- N forensic requests
   |- N NPC conversations -> N memories
   |- N clue-board nodes -> N edges
   `- N accusations (normally one final accepted submission)
```

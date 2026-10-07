# Internal Functions and State Logic

This file defines application behavior that should remain deterministic unless explicitly marked as LLM-backed.

## Common guards

Every session-scoped function should compose these guards rather than reimplementing ad hoc checks.

```ts
requireAccountIdentity(ctx)
requireSessionMember(ctx, sessionId)
requireCaseReady(ctx, caseId)
requireSessionActive(ctx, sessionId)
requireEntityBelongsToCase(entityId, caseId)
requireEntityBelongsToSession(entityId, sessionId)
requireBeforeDeadline(session)
```

## Session lifecycle

### `createGeneratedGame(input, identity, nickname)`

1. Create placeholder case in `generating`.
2. Generate unique room code.
3. Create session in `generating`.
4. Generate reconnect secret; store only secure hash.
5. Create first player.
6. Start durable case-generation workflow.
7. Return room code + raw reconnect secret once without waiting for generation.
8. When generation freezes the case as `ready`, initialize game clock/location and the default or user-overridden deadline from generated case data, then transition the room into playable state.

### `createReplaySession(caseId, identity, nickname)`

1. Verify existing case `ready`.
2. Generate new room/session and reconnect secret.
3. Set session `gameTime` to canonical case starting time/minute origin.
4. Set default `deadline = gameTime + estimatedOptimalMinutes + 1440`, unless the user supplied an override.
5. Spawn first player at the initial case location.
6. Create fresh state snapshot version 1.
7. Return room code + raw reconnect secret once.

### `joinSession(roomCode, identity, nickname)`

Transactionally:

- reject expired/non-joinable room,
- count current session players,
- reject if already 2,
- insert second player,
- create reconnect secret,
- append event.

### `reconnectSession(roomCode, reconnectSecret)`

- hash/verify secret,
- resolve exact player slot,
- bind current Clerk user identity if reconnect policy allows,
- never create a third player.

### `resetSession(sessionId)`

Create fresh mutable session state from the same immutable case. Prefer creating a new session record over destructive in-place history deletion if product UX allows it.

### `expireSessions`

Scheduled cleanup/mark-expired logic for sessions abandoned >7 days.

## State snapshot + append-only events

For each meaningful mutation:

```text
validate
  -> apply current snapshot change
  -> increment version
  -> append event with same version
```

Snapshot is for fast reads. Event log is for debugging/reconstruction, not the primary read path.

## Game-time engine

All time values are integer in-game minutes.

### Continuous action-driven clock

- Store an integer game-time anchor and an optional wall-clock timestamp for when the active interval began.
- While one or more timed actions are active, derive current game time from the anchor, elapsed wall time, and the server-owned speed multiplier.
- New actions start at that derived game time and may overlap actions already in progress.
- When the last active action completes, persist the derived game time and clear the wall-clock anchor so discussion and review do not consume the deadline.
- Treat actions and forensic requests as complete when derived game time reaches their recorded completion time; materialize completion during the next authorized server interaction rather than writing per-minute ticks.
- Preserve state after the deadline is crossed; deadline UX decides which new investigation actions remain available.

The deadline prevents further ordinary investigation actions according to final UX rules, but existing data is not deleted.

### Fixed action costs

```ts
const ACTION_TIME = {
  MOVE_ROOM: 1,
  MOVE_FLOOR: 2,
  SEARCH_ROOM: 15,
  INSPECT_ITEM: 2,
  NPC_QUESTION: 3,
  CCTV_WINDOW: 5,
  READ_DEVICE: 5,
  PUBLIC_RECORD_SEARCH: 10,
  SUBMIT_FORENSIC: 5,
  CLUE_BOARD_EDIT: 0,
  REVIEW_EXISTING_INFO: 0,
  CASE_CLOSE: 0,
} as const;
```

Travel between places uses `placeConnections.travelMinutes`.

Default forensic turnaround values:

```ts
const FORENSIC_TURNAROUND = {
  fingerprint: 60,
  footprint: 60,
  blood: 120,
  dna: 240,
  toxicology: 240,
  fiber: 120,
  ballistics: 180,
  autopsy: 240,
} as const;
```

Generated forensic outputs may override these only within validator-approved bounds if desired. Simpler V1: use the constants exactly.

## Procedural city/interior generation

### `generateCityGraph(seed, minimumPlaces = 10)`

Deterministic code, not LLM.

Requirements:

- >=10 places,
- connected graph,
- no unreachable required location,
- reasonable edge travel times,
- deterministic output for same seed.

### `generateBuildingLayout(template, layoutSeed, parameters)`

Deterministic template library.

LLM may choose/assign:

- building type/template,
- number of floors/rooms within practical generation/runtime limits,
- semantic names/owners,
- which generated rooms are story-relevant.

Code creates actual layout/connectivity.

Corridors are represented as connection edges unless they are searchable locations.

## Travel

### `travelToPlace(sessionId, playerId, destinationId)`

- compute deterministic shortest path from current place to destination,
- reject if unreachable,
- sum `travelMinutes` across the path,
- start a journey ending at the derived shared game time plus that cost,
- update player current place only when that journey completes,
- pause the shared clock at the final journey's completion time when no timed journey remains.

Both players may be at different places simultaneously.

### `moveToRoom(roomCode, destinationRoomId)`

- same building/floor graph validation,
- use 1 minute for normal room edge,
- 2 minutes when transition crosses floors,
- update current room on completion; allow another player to act concurrently.

## Search

### `searchRoom(roomCode)`

- require player physically present in room,
- require searchable room,
- advance 15 minutes,
- reveal all case items configured to be revealed by that search operation according to the fixture/generated case data,
- never generate new evidence,
- add only collectible items to inventory when explicitly collected.

`inspectItem(roomCode, itemId)` requires a discovered item in the current room or shared inventory and reveals its stored description after 2 game minutes. `collectItem(roomCode, itemId)` requires a discovered, collectible item in the player's current room and adds it to shared inventory without inventing evidence.

If progressive/multiple searches per room are later desired, add deterministic search tiers rather than LLM generation.

## CCTV

### `cases.startCctvReview(roomCode, cameraId, minute)` / `cases.getCctvWindow(roomCode, cameraId, minute)`

- validate bureau access, camera, and selected time,
- start a fixed 5-minute action for the selected 40-minute window,
- withhold matching pre-generated CCTV records until the action completes,
- share completed reviews with both players,
- never fabricate missing footage.

CCTV output is textual/data only and never visual media.

## Devices

### `inspectDevice(sessionId, deviceId)`

- validate the device is legitimately accessible/discovered,
- charge device-read cost,
- expose pre-generated calls/messages associated with it.

## Public records

### `searchPublicRecords(sessionId, query)`

- charge fixed cost,
- perform deterministic lexical/fuzzy search over this case's `publicRecords`,
- no LLM required for retrieval.

## Forensics

### `requestForensicTest(sessionId, outputId)`

- verify the relevant source item/location has been legitimately discovered/available,
- reject duplicate equivalent active request,
- charge submission time,
- set `readyAtGameTime = currentGameTime + 5 submission minutes + turnaroundMinutes`.

An outstanding request keeps the shared clock running through its turnaround, overlapping other detectives' work. Once ready, the clock pauses if no other timed action remains. Reading a ready result is a separate free action at the lab.

No actual calculation is done during the wait. The pre-generated output is hidden until ready.

## NPC context builder

### `buildNpcContext(sessionId, npcId)`

Allowed context:

- NPC's own private script,
- limited public world facts required for coherent roleplay,
- canonical experiences/knowledge belonging to that NPC,
- shared conversation history for this NPC/session,
- shared session memories for this NPC/session.

Forbidden context:

- `caseSolutions`,
- complete canonical timeline unless explicitly filtered to events the NPC experienced/knows,
- another NPC's private script,
- hidden forensic truth the NPC could not know,
- hidden player discoveries.

## Same-NPC message ordering

### `enqueueNpcMessage`

Transactionally increment `nextSequence` and persist the user message.

### `processNextNpcMessage`

For each `(sessionId, npcId)` conversation:

1. if generation active, exit,
2. claim lowest queued sequence,
3. mark active,
4. build context,
5. stream persisted reply,
6. mark message complete,
7. extract/update NPC memory,
8. clear active,
9. schedule next queued message if present.

Concurrent messages are accepted; LLM turns are serialized per NPC.

Different NPC conversations may process concurrently.

## NPC memory

### `extractNpcMemory`

LLM-backed or structured heuristic.

Memory entries must retain epistemic framing.

Correct:

```text
Player A claimed they saw John at 20:00.
```

Incorrect:

```text
John was at the location at 20:00.
```

No memory may become canonical case truth.

## Clue board

React Flow maintains local interaction state; every persistent mutation writes to Convex.

- notes are user-authored,
- reference nodes point to existing discovered entities,
- edges are user-authored hypotheses/relationships,
- nothing on the board modifies canonical case data.

## Case close grading

### Deterministic parts

- killer: exact NPC ID match,
- weapon: exact item ID when canonical weapon is a stored item,
- totalStars: server sum of five booleans.

### Semantic parts

LLM receives only canonical grading material and player's submission.

- motive semantic match,
- evidence explanation semantic validity after deterministic evidence-group check,
- method semantic match.

The LLM returns a strict structured result. It never computes the final star total.

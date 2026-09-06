# Internal Functions and State Logic

This file defines application behavior that should remain deterministic unless explicitly marked as LLM-backed.

## Common guards

Every session-scoped function should compose these guards rather than reimplementing ad hoc checks.

```ts
requireAnonymousIdentity(ctx)
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
8. When generation freezes the case as `ready`, initialize game clock/deadline/location from generated case data and transition the room into playable state.

### `createReplaySession(caseId, identity, nickname)`

1. Verify existing case `ready`.
2. Generate new room/session and reconnect secret.
3. Set session `gameTime` to canonical case starting time/minute origin.
4. Set `deadline = gameTime + estimatedOptimalMinutes + 1440`.
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
- bind current anonymous identity if reconnect policy allows,
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

### `advanceGameTime(sessionId, minutes, reason, actorPlayerId?)`

Transactionally:

1. assert `minutes >= 0`,
2. increment session `gameTime`,
3. resolve pending forensic requests whose `readyAtGameTime <= gameTime`,
4. append time/action event,
5. preserve state even if the deadline has now been crossed.

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
- number of floors/rooms within allowed bounds,
- semantic names/owners,
- which generated rooms are story-relevant.

Code creates actual layout/connectivity.

Corridors are represented as connection edges unless they are searchable locations.

## Travel

### `travelToPlace(sessionId, playerId, destinationId)`

- compute deterministic shortest path from current place to destination,
- reject if unreachable,
- sum `travelMinutes` across the path,
- update player current place,
- clear/update room position appropriately,
- advance game time by summed path cost.

Both players may be at different places simultaneously.

### `moveToRoom(sessionId, playerId, destinationRoomId)`

- same building/floor graph validation,
- use 1 minute for normal room edge,
- 2 minutes when transition crosses floors,
- update current room.

## Search

### `searchRoom(sessionId, playerId, roomId)`

- require player physically present in room,
- require searchable room,
- advance 15 minutes,
- reveal all case items configured to be revealed by that search operation according to the fixture/generated case data,
- never generate new evidence,
- add only collectible items to inventory when explicitly collected.

If progressive/multiple searches per room are later desired, add deterministic search tiers rather than LLM generation.

## CCTV

### `inspectCctvWindow(sessionId, cameraId, start, end)`

- validate camera access and time range,
- charge fixed action time,
- return matching pre-generated CCTV records,
- never fabricate missing footage.

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
- set `readyAtGameTime = currentGameTime + turnaroundMinutes`.

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

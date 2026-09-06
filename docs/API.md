# API Surface

Core application API is composed of **typed Convex queries, mutations, and actions**. Do not create REST endpoints for ordinary game operations.

Every client-callable function must authenticate the anonymous user and enforce session/case authorization.

## Public queries

### Case/generation

```ts
cases.getPublic({ caseCode })
generation.getStatus({ caseId })
```

`cases.getPublic` returns only safe metadata and never private solution/timeline/script data.

### Sessions

```ts
sessions.get({ sessionId })
sessions.getPlayers({ sessionId })
sessions.getState({ sessionId })
sessions.getTime({ sessionId })
```

### World/navigation

```ts
world.getCity({ sessionId })
world.getPlace({ sessionId, placeId })
world.getPlaceConnections({ sessionId, placeId })
world.getBuilding({ sessionId, buildingId })
world.getFloor({ sessionId, floorId })
world.getRoom({ sessionId, roomId })
world.getRoomConnections({ sessionId, roomId })
```

### Investigation

```ts
search.getRoomDiscoveries({ sessionId, roomId })
inventory.list({ sessionId })

cctv.listCameras({ sessionId, placeId? })
cctv.getRecords({ sessionId, cameraId, startTime, endTime })

devices.listAvailable({ sessionId })
devices.get({ sessionId, deviceId })
calls.list({ sessionId, deviceId })
messages.list({ sessionId, deviceId })

publicRecords.search({ sessionId, query })

forensics.listRequests({ sessionId })
forensics.getRequest({ sessionId, requestId })
```

Public-record search must search only the pre-generated public-record corpus for the case.

### NPC/interrogation

```ts
npcs.list({ sessionId })
npcs.getPublic({ sessionId, npcId })
npcConversations.get({ sessionId, npcId })
npcConversations.getMessages({ sessionId, npcId })
```

If the selected Convex agent/thread component supplies message queries, use its API instead of duplicating them.

### Clue board

```ts
clueBoard.getNodes({ sessionId })
clueBoard.getEdges({ sessionId })
```

### Presence

```ts
presence.list({ sessionId })
```

### Case close

```ts
caseClose.getResult({ sessionId })
```

## Public mutations

### Anonymous player/session lifecycle

```ts
games.create({
  genre,
  difficulty,
  expectedLength,
  nickname,
})
```

Creates in one logical flow:

- placeholder case + generation run,
- room/session in `generating` state,
- first player + reconnect secret,
- background generation workflow.

Returns room code, reconnect secret, case/session identifiers, and generation status immediately. The second player may join while generation is running. Investigation starts only after the case becomes `ready`.

```ts
sessions.createReplay({ caseCode, nickname })
sessions.join({ roomCode, nickname })
sessions.reconnect({ roomCode, reconnectSecret })
sessions.reset({ sessionId })
sessions.end({ sessionId })
```

A room survives abandonment for 7 days.

### Presence

```ts
presence.heartbeat({ sessionId })
```

### Travel/navigation

```ts
world.travelToPlace({ sessionId, toPlaceId })
world.moveToRoom({ sessionId, roomId })
```

Mutation computes a deterministic shortest path through the city graph, verifies reachability, and charges the summed path travel time. Players are not forced to click every intermediate graph node.

### Search and inventory

```ts
search.searchRoom({ sessionId, roomId })
items.inspect({ sessionId, itemId })
items.collect({ sessionId, itemId })
```

Search only reveals pre-existing case items.

### CCTV

```ts
cctv.inspectWindow({ sessionId, cameraId, startTime, endTime })
```

This advances game time and returns/stores access to matching pre-generated records.

### Devices and records

```ts
devices.inspect({ sessionId, deviceId })
publicRecords.performSearch({ sessionId, query })
```

These advance game time according to the fixed rules table.

### Forensics

```ts
forensics.request({ sessionId, forensicOutputId })
forensics.markViewed({ sessionId, requestId })
```

`request` records `readyAtGameTime`; it does not call an LLM.

### NPC messages

```ts
npcConversations.sendMessage({
  sessionId,
  npcId,
  message,
})
```

The mutation:

1. validates membership and NPC/case relation,
2. assigns the next sequence number transactionally,
3. persists/queues the message,
4. schedules processing if the conversation is idle,
5. advances game time by the interrogation-question cost.

It does not generate the reply inside the mutation.

### Clue board

```ts
clueBoard.createNoteNode({ sessionId, text, x, y })
clueBoard.createReferenceNode({ sessionId, type, referenceId, x, y })
clueBoard.updateNode({ nodeId, text?, x?, y? })
clueBoard.deleteNode({ nodeId })
clueBoard.createEdge({ sessionId, sourceNodeId, targetNodeId, label? })
clueBoard.updateEdge({ edgeId, label? })
clueBoard.deleteEdge({ edgeId })
```

Board editing consumes zero game time.

### Case close

```ts
caseClose.submit({
  sessionId,
  culpritNpcId,
  motiveExplanation,
  weaponItemId?,
  weaponDescription?,
  evidenceIds,
  evidenceExplanation,
  methodExplanation,
})
```

Mutation stores the submission and schedules the private grading action.

## Public actions

Prefer mutations that schedule internal actions instead of exposing raw LLM actions directly.

There should normally be no generic public `askLLM`, `generate`, or `judge` action.

## Internal-only queries/mutations/actions

Never callable from the browser:

```ts
generation.generateCrimeSkeleton
generation.generateTimeline
generation.generateCharacters
generation.assignWorld
generation.generatePhysicalEvidence
generation.generateRecords
generation.generateForensics
generation.generateBrief
generation.estimateOptimalTime
generation.validateGeneratedCase
generation.repairSection
generation.finalizeCase

npc.claimNextMessage
npc.generateReply
npc.persistReply
npc.updateMemory
npc.processNextQueuedMessage

caseClose.judge

session.advanceGameTime
session.appendEvent
session.refreshDerivedStatuses
```

## HTTP routes

None required for core V1 gameplay.

Add Convex HTTP actions only when an actual external webhook/integration requires one.

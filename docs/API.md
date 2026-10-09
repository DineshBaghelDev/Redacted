# API Surface

Core application API is composed of **typed Convex queries, mutations, and actions**. Do not create REST endpoints for ordinary game operations.

Every client-callable function must authenticate the Clerk user and enforce session/case authorization.

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
sessions.listMine()
sessions.getPlayers({ sessionId })
sessions.getState({ sessionId })
sessions.getTime({ sessionId })
```

`sessions.listMine` returns only the signed-in player's unexpired published-case rooms, including whether a final report has been submitted so the home screen can open that room's case report.

`sessions.createReplay({ caseId, nickname, deadlineMinutes? })` creates a fresh room for a published case. `deadlineMinutes` is an optional positive safe integer of shared game minutes from zero; when omitted, the frozen estimate plus 1,440 minutes applies. The deadline cannot be changed after room creation.

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

publicRecords.search({ roomCode, search })

forensics.getLab({ roomCode })
```

Public-record search must search only the pre-generated public-record corpus for the case.
Public-record search requires access to the bureau/public-record terminal.

The previous-case list uses frozen published case metadata once available. Replaying a published case creates a fresh session without consulting mutable generation drafts.

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
clueBoard.getNodes({ roomCode })
clueBoard.getEdges({ roomCode })
```

### Presence

```ts
presence.list({ sessionId })
```

### Case close

```ts
caseClose.getResult({ roomCode })
```

## Public mutations

### Anonymous player/session lifecycle

```ts
games.create({
  genre,
  difficulty,
  expectedLength,
  nickname,
  deadlineMinutes?,
})
```

Creates in one logical flow:

- placeholder case + generation run,
- room/session in `generating` state,
- first player + reconnect secret,
- background generation workflow.

Returns room code, reconnect secret, case/session identifiers, and generation status immediately. The second player may join while generation is running. Investigation starts only after the case becomes `ready`.

```ts
sessions.createReplay({ caseId, nickname, deadlineMinutes? })
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
world.getMap({ roomCode })
world.startTravel({ roomCode, destinationId })
world.finishTravel({ roomCode })
investigation.getPlace({ roomCode })
investigation.moveToRoom({ roomCode, roomId })
investigation.finishAction({ roomCode })
```

`startTravel` computes a deterministic shortest path through the frozen city graph, verifies reachability, and starts a timed journey. Parallel journeys and room actions share the same game clock. `finishTravel` and `finishAction` settle completed actions and pause the clock after the last one; they are safe to call after reconnecting. Players are not forced to click every intermediate city graph node. Room movement follows frozen room connections.

### Search and inventory

```ts
investigation.searchRoom({ roomCode })
investigation.inspectItem({ roomCode, itemId })
investigation.collectItem({ roomCode, itemId })
investigation.getInventory({ roomCode })
```

Search takes 15 game minutes and only reveals pre-existing case items in the player's current room. Inspection takes 2 game minutes and reveals the item's stored description. Collection requires physical access to a discovered collectible item; collected items are shared with both players. The player decides whether an item matters to the case.
Discovered objects may be pinned through `clueBoard.createReferenceNode({ roomCode, type: "item", referenceId: itemId, x, y })`; undiscovered IDs are refused.
Final-report weapon item IDs must come from the shared collected inventory; text remains available for weapons that are not physical case items.

### CCTV

```ts
cases.getCctv({ roomCode })
cases.getCctvWindow({ roomCode, cameraId, minute })
cases.startCctvReview({ roomCode, cameraId, minute })
```

Starting a review occupies the detective for 5 game minutes. The window query returns `available` or `pending` with no records until the shared action completes, then returns the stored records as `ready`. The selected minute covers 20 minutes on each side; a completed window can be reopened freely by either partner. CCTV review requires bureau-terminal access, and only reviewed records can be pinned. Records are textual/data only and never visual media.

### Devices and records

```ts
devices.inspect({ sessionId, deviceId })
publicRecords.search({ roomCode, search })
publicRecords.performSearch({ roomCode, search })
```

The public-record query returns `available` or `pending` with no records until the room's 10-minute search completes. It then returns `ready` with at most 50 stored matches and the room's ten most recent search terms. Reopening the same normalized term is free. Both search and result viewing require bureau-terminal access; only obtained records may be pinned.

These advance game time according to the fixed rules table.
Device inspection requires physical access to the discovered device. Public-record search requires access to the bureau/public-record terminal.

### Forensics

```ts
forensics.request({ roomCode, forensicOutputId })
forensics.markViewed({ roomCode, forensicOutputId })
```

`request` records `readyAtGameTime` after 5 minutes of submission plus the frozen turnaround; it does not call an LLM. `getLab` lists only tests backed by collected items, searched rooms, or the case autopsy. Results are omitted until ready and explicitly viewed. Requests and result viewing require visiting the forensic lab.

### NPC messages

```ts
npcConversations.callToBureau({ roomCode, npcId })
npcConversations.getInterview({ roomCode, npcId })
npcConversations.sendQuestion({ roomCode, npcId, question, proofNodeId?, proofReference?, requestPhone?, requestStatements? })
npcConversations.readPhone({ roomCode, npcId })
npcConversations.retryFailed({ roomCode, npcId })
```

The mutation:

1. validates membership and NPC/case relation,
2. verifies the NPC was called to the bureau and the detective is there,
3. assigns the next sequence number transactionally,
4. persists/queues the message,
5. starts a 3-minute timed action; completion queues processing,
6. processes one same-NPC reply at a time and streams it to both detectives through the Agent thread.

It does not generate the reply inside the mutation.

Calling an NPC to the bureau is immediate in V1; field interviews are out of scope. Retrying a failed answer does not charge another 3 minutes. `listAvailableProof` lists accessible found items, viewed lab results, reviewed CCTV records, completed public records, read device files/calls/messages, and earned witness statements. A question may show any listed evidence directly without pinning it; `sendQuestion` also accepts existing pinned cards. The server rechecks access and records matching lie exposure. Asking for an NPC-held phone is a 3-minute question; handover is shared when it finishes. `readPhone` takes 5 minutes at the bureau and only then exposes frozen calls and messages. Asking for an NPC's recorded account is a 3-minute question; at completion, statements about events they intentionally lie about remain withheld, while other frozen statements become shared session evidence. Pins, proof, and final-report citation recheck that session access.

### Clue board

```ts
clueBoard.createNoteNode({ roomCode, text, x, y })
clueBoard.createReferenceNode({ roomCode, type, referenceId, x, y })
clueBoard.updateNode({ nodeId, text?, x?, y? })
clueBoard.deleteNode({ nodeId })
clueBoard.createEdge({ roomCode, sourceNodeId, targetNodeId, color, label? })
clueBoard.updateEdge({ edgeId, color?, label? })
clueBoard.deleteEdge({ edgeId })
```

Board editing consumes zero game time.
Item references require shared discovery; forensic references require the lab result to have been viewed. Case-close submissions accept pinned item and forensic IDs and resolve them to frozen evidence IDs on the server.

### Case close

```ts
caseClose.submit({
  roomCode,
  culpritNpcId,
  motiveExplanation,
  weaponItemId?,
  weaponDescription?,
  evidenceIds,
  evidenceExplanation,
  methodExplanation,
})
caseClose.retry({ roomCode })
```

Submission stores the report and schedules private grading. If grading fails, the room can retry the same report without submitting a replacement.

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

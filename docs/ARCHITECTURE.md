# Architecture

## Stack

- **Frontend:** Next.js + TypeScript
- **Frontend deployment:** Vercel
- **Backend/database/realtime:** Convex
- **LLM abstraction:** Vercel AI SDK
- **Schema validation:** Zod + Convex validators
- **Case generation orchestration:** Convex workflow/actions
- **NPC persistent thread/streaming:** Convex-backed persisted streaming; use `@convex-dev/agent` if it stays aligned with the required behavior
- **Clue board UI:** React Flow
- **Observability:** Sentry + Convex dashboard/logs
- **Testing:** Vitest + Playwright + Promptfoo for LLM regression/red-team suites

## Runtime topology

```text
Browser
  |
  | Next.js UI
  v
Vercel
  |
  | typed Convex client calls
  v
Convex
  |- database
  |- reactive queries
  |- transactional mutations
  |- actions for LLM/external calls
  |- generation workflow
  |- scheduled/background work
  |- persisted multiplayer state
  |
  +----> LLM provider(s) through Vercel AI SDK

Sentry receives frontend/runtime failures and application telemetry.
```

There is no separate Fastify server, Socket.IO server, Redis queue, PostgreSQL instance, or custom worker service in V1.

## Data ownership

### Immutable generated case data

Generated once, validated, then frozen:

- case metadata
- brief
- canonical solution
- canonical timeline
- city and places
- buildings/floors/rooms/connections
- NPC public profiles
- NPC private scripts
- physical items
- forensic outputs
- CCTV cameras/records
- vehicles
- devices
- calls
- messages
- public records

### Mutable session data

Fresh for every playthrough:

- players
- reconnect credentials
- current player locations
- game time and deadline
- inventory/discovery state
- forensic requests and readiness
- clue board nodes/edges
- NPC conversations
- NPC session memories
- append-only session events
- current state snapshot/version
- case-close submission/result
- presence

## Case lifecycle

```text
create room + case request
    |
    +--> room exists immediately (players may join)
    |
    v
generating
    |
    v
fixed generation pipeline
    |
    v
deterministic validation
    | fail
    +------> targeted repair (max 2) ----+
    |                                     |
    +-------------------------------------+
    |
    v
ready / immutable
    |
    +--> session A
    +--> session B (replay)
    +--> session C ...
```

A new generated game creates the room/session immediately and generates its case before investigation begins. A replay creates a new room/session against an already-ready case and never regenerates or mutates the case.

## Multiplayer model

- 1–2 players per session.
- Shared state is server-authoritative in Convex.
- Both players may act simultaneously.
- Mutations serialize state updates transactionally.
- Same-NPC concurrent user messages are accepted, ordered, queued, and processed sequentially for that NPC conversation.
- Different NPC conversations may generate concurrently.
- Both players subscribe to the same persisted NPC stream and see it live.
- Both players can perform session-level actions. Destructive actions such as reset/end should require UI confirmation.

## Anonymous identity model

No accounts required.

A player has:

1. an anonymous backend identity/token for authorization and rate limiting,
2. a nickname for display,
3. a room code to join the session,
4. a separate reconnect secret to reclaim the same player slot.

Reconnect secrets are stored only as hashes and returned raw only when first issued.

## Realtime model

Use Convex reactive queries for shared state:

- player presence
- clue board
- inventory/discoveries
- forensic request status
- session state
- NPC conversations/streams
- session completion

Do not introduce a second realtime layer.

## Background work

Background work lives inside Convex workflows/actions.

Primary long-running tasks:

- multi-stage case generation
- targeted generation repair
- NPC replies
- NPC-memory extraction/update
- case-close semantic grading

All durable case generation stages must be resumable/idempotent.

## Design principle

The LLM generates and roleplays content. Deterministic application code owns world rules, time, navigation, persistence, authorization, state transitions, and referential integrity.

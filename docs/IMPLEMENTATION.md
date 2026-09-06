# Implementation Plan

Do not start by wiring the full LLM generation pipeline. Build game mechanics against one deterministic hardcoded fixture case first.

## Phase 0 — Repository skeleton

- Next.js + TypeScript
- Convex configured
- environment handling
- Sentry
- Vitest
- Playwright
- shared domain types/validators

## Phase 1 — Convex schema and security boundaries

Implement tables from `DATABASE.md`.

Critical first tests:

- private case tables have no client query path,
- max two session players,
- room/reconnect rules,
- generated case immutability helper/discipline.

## Phase 2 — Hardcoded fixture case

Create one fixture containing every major system:

- >=10 city places,
- at least one multi-floor building,
- NPCs/private scripts,
- rooms/search items,
- CCTV,
- vehicle,
- phone/laptop,
- calls/messages,
- public records,
- fingerprint/footprint + one other forensic output,
- canonical solution,
- five-star grading data.

Use a seed and deterministic interior generator even for the fixture topology.

## Phase 3 — Session/multiplayer core

Implement:

- anonymous identity,
- room creation/join/reconnect,
- 1–2 player limit,
- shared reactive session state,
- presence heartbeat,
- 7-day expiration,
- session event log + snapshot versioning.

Verify with two Playwright browser contexts before proceeding.

## Phase 4 — City/navigation/time

Implement:

- city graph UI/data,
- player current place,
- building/floor/room navigation,
- deterministic travel/action time,
- game clock/deadline scaffolding (do not finalize two-player concurrency semantics until reviewed),
- forensic readiness refresh as time advances.

## Phase 5 — Investigation systems

Implement against fixture data:

1. room search,
2. item inspection/inventory,
3. CCTV time-window lookup,
4. devices,
5. call logs/messages,
6. public-record search,
7. forensic requests/results.

No LLM required in this phase.

## Phase 6 — Clue board

React Flow + Convex:

- note nodes,
- reference nodes,
- drag positions,
- edges/labels,
- realtime second-player updates,
- delete/update conflicts with server-authoritative mutations.

Do not add CRDT/Liveblocks unless actual tests show a need.

## Phase 7 — NPC interrogation

Implement:

- private context builder,
- persistent shared conversation,
- same-NPC sequence queue,
- persisted streaming,
- different-NPC concurrency,
- session memory with provenance,
- failure/retry handling,
- leakage tests.

Initially use the fixture's hand-authored NPC scripts.

## Phase 8 — Case close

Implement:

- submission UI,
- deterministic killer/weapon checks,
- evidence-group check,
- structured LLM motive/evidence/method judge,
- five-star result,
- judge regression dataset.

## Phase 9 — Procedural city/interior generator

Generalize deterministic world generation:

- seeded city graph,
- >=10 places,
- connectedness,
- travel bounds,
- building templates,
- floors/rooms/connections,
- reproducibility tests.

This must work without any LLM.

## Phase 10 — Case generation workflow

Only now implement `GENERATION.md`:

- structured stage schemas,
- generation workflow persistence,
- model calls,
- deterministic validators,
- targeted repair,
- freeze.

Generated case is accepted only if it can be loaded by the exact same game engine used by the fixture.

## Phase 11 — Evals and hardening

- 50–100 generated-case batch eval,
- NPC consistency suite,
- secret-leakage suite,
- case-close judge suite,
- two-player concurrency suite,
- rate limits,
- bot protection before public exposure,
- cost/latency telemetry.

## Definition of V1 technical readiness

V1 is technically ready when:

- two anonymous players can join/reconnect reliably,
- both can investigate different locations simultaneously,
- all shared state converges in realtime,
- same-NPC concurrent messages remain ordered,
- the fixture case can be completed end-to-end,
- clue board is collaborative,
- game time and forensic waits work deterministically,
- 5-star grading is reproducible enough on eval set,
- generated cases pass validators and run through the same engine without special-case code,
- hidden solution/script data cannot be read by the client or NPC context.

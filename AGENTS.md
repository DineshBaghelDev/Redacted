<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Redacted — Agent Entry Point

This repository's technical decisions are split across the files below. Agents should read this file first, then open only the files relevant to the task.

## Source of truth

| File | Read when working on |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System boundaries, deployment, runtime topology, data ownership |
| [DATABASE.md](./DATABASE.md) | Convex tables, fields, indexes, relations, immutable vs mutable data |
| [API.md](./API.md) | Public Convex queries/mutations/actions and their contracts |
| [FUNCTIONS.md](./FUNCTIONS.md) | Internal functions, workflows, state transitions, queueing, time advancement |
| [GAME_SYSTEMS.md](./GAME_SYSTEMS.md) | City, travel, interiors, search, CCTV, devices, forensics, interrogation, clue board, case close |
| [GENERATION.md](./GENERATION.md) | Case-generation stages, schemas, repair policy, immutable generation rules |
| [VALIDATION_EVALS.md](./VALIDATION_EVALS.md) | Deterministic validation, LLM evals, multiplayer tests, acceptance gates |
| [SECURITY.md](./SECURITY.md) | Hidden solution boundaries, authorization, anonymous users, abuse/rate-limit rules |
| [TOOLING.md](./TOOLING.md) | Libraries/services chosen and explicitly rejected |
| [DECISIONS.md](./DECISIONS.md) | Locked decisions, rejected alternatives, unresolved items |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Recommended implementation sequence and fixture-first strategy |

## Non-negotiable product rules

1. V1 supports **1–2 players** in the same shared case session.
2. Both players share all case state, NPC conversation history, NPC session memory, inventory, clue board, and notes.
3. Cases are generated **once when a new case is created**, fully validated, stored, then immutable.
4. Replaying a case creates a **fresh session** against the exact same stored case.
5. The player performs deductions. The game must not automatically create clues, relationships, suspicion scores, or inferred conclusions.
6. NPCs roleplay live from their own generated script, allowed world facts, shared conversation history, and session memory. They must never receive the hidden canonical solution.
7. All investigation data—search results, CCTV, calls, messages, public records, forensic truth—is generated before play. Gameplay reveals stored truth; it does not invent new evidence live.
8. City navigation is a graph with **at least 10 places**. Building interiors are generated deterministically from templates and a seed.
9. Game time is deterministic integer minutes. LLMs do not decide action duration during play.
10. Case close is scored out of five stars: killer, motive, weapon, evidence, method.
11. Core backend interface is Convex functions, not REST.
12. Keep V1 small. Do not add Redis, Socket.IO, Fastify, PostgreSQL, Liveblocks, LangChain, vector search, or a custom admin panel unless this spec is deliberately revised.

## Agent implementation rules

- Do not invent new game concepts such as phases, suspicion meters, clue-reveal actions, relationship scores, locked locations, or hint systems.
- Do not expose `caseSolutions`, private `caseEvents`, or `npcScripts` through client-callable functions.
- Do not put hidden case data into client documents and rely on UI filtering.
- Do not let NPC LLM output mutate game state except its own persisted reply and derived session memory.
- Do not generate evidence during gameplay.
- Do not treat a player's statement to an NPC as world truth. Persist it as a claim with provenance.
- Do not store clue-board state in Liveblocks. Use React Flow for UI and Convex for persistence/realtime.
- Do not implement generated interiors with an LLM. Use deterministic templates plus generated parameters.
- Do not start implementation with generation. Build and test the game using a hardcoded fixture case first.

## Current unresolved items

Do not invent answers to these during implementation:

- **Parallel time semantics:** two partners can work simultaneously, but we have not explicitly decided whether concurrent time-consuming actions add to one global clock or overlap in simulated time. This must be resolved before finalizing the time engine.
- **Investigation access rules:** we have not explicitly decided whether interrogation requires physical co-location, whether forensic submission requires visiting the lab, or what physical/discovery prerequisites apply to CCTV/devices/public-record tools.
- Exact numeric bounds for generated city travel times and case sizes by difficulty.
- Exact content-count targets per difficulty/length.
- Whether users may override the default case deadline in a later version.
- Final visual representation of CCTV records in the UI; V1 does not require generated video.

If a task conflicts with this file or another linked source-of-truth file, stop and surface the conflict instead of silently choosing a new architecture.

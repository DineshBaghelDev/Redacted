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
| [SECURITY.md](./SECURITY.md) | Hidden solution boundaries, Clerk authentication, authorization, abuse/rate-limit rules |
| [TOOLING.md](./TOOLING.md) | Libraries/services chosen and explicitly rejected |
[DECISIONS.md](./DECISIONS.md) | Locked decisions, rejected alternatives, unresolved items |
|  |
| [progress.md](./docs/progress.md) | Current implementation progress and latest shipped UI/backend changes |
| [design decisions.md](./docs/design decisions.md) | Product and UI decisions made during implementation |

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

## Locked gameplay decisions

- Investigation actions are location-gated: players must go to the relevant place/tool to perform searches, forensics, CCTV review, device inspection, and public-record searches.
- Interrogation is allowed only when the NPC is present: either the player calls the NPC to the bureau, or the player goes to meet the NPC.
- City size and case size have no hard upper limit; keep only minimum/solvability constraints and generation/runtime practicality checks.
- Suspect counts by difficulty: easy has around 3-4 suspects, normal has around 6-7 suspects, and hard has 10 or more suspects.
- Users may override the default case deadline.
- CCTV records have no visual representation at all. Use textual/data records only; do not add generated video, stills, thumbnails, or visual playback later.

If a task conflicts with this file or another linked source-of-truth file, stop and surface the conflict instead of silently choosing a new architecture.

# Must Follow rules
- Plan before you make any change
- ask necessary questions before working so that you are not working on assumptions
- Always follow the laziest and fastest path, No over-engineering
- Avoid using Technical language in UI. Think like a typical user
- follow YAGNI method
- keep the codebase readable, modular, simple, clean and structured.
- Always make the smallest possible part as client component, rest as server.
- use necessary skills of the tools you are working with.
- Keep `docs/progress.md` and `docs/design decisions.md` updated when making implementation or product/design changes.

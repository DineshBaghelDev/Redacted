# Locked Decisions

This file records decisions from the technical design discussion so agents do not reopen settled questions without a concrete reason.

## Product/runtime

- V1 supports **1–2 players**.
- Multiplayer is shared-case cooperative play; partners distribute investigation work.
- Both players share state, inventory, NPC conversation history, NPC memory, clue board, and discoveries.
- Server-authoritative state.
- Realtime updates required.
- No user accounts required.
- Anonymous backend identity + nickname.
- Room code joins session.
- Separate reconnect secret reclaims a specific player slot.
- Both players may execute session-level actions; destructive actions should get UI confirmation.
- Sessions survive abandonment for **7 days**.

## Stack

- Next.js frontend.
- Next.js deployed on Vercel.
- Convex is backend + database + realtime.
- No Fastify backend after Convex decision.
- No PostgreSQL/Drizzle after Convex decision.
- No Socket.IO after Convex decision.
- Background work handled in Convex workflows/actions.
- Vercel AI SDK for LLM abstraction.
- Fixed provider/model configuration; no runtime model chooser or dynamic router in V1.
- Stronger model for primary case generation; cheaper model for repair/NPC when suitable.

## Case generation/storage

- Case generated when creating a new case, before gameplay begins.
- 30–90s generation latency is acceptable.
- Fixed multi-step generation pipeline.
- Generate solution first, then timeline, characters, world assignments, evidence/records, validation.
- Targeted repair of invalid sections, then revalidate.
- Deterministic structural/consistency checks; no extra LLM solvability call in V1.
- Generated cases are stored permanently/replayable.
- Generated case data is normalized into tables, not one giant JSON blob.
- Strict versioned case schema.
- Generated case immutable after ready.
- Replay creates fresh mutable session state against identical immutable case.

## World

- City is a graph, not an open-world street simulation.
- At least 10 places per generated city.
- Players can travel to any reachable place.
- Building/floor/room layouts are deterministic from templates + seed.
- LLM may choose semantic parameters/assignments, not graph topology.
- Corridors are normally graph edges; use corridor rooms only when interactable/searchable.

## Investigation

- Search results are generated upfront and stored.
- Search reveals existing case items; it does not generate clues live.
- `caseItems` means physical objects, not forensic conclusions.
- Inventory is game-controlled; players cannot manually invent items.
- CCTV data is generated upfront.
- CCTV records have no visual representation at all. Use textual/data records only; do not add generated video, stills, thumbnails, or visual playback later.
- Devices: phone/laptop.
- Digital data: call logs + messages.
- Call logs must include timestamp, incoming/outgoing, duration.
- No social posts in V1.
- Public records included.
- Forensic outputs generated upfront; requests have in-game turnaround.
- Fingerprints and footprints explicitly supported.

## Player deduction

- No automatic clue reveal system.
- No relationship/suspicion score system.
- No automatic location unlocking from NPC dialogue.
- No game `phase` concept.
- Player writes their own notes and draws their own connections.
- No hint system in V1.

## Clue board

- React Flow for graph UI.
- Convex for persistence/realtime.
- No Liveblocks.
- Shared editable nodes/edges.
- User-authored notes + references to discovered case entities.

## NPCs/interrogation

- NPC responses generated live.
- Each NPC has its own pre-generated private script: personality, experience, knowledge, secrets, intentional lies, behavior.
- NPC receives own script + limited public/known facts, not full case data.
- NPC never receives hidden canonical solution.
- NPC session memory persists during the playthrough.
- Memory shared across both players for that NPC.
- Player statements remain attributed claims, not world truth.
- NPC dialogue does not mutate unrelated game state.
- Replies stream live.
- Both players see the same conversation live.
- Both players may message same NPC concurrently.
- Same-NPC messages are server-ordered and processed sequentially.
- Different NPC conversations may run simultaneously.
- Interrogation is allowed only when the NPC is present: either the player calls the NPC to the bureau, or the player goes to meet the NPC.

## Game time

- Add game-time/deadline system.
- Integer in-game minutes.
- Deterministic action costs.
- Exact overlap/addition semantics for two simultaneous players are intentionally unresolved and must be reviewed before the time engine is finalized.
- Travel uses city-edge travel cost.
- Reports/forensics may become available after elapsed game time.
- Default deadline = AI-estimated optimal investigation time + one in-game day (1440 minutes).
- Users may override the default case deadline.
- Difficulty changes case complexity, not arbitrary action-time multipliers.

## Case close

Five independent stars:

1. killer,
2. motive,
3. weapon,
4. evidence,
5. method/how.

- Killer checked deterministically.
- Weapon checked deterministically when represented by an item.
- Motive graded semantically by LLM.
- Evidence requires valid selected evidence IDs/proof group + semantic explanation.
- Method graded semantically by LLM.
- Server sums booleans into total stars.

## Observability/admin

- Sentry for runtime errors/failures.
- Convex dashboard/logs for developer inspection.
- No custom admin panel in V1.

## Rejected or superseded decisions

- Self-hosted Node + PostgreSQL stack: superseded by Convex decision.
- PostgreSQL `LISTEN/NOTIFY` worker queue: superseded by Convex.
- Fully normalized relational SQL design: translated into normalized Convex documents.
- `contacts` table: incorrect; actual requirement is call logs.
- `sessionState.phase`: removed; game has no phase concept.
- Liveblocks for clue board: rejected as duplicate realtime/persistence.
- LLM-generated building graphs: rejected as unnecessary and fragile.


## Gameplay access semantics

Investigation actions are location-gated:

- search requires being at the searched location,
- forensic requests require visiting the forensic lab,
- CCTV review requires visiting the relevant security/CCTV access point,
- phones/laptops require physical access to the discovered device,
- public-record search requires visiting the bureau/public-record terminal.

These are gameplay rules, not backend constraints.

# Game Systems

## Core game loop

### Case brief

Player starts with only legitimate initial information:

- where,
- when,
- what happened / incident type,
- who reported it,
- minimal necessary known facts.

No automatic suspect ranking, clue list, deductions, or hints.

### Investigation

Players independently distribute work while sharing all discovered state.

Available systems:

- travel around city,
- enter buildings/floors/rooms,
- search locations,
- inspect/collect physical items,
- use forensic laboratory,
- inspect fingerprints/footprints and other lab outputs,
- interrogate NPCs live,
- inspect CCTV,
- inspect phones/laptops,
- inspect call logs/messages,
- search public records,
- build shared clue board,
- manage limited in-game time.

Investigation actions are location-gated. Players must go to the relevant place/tool to perform searches, forensics, CCTV review, device inspection, and public-record searches.

Interrogation is allowed only when the NPC is present: either the player calls the NPC to the bureau, or the player goes to meet the NPC.

### Case close

Players submit five findings:

1. killer,
2. motive/reason,
3. weapon,
4. evidence,
5. method/how it was done.

Each category is worth one star. Goal: 5/5.

## Procedural city

The city is intentionally abstract: a graph of places, not a simulated open-world street network.

Requirements:

- at least 10 places,
- all required investigation locations reachable,
- travel edges have deterministic time costs,
- players can choose any reachable place at any time; the server computes the shortest travel path/cost through the graph,
- different players can occupy different places.

Examples of place types:

- residences,
- offices,
- hospital,
- shops,
- restaurants,
- hotel,
- warehouse,
- public building,
- parks,
- case-specific locations.

The LLM may assign story semantics to places. Graph generation stays deterministic.

## Buildings, floors, corridors, rooms

Use deterministic templates plus case-generated parameters.

Examples:

### Apartment

```text
floor
|- corridor edge
|- apartment A
|  |- living room
|  |- bedroom
|  `- kitchen
`- apartment B
```

### Office

```text
floor
|- corridor edges
|- reception
|- offices[]
`- meeting room
```

Code owns structural validity. LLM owns semantic assignment.

Do not make every corridor a database room. Represent most corridors as graph edges. Create corridor rooms only when the corridor is itself searchable/interactable.

## Search

Search is deterministic reveal of generated content.

Rules:

- player must be at the room/location,
- search costs game time,
- results already exist in `caseItems`,
- hidden items may become discovered,
- collectible items may enter inventory through explicit player action,
- no LLM generation during search.

There is no automatic `reveal_clue` mechanic. An item is an item; the player decides whether it is a clue.

## Inventory

Inventory is game-controlled.

Players cannot manually invent/remove arbitrary inventory entries.

Only legitimate game actions may add/remove physical items.

## CCTV

CCTV consists of:

- cameras tied to locations/rooms,
- pre-generated records/events tied to time ranges,
- observed NPCs/vehicles,
- textual/data UI representation.

CCTV records have no visual representation at all. Do not add generated video, stills, thumbnails, or visual playback later.

Players choose camera/time windows. The game returns stored matching records.

## Devices

Supported V1 device types:

- phone,
- laptop.

Device data:

- call logs,
- messages.

No social-post system in V1.

### Call logs

Must include:

- timestamp,
- incoming/outgoing,
- duration,
- other party identity/label.

## Public records

Pre-generated searchable records such as:

- people,
- property,
- vehicles,
- businesses,
- employment,
- criminal/publicly available records,
- case-specific public record types.

Retrieval searches stored case data; it does not generate answers live.

## Forensic laboratory

Underlying forensic truth is generated with the case.

Player workflow:

```text
discover source/item
  -> request valid test
  -> spend submission time
  -> wait in game time
  -> result becomes ready
  -> inspect result
```

Supported base test types:

- fingerprints,
- footprints,
- DNA,
- blood,
- toxicology,
- fibers,
- ballistics,
- autopsy/report,
- extensible `other`.

Forensic output is separate from `caseItems`.

## Interrogation/NPC system

Each NPC gets a generated private canonical script containing:

- personality,
- goals,
- experiences,
- facts they know,
- secrets,
- intentional lies,
- behavioral constraints.

The NPC responds live to arbitrary player questions.

Context rules:

- own script only,
- limited world/public facts,
- own conversation history,
- own session memory,
- no hidden full solution.

NPC dialogue does not automatically:

- reveal clue entities,
- unlock locations,
- modify relationships,
- change suspicion scores,
- interpret what the player should conclude.

Both players see the same NPC conversation live.

Both may send concurrently. Messages are ordered and processed one NPC turn at a time for that conversation.

## NPC session memory

NPCs remember interactions across both players for the same session.

Memory is session-scoped and NPC-scoped.

A player's statement is remembered as that player's claim. It never overwrites canonical facts.

Replaying the case starts with fresh NPC session memory.

## Clue board

Shared collaborative graph using React Flow + Convex.

Players can:

- create free-text note nodes,
- create nodes referencing discovered NPCs/items/calls/messages/CCTV/forensics/vehicles/places/public records,
- drag/reposition nodes,
- connect nodes with strings/edges,
- optionally label edges,
- open a node to inspect full note/reference details.

Both players edit the same board in realtime.

Board data represents player reasoning only. It never changes canonical game truth.

No Liveblocks in V1.

## Game time

The case has a shared deadline and deterministic action durations.

**Concurrency semantics are still unresolved:** because partners are explicitly meant to split work, we must decide whether simultaneous actions overlap in simulated time or simply add to one shared clock. Do not silently lock additive global time during implementation. The fixed costs below are valid regardless of the eventual concurrency rule.

V1 fixed costs:

| Action | Minutes |
|---|---:|
| Move between rooms | 1 |
| Move between floors | 2 |
| Search room | 15 |
| Inspect discovered item | 2 |
| Ask NPC one question | 3 |
| Inspect one CCTV time window | 5 |
| Read a device | 5 |
| Search public records | 10 |
| Submit forensic test | 5 |
| Add/edit clue-board content | 0 |
| Review already obtained information | 0 |
| Submit case close | 0 |

Travel between city places uses the graph edge's generated deterministic `travelMinutes`.

Deadline:

```text
starting game time
+ AI-estimated optimal investigation minutes
+ 1440 minutes
```

The optimal estimate is generated once during case generation. Users may override the default deadline. Runtime costs remain deterministic.

Difficulty changes case complexity, not arbitrary action-time multipliers.

## Difficulty

Difficulty should affect real investigative complexity, for example:

- number of plausible suspects,
- density of records/evidence,
- timeline complexity,
- number of places that matter,
- ambiguity/indirection of evidence,
- amount of irrelevant but plausible information.

Suspect counts by difficulty:

- easy: around 3-4 suspects,
- normal: around 6-7 suspects,
- hard: 10 or more suspects.

City size and case size have no hard upper limit. Keep minimum/solvability constraints and generation/runtime practicality checks.

There is no V1 hint system.

## Replay

A generated case is reusable.

Replay means:

- identical city seed/layout,
- identical NPC canonical scripts,
- identical solution/timeline/evidence/records,
- fresh players/session state,
- fresh discovery/inventory,
- fresh clue board,
- fresh NPC conversation and session memory,
- fresh game clock/deadline.

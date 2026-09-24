# Case Generation Pipeline

Generation is a **fixed, shallow, multi-stage pipeline** that runs once when a case is created. It is not an autonomous agent deciding what to do next.

Core idea: **plan the crime, then derive the evidence from it.** The LLM writes people, motives, story events and text. Code owns the city, time, travel, evidence derivation and every check. Consistency comes from one structured source of truth (the timeline) that every record is derived from — not from the order stages run in.

A stronger model handles primary generation. A cheaper model may handle targeted repair. Provider/model IDs are configured through environment variables behind the Vercel AI SDK.

## Principles

1. Generate the crime core first; everything else derives from it.
2. The city is a permanent hand-made fixture in V1, buildings included; every case reuses it with new characters.
3. The LLM never does time, distance, or who-saw-what math. Code does.
4. Evidence (CCTV, calls, card records, forensics, items, records) is **derived by code** from timeline events. The LLM only writes wording for facts that already exist.
5. Every stage emits strict structured output validated immediately.
6. Failed sections are repaired locally, not by regenerating the entire case.
7. Maximum 2 repair attempts per failure path.
8. Once ready, generated case records are immutable.

## Inputs

```ts
{
  difficulty: "easy" | "normal" | "hard",
  deadlineOverride?: number,
  seed: number, // drives every code-side choice; same seed + same LLM output = same case
}
```

Plus the V1 city fixture.

## Stage 0 — City and interiors (code)

V1 uses one **ready-made city** with **20 places**, reused across cases. Players learning the city is a feature.

City fixture contains:

- places with type (home, office, bar, shop, park, ...) and interior template,
- travel graph with travel minutes per street (edge),
- **street cameras** attached to specific edges,
- which interior camera spots are active per building.

Buildings use 5 templates (house, apartment/hotel, office, shop, public place) with **fixed per-building settings** — no seed, so every building is identical in every case. Templates define rooms, doors, camera spots and item slots.

The city holds **no people**: places are named by address or business, never by family. Each workplace lists job slots (bar: owner, bartender, …) and homes list home units (house, Flat 3B). Cases fill these with new characters. Rooms list item slots (drawer, bin, wardrobe); each case decides what goes in them.

Ids are permanent because cases store them. The city is versioned (`city.version = 1`) and never edited in place; a changed city becomes version 2 and each case records its version. A snapshot test catches accidental edits.

Faulty cameras: code marks some working cameras as faulty for a case, based on difficulty and seed. A faulty camera records nothing for the whole case, and its records show it as offline. This is separate from the killer's "disable-camera" cover-up.

The LLM never builds or edits topology.

Code: `convex/fixtures/city.ts`, `convex/generation/core/{buildings,city}.ts`.

## Stage 1 — Crime core (LLM, implemented)

Input: difficulty, a **seeded brief** (motive type, weapon category, crime-scene place, picked by code from the seed so cases vary), every city room id, every camera id.

Output shape: `crimeCoreSchema` in `core/schemas.ts` — victim/killer/accomplice ids (short lowercase first names), motive, weapon, method, scene room, time of death, windowStart, discovery, cover-up, optional switched-off camera.

Rules and checks live together in `core/crimeCast.ts` (`CRIME_RULES` goes into the prompt word for word; `crimeProblems` enforces it): rooms exist and the scene allows crimes; victim, killer, accomplice and finder are different people; windowStart is Day 1 00:00; death on Day 2; body found after the death and by the end of Day 3; AI output follows the brief (the hand-written case is exempt from the brief).

One crime per case. Accomplice optional.

## Stage 2 — Cast (LLM, implemented)

Input: crime core, difficulty, every home id with its address, workplaces with free job titles and room ids, public places for hangouts.

Suspect counts: easy 3–4, normal 6–7, hard 10–12 (the killer included). Plus 3–6 witnesses (bartender, neighbour, clerk…).

Per character (`characterSchema`): name, age, gender, role, home, job, routine type, hangout, appearance (height, build, clothing, shoes), traits, relationship to victim, secret, what they protect, fake motive (innocent suspects), public records.

Checks (`castProblems`, rules in `castRules` go into the prompt): the crime's people exist with the right roles; counts match difficulty; ids unique; homes exist; jobs are free slots at that place and work rooms belong to it; unemployed people and students have a public hangout; the killer has no fake motive.

## Stage 3 — Timeline (code routine + LLM story events)

Window: `windowStart` → body discovery, max 2 days.

1. **Routine (code):** each character gets a daily routine from a template (office worker, night shift, shop owner, unemployed, student) + seed: work hours, nights at home, regular spots.
2. **Story events (LLM):** only events that matter — meetings, fights, purchases, the crime, cover-up, accomplice coordination.
3. **Merge (code):** story events override routine; routine blocks next to a story event in another place are trimmed so there is always enough travel time. Story events are never moved — clashes between them are reported.

Times are whole minutes from Day 1 00:00 (Day 2 starts at 1440). The story stage also lists **story items** (weapon included, id `weapon`) with start room and final room + slot; any item that moves needs an event that uses it in its final room. Cast members pick a routine type; `job.roomId` can pin their work room, otherwise code picks one.

Code: `convex/generation/core/{schemas,routine,timeline}.ts`; hand-written stand-ins for the LLM stages live in `convex/fixtures/caseEasy.ts`.

```ts
event:    { id, actors, placeId, roomId, start, end, action, visibility: "public" | "private", itemsUsed }
comm:     { id, from, to, time, type: "call" | "message", gist, durationMinutes? }
purchase: { id, who, placeId, time, item, payment: "card" | "cash" }
```

Checks on the merged timeline:

- nobody is in two places at once,
- gap between events ≥ graph travel time,
- killer in the scene room at time of death,
- victim has no events after death,
- weapon path (origin → scene → disposal) is covered by events,
- accomplice (if any) has ≥ 1 coordination event with the killer,
- every suspect's whereabouts at time of death are defined — some provable, some not (difficulty knob),
- killer's alibi is breakable.

Repair: exact violations are sent back to the LLM.

## Stage 4 — Evidence derivation (code, no LLM)

- **CCTV:** code routes each movement — shortest street path between places, and entrance → stairs/lift → corridor → room inside buildings. Every active camera on the route emits a row with time, direction and an **appearance description, not a name**. Players match appearance to people. A `disable-camera` cover-up produces a gap plus an outage/maintenance record.
- **Phone:** call logs (timestamp, incoming/outgoing, duration) and messages from comm events.
- **Card records:** from card purchases. Cash leaves no record.
- **Forensics:** a rule table maps weapon category + method + cover-up to cause of death, widened time-of-death range, wounds, prints/DNA/fibers present or wiped.
- **Physical items:** weapon, receipts, notes placed in interior template slots by seed.
- **Public records:** from cast backstory (debts, insurance, property, criminal record).
- **Devices:** phones/laptops hold message and note content.

Every evidence item keeps hidden `aboutIds` (who it is truly about) and `sourceIds` (story/timeline ids it came from).

Implemented rules (`convex/generation/core/evidence/`):

- CCTV rows: a stay row when someone is in a camera room; pass rows for camera rooms on the in-building route (exit via `leftVia` or nearest entrance, enter via `enteredVia` or nearest entrance) and for camera streets on the fastest street route, timed from departure. Rows describe gender + appearance, never names.
- Faulty cameras: easy 1, normal 2, hard 4; picked by seed only among cameras that recorded nothing from the story. Each gets an "offline" record.
- Phones: every call/message is stored on both phones. The victim's phone is found on the body; other phones must be handed over by their owner.
- Forensics: autopsy (cause by weapon type, time-of-death range ±45/90/120 min by difficulty); weapon blood (blunt/sharp), weapon prints (none if `wipe-prints`), fibers from the killer's clothing used in the murder; blood on that clothing; prints on other story items; scene prints (residents + visitors, killer removed if wiped) and scene fibers.
- Records: address and employment for everyone, plus each character's `records` (insurance, debts, complaints, companies...).
- Witness statements: for each public story event, other people in it and anyone at the same place at the time (never the victim).
- Devices: laptops/tablets are ordinary story items of kind `device` (only present when the story puts one somewhere). Their `contents` (files, notes) become evidence readable after the device is found.
- Background clutter: everyday objects (bills, magazines, gym bags...) placed by seed in rooms that matter to the case (story rooms, cast homes and work rooms): easy 2, normal 3, hard 5 per place. They prove nothing.
- Weapon-specific lab tests: toxicology (poison), ballistics (firearm), ligature marks (strangulation); a fall is shown by the autopsy.
- Footprints: shoe prints at any side door the killer used at the scene building, described by the killer's `appearance.shoes`.
- Camera switched off (`disable-camera` cover-up): the crime names the camera and time window (`disabledCamera`); its records in that window are dropped and a "switched off" record is added. Checked: camera exists, times make sense, and the killer or accomplice is at that camera's place when it goes off.

## Stage 5 — Fact links and decisive set (code, implemented)

`convex/generation/core/facts.ts` turns evidence into facts: killer at scene, killer near scene (camera within 60 min and able to reach the scene), killer contacted victim, motive (anything tagged `proves: ["motive"]`), weapon used on victim, weapon linked to killer (prints or killer-clothing fibers), method (autopsy), accomplice link, and one alibi fact per innocent suspect (camera, card payment or witness placing them too far away to reach the scene at the time of death).

Decisive = victim's blood on an item the killer owns, killer's prints on the weapon, the killer on a camera in the scene room at the time of death, or an item taken from the scene building that ends up in the killer's home. Cover-ups change this (wiped prints are not decisive). The evidence star is earned by selecting any item from the decisive set.

## Stage 6 — Lies (LLM chooses, code checks)

Lies come from personality and interest, never at random.

Input per NPC: personality, secret, what they protect, their slice of the timeline, evidence list.

```ts
lie: {
  id, npcId,
  topic: "whereabouts" | "relationship" | "motive" | "item" | "secret",
  claim, reason,
  truthIds,               // story events, messages/calls or purchases the lie hides
  disprovingEvidenceIds,  // evidence ids; showing one breaks the lie
  whenCaught: "full-truth" | "admit-shown" | "backup-lie", // from personality
  backupLie?: { claim, disprovingEvidenceIds },
}
```

A lie breaks during play only when a player shows found evidence (any kind) listed in `disprovingEvidenceIds` (see `GAME_SYSTEMS.md`).

Checks (`core/lies.ts`, implemented): the person exists and isn't the victim; truth ids exist; every disproving piece exists, isn't background clutter, isn't the liar's own statement, and is about the liar or comes from what the lie hides; `backup-lie` needs a backup lie whose proof isn't only the first lie's proof; the killer must have a whereabouts lie hiding the murder. For AI output, failing lies will be dropped or repaired (chunk E). Innocents lying to protect their own secrets are the natural red herrings.

A witness who lies about an event never counts as telling what they saw of it, so their statement can't clear anyone.

## Stage 7 — Text writing (LLM, fenced)

Writes message bodies, notes, record wording, witness phrasing. Input is the fact; output must not add facts. Every name, place and time in the text must come from an allowed list, otherwise regenerate.

## Stage 8 — NPC scripts (code assembles)

- Knowledge = events the NPC took part in + events they **witnessed** (same place, same time, public visibility — computed by code).
- Script = personality, knowledge, lies, secret, relationships, speaking style.
- Never includes solution fields or other NPCs' private events.
- Implemented in `core/scripts.ts`: profile (age, gender, job, home, personality, relationship, secret, what they protect), knowledge (events they took part in or saw, their calls/messages, purchases, and the public news of the death), their lies, and fixed rules. Only the killer gets "never confess"; innocents get "you don't know who killed the victim". A leak check rejects private events the NPC wasn't in and the crime's hidden method/motive text.

**Things older than the window:** NPCs may improvise small backstory details older than 2 days while talking. These are persisted to NPC session memory so both players see the same thing. They are **talk only** — never new evidence, records, CCTV, or forensics.

## Stage 9 — Case brief

Only what investigators legitimately receive at start: where, when, what, who reported it, minimal necessary facts. Explicit leakage checks against solution fields.

## Stage 10 — Optimal-time estimate

A model receives only what's needed to estimate a competent investigation route (relevant places, travel graph, required searches, likely interrogations, forensic waits, complexity) and outputs `{ estimatedOptimalMinutes, reasoningSummary }`. Default deadline = `optimal + 1440`. Users may override.

## Stage 11 — Solvability validation (code)

No LLM judge in V1. Implemented in `core/validate.ts`; returns a pass/fail list the tester shows as a checklist. Checks, plus those in `VALIDATION_EVALS.md`:

- **killer:** ≥ 2 different evidence types place the killer at the scene or break their alibi,
- **motive:** ≥ 2 items,
- **weapon:** ≥ 1 item links weapon to scene and ≥ 1 links it to the killer,
- **method:** supported by forensics,
- **evidence:** decisive set has ≥ 1 reachable item (≥ 2 on easy),
- **unique answer:** every innocent suspect is cleared by ≥ 1 item (alibi or no access),
- **accomplice:** ≥ 1 linking item if present,
- **red herrings:** every lie and fake motive is refutable,
- **reachable:** every required item is obtainable at a city place/tool,
- **no shortcut:** no single item names the killer outright (killer's name next to words like "killed" or "murderer").

"Killer" counts evidence kinds across: at the scene, near the scene, and proof that breaks the killer's whereabouts lie. "Reachable" means: search spots exist in the room ("on the body" only at the scene), cameras exist, lab subjects and devices are themselves found, phones exist, and the person to question is alive and not lying about that event.

## Stage 12 — Targeted repair

Each failed check maps to the earliest stage that caused it; rerun from that stage down.

```ts
{ brokenSection, relevantCanonicalFacts, exactValidationErrors, allowedReferences }
```

Maximum 2 repair attempts per failure path. If still invalid, restart with a new seed. After 2 restarts, mark generation failed and show the player a plain "couldn't build this case, try again".

Progress shown to players in plain words ("Writing suspects…", "Checking the case can be solved…").

## Stage 13 — Freeze

When all gates pass, `case.status = ready`. After this: no generated record is modified during play, no partial regeneration, no NPC action mutates canonical truth, replay uses identical records.

## Difficulty knobs

- suspect count,
- evidence redundancy per fact (high / medium / low),
- lies per NPC,
- share of key moments on camera,
- number of faulty cameras,
- number of innocents without a provable alibi.

## Build order

1. City fixture (20 places, streets, cameras).
2. One hand-written case in the stage 1–8 output shape.
3. Build gameplay against it.
4. Stage 11 validator, run against the hand-written case.
5. LLM stages last.

## Technical implementation

Code layout:

- `convex/generation/core/` — plain TypeScript, no Convex imports: seeded RNG, route finder, timeline checker, evidence builders (CCTV, forensics rule table, records), decisive set, validator. Shared by Vitest and Promptfoo.
- `convex/generation/stages.ts` — stage list: inputs, output schema, hand-written output, code `run`, AI `prompt`, `check`.
- `convex/generation/prompts/` — prompt builders; city lists and rule text come from the same data the checks use.
- `convex/generation/llm.ts` — `generateJson`: NIM call through the AI SDK, strict schema first, JSON mode fallback; bad output is returned as problems, never thrown.
- `convex/generation/workflow.ts` — fixed stage order + repair loop (Convex workflow component).
- `convex/fixtures/` — V1 city and the hand-written case.

Tables:

- `generationJobs` — case, seed, status, current stage, attempts, errors, plain-words progress label, workflow id, token/cost totals. Client subscribes for the loading screen.
- `generationDrafts` — one doc per (job, stage) output. Workflow steps pass draft ids, not large payloads.
- `generationLogs` — every AI call: model, mode (strict/json), prompt, raw reply, problems, tokens, time (debugging; doubles as Promptfoo datasets).

Workflow rules:

- LLM stages run via `step.runAction` with retry (e.g. 3 attempts, exponential backoff) for **transient** failures only: rate limits, network, timeouts.
- Validation failures are **not thrown**. Stages return `{ ok, errors }` and the workflow runs the repair loop explicitly (max 2 repairs, then new seed, max 2 restarts).
- Per-NPC lies and per-item text writing run in parallel with a concurrency cap.
- Publish copies drafts into case tables in batches; `case.status = ready` is written last.
- Leaving the room during generation cancels the workflow.
- Seed, model ids and prompt version are stored on the case.

Testing:

- **Vitest** — core functions against the hand-written case, plus deliberately broken copies that must fail the expected check.
- **Vitest + `convex-test`** — workflow with stubbed LLM stages: order, repair loop, retries, cancel, publish.
- **Promptfoo** — per-stage prompt evals whose assertion calls the same core validator; NPC evals (holds lie under pressure, breaks on proof, never leaks solution). Run manually/scheduled, not per push.
- **Record and replay** — AI cases worth keeping are saved to `convex/fixtures/recorded/` (`npx convex run dev/tester:exportJob`); `replay.test.ts` reruns all code stages and checks on them and snapshots the problems.
- **Smoke script** — full pipeline on the dev deployment over ~10 seeds; reports pass rate, time, cost.
- **Dev case viewer** — dev-only read-only page to inspect generated cases.

## Model strategy

- `GENERATION_MODEL`: `moonshotai/kimi-k3` on NVIDIA NIM,
- `NPC_MODEL`: `moonshotai/kimi-k2.6` on NVIDIA NIM,
- `REPAIR_MODEL`: cheaper structured-output model,
- `JUDGE_MODEL`: grader for motive/method at case close; may equal NPC or generation model initially.

No automatic dynamic model router in V1.

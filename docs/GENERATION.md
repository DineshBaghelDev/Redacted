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

## Crime kinds

The pipeline is shared by every kind of crime; what is specific to one kind lives in one module under `core/crimes/` (`murder.ts` is the only one in V1; theft and robbery are planned). A kind (`CrimeKind` in `core/crimes/kind.ts`) supplies:

- **Words** the shared rules and messages use (murder: "killer", "time of death", "the body is found", "whoever finds the body").
- **Crime core**: its extra fields on top of the shared base (murder adds the weapon; it narrows motive types, accomplice roles and cover-up steps), its seeded picks (murder: motive type, weapon category), rules, field notes and checks, and a one-line summary for "don't repeat recent cases".
- **Story**: its own rules (murder: the murder event with killer, victim and weapon; the victim does nothing after), the "items" hint, evidence notes, when the victim's day ends, its decisive-evidence kinds, its evidence routes (murder: link the weapon to the killer) and its timeline checks.
- **Evidence, facts, checks**: the evidence only it produces (murder: autopsy, blood, weapon fibers, toxicology/ballistics/ligature), its key items (wiped by "wipe-prints"), where the victim's phone is, its facts and decisive evidence, its own solvability checks (murder: weapon, method), what "points at an innocent", and the verbs that give the answer away.
- **Scripts and brief**: the culprit/accomplice/innocent script rules, the news line everyone hears, and the brief's rules, facts and leak checks.

Shared by every kind: the crime-core base (`crimeBaseSchema`: victim, culprit, accomplice, motive, method, scene, crime time, discovery, cover-up, switched-off camera), the seeded brief (kind, scene place, accomplice, part of Day 2, names), the cast, routines and timeline, cameras, phones, card records, public records, items and device files, prints on items, shoe prints, scene prints and fibers, witnesses, the culprit placed at the scene by two kinds of evidence, motive, "taken from the scene" and "on the scene camera" as decisive evidence, alibis, lies, text, scripts, estimate and the solvability checks.

Adding a kind: write `core/crimes/<kind>.ts`, register it in `core/crimes/index.ts` (`KINDS`, `ENABLED_TYPES`), turn `crimeCoreSchema` into a union on `type`, and give the crime stage the job's kind schema. Case-close scoring (five stars: killer, motive, weapon, evidence, method) is murder's; other kinds need their own star list before they ship.

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

Input: difficulty, a **seeded brief** (motive type, weapon category, crime-scene place, accomplice yes/no (about 1 case in 5), the part of Day 2 the death falls in (night, morning, afternoon, evening), and 24 first names plus 20 surnames from `core/names.ts`; all picked by code from the seed so cases vary), every city room id, every camera id, and one-line summaries (motive type, weapon, motive details) of the 10 newest AI crimes from other jobs, which the prompt says not to repeat. No check enforces this; judging "too similar" is left to later evals.

Output shape: `crimeCoreSchema` in `core/crimes/` — the shared base (`type`, victim/culprit/accomplice ids as short lowercase first names, motive, method, scene room, `crimeTime`, windowStart, discovery, cover-up, optional switched-off camera) plus the kind's own fields (murder: weapon).

Rules and checks live together in `core/crimeCast.ts` (`crimeRules` plus the kind's rules go into the prompt word for word; `crimeProblems` enforces them): rooms exist and the scene allows crimes; victim, culprit, accomplice and finder are different people; windowStart is Day 1 00:00; the crime on Day 2; discovered after it and by the end of Day 3; AI output follows the brief (the hand-written case is exempt from the brief). The cover-up can't move the body: the scene is always where the body is found.

One crime per case. Whether there is an accomplice comes from the seed (about 1 case in 5): left to the AI it never chose one, so that path went untested.

`accomplice` and `disabledCamera` are required fields that may be `null`: when they were optional, the AI silently skipped `disabledCamera` three tries in a row even when its cover-up said "disable-camera". If it still names no camera after repairs, the crime's clean-up drops the "disable-camera" step.

## Stage 2 — Cast (LLM, implemented)

Input: crime core, difficulty, a seeded cast brief (exact number of suspects within the difficulty's range, the victim's routine, the case's name lists), every home id with its address, workplaces with free job titles and room ids, public places for hangouts.

Suspect counts: easy 3–4, normal 6–7, hard 10–12 (the killer included). Plus 3–6 witnesses (bartender, neighbour, clerk…).

Per character (`characterSchema`): name, age, gender, role, home, job, routine type, hangout, appearance (height, build, clothing, shoes), traits, relationship to victim, secret, what they protect, fake motive (innocent suspects: a motive, a grudge or just being near at the wrong time), public records. Secret and "protects" are optional: many people have nothing to hide.

Checks (`castProblems`, rules in `castRules` go into the prompt): the crime's people exist with the right roles; counts match difficulty; ids unique; homes exist; jobs are free slots at that place and work rooms belong to it; unemployed people and students have a public hangout; the killer has no fake motive. AI casts also follow the brief: exact suspect count, victim's routine, names from the lists, id = lowercase first name. Replay tests skip the seeded-brief rules because older recordings predate them.

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
- where suspects were at the time of death is up to the story — some provable, some not (difficulty knob); being on the road is fine,
- killer's alibi is breakable.

Repair: exact violations are sent back to the LLM.

Implemented (`core/story.ts`, prompt `prompts/story.ts`): the AI gets the crime core, cast, every room (entrances and search spots marked), travel minutes between all places, `storyRules` and `evidenceNotes` (shared plus the kind's; how code turns the story into evidence, so it can plan a solvable case), and a plan of the ways this crime can get decisive evidence and pass each evidence check (placing the culprit at the scene with two kinds, the kind's links such as the weapon, the accomplice). The same ways go back with a repair when a check fails. The story check runs end to end: duplicate ids, then the timeline checks, then, if those pass, evidence + facts + the stage 11 checks (except lies, not written yet). So repairs aim at "nothing clears Lena", not only at timing.

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

`convex/generation/core/facts.ts` turns evidence into facts: killer at scene (forensics, footprints, scene camera, or a witness/card payment at the scene place within an hour of the death), killer near scene (camera within 60 min and able to reach the scene), killer contacted victim, motive (anything tagged `proves: ["motive"]`), weapon used on victim, weapon linked to killer (prints, killer-clothing fibers, or the killer on camera in the weapon's origin room during a story event that uses the weapon), method (autopsy), accomplice link, and one alibi fact per innocent suspect (camera, card payment or witness placing them too far away to reach the scene at the time of death).

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

Nobody has to lie. Innocent people tell the truth to clear themselves; an innocent lies only when the truth would do them real damage (arrest, losing their job, a ruined reputation, a broken marriage or family, exposing someone they protect). Embarrassment or a small rule broken at work is not enough. The killer always lies, with a convincing cover story; their whereabouts lie is the only required one. How someone reacts when caught is judged from personality and situation, not a fixed mapping. A secret alone isn't a reason to lie; it has to come up in questions about this case. At most 2/3/4 innocent liars on easy/normal/hard (`MAX_INNOCENT_LIARS`, a ceiling enforced by the lies check and the final check; the prompt says "usually fewer, often none").

Checks (`core/lies.ts`, implemented): the person exists and isn't the victim; truth ids exist; every disproving piece exists, isn't background clutter, isn't the liar's own statement, and is about the liar or comes from what the lie hides; `backup-lie` needs a backup lie whose proof isn't only the first lie's proof; the killer must have a whereabouts lie hiding the murder. For AI output, failing lies will be dropped or repaired (chunk E). Innocents lying to protect their own secrets are the natural red herrings.

A witness who lies about an event never counts as telling what they saw of it, so their statement can't clear anyone.

AI version (`prompts/lies.ts`): gets `lieRules` and, per person, only their traits, secret (if any), why police might suspect them, what they did, and the evidence about them (no clutter, no everyday camera rows, no phone entries). After repairs run out, lies that still fail are dropped (`keepValidLies`); a lie whose only problem is its backup lie keeps the main lie and switches to "admit-shown". A missing killer whereabouts lie stays a problem. `truthIds` is required in the shape (the AI skipped it when it was optional).

## Stage 7 — Text writing (LLM, fenced)

Writes message bodies, notes, record wording, witness phrasing. Input is the fact; output must not add facts. Every name, place and time in the text must come from an allowed list, otherwise regenerate.

Implemented (`core/text.ts`): rewrites each message (once, applied to both phones), device file and witness statement. Output `{ texts: [{ id, text }] }`. Check: known ids; no cast name, place name or clock time that isn't in that piece's source. Texts still failing after repairs are dropped and keep the plain wording. Records keep their code wording.

## Stage 8 — NPC scripts (code assembles)

- Knowledge = events the NPC took part in + events they **witnessed** (same place, same time, public visibility — computed by code).
- Script = personality, knowledge, lies, secret, relationships, speaking style.
- Never includes solution fields or other NPCs' private events.
- Implemented in `core/scripts.ts`: profile (age, gender, job, home, personality, relationship, secret, what they protect), knowledge (events they took part in or saw, their calls/messages, purchases, and the public news of the death), their lies, and fixed rules. Only the killer gets "never confess"; the accomplice gets "never reveal the killer, admit your own part only as exposed lies force you"; innocents get "you don't know who killed the victim". A leak check rejects private events the NPC wasn't in and the crime's hidden method/motive text.

**Things older than the window:** NPCs may improvise small backstory details older than 2 days while talking. These are persisted to NPC session memory so both players see the same thing. They are **talk only** — never new evidence, records, CCTV, or forensics.

## Stage 9 — Case brief

Only what investigators legitimately receive at start: where, when, what, who reported it, minimal necessary facts. Explicit leakage checks against solution fields.

Implemented (`core/brief.ts`): code hands the AI only victim, place, time found, who reported it, and the weapon if it was left at the scene. Output `{ title, summary, initialFacts }`. Leak check: no killer/accomplice name (surnames shared with the victim or finder are fine), no weapon that isn't at the scene, no copied method or motive text; must name the victim; 3–5 facts.

## Stage 10 — Optimal-time estimate (code, no LLM)

Code estimates a competent investigation and outputs `{ estimatedOptimalMinutes, reasoningSummary }` plus the steps behind it. Default deadline = `optimal + 1440`. Users may override.

Implemented (`core/estimate.ts`): code lists the steps a perfect investigation needs (decisive evidence, one piece per fact, two for motive, each alibi, proof for the killer's lies, plus items that must be found before a lab test or device read), prices them with the fixed action costs from `GAME_SYSTEMS.md`, adds a nearest-place-first route from the police bureau and back, and gives the total as a lower bound. The estimate is the lower bound times a dead-end factor (easy ×2, normal ×2.5, hard ×3), rounded up to 15 minutes. It was an AI stage until 2026-09-24; replaced because code bounded it anyway and it cost a slow call.

## Stage 11 — Solvability validation (code)

No LLM judge in V1. Implemented in `core/validate.ts`; returns a pass/fail list the tester shows as a checklist. Checks, plus those in `VALIDATION_EVALS.md`:

- **killer:** ≥ 2 different evidence types place the killer at the scene or break their alibi,
- **motive:** ≥ 2 items,
- **weapon:** ≥ 1 item links weapon to scene and ≥ 1 links it to the killer,
- **method:** supported by forensics,
- **evidence:** decisive set has ≥ 1 reachable item (≥ 2 on easy),
- **unique answer:** nothing decisive points at an innocent (the victim's blood on their things, their prints on a weapon they don't own, them on the scene camera at the death). Innocents don't need a provable alibi; alibis are still listed as facts when they exist,
- **accomplice:** ≥ 1 linking item if present,
- **red herrings:** every lie and fake motive is refutable,
- **reachable:** every required item is obtainable at a city place/tool,
- **no shortcut:** no single item names the killer outright ("<killer> … killed/shot/poisoned … <victim>" in a few words; the killer's name next to other deaths is fine).

"Killer" counts evidence kinds across: at the scene, near the scene, and proof that breaks the killer's whereabouts lie. "Reachable" means: search spots exist in the room ("on the body" only at the scene), cameras exist, lab subjects and devices are themselves found, phones exist, and the person to question is alive and not lying about that event.

## Stage 12 — Targeted repair

Each failed check maps to the earliest stage that caused it; rerun from that stage down.

Implemented per stage (`convex/generation/aiStage.ts`): after a try, the stage's checks run; if they fail and repairs are left (max 2), the next try gets the first prompt plus the previous answer and the exact problems. After the last repair, the runner keeps whichever of the last two tries had fewer problems (a repair once made things worse), then the stage's `finalize` step drops what can't be fixed (lies, texts). Each try is its own background action with a 9-minute AI timeout, so a slow model can't hit Convex's 10-minute action limit silently. The tester's "Recheck" reruns a stage's checks on its saved output after the checks change. Restarting from an earlier stage and new seeds are chunk F (workflow).

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
- `convex/generation/workflow.ts` — fixed stage order + repair loop (Convex workflow component). Implemented: `generateCase` (one case) and `generateBatch` (a test run, cases one after another).
- `convex/generation/jobs.ts` — running one code stage or one AI try for a job, shared by the tester and the workflow.
- `convex/generation/core/stats.ts` — test-run stats per case and per AI stage, and the time-left prediction.
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
- **Test runs** — "Run 3 test cases" in the tester (easy, normal, hard, random seeds, one after another); the stats view shows pass rate, time and tokens per case, and per AI stage: first-try passes, repairs, time, tokens, failed calls and the most common problems. Cost is added once the provider is chosen.
- **Dev case viewer** — dev-only read-only page to inspect generated cases.

## Model strategy

- Generation models are set per AI stage in `convex/generation/llm.ts` (`STAGE_MODELS`) as a fixed, ordered list written `provider:model` (providers: NIM, Gemini, Groq, OpenRouter, all through their OpenAI-compatible APIs). When a call fails (rate limit, daily quota, overload) the next model in the list takes over. Current lists (from a side-by-side run on 2026-09-25):
  - Gemini `gemini-3.5-flash` first for crime, cast, story and lies (fastest; free tier is 20 requests a day per model, so the next model takes over once it's used up).
  - crime, text, brief: Groq `openai/gpt-oss-120b` (a few seconds; Groq's free per-minute token cap only fits these small prompts), then NIM `moonshotai/kimi-k3`.
  - cast, story: OpenRouter `nvidia/nemotron-3-super-120b-a12b:free` (cast right first try in 82 s, story in 137 s with 2 repairs; free tier is 50 calls a day), then NIM.
  - lies: NIM only (about 16k-token prompt).
  - Tried and not used: Gemini 3.8/3.7/3.5 Flash (overloaded, 503 on full prompts that day), Gemini 3.1 Pro (not in the free quota), Gemini 2.5 (no longer offered to new keys). Moonshot's own API is paid, so not used.
- `NPC_MODEL`: `moonshotai/kimi-k2.6` on NVIDIA NIM,
- `REPAIR_MODEL`: cheaper structured-output model,
- `JUDGE_MODEL`: grader for motive/method at case close; may equal NPC or generation model initially.

No automatic dynamic model router in V1: the per-stage lists are fixed; the next model is used only when a call fails.

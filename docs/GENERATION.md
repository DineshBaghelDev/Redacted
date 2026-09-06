# Case Generation Pipeline

Generation is a **fixed, shallow, multi-stage pipeline**. It is not an autonomous agent deciding what to do next.

A stronger model handles primary generation. A cheaper model may handle targeted repair. Provider/model IDs are configured through environment variables behind the Vercel AI SDK.

## Principles

1. Generate canonical truth first.
2. Everything else must derive from that truth.
3. City/interior topology is deterministic code, not LLM layout output.
4. Investigation records are generated before play.
5. Every stage emits strict structured output validated immediately.
6. Failed sections are repaired locally, not by regenerating the entire case.
7. Maximum 2 repair attempts per failure path.
8. Once ready, generated case records are immutable.

## Inputs

```ts
{
  genre: string,
  difficulty: "easy" | "medium" | "hard",
  expectedLength: "short" | "medium" | "long",
}
```

No broad set of user tuning controls in V1.

## Stage 1 — Crime skeleton

LLM output:

```ts
{
  incident: {
    type: string,
    roughLocationType: string,
    incidentTime: number,
  },
  culprit: GeneratedNpcSeed,
  motive: string,
  weapon: GeneratedWeaponSeed,
  method: string,
  keyReasoningPoints: string[],
}
```

This establishes canonical solution truth.

## Stage 2 — Canonical timeline

Input: crime skeleton.

Generate all important events:

- lead-up,
- crime execution,
- movements,
- interactions,
- communications,
- cover-up/after-events where applicable.

Each event must specify exact participating generated character keys, place semantic keys, and timestamps.

Validator checks chronology and impossible overlaps.

## Stage 3 — Characters and NPC scripts

Input: skeleton + timeline.

Generate:

- victim if applicable,
- culprit,
- plausible suspects,
- witnesses,
- reporter,
- supporting NPCs needed by the case.

For every NPC generate:

- public profile,
- personality,
- goals,
- experiences,
- knowledge,
- secrets,
- intentional lies,
- behavioral rules.

Private NPC knowledge must be traceable to what that NPC experienced, observed, was told, or plausibly knows.

## Stage 4 — Procedural city and interiors

Code generates from seed:

- city,
- >=10 places,
- connected travel graph,
- travel times,
- building templates,
- floors,
- rooms,
- room connections.

LLM assigns story semantics:

- NPC homes/workplaces,
- crime location,
- relevant places,
- relevant room assignments,
- semantic names/descriptions.

Do not ask the LLM to construct graph topology.

## Stage 5 — Physical evidence

Input: solution + timeline + NPCs + world.

Generate `caseItems` and their placement.

Requirements:

- weapon represented when physically applicable,
- fingerprints/footprints/source traces consistent with events,
- necessary objects are discoverable through legitimate searches,
- irrelevant but plausible objects may exist depending on difficulty,
- internal generation metadata should retain origin-event references for validation even if not exposed to players.

## Stage 6 — Records

Generate consequences of existing canonical events:

- CCTV records,
- vehicles,
- devices,
- call logs,
- messages,
- public records.

Hard rule:

> A record may reflect or corroborate an existing canonical event. It must not silently invent a new canonical event.

No social posts in V1.

## Stage 7 — Forensic outputs

Generate forensic truth from existing physical evidence/events:

- fingerprint matches,
- footprint comparisons,
- DNA/blood,
- toxicology,
- fibers,
- ballistics,
- autopsy/report,
- other case-specific lab outputs.

These are pre-generated outputs hidden until the corresponding session request is ready.

## Stage 8 — Case brief

Generate only information investigators legitimately receive at start:

- where,
- when,
- what,
- who reported it,
- minimal necessary facts.

Run explicit leakage checks against solution fields.

## Stage 9 — Optimal-time estimate

A model receives only the information required to estimate a competent investigation route:

- number of relevant places,
- travel graph,
- required searches,
- likely interrogations,
- required forensic waits,
- complexity level.

Output:

```ts
{
  estimatedOptimalMinutes: number,
  reasoningSummary: string,
}
```

Clamp result to configured sanity bounds.

Runtime deadline becomes `optimal + 1440` minutes.

## Stage 10 — Deterministic validation

No LLM judge required for general solvability in V1.

Run structural, referential, chronology, world, security, and accessibility checks described in `VALIDATION_EVALS.md`.

## Stage 11 — Targeted repair

If deterministic validation fails, repair only the smallest broken section.

Repair input:

```ts
{
  brokenSection,
  relevantCanonicalFacts,
  exactValidationErrors,
  allowedReferences,
}
```

Example:

```text
CCTV record references unknown vehicle
  -> repair only that record/records
  -> revalidate references + timeline consistency
```

Maximum 2 repair attempts.

If still invalid, mark case generation failed.

## Stage 12 — Freeze

When all gates pass:

```text
case.status = ready
```

After this point:

- no generated case record is modified during play,
- no partial regeneration,
- no NPC action mutates canonical case truth,
- replay uses the exact same records.

## Model strategy

Use:

- `GENERATION_MODEL`: strongest selected fixed model,
- `NPC_MODEL`: cheaper/faster model appropriate for live roleplay,
- `REPAIR_MODEL`: cheaper structured-output model,
- `JUDGE_MODEL`: reliable semantic grader; may equal NPC or generation model initially.

No automatic dynamic model router in V1.

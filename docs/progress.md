# Progress

## 2026-09-06

- Restyled the signed-in and signed-out home screen as a pixel-noir title menu using the supplied city-office background.
- Added the signed-in home screen with logo placeholder and room action buttons.
- Applied Pixelify Sans as the global site font.
- Kept room actions as UI-only buttons until room flows exist.
- Added the first Convex room flow: signed-in players can create a room, join by code, and see the joined room indicator.
- Reworked the signed-in start flow: detective name, menu, create-room modal, join-room form, previous-games cards, loading screen, fresh-start confirmation, and empty case brief.
- Improved the room lobby with saved detective profile name, copy-room-code, player ready states, start gating, friendlier join errors, and a red leave-room action.
- Converted the join-room form from an inline panel into a modal overlay with a close button, matching the room modal pattern.
- Modularized the room hub into a `room-hub/` folder: a `useRoomSession` hook for room flow logic, a `constants` file for shared styles, and one screen component per file under `screens/`.
- Join-room dialog now takes the room code as six single-character OTP-style boxes (auto-advance, backspace navigation, paste support) and shows join errors inside the dialog instead of behind it.
- Main-menu options are now borderless plain text that reveal the pixel-noir border/background on hover or keyboard focus.
- Fixed the detective-name dialog flashing on reload: the room hub now waits for the client to read the saved name from localStorage before rendering anything, eliminating the SSR/client mismatch.
- Hardened room lifecycle actions with waiting-state and membership checks, persisted leave cleanup, visible lobby errors, and selected-case handoff into the case brief.

## 2026-09-24

- Redesigned the case-generation plan in `docs/GENERATION.md` (crime core, cast, timeline, code-derived evidence, lies, validation, repair); no code yet.
- Case generation setup: installed Convex workflow component, NIM-compatible AI SDK provider, Zod, Vitest and convex-test; added a seeded random helper with tests.
- Added `generationJobs` / `generationDrafts` tables, a stage list (`convex/generation/stages.ts`) and a dev-only generation tester at `/dev/generation` (allowlisted by `DEV_TOOL_USER_IDS`) that runs one stage at a time and shows its output and problems.
- Built the permanent V1 city: 20 places, 25 streets, 5 building templates (199 rooms), 8 street cameras and 52 room cameras, route finding, city checks, and tests (including a snapshot guarding city ids). The tester's first stage now shows the city.
- Tester: stage 0 now shows a clickable city map (streets, minutes, camera streets) and each building's floors, rooms, cameras, doors and item slots. Added fixed map positions to places.
- Chunk A: stage shapes (crime core, cast, story) as Zod schemas, a hand-written easy case ("The Keel Street Ledger": 4 suspects, 3 witnesses) in the fixture city, routine builder, timeline merge with travel-time trimming, and timeline checks with broken-case tests. Tester can load hand-written stage outputs and shows the timeline as a filterable table.
- Tester: crime, cast and story stages now have visual views (crime card, character cards, story timeline with calls/purchases/items); timeline table shows names. Raw data stays as a collapsible fallback.

## Pending

### Case generation — remaining chunks

- **B.** Evidence built from the timeline (CCTV, phone, card, forensics, items, records, devices) + fact links and decisive set.
- **C.** Lie checks, NPC scripts (what each NPC knows) and the full solvability validator. Milestone: hand-written case passes end to end with no AI.
- **D.** AI setup (NIM, logs) + AI crime core and cast stages.
- **E.** AI story events (with repair), lies, written text, case brief, time estimate.
- **F.** Full workflow ("Run all", retries, repair loop), Promptfoo evals, 10-seed smoke run.

### Making AI-generated cases trustworthy

Today the same code path and checks run for hand-written and AI output, but that does not yet guarantee AI cases work:

- **Solvability not checked yet.** An AI story can pass every timeline check and still be unsolvable (alibi can't be broken, innocents can't be cleared). Covered by chunk C.
- **Story sense not checked.** Only later evals (chunk F) judge whether a case makes sense.
- **Only one test case, written alongside the checker.** Untested paths: accomplice, unemployed/student routines and hangouts, hotel guests, events crossing midnight, 3+ people meeting, poison/other weapon types, public-place crime scenes.
- **Repair via plain-English problems is untested.** Unknown whether the AI can fix its output from the checker's messages.
- **NIM strict JSON support for Kimi is unknown.** Verify on the first AI call; fall back to JSON mode + Zod if needed.

Planned fixes:

- [ ] **Invariant tests (start of chunk B):** run the timeline builder over ~200 seeds and randomly tweaked copies of the case; whenever the checker says "no problems", assert the basic rules really hold (no overlaps, travel possible). Catches checker gaps and crashes.
- [ ] **One source for rules (chunk D):** prompts get the exact allowed ids (rooms, homes, jobs) and the same rule list the checker uses.
- [ ] **Record and replay (chunk D):** save every AI case, passing or failing, as a test fixture so each real case becomes a permanent regression test.
- [ ] **Smoke pass rate (chunk F):** 10-seed run reporting pass rate, time and cost — the real measure of "it works for AI".

### Open questions

- Hand-written story ("The Keel Street Ledger") awaiting review before chunk B.
- Stairs vs lift: routes inside buildings always pick stairs on a tie; timeline may need to say which was used, since cameras differ.

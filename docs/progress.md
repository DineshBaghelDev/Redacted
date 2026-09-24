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
- Chunk B: invariant tests (200 seeds + 200 randomly shifted stories), evidence builders (CCTV with faulty cameras, phones, card payments, forensics, items, devices, public records, witness statements), facts stage (what each piece proves, decisive set, alibis). Added gender, item kind, `proves` tags and public records to the stage shapes. Tester shows evidence like a player would (CCTV by camera and time, phones, lab, items, records, witnesses, with a "show hidden truth" toggle) and each fact with its supporting evidence.
- Finished chunk B's leftovers: laptops as optional story items with readable files, background clutter items for searches, weapon-specific lab tests (toxicology, ballistics, ligature), footprints at side doors the killer used, and the "camera switched off" cover-up with its checks. Hand-written case gained Daniel's laptop (a spreadsheet of payments to Hale Consulting) and Victor's shoes. Tester shows laptop files and marks clutter as background items.
- Chunk C: lies stage shape and checks (each lie hides something real and is broken by existing evidence about the liar; backup lies need different proof; the killer must lie about where he was), NPC scripts built by code (profile, what they took part in or saw, their messages and purchases, lies, rules; leak check), and the final "can the case be solved?" check (killer, motive, weapon, method, decisive evidence, every innocent cleared, accomplice, every lie catchable, everything reachable, no giveaway). Hand-written case got 5 lies, Nora's stolen painkillers, and passes every check with no AI. New decisive rule: something taken from the scene found in the killer's home. Tester shows lies with their proof, each NPC's script, and a pass/fail checklist. 59 tests.
- Docs: any found evidence (not only picked-up items) can be shown to break a lie.
- Chunk D: AI connection (`convex/generation/llm.ts`: NIM via AI SDK, strict JSON schema with JSON-mode fallback, bad output returned as problems), every AI call logged in a new `generationLogs` table, AI crime core stage (seeded brief for motive, weapon and scene so cases vary) and AI cast stage. Crime and cast rules now live in one file whose rule text goes into the prompts word for word, with matching checks. Record and replay: `exportJob` saves a job's AI outputs to `convex/fixtures/recorded/`, and a replay test reruns every code stage and check on them. Tester: "Run with AI" button, AI call panel (model, mode, time, tokens, prompt, reply), and bad output no longer breaks the page. Updated `ai` to 7.0.113 to match the NIM provider package.
- First real AI runs (NIM, `moonshotai/kimi-k3`): strict JSON schema mode works, so no fallback needed so far. Crime core takes ~60 s, cast ~150 s (the model thinks before answering). Fixes from what the checks caught: weapon rooms must be copied from the list, the cover-up can't repeat steps (max 5), and a switched-off camera must name the camera. API key is `NIM_API_KEY` in Convex (pushed from `.env.local`). First recorded case: `convex/fixtures/recorded/union-station-poison.json` (crime + cast).

- Chunk E: AI versions of story events (3a), lies (6), written text (7), case brief (9) and time estimate (10), each with rules shared by prompt and checks. The story check now runs end to end (timeline, then evidence and the "can it be solved?" checks) so repairs target real problems. Repair loop: failing output goes back to the AI with the exact problems, up to 2 times; each try runs as its own background step; lies and texts that still fail are dropped. New checks: written text can't add people, places or times; the brief can't name the killer or leak the weapon, motive or method; the estimate must be 1–4 times a code-computed minimum. Hand-written case got a brief, an estimate and two hand-written messages. Tester: "AI is working" banner with "Stop waiting", repair number on each AI call, and views for written text (plain vs written), the brief (as a case file) and the estimate (with default deadline). 81 tests.

- First full AI case run (normal, seed 7, Union Station poisoning): story needed 2 repairs (first try 559 s with timing mistakes, then solvability gaps). The real run exposed checker gaps, now fixed: "gives the answer away" flagged the killer's name next to an unrelated death; poison cases had no way to link the weapon to the killer (now: killer on camera where the weapon came from); a witness or card payment at the scene now places the killer there. Added a 9-minute AI timeout and a "Recheck" button. Lies run exposed more: the last repair returned 1 lie with missing fields and the clean-up then dropped everything; fixed by keeping the better of the last two tries, making `truthIds` required, and keeping a main lie when only its backup lie is broken.
- **First fully AI-generated case passes every stage** (Union Station poisoning, normal): 20 story events, 321 pieces of evidence, 11 lies, 26 written texts, brief, estimate (215 min against a 94-min minimum), final check all green. Saved to `convex/fixtures/recorded/union-station-poison.json` as a replay test. This run's AI totals, including the failed tries before the fixes: 16 calls, 45 min, 139k tokens in, 32k out. Lies were the heaviest prompt (~16k tokens per try).

- Removed forced behaviour found in a review of all rules and prompts: lies are no longer demanded from every suspect (only the killer's cover story is required; others lie only when the story gives a reason), secrets are optional, innocents no longer need a provable alibi (the final check now asks that nothing decisive points at an innocent), a suspect on the road at the time of death is fine, and the accomplice's script no longer says they don't know the killer. The lies prompt now sends each person only their own story and evidence. Rerun on the Union Station case: 11 lies became 6 (the killer's 2 plus 4 innocents); ~4 min over 2 tries, with the prompt down from ~16k to ~11k tokens. Also added: a secret alone isn't a reason to lie, and at most 2/3/4 innocent liars on easy/normal/hard (a checked ceiling, not a target). An innocent lies only when the truth would do real damage (arrest, job, reputation, family); embarrassment isn't enough. Secrets in the cast only when serious. Hand-written case dropped Lena's lie (only embarrassment); Tom (fraud) and Nora (theft) keep theirs. Union Station case rerun: 5 lies (killer 2, 3 innocents).
- Crime: the AI never filled the optional `disabledCamera` (3 tries), so `accomplice` and `disabledCamera` are now required-but-nullable, and a leftover unnamed camera switch-off is dropped. Crime prompt says most killers act alone. Fixed: a failed AI call (e.g. timeout) left the job stuck on "AI is working". That cast was made under the old "everyone has a secret" rule, so new casts should give fewer liars.

- Time estimate (stage 10) is now pure code: the minimum a perfect investigation needs × 2 / 2.5 / 3 for easy / normal / hard, rounded up to 15 min. One AI call fewer per case; the estimate prompt and hand-written estimate are gone. Replay tests now rerun every code stage even when an older recording holds its output.
- Chunk F (part 1): "Run all" as a Convex workflow (`convex/generation/workflow.ts`): every stage in order with the repair loop, failed AI calls retried 3 times with backoff, the case stops at the first stage still failing. Stage running moved from the tester into `convex/generation/jobs.ts` so both share it. Jobs now have a status (waiting, running, passed, failed, stopped), start/finish times and a test-run label. Tester: "Run all" / "Stop" per job, "Run 5 test cases" (2 easy, 2 normal, 1 hard, one after another), and a stats view per test run (per case: result, time, AI calls, tokens; per AI stage: first-try passes, final passes, repairs, time, tokens, failed calls, most common problems). A running job shows the predicted AI time left from the last 5 passed cases of its difficulty. The 200-seed timeline tests got a 30 s limit (they hit vitest's 5 s default on a busy machine). 90 tests.

- Seeding for variety: the seed now also picks accomplice or not (about 1 case in 5), the part of Day 2 the death falls in, 24 first names and 20 surnames for the case (`core/names.ts`), the exact suspect count and the victim's routine. Prompts state them; crime and cast checks enforce them on AI output. Replay tests no longer apply seeded-brief rules to old recordings. 93 tests. Not deployed yet: waiting for the first 5-case NIM baseline run to finish so it measures the old pipeline.

- Cases looked alike (6 AI cases: Elena killer in 3, Marcus/Martin victims, affair/inheritance/old-testimony plots, two poisoned coffees at Union Station). The crime prompt now gets one-line summaries of the 10 newest AI crimes from other jobs and must pick a clearly different premise (new `by_stage` index on drafts). Also not deployed until the baseline run ends.

- Providers: `llm.ts` now reaches NIM, Gemini, Groq and OpenRouter (model written `provider:model`), and each AI stage has an ordered model list with fallback on failed calls (`STAGE_MODELS`). Side-by-side run of crime → cast → story (seed 4242, easy): OpenRouter's free Nemotron 3 Super did all three in about 4 min (cast first try); Groq gpt-oss-120b did crime in 3 s but hit its free token-per-minute cap on cast; Gemini Flash models were overloaded (503) and 3.1 Pro isn't in the free quota. NIM reference from the test run: about 18 min for the same stages. Now: Groq for crime/text/brief, Nemotron for cast/story, NIM for lies and as backup. `GROQ_API_KEY` and `OPENROUTER_API_KEY` set in Convex dev.
- Baseline test run so far: easy passed (25 min, 11 AI calls; cast and story needed 2 repairs each), easy passed, normal failed at story (the weapon was left in a spot the stairs don't have, 3 times; the check message now lists the room's spots, or says it has none). The baseline mixes old and new code because `convex dev` pushes saved files. 94 tests.

## Pending

### Case generation — remaining chunks

- **F.** ~~Full workflow ("Run all", retries, repair loop)~~ done; first real 5-case test run, cost per case (after provider choice), parallel stages, Promptfoo evals.

### Making AI-generated cases trustworthy

Today the same code path and checks run for hand-written and AI output, but that does not yet guarantee AI cases work:

- **Solvability check is rule-based.** It proves each star has reachable evidence, not that players will connect it. Story sense is still for evals.
- **Story sense not checked.** Only later evals (chunk F) judge whether a case makes sense.
- **Only one test case, written alongside the checker.** Untested paths: accomplice, unemployed/student routines and hangouts, hotel guests, events crossing midnight, 3+ people meeting, firearm/strangulation/fall cases end to end (poison lab test is covered), public-place crime scenes.
- **Repair via plain-English problems is untested.** Unknown whether the AI can fix its output from the checker's messages.
- **Brief can add small invented details** (seen: "construction foreman" for a warehouse foreman, "near the ticket gates"). The leak check only blocks the solution; a check or eval for added facts is still missing.
- **Checks can't catch text that contradicts the data.** Seen in a real cast: a witness described as "Elliot's neighbour at Carver Towers" whose home is 14 Keel Street. Needs a later text-vs-data check or eval.
- **AI is slow.** ~60 s crime, ~150 s cast, story first try ~9 min (right at the 10-minute Convex action limit; now cut off at 9). A full case takes 20+ minutes. Consider a faster model for the story or generating cases ahead of time.
- **NIM free endpoint queues requests:** a one-sentence `kimi-k3` call took ~3 min on NIM vs ~10 s on Moonshot's own API (thinking isn't the cause). A normal-case story hit the 9-min timeout on NIM. Provider choice deferred during development.
- **Fresh-case check of the new lie rules not finished** (normal, seed 2024: crime and cast pass, story timed out on NIM).
- **NPC model id `moonshotai/kimi-k2.6` not tried yet.**

Planned fixes:

- [x] **Invariant tests (start of chunk B):** run the timeline builder over ~200 seeds and randomly tweaked copies of the case; whenever the checker says "no problems", assert the basic rules really hold (no overlaps, travel possible). Catches checker gaps and crashes.
- [x] **One source for rules (chunk D):** prompts get the exact allowed ids (rooms, homes, jobs) and the same rule list the checker uses (crime and cast done; story and lies in chunk E).
- [x] **Record and replay (chunk D):** save AI cases, passing or failing, as test fixtures so each real case becomes a permanent regression test. Saving is a manual command for now.
- [ ] **Smoke pass rate (chunk F):** 5-case run reporting pass rate, time and cost — the real measure of "it works for AI".

### Open questions

- CCTV row ids depend on the seed, so hand-written lies can't point at camera records. AI lies get the real ids per case, so this only limits the fixture.
- A witness who lies about an event is treated as never telling what they saw of it, even after the lie breaks. Simple and safe for the checks; revisit if it blocks good cases.
- Stairs vs lift: routes inside buildings always pick stairs on a tie; timeline may need to say which was used, since cameras differ.

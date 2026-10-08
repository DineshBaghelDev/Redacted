# Progress

## 2026-10-08 — Room browser-history navigation

- The replay shell now derives its visible screen and current room code from the URL on every navigation. Browser Back/Forward no longer leaves a previous screen or room-lobby overlay visible over a different route.
- Signed-out desktop and mobile boot screens were visually checked at 1440×900 and 390×844. Signed-in history interaction remains unverified without an authenticated browser session.

## 2026-10-08 — Older passed-case replay recovery

- The development deployment had 23 passed generation jobs but only one published replay case. A private, per-job idempotent repair now reuses frozen-case validation, including a strict read-time translation of the older `killerId`/`timeOfDeath` crime fields.
- Recovered 17 additional jobs: 18 frozen replay cases are now published. Five older jobs remain invalid (one crime names people absent from its cast; four use the removed body-moving mechanic) and stay hidden. The repair does not alter drafts, publish failed transactions, or add a public creation/generation route. Per-case browser playability is still unverified.

## 2026-10-08 — Shared recorded statements

- A detective can ask for an NPC's frozen witness account at the bureau. The question costs 3 game minutes; when it completes, the session gains only that NPC's published statements whose events are not covered by their intentional lies. Both detectives can then read, pin, and show those statements as proof.
- Clueboard pinning, proof presentation, and final-report citation recheck the session access row, so guessed statement IDs and forged board cards do not reveal or cite private statements. Mocked timing, two-player sharing, lie exclusion, and case-close access tests pass. Live-provider/browser verification remains open.

## 2026-10-08 — Frozen witness-statement publication

- New cases now publish generated witness statements and their rewritten wording as immutable, private runtime rows. An internal idempotent backfill repairs previously published cases without regenerating story or changing replay creation.
- Runtime acquisition is described above; live-provider/browser verification remains open.

## 2026-10-08 — Direct interview proof

- Detectives can show found evidence directly in a bureau interview without first pinning it to the clueboard. The selector includes discovered items, viewed lab results, reviewed camera records, completed public records, and read device files, calls, and messages. Server checks still reject guessed or unread references; pinned-proof calls remain supported.
- The current selector is bounded to the first 100 rows of each discovery source. Another person's statement remains open; field interviews are out of V1 scope by player decision. Real-provider and browser playthrough are still unverified.

## 2026-10-08 — NPC-phone handover and read

- Added a deliberate bureau interview request for NPC-held phones. After the 3-minute question, both detectives share the handover; a separate 5-minute read reveals the phone's pre-generated calls and messages.
- The interview panel now shows read records and can pin them. Clueboard pinning, interview proof, and final-report submission all check the same session read gate, so a guessed record ID cannot reveal an unread NPC phone.
- Mocked two-player backend coverage confirms hidden-before-read, shared-after-read, partner duplicate-read rejection, and a message used to expose a lie. Real-provider and browser playthrough remain unverified.

## 2026-10-08 — Bureau interview path in progress

- Pinned, already-discovered evidence can now be shown with a bureau question. The server rechecks case/session access, resolves the frozen evidence ID, and marks matching main or backup lies exposed for that shared conversation. The NPC reply sees only that NPC's lie exposure state for the queued turn; no solution or script is sent to clients.
- At this stage, unpinned discovered evidence and another person's statement were not selectable yet; the real-provider/browser interview pass remains open.
- Added the shared NPC conversation component, a bureau call action, a 3-minute question action, per-NPC ordered processing, and a responsive conversation view. Calling an NPC to the bureau is immediate by player decision.
- The NPC reply worker sees only that NPC's private script and thread history, not the hidden case solution. Live model replies, evidence presentation, and full browser playthrough remain to be verified before treating interviews as complete.

## 2026-10-08 — Searchable victim phone and shared records

- Reconfirmed continuous, action-driven play with no turns. The clock remains paused when neither detective has a timed action.
- Generated victim phones with a scene-search location now publish as hidden physical items. If the scene room otherwise has no searchable slots, publication enables the room search so the phone is reachable. The existing internal backfill repairs already-published cases without regenerating evidence.
- A 5-minute read reveals the phone's frozen calls and messages to both detectives. Either can pin an individual record and cite it in the final report; guessed IDs cannot bypass the read. NPC-held phones still need a separate handover route.

## 2026-10-08 — Playable laptop files

- Searchable laptops now publish their frozen files into playable case rows. An investigator must find the physical laptop, then spend 5 shared game minutes to read it; contents remain hidden until completion and are shared with the partner.
- Read files can be pinned to the clueboard and cited in the final report. Direct file-ID guesses, non-members, and duplicate partner reads cannot bypass discovery.
- Added an idempotent internal backfill for already-published cases whose first publisher omitted laptop files. Victim-phone records are now playable; NPC-held phone access remains unfinished.

## 2026-10-08 — Shared-clock settlement correction

- When one action or lab request completes while another continues, settlement now saves the current shared-time anchor. Later result availability and the next completion timer no longer read an outdated baseline.
- Added a regression covering staggered lab results and pause after the last result; corrected the locked decision record and source-of-truth links.

## 2026-10-08 — Timed public-record searches

- Searching the bureau's public records now costs 10 shared game minutes. Typed text alone reveals nothing; completed searches and their results are shared with the partner.
- Only files returned by a completed search may be pinned to the clueboard. Direct record-ID guesses no longer bypass the search.
- Search now matches the file contents as well as titles, so an address such as Keel Street can be found even when the title only names a person.
- Each search stores its matched file IDs at start, so later search-index or corpus changes cannot make a completed search display an unpinnable file.

## 2026-10-08 — Timed CCTV review

- Reviewing a camera time window now occupies a detective for 5 shared game minutes. Results remain server-hidden until completion, and a completed window is available to both partners without another charge.
- The bureau terminal shows available, in-progress, and reviewed states. Direct clueboard pinning cannot bypass a completed review by guessing a CCTV record ID.

## 2026-10-07 — Forensic lab requests and results

- Added shared lab requests for tests backed by collected objects, searched rooms, or the autopsy. Submission occupies the detective for 5 game minutes; the frozen turnaround keeps the shared clock running and overlaps other work.
- The lab lists eligible test names and pending times without exposing result text. Either partner can open a ready result at the lab, after which it is shared. No evidence is generated during play.
- A room-level clock settlement timer handles completed travel, room actions, and pending lab work even when the player leaves a specific station screen.
- Viewed lab reports and discovered objects can be pinned to the clueboard and selected as proof in the final report. The server converts those pins to canonical evidence IDs before grading, without exposing unviewed reports.
- The final report now offers collected inventory as an explicit weapon choice. Server validation rejects guessed or uncollected item IDs while retaining a text description for non-item weapons.

## 2026-10-07 — Room investigation and shared inventory

- Added connected room movement, 15-minute room searches, 2-minute item inspection, and explicit collection on the continuous shared clock. Two players can act concurrently; the clock pauses after the last action.
- Search reveals only frozen case items in that room. Discovered items, inspected descriptions, searched rooms, and collected inventory are shared. Hidden items remain unavailable until a legitimate search.
- Added a responsive Explore screen with room navigation, action progress, local finds, and shared inventory, reachable from the city map or the away-from-bureau notice.
- Discovered objects can now be pinned to the shared clueboard. Pinning is refused until the team finds the object and never reveals its description early.
- Closed a clueboard location bypass: public-record and CCTV cards can only be created while the detective has bureau-terminal access.
- CodeRabbit review closed two gameplay races: a started session can no longer be started again to reset the clock, and partners cannot waste time by searching the same room simultaneously.
- Published the checked hand-written case in the development deployment and verified a two-player replay/travel backend flow. Browser playthrough remains to be checked.

## 2026-10-07 — Continuous multiplayer clock decision

- Chose an action-driven shared clock: concurrent detective actions overlap, the clock pauses when no timed action is active, and server timestamp anchors avoid turn prompts and per-minute writes.
- Kept the real-time speed multiplier adjustable for playtesting while preserving the documented in-game minute costs.
- Added the first timed action: detectives can choose any reachable city destination, travel concurrently along the shortest route, and arrive independently. The shared clock pauses after the last journey; stale journeys settle on return.
- The map shows each detective's location and journey progress. Bureau CCTV and public-record reads now require that detective to be physically at the bureau and not travelling; away detectives see a route back to the map.
- Publishing the checked hand-written case exposed cameras with no observations. The publisher now keeps those cameras across the case window instead of rejecting the case.

## 2026-10-07 — Stale room recovery

- Expired, unknown, or inaccessible room URLs now return to the home screen instead of showing an empty game or permanent loading lobby.
- The home screen explains that the room is no longer available while preserving normal room creation and join flows.

## 2026-10-07 — Waiting-room route guard

- Direct brief or bureau URLs now return waiting sessions to their ready lobby instead of visually bypassing it.
- Once either player starts, the lobby route still advances both detectives to the shared case brief.

## 2026-10-07 — Safe investigation exit

- Leaving a started room now requires confirmation because the membership removal is irreversible.
- The bureau explains that the player cannot rejoin, with a keyboard-focused `Stay` action as the safe default.

## 2026-10-07 — Complete CCTV windows

- Camera timeline queries now apply the selected time boundary in the database index and inspect every earlier overlapping row.
- Later activity no longer disappears when a camera has more than 512 stored records.

## 2026-10-07 — Truthful station guidance

- The bureau now calls the roster surface `People` until live interviews exist, while preserving its room-scoped route.
- The Case File description now matches its actual briefing and final-report flow.
- CCTV no longer claims the timeline contains activity marks that are not rendered.

## 2026-10-07 — Case-close evidence limit

- The final-report form now shows the server's 12-record limit before submission.
- Once 12 records are selected, extra choices are disabled while selected records remain removable.

## 2026-10-07 — Shared lobby start transition

- When either detective starts a ready room, both clients now follow the shared `playing` status into the case brief.
- The partner no longer remains trapped in a stale lobby after the starter navigates away.
- Lobby controls enter a truthful opening state while the shared route transition completes.

## 2026-10-07 — Shared map-place references

- Every map-visible place can now be pinned directly to the shared clueboard without implying travel or discovery.
- The server validates the place against the replayed case's city, derives player-safe card text, and de-duplicates the reference for both players.
- Every clueboard card now has an accessible full-detail view on mobile and desktop.
- The bureau names its currently playable evidence surface `Public records` instead of advertising unfinished inventory, messages, or lab results.

## 2026-10-06 — Ready-gated investigation start

- A second player joining a replay room no longer starts the investigation automatically.
- The room stays in the lobby with investigation data hidden until every connected player marks ready and a player explicitly starts.
- Regression coverage follows the two-player join, ready, and start flow end to end.

## 2026-09-28 — Private case-close grading

- A signed-in room member can submit one final five-part theory using a case NPC and evidence pinned to that session's clueboard.
- Killer, weapon identity/name, canonical evidence-group coverage, and the five-star total are checked server-side; motive, non-item weapon, evidence reasoning, and method use a private structured judge.
- Canonical answers and model-written text never enter the public result. Provider failure leaves a bounded retry path instead of a stuck judging state.
- The Case File station now carries the complete responsive flow: public brief, five findings, evidence selection, irreversible confirmation, shared judging state, retry, and the five-category result.

## 2026-09-28 — Evidence reference cards

- Known people, visible public records, and CCTV rows can now be pinned directly to the shared clueboard.
- Reference cards keep their case evidence ID, use server-derived display text, cannot be rewritten as notes, and de-duplicate across both players.
- The clueboard remains editable only after the investigation starts; cross-case references are rejected server-side.
- Shared strings can now be labelled, recoloured after selection, and removed; labels are bounded and rendered directly on the board.

## 2026-09-28 — Active-game investigation guard

- One shared server guard now keeps the city map, public NPC list, CCTV console, and public-record search unavailable until a room enters play.
- The public case brief remains visible in the lobby, and regression coverage checks both waiting and playing states.
- Map and public-person reads no longer cut large cases off at 32 places/NPCs or 64 streets.

## 2026-09-27 — Records access review fix

- CodeRabbit found that room membership alone could read public records before an investigation started.
- The records query now requires both membership and a playing session; the regression test covers waiting, playing, and non-member access.

## 2026-09-27 — Replay-only home menu

- Removed the disabled new-case affordance from the home screen.
- Playing a previous case is now the primary action, followed by joining a partner's room and settings.

## 2026-09-27 — Bureau records terminal

- The Evidence station now provides a responsive searchable public-record terminal using the frozen case corpus.
- Results expose only type, title, and player-facing content; normalized subject links and proof/source metadata stay server-side.
- Room membership is enforced, with clear loading, empty, and unavailable states on mobile and desktop.

## 2026-09-27 — Case-ID replay contract

- Published previous-case entries now carry their frozen case ID and create new sessions through `sessions.createReplay`.
- The replay mutation rejects partial or unpublished cases and never reads generation jobs or drafts.
- Unpublished generation drafts are hidden from players and cannot create sessions; only fully frozen cases are replayable.

## 2026-09-27 — Active-room resume

- The home menu now shows the signed-in player's unexpired rooms with case title, room code, player count, and clear lobby/investigation wording.
- Continuing a waiting room reopens its lobby; continuing a started room goes directly to the bureau.
- The query is Clerk-identity scoped and does not reveal other players' rooms.

## 2026-09-27 — Frozen-case replay authority

- A case receives a publication version only after all current immutable runtime tables are written successfully.
- Previous-case listing uses frozen title, summary, and difficulty after publication, even if generation drafts or job status later change.
- Replaying that entry creates a fresh room against the same case row without re-reading generation data.

## 2026-09-27 — Private narrative freeze

- Passed cases now copy their canonical event timeline and per-NPC roleplay scripts into server-only runtime tables.
- Event actors and locations are normalized to frozen case rows; scripts retain only that NPC's checked knowledge, lies, and behavior rules.
- Neither table has a client-callable query, preserving the hidden-solution boundary.

## 2026-09-27 — Publication review fixes

- Case publication no longer truncates cities, rooms, casts, items, or evidence-link resolution at arbitrary row counts.
- A passed generation job with no decisive evidence now fails atomically instead of creating an incomplete playable case.

## 2026-09-27 — Forensic truth freeze

- Generated lab truth now publishes into immutable case-owned forensic outputs with normalized item, room, and NPC links.
- Test names are normalized to the documented runtime vocabulary and use the locked V1 turnaround constants.
- No forensic request, result release, or game-clock behavior was added while parallel time semantics remain unresolved.

## 2026-09-27 — Public-record evidence freeze

- Address, employment/background, and card-payment evidence now publishes into immutable case-owned records.
- Records keep normalized subject links but omit generation-only proof and source-event tags.
- Player search remains deferred until its location gate and discovery rules are implemented.

## 2026-09-27 — Digital evidence freeze

- Passed cases now copy phones, call logs, and messages into immutable runtime tables before a lobby is created.
- Message wording uses the checked text-stage rewrite when present; both participants' phone copies remain consistent.
- Runtime records use normalized NPC/device links and no public query exposes them yet.

## 2026-09-27 — Immutable CCTV records

- Cameras and appearance-only records now publish into case-owned Convex tables with real place, room, street, and NPC references.
- The player CCTV queries no longer read mutable generation drafts; they return only camera labels, time bounds, status, and sanitized record wording.
- Hidden NPC links stay server-side and vehicle links are ready for future generated vehicle data.

## 2026-09-27 — Physical evidence freeze

- Searchable story objects and seeded clutter now publish into normalized case-item rows with their stored place, room, slot, type, and collection rules.
- Item publication reads the generated access rule rather than guessing a location, fails closed on unknown rooms, and runs exactly once per case.
- Items remain hidden and have no public query until a legitimate room search reveals them.

## 2026-09-27 — Immutable playable world snapshot

- Starting a session now publishes the complete V1 city, buildings, floors, rooms, doors, home units, and travel edges into normalized case-owned Convex rows exactly once.
- The player city map now reads the selected case's stored snapshot instead of importing the generator fixture at request time.
- Stable source IDs and explicit ordering preserve map labels, routes, camera flags, and deterministic path tie-breaking for replays.

## 2026-09-27 — Case-specific interview roster

- The bureau interview station now shows the selected case's normalized victim, people of interest, and witnesses in a responsive case-file layout.
- The public NPC query is room-member scoped and omits generated source IDs and all private scripts/solution data.
- Asking questions remains deferred until the shared multiplayer clock rule is decided.

## 2026-09-27 — Private solution freeze

- Passed generated cases now freeze their cast into normalized NPC rows and store one server-only canonical solution before play.
- Existing passed cases are backfilled idempotently the next time a new session is created; no client-callable function exposes the solution.
- The weapon uses the documented text fallback until physical case items are published.

## 2026-09-27

- Replaced the client-only Union Station CCTV demo data with the selected case's generated cameras and appearance-only records.
- CCTV reads are scoped through the authenticated room membership and omit hidden people, source events, and solution data.
- Camera faults and temporary outages now come from each case, and the timeline adapts to that case's recorded window on mobile and desktop.
- Replaced the map placeholder with the permanent 20-place city and its real street connections, travel minutes, and camera-marked routes.
- The city map is room-member-only, supports place and direct-route inspection, and adapts into a stacked layout on small screens.
- Starting a ready room now opens the selected case's full public briefing instead of skipping from a decorative loading screen straight to the bureau.
- The room-scoped briefing survives reloads and gives players explicit Begin investigation and Leave room actions on mobile and desktop.
- Added a dedicated mobile bureau station menu so every investigation surface has a reliable touch target even when the room artwork is cropped on narrow screens.
- Join and lobby overlays now use native modal dialogs, keeping keyboard focus inside the active room flow and announcing errors to assistive technology.
- Lobby actions now prevent repeat submissions, show their active state, and report clipboard failures instead of silently doing nothing.
- Changed the previous-case action from technical `Play in lobby` wording to the player-facing `Play case`.
- Added a named mobile place picker above the city map so players do not have to guess numbered map markers or hit tightly spaced dots.
- CCTV now requests only the selected camera's nearby time window from Convex; the browser no longer receives the case's full camera-record corpus or activity markers.

## 2026-09-26

- New rooms now enter the fixed Union Station Death development case without running generation; added the bureau image as the first playable investigation surface with clickable Interrogate, CCTV, Clueboard, and Evidence stations.
- Removed the account profile badge and made the app shell and bureau use the full viewport width.
- Kept the home/menu background image while locking the bureau scene to the viewport with no page scroll.
- Removed the bureau header and bottom instruction panel so the scene is unobstructed.
- Made screen state URL-backed: reloading `/game` or a station route no longer returns to the home menu.
- Kept room creation and the lobby on `/lobby` so route navigation does not clear the newly created room modal.
- Lobby URLs now include the room code (`/lobby/:roomCode`) and restore the room query on reload.
- Investigation routes are room-scoped: `/lobby/:roomCode/bureau` and `/lobby/:roomCode/bureau/:station`.
- Added bureau hotspots for the window map (`/map`) and desk case file (`/case`).
- The desk case route now renders the fixed Union Station Death brief and initial facts.
- Case brief content now comes from the room's selected passed case through a public-fields-only query; no case facts are hardcoded in the UI.
- Gated room and case queries on Clerk readiness to prevent unauthenticated Convex calls during lobby-route reloads.

- Added the shared Convex-backed clueboard: players can create, edit, drag, and remove note cards and join their pushpins with red, gold, blue, or green strings.
- Clueboard edits sync to both room players, consume no game time, and never modify case truth.
- Added the first playable CCTV console: choose a camera, drag through the case timeline, and read appearance-only records near the selected time. All footage, names, and hidden case data stay out of the client.
- Hid the bureau's persistent Leave game control while a station is open so it no longer covers the station's Back button.

## 2026-09-24

- Restricted the Sentry demo page and error API to development; enabled example logging and disabled collection of user details and request bodies.
- Fixed the legacy room hub to display join failures without changing the current room and to distinguish loading, unavailable, and joined rooms.

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

- First test run finished: 3 of 5 passed (easy 25 min, easy 18, normal failed at story 22, normal 33, hard failed at story 21). Story is the weak stage (0 of 5 right first try, 8.8 min average); crime and brief are solid. Fixes from its most common problems: the cast job list shows openings as counts ("cashier ×2") and the problem names who took the job; story problems now say how to fix them (both overlapping events with times; which room needs an event to move an item; what counts as decisive evidence; which kinds of evidence place the killer); a new evidence note tells the story it needs 2 different kinds of evidence placing the killer at the scene; the lies prompt no longer offers a person's own statement as proof against them, and proof ids must be copied exactly. Failed calls before a fallback model are now logged. Test runs are now 3 cases (easy, normal, hard).

- Second test run (3 cases, fixes landing mid-run): 0 of 3 passed; each failure fixed. Easy failed at story (1 decisive piece, needs 2), normal at scripts (the story copied the crime's hidden method word for word into the killer's murder event, so the killer's script "contained the method"), hard at story (poison + wiped prints + no scene camera left one decisive route, unused). Fixes: the story prompt states how many decisive pieces the case needs and lists only the routes this crime allows (`decisivePlan`), saying "must use them" when there's no spare; a failed decisive check sends those routes to the repair; a story rule against copying the crime's method/motive text, checked in the story stage so it's repairable instead of failing at scripts; every event lasts at least 1 minute (Nemotron wrote every event with end = start: first tries dropped from 17–18 problems to 2); failed provider calls log status and reply body. 97 tests.

- Third test run (3 cases, all earlier fixes in from the start): 2 of 3 passed, about 8–9 min per case (was 18–33 min). Normal 8 min (8 AI calls), hard 8 min (7), easy failed at story after 9 min: the killer's suit was in the murder event but had no owner, so no fibers linked the weapon to him. Per stage first-try: crime 3/3, cast 2/3, lies 2/2, text 2/2, brief 2/2, story 0/3 (1.7 repairs). Fixes: the story plan (`evidencePlan`, was `decisivePlan`) now also lists this crime's ways to link the weapon to the killer and to link an accomplice, and each failed check sends its ways to the repair; a wrong item spot in a room that has spots is replaced by the room's first spot instead of costing a repair (only rooms with no spots, like stairs, are still flagged). 99 tests.

- Fourth test run: easy passed (5 min), hard passed (7 min), normal failed at scripts from a checker bug (it passes once fixed: the story marked the body's discovery private, and every script gets the "News: … was found dead" line by design). Fixes: the scripts check allows that news item; the story's decisive routes are ordered simplest first and the prompt says "use these N"; unknown-person messages name the id and list valid ids; story prompt cut from ~7.7k to ~5.9k tokens (room list without repeated names or search spots, rooms with nowhere to leave items marked [no items]; travel table lists each pair once since routes are symmetric).
- Models: Gemini 3.5 Flash added first for crime, cast, story and lies (crime 8 s, cast 20 s, lies 24 s in tests). Its free tier is 20 requests a day per model (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`), so it covers only ~2–3 cases a day; the fallback chain (Groq / Nemotron / NIM) takes over when it's used up. On free tiers the steady state is ~5–9 min per case; ~2–3 min needs a paid Gemini key. Error logs now keep 1,000 characters of the provider reply. 100 tests.

- Quality review of passing cases (read like a player): they passed every check but weren't good. Suspects with no reason and absent from the story, a killer texting his plan, the killer taking a random vase only to create evidence, only the killer with a real motive or the opportunity, the victim at the scene at 1 a.m. with no reason, and the brief naming a weapon the killer hid. Fixes: every innocent suspect needs a fakeMotive (checked) and must appear in the story (checked, repairable); at least 2 innocents have a serious motive and at least one has no alibi near the time of death; no stated plans or confessions in messages; every killer action has a story reason; the victim's last hours explain why they were at the scene; the brief can't name a hidden weapon even if it's still at the scene. Story prompt asks for 15–30 events.
- Fifth test run: normal passed in 5 min with every AI stage right first time and a much better story (every suspect has a reason and appears; indirect motive evidence; the killer takes the document he killed over). Easy failed at timeline (its cast predated the new suspect rule, a mid-case deploy artifact); hard failed at cast on NIM (off-by-one counts). New: when the cast counts are still wrong after repairs, code turns extra innocent suspects into witnesses and removes extra witnesses (never the crime's people). Only the last model in a stage's list retries a failed call (a used-up quota now costs 0 s instead of 6 s). Crime prompt ~3.1k → ~2.4k tokens (compact rooms and cameras). OpenRouter's reply: "Add 10 credits to unlock 1000 free model requests per day". 104 tests.

- Sixth test run, NIM only (Gemini's 20/day and OpenRouter's 50/day were used up): 0 of 3 (easy failed at story 13 min, normal at lies 15 min, hard at cast 5 min). NIM often returns the previous answer unchanged on a repair, or empty/broken JSON. The run exposed three flaws in the repair and clean-up code, all fixed: an unusable reply (empty, not JSON, wrong shape) no longer replaces a usable earlier answer; the last try never falls back to an unusable earlier answer (it chose an empty reply over a real story because it had fewer "problems"); the lie clean-up drops only bad proof ids instead of whole lies (one bad id had cost the killer's alibi lie). Travel-time problems now give exact target times ("start the second at 10:29 or later, or end the first by 10:02"), which fixed a repeat miss on the next try. 107 tests.
- Where it stands: with the fast free models (Gemini Flash, Nemotron) cases pass at about 5–9 min, the best at 5 min with every AI stage right first time. On NIM alone they mostly fail and take 10–25 min. The free daily quotas (Gemini 20, OpenRouter 50) cover about 3–5 cases a day; OpenRouter says a one-time 10 credits raises its free limit to 1,000 a day.

- Pipeline made crime-kind based: murder is one module (`core/crimes/murder.ts`) plugged into a shared pipeline, so theft and robbery can be added as one module each. The audit found the pipeline wasn't locked to one plot, but was locked to murder in every stage and had murder options it couldn't pass (moving the body; too few ways to get decisive evidence for poison, gun or strangulation with wiped prints). Added: the weapon hidden at the killer's home is decisive, buying the weapon by card links it, the story gets a plan of the ways to place the culprit at the scene, and a fall has no weapon item (the push is the weapon; the autopsy proves it).
- Models: the owner's paid Kimi key (K3, low thinking) now leads crime, cast, story and lies; free Groq then Kimi K2.6 (no thinking) do text and brief; free Gemini and NIM are backups. The account allows 3 calls a minute and one at a time, so a refused call waits instead of dropping to a weaker model. Found and fixed: low thinking never reached any provider (the SDK overwrote the raw field), so calls thought at full length: slow (cast 332 s), costly and timing out. With it fixed: cast ~60 s, story ~2–4 min. AI calls now stream; a timeout comes back as a logged error instead of crashing the step; Kimi uses plain JSON mode (strict mode is ~40% slower; code still checks the shape). NIM's "empty reply" in strict mode retries in JSON mode.
- Test runs 8 and 9 (Kimi): run 8 passed 3 of 3 (easy 24 min, mostly before the thinking fix; normal 4 min; hard 8 min); run 9 passed easy (5 min) and normal (8 min), hard failed at evidence: the switched-off camera had nobody there to switch it off, which only a code stage checked. Now the story check catches it, with the exact place and time. About $0.23 (normal, no repairs) to $0.51 (hard, some repairs) of Kimi per case.
- Quality review of runs 8 and 9 (read like a player): strong plots (a delayed antifreeze poisoning with 10 suspects; a bank-stair shove over an emptied escrow). Fixed what the checks missed: wording that contradicts the data (a "two o'clock round" in a 21:00 event; a brief saying "early Tuesday"; cast text giving clock times the story then contradicts), messages from a person to themself (drafts go in a phone's notes), and suspects' reasons that cite evidence the story never creates. 111 tests.

- Test run 10: easy (4 min) and normal (5 min) passed with every AI stage right first time or one quick text repair; hard failed at facts: a fall murder still expected "the weapon links to the killer", which a fall has no weapon for. Fixed, and the story check now also runs the facts stage's checks, so a later code stage can't fail on something only a story repair could fix. Also: the brief can't name a part of day that disagrees with the discovery time ("delivering groceries that evening" for a 09:00 discovery), a poison must kill within the hour (the killer is with the victim when they die; the AI had picked slow rat poison), and an invented room id gets the list of that building's real rooms. Crime scenes are spread evenly over the 18 places (checked over 2,000 seeds). 112 tests.

- Test run 11: normal (9 min) and hard (9 min) passed; easy crashed at story when a Kimi reply died midway: the AI SDK's own result promises rejected with nobody listening, which killed the step with no log. AI replies are now read only from the stream parts, and a refused call for Kimi's one-at-a-time limit waits too. Wording checks widened: an event's parts of day must fit its time ("all evening" for a 00:00–03:00 event; "night shift" and "last night" don't count), and the text stage accepts a time written in 12-hour form ("9:30" for "21:30"; 11 false problems in one try). Note: the owner's running `convex dev` deploys each saved file, so check changes go live mid-run. 115 tests.

- Test run 12: 3 of 3 passed (easy 5 min, normal 9 min, hard 7 min). The story check now returns every problem it can find before building the evidence in one go (it used to stop at the first kind, e.g. duplicate ids, costing an extra repair each time). Parts of the day are no longer checked in event wording: actions often mention plans or other times ("a family matter to settle that afternoon" in a 02:00 event), so the check caused paid false repairs; explicit clock times still are, and the brief's part of day is too. The crime prompt now gives the exact crimeTime range for the brief's part of Day 2 (the most common first-try crime miss). Runs 8–12 with Kimi: 12 of 15 cases passed; the 3 failures were pipeline bugs, each fixed (a switched-off camera only checked in a code stage, a fall expecting a weapon link, a reply dying midway crashing the step). Passing cases take 4–9 min and about $0.25–0.55 of Kimi each. 114 tests.

- Cost and repair savings (owner-approved): code now fixes common first-try misses before a check sees them, so they no longer cost a Kimi repair (~60 s, $0.05–0.10 each): duplicate event/message/purchase ids get a suffix; cast ids that aren't the lowercase first name are renamed (unless the crime core uses them); the victim gets the brief's routine (with a hangout place if needed); an owned item's move is given to its owner's event in the room it ends in. Only the weapon's move must happen in an event now; other items are found where they end up. Crime and cast go into the prompts as compact JSON (~560 tokens less per story call on an easy cast). Kimi stays in plain JSON mode; the spec (VALIDATION_EVALS.md) now says so. Parallel stages dropped: Kimi allows one call at a time, and the stages that could overlap take 1–5 s. 117 tests.

- GPT-6 Sol via the owner's local Codex server (ChatGPT subscription): tried all 7 models it offers. Sol was the best fast one (cast right first try in 39 s); Luna needed more repairs; Astra wrote richer but is costly. Sol's first cases were thin (11 words an event, 3 messages, 1 lie), so the prompts were made richer for every model: a fuller motive, 1–2 concrete sentences per event, 5–10 messages, 1–4 purchases, innocents with a secret at stake usually lie. With them plus medium thinking for the story, Sol matches Kimi (easy 3.7 min, normal ~5 min, hard 3.1 min; hard: 28 events, 12 distinct suspects). The problem message for evidence pointing at an innocent now says which room and minutes to keep them out of (a hard case had failed three tries on it). Sol is used only where its key is set: Convex can't reach the owner's PC yet (a tunnel or a local runner is needed). 117 tests.

- Convex now reaches GPT-6 Sol: the owner's Codex server runs with a password (`CODEX_API_KEY` in `.env.local`), a Cloudflare quick tunnel exposes it over HTTPS (requests without the password get 401, checked through the tunnel), and the Convex env has `CODEX_API_KEY` and `CODEX_BASE_URL`. The quick tunnel's address changes on every restart. Every other provider stays configured. README gained a "Case generation" section (models, keys, tunnel steps, tester); TOOLING.md lists the providers; `.env.example` has `CODEX_API_KEY`. First case on Convex through the tunnel: a normal case passed with every big stage on Sol (crime 9 s, cast 38 s, story 87 + 57 s, lies 11 + 14 s) and text and brief on Groq, about 3.7 min of AI time and no Kimi spend.

- CodeRabbit review of PR #5 (skill files, generated code, lock files and recorded data now skipped via `.coderabbit.yaml`). Fixed: scene fingerprints only include people who live in the scene room (a flat block's or hotel's other residents used to get false prints, which could even pass the "culprit at the scene" check); blood on a weapon the killer owns no longer counts as decisive; NPC scripts give house residents a readable home ("14 Keel Street", not "keel-14:home"); AI-written name parts are escaped before going into a search pattern (a bracket or plus sign would have crashed the brief or text stage); the part-of-day check also looks at a span's last minute. Regression tests for each. 122 tests.

## Pending

### Clue board — remaining

- Add reference cards for vehicles when that discovery surface becomes playable. Discovered items, calls/messages, and forensics are already pinnable.

### Case generation — remaining

- Passed generated cases now appear in Previous cases. Choosing one creates an immutable public case record, links a new lobby session to it, and scopes the lobby and bureau case brief to that selected case.
- Only the Previous cases panel scrolls inside the fixed-height game screen, so every card remains reachable without moving the main menu.
- Previous-case cards show the full player-safe public brief summary instead of clipping it or showing the generation date.
- The bureau/game screen has a persistent Leave game control that removes the player from the room and returns to the main menu.
- Create room is disabled in the main menu until player-facing case generation is ready. Passed cases remain playable through Previous cases.

- **Freeze into playable cases (Stage 13):** a passed job still lives in `generationJobs`/`generationDrafts`. Writing it into the game's case tables (`cases`, `caseSolutions`, `caseEvents`, `npcScripts`, …) waits for those tables, which the game builds first on the hand-written case.
- **Restart with a new seed:** a job that still fails after its repairs is marked failed; the spec's "restart with a new seed, fail after 2 restarts" isn't built.
- **Player-facing progress text** ("Writing suspects…"): deferred with loading screens.
- **Offline eval suite (50–100 cases):** runs 8–12 give a baseline (12 of 15 passed, 4–9 min, $0.25–0.55 each); the full suite waits on budget.
- **More crime kinds:** theft and robbery plug in as one module each, plus their own case-close stars.

### Dev tester: known limits (by design for now)

- Every allowlisted developer can see and control every job (a shared dev tool, not per-user).
- "Stop waiting" clears a job's running marker without cancelling the attempt already in flight, which can still write its log and draft afterwards. Harmless for a single developer; give each attempt an id if the tester is shared more widely.

### Known limits of AI cases (after runs 8–12)

- **Solvability is rule-based and story sense is judged by reading cases.** No AI judge in V1 (per VALIDATION_EVALS.md).
- **Wording vs data:** checked in code for clock times, weekdays and the brief's part of day, messages to oneself, and claimed evidence in suspects' reasons. Other small contradictions still slip through (a witness "who cleaned the hotel rooms where the dinner was discussed" when the dinner was at a flat). Filler witnesses with nothing to do are accepted.
- **Groq's text rewrite** sometimes adds a time; one free repair fixes it.

Planned fixes:

- [x] **Invariant tests (start of chunk B):** run the timeline builder over ~200 seeds and randomly tweaked copies of the case; whenever the checker says "no problems", assert the basic rules really hold (no overlaps, travel possible). Catches checker gaps and crashes.
- [x] **One source for rules (chunk D):** prompts get the exact allowed ids (rooms, homes, jobs) and the same rule list the checker uses (crime and cast done; story and lies in chunk E).
- [x] **Record and replay (chunk D):** save AI cases, passing or failing, as test fixtures so each real case becomes a permanent regression test. Saving is a manual command for now.
- [ ] **Smoke pass rate (chunk F):** 5-case run reporting pass rate, time and cost — the real measure of "it works for AI".

### Open questions

- CCTV row ids depend on the seed, so hand-written lies can't point at camera records. AI lies get the real ids per case, so this only limits the fixture.
- A witness who lies about an event is treated as never telling what they saw of it, even after the lie breaks. Simple and safe for the checks; revisit if it blocks good cases.
- Stairs vs lift: routes inside buildings always pick stairs on a tie; timeline may need to say which was used, since cameras differ.

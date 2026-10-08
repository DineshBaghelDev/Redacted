# Design Decisions

## 2026-10-08 — NPC phones are acquired in the interview

- Asking to examine a person's phone is a normal 3-minute bureau question, not an automatic reward for calling them. The handover becomes shared only when the question completes.
- Reading that handed-over phone is a separate 5-minute bureau action. Its already-generated calls and messages become visible, pinnable, and usable as proof only after the read completes. This changes replay-session access, never the stored case.

## 2026-10-08 — Proof shown during interviews

- Detectives may show any shared, already-discovered evidence directly during a 3-minute question; a clueboard pin is not required. Pinned evidence remains supported.
- The server rechecks discovery/read access and compares the evidence's canonical ID to that NPC's own lie script. Main and backup exposures are shared within this session only; merely pressing an NPC without matching proof does not break a lie.
- Another person's statement remains to be made available as proof.

## 2026-10-08 — Bureau calls are immediate in V1

- Calling a living NPC while at the bureau makes them available for a shared interview immediately; there is no separate arrival timer or cost. Each question still occupies its detective for 3 game minutes on the continuous shared clock.
- V1 interviews are bureau-only by player decision. Do not add NPC travel schedules or field meetings.
- The other detective may ask concurrently. Questions to the same NPC are answered in server order against one shared conversation. Replaying the case starts a fresh conversation.

## 2026-10-08 — Victim phone follows the scene search

- A victim phone whose generated access says scene search is a hidden, collectible item in that room, even when the room template has no ordinary item slot. It is not granted automatically.
- Reading the found phone costs 5 shared game minutes and unlocks only its pre-generated calls and messages. Both detectives share the result and may choose which records to pin or cite. NPC-held phones stay inaccessible until a deliberate handover interaction exists.

## 2026-10-08 — Read physical devices before revealing files

- Laptop files are immutable generated evidence linked to the searchable physical laptop. Finding the item does not reveal its files; one 5-minute read unlocks them for the shared session.
- Either detective can pin a read file and use it as final-report proof. A second read of the same laptop is unnecessary. Phone access remains separate because its NPC handover route is not settled.

## 2026-10-08 — Partial completions keep the shared clock moving

- Finishing one timed task while another remains active re-anchors the same continuous clock; it does not end or restart the investigation's time. This keeps completed results and the next timer aligned for both players.

## 2026-10-08 — Records search is a deliberate action

- The records terminal waits for an explicit Search action rather than charging as text is typed. Each distinct normalized query costs 10 game minutes; reopening an already completed query is free.
- A bounded list of the room's recent queries helps partners find shared results. An empty query is a deliberate general browse, not a free default reveal.
- Search results remain hidden until the action completes, and only records actually returned by completed searches can become clueboard cards.
- Search covers file titles and contents; title-only matching made ordinary address queries look falsely empty.
- The matched file IDs are fixed when a search begins; the terminal and clueboard therefore agree on which files that completed search actually found.

## 2026-10-08 — Camera records require a deliberate review

- Choosing a camera and time does not reveal records. A 5-minute review covers 20 minutes either side of that time and is shared after completion.
- Reopening the exact reviewed window is free. CCTV reference cards still require bureau access and now require the record to fall inside a completed review.
- The terminal keeps its textual timeline; CCTV has no footage, stills, or thumbnails.

## 2026-10-07 — Lab turnaround on the shared clock

- A submitted lab test takes 5 minutes of the detective's time, then its frozen turnaround continues on the shared clock. Ready time includes both costs. Concurrent detective actions overlap instead of adding minutes.
- Tests appear only once their physical source is legitimately available: collected object, searched room, or the source-less autopsy. The result is a deliberate, shared reveal at the lab, not an automatic clue or conclusion.
- A lab report becomes pin-able only after it has been viewed. Final-report evidence choices accept pinned objects and reports alongside records, while the server resolves each to its frozen case evidence ID for grading.
- Choosing a collected weapon uses its item identity for exact case-close grading; the free-text weapon field remains for cases whose weapon is not a collected object.

## 2026-10-07 — Physical investigation stays player-driven

- Explore shows the current building's connected rooms; moving across a room edge costs 1 game minute, or 2 across floors. A room can be searched once per shared session for 15 game minutes.
- Finding an object does not declare it a clue. Its stored description appears only after a 2-minute inspection, and collectible objects enter shared inventory only after a player chooses Collect.
- Pinning a found object is an explicit player choice; its clueboard card names the object but does not reveal uninspected details or infer a connection.
- Public-record and CCTV cards require bureau-terminal access when first pinned, matching the underlying records' location gate. Existing shared pins remain readable elsewhere.
- The same shared clock runs travel, movement, search, and inspection. Free reading and collecting do not advance it.

## 2026-10-07 — Investigation time is continuous and action-driven

- Reconfirmed on 2026-10-08: gameplay is not turn-based. Either detective can start an independent timed action while the other acts or talks; the shared clock pauses only when neither has an active timed action.
- Timed actions run on one shared accelerated clock and may overlap between detectives; collaboration must save time rather than double its cost.
- The clock runs only while at least one timed action is active, so discussion, reading, and reconnecting do not silently consume the deadline.
- Server timestamp anchors derive elapsed game time without per-minute database writes or background ticking.
- The real-time speed multiplier remains server-owned and adjustable for playtesting without changing canonical action costs.
- The first implementation applies this model to city travel. One real second currently represents one game minute; this constant is tuned after playtesting.
- Travel changes each detective's location only on arrival. Bureau terminal access follows that location and is unavailable during a journey.
- A camera without observations is still part of the case. Its timeline covers the full case window and honestly returns no rows for quiet periods.

## 2026-10-07 — Confirm irreversible room exit

- Leaving a started investigation remains a permanent membership removal in V1.
- The UI must explain that consequence and default keyboard focus to staying in the room before it performs the destructive action.

## 2026-10-07 — Station names describe playable actions

- Bureau labels describe what a player can do now; unfinished interrogation, inventory, and lab mechanics are not advertised as active controls.
- Internal route names may remain stable while player-facing labels become more accurate.

## 2026-10-07 — Shared status drives room transitions

- Starting an investigation is a shared session transition, so every connected lobby observes `playing` and opens the case brief.
- The starter does not receive a separate client-only navigation path; both detectives follow the same reactive state.
- A waiting session remains authoritative over direct brief or bureau URLs; those routes return to the ready lobby until play starts.
- A room URL with no authorized live membership returns to the home screen with a plain unavailable-room message.

## 2026-10-07 — Map places are board-ready facts

- A place shown on the active case map may be pinned without a discovery action because the city map already exposes it to every room member.
- Place references are validated against the session's frozen case city and contain only the public map name, area, and place kind.
- Opening a board card shows its complete saved text in a focused dialog; it does not fetch hidden case data.

## 2026-10-06 — Joining never starts the case

- Reaching the two-player limit does not imply consent to begin; joining and readiness remain separate actions.
- `Start investigation` is the only transition from lobby to play and remains unavailable until every connected player is ready.

## 2026-09-28 — Case close reveals scores, not answers

- The private judge receives canonical grading material, but clients receive only category stars and generic mismatch feedback.
- Evidence submitted at case close must already be pinned to that session's shared clueboard; foreign or unpinned IDs are rejected.
- The frozen `weapon` item uses deterministic identity matching. Until inventory exposes item IDs, an exact normalized weapon name is the player-facing fallback; non-item weapons remain semantically judged.
- Case close uses a review step before the irreversible submission, then shows the same pending or completed result to both players.

## 2026-09-28 — Pin evidence from where it is found

- Person, public-record, and CCTV reference cards are created from their investigation screens rather than from a generic clueboard picker.
- The server derives reference-card wording from the frozen case record and rejects foreign IDs; players can arrange, connect, or remove a card but cannot rewrite its evidence text.
- Re-pinning the same record returns the existing shared card instead of creating duplicates.
- Selecting a clueboard string turns the existing color controls into edit controls and exposes one short optional label, avoiding a separate inspector panel.

## 2026-09-28 — Lobby access stops at the case brief

- The lobby may show the public case brief, but investigation data (map, people, CCTV, and public records) is returned only after the room starts play.
- Public case-data queries must not impose smaller content caps than the generation rules; pagination can replace complete reads when runtime practicality requires it.

## 2026-09-27 — Do not advertise unavailable case creation

- This build is replay-only, so the home screen presents saved cases as the primary path instead of teasing a disabled creation flow.

## 2026-09-27 — Records search is a bureau evidence surface

- Public records use a focused terminal layout rather than a generic dashboard or raw table.
- Search targets record titles and caps each response while preserving access to larger cases through specific searches.
- Until travel exists, every playable session remains at the bureau, so this screen is the current location gate.

## 2026-09-27 — Replay identifies the frozen case directly

- Published menu entries replay by `caseId`, matching the immutable case boundary.
- `generationJobId` remains provenance only; it cannot be used by a player to publish or start a case.
- Replay validation requires the current publication version before any fresh session is created.

## 2026-09-27 — Active investigations are recoverable from home

- URL-backed reload remains the primary resume path, while the home menu also lists the player's active rooms.
- Waiting rooms return to the lobby; started rooms open the bureau without replaying the case brief.
- Resume cards stay compact and above secondary menu actions on both mobile and desktop.

## 2026-09-27 — Published cases, not generation jobs, own replay truth

- Generation jobs are provenance and diagnostics; after complete publication they are no longer a replay dependency.
- `publicationVersion` is written last, so failed publication cannot advertise a partial case as playable.
- A replay always creates new session/player state while preserving the exact frozen case identity.

## 2026-09-27 — NPC scripts remain structured and private

- Each non-victim NPC receives one immutable script linked to its frozen NPC row.
- Knowledge keeps provenance, time, place, and wording so later roleplay context can be built without reading generation drafts.
- Canonical events and scripts are server-only; future NPC functions must project one NPC's allowed context rather than return either document.

## 2026-09-27 — Freeze lab truth separately from requests

- Forensic outputs are immutable case truth; requesting and revealing them will be mutable per-session state.
- Publication stores documented turnaround durations but does not start a timer or expose unreleased results.
- Generated plural labels such as `fingerprints` are normalized to the runtime test type `fingerprint`.

## 2026-09-27 — Public records store player-facing truth only

- Runtime records retain the generated title and content plus normalized subject identity.
- Hidden proof tags and generation source IDs are not copied into the player-facing record table.
- Card payments share the records dataset because V1 discovers them through the same bureau tool.

## 2026-09-27 — Freeze digital records before play

- Phones and their call/message history belong to immutable case truth, not mutable session state.
- The same communication is stored on both participating phones because each device is an independent investigation route.
- Client access waits for discovery-aware device queries; raw normalized records stay server-only.

## 2026-09-27 — CCTV runtime reads only frozen case rows

Camera identity and record windows are resolved during case publication. Public queries retain fixture camera IDs for stable UI selection but never return stored NPC links, source events, or other hidden truth.

## 2026-09-27 — Search uses the generated evidence access rule

The final `evidence` stage is authoritative for an item's searchable room and slot; the story stage supplies its physical type. Clutter is reviewable but not collectible, while authored case objects are collectible. Publishing never exposes hidden ownership or proof links.

## 2026-09-27 — V1 world is copied into each ready case

The permanent V1 fixture remains the authoring source, but play reads a case-owned immutable snapshot. Fixture IDs are retained as source IDs for generated references; runtime relations use Convex document IDs. The extra stored map, camera, room-slot, and ordering fields preserve behavior that the earlier database sketch did not capture.

## 2026-09-27 — Interview station starts with a safe case roster

The interview desk may show public character details before live questioning exists. It never reads generation drafts, private NPC scripts, or the canonical solution; presence-gated questions will be added with the time engine.

## 2026-09-27 — Generated IDs remain publish-time mapping keys

Generated character IDs are stored as case-scoped `npcs.sourceId` values only to map immutable generation output into normalized Convex rows. Runtime relationships use Convex document IDs, including the private solution's culprit reference.

## 2026-09-27

- The CCTV console reads only the selected room's case. Its public response includes camera labels, faults, times, appearance/movement wording, and outage rows; it excludes identities, source events, and every hidden solution field.
- Generated CCTV drafts remain server-side while gameplay tables are built. The public query is a narrow compatibility read, not permission to expose generation drafts to the client.
- The first city-map slice is a read-only route planner using the permanent city graph. It deliberately does not offer travel until the shared multiplayer clock rule is resolved.
- The case brief is a deliberate player step after lobby readiness, not a timed loading animation. Players choose when to enter the bureau after reading the known facts.
- Desktop keeps the bureau's in-world hotspots; mobile uses a compact station menu because image-coordinate doors are unreliable after portrait cropping.
- Room overlays use the browser's native modal dialog behavior for focus containment; Escape closes the join dialog but cannot silently leave an active room.
- Room actions expose one clear in-progress state at a time; clipboard denial is a normal recoverable UI error, not a silent failure.
- Mobile map navigation uses a native named place picker as the reliable touch path; numbered map markers remain a compact spatial aid.
- CCTV camera names and the case time range may reach the client, but record rows are fetched only for the selected camera and nearby time window. The UI must not download all records and filter them locally.

## 2026-09-26

- The clueboard uses a full-screen corkboard workspace inspired by physical evidence boards: paper notes, one visible pushpin per card, and colored strings tied between pins.
- The first clueboard slice supports free-text notes only. Discovered-record cards will reuse the same board after their source systems exist.
- String colors are red, gold, blue, and green; color expresses only the players' own organization and has no game meaning.
- The CCTV console is a text terminal, not a video player: players choose one camera and scrub one timeline, then see appearance and movement descriptions near that time. Camera faults appear as missing recordings, never as visual footage.

## 2026-09-24

- Keep Sentry error-generating demo routes available in development only, not in production.

## 2026-09-06

- Use the supplied office skyline art as the home-screen background and present the main actions as a left-side pixel-game menu.
- Use Pixelify Sans across the entire website for a simple pixel-game feel.
- Show signed-in users a minimal room hub with `My rooms`, `Create Room`, and `join room`.
- Match the provided sketch with a white screen, blue outline, circular logo placeholder, and outlined buttons.
- Keep the first room UI to create, join, and joined-state feedback only; defer room lists, reconnect, presence, and case generation.
- Use the attached pixel-noir references as mood direction for the start flow: left menu, dossier-like previous-game cards, and a quiet loading state over the bureau background.
- Keep previous games as local sample cards until saved-game history exists in Convex.
- Store the detective name in the local detective profile/settings UI for now; move it to an account-backed profile only when cross-device profile sync is needed.
- Require every connected room player to mark ready before enabling `Start investigation`.
- Main-menu options render as plain text and only reveal their bordered pixel-noir styling on hover or keyboard focus.
- The join-room dialog takes the room code as six single-character OTP-style boxes and shows join errors inside the dialog.
- Only waiting rooms accept joins, and room actions require an authenticated session-player membership.

## 2026-09-24

- Case generation plans the crime first, then derives all evidence from one timeline with code; the LLM writes people, motives, story events and wording only.
- V1 uses one ready-made 20-place city with street and in-building cameras.
- Timeline window is up to 2 days before the crime; older backstory is NPC talk only.
- One crime per case with an optional accomplice; naming the accomplice earns a bonus badge, not a sixth star.
- NPC lies come from personality and what they protect, and every lie can be disproved by evidence.
- CCTV rows describe appearance, not names; players filter by camera and time.
- Evidence star is earned by picking a key item from the case's decisive set.
- NPC lies break only when players show proof, never from repeated pushing; the killer never confesses the murder.
- Use NVIDIA NIM with Kimi K3 for case generation and Kimi K2.6 for NPC conversations.
- Allow one dev-only, read-only case viewer page for inspecting generated cases until the game UI exists.
- The city and buildings never change between cases; places use addresses or business names so any new cast can live and work there.
- Some cameras can be faulty in a case, so camera coverage is not the same every time.
- One hand-written easy case is kept for building the game UI and testing, so we don't spend AI tokens regenerating cases during development.
- A lobby is the waiting state of a session, not a separate table. Each new session links to one passed case; gameplay reads derive that case from the authenticated player's session instead of accepting a client-selected case id.
- The main menu stays fixed; only the Previous cases panel scrolls when its cards exceed the game viewport.
- Case cards wrap the full public brief summary; hidden solution and generation data never enter the list response.
- Leaving from the bureau/game screen removes the player from the active room before returning to the main menu.
- Create room is reserved for the generate-a-new-case flow and stays disabled until that flow is deliberately opened to players; replaying passed cases remains separate.
- Each lie says how the person reacts when caught: tells the whole truth, admits only what the proof shows, or switches to a backup lie (which needs different proof).
- Finding something taken from the victim's home inside the killer's home counts as decisive evidence.
- The victim's phone is found "on the body" at the scene.
- Any evidence the players have found can be shown to break a lie, not only physical items they picked up.
- For variety, code picks each AI case's motive type, weapon type and crime-scene place from the seed; the AI builds the case around them.
- Witnesses per case: 3–6.
- When AI output fails the checks, the AI gets its answer back with the exact problems, up to 2 times; lies and written texts that still fail are dropped rather than failing the case.
- The case brief tells players only who died, where, when, who reported it, and the weapon only if it was left at the scene.
- The time estimate is worked out by code, not AI: the minimum a perfect investigation needs × 2 (easy), 2.5 (normal) or 3 (hard) for dead ends, rounded up to 15 minutes.
- "Run all" stops a case at the first stage that still has problems after its repairs (no new-seed restart yet). Failed AI calls (network, rate limit, timeout) are retried up to 3 times with a growing wait; failed checks go to repairs instead.
- Test runs are 3 cases (easy, normal, hard), generated one after another so each case's time isn't slowed by the others.
- Generation time left is predicted from the average AI time per stage over the last 5 passed cases of the same difficulty.
- For variety the seed also picks: accomplice or not (about 1 in 5), the part of Day 2 the death happens in, the exact number of suspects, the victim's daily routine, and the names the case may use. The cover-up stays the AI's choice because it depends on the story.
- To stop every case looking the same, the crime prompt lists the last 10 generated crimes and asks for a clearly different premise (relationship, situation behind the motive, weapon item). Seeded story ingredients and story complications were considered and left out for now.
- Case generation uses free tiers only (no Moonshot, which is paid). Each AI stage has a fixed list of models; when one fails (rate limit, quota, overload) the next takes over, with NIM as the backup everywhere.
- If the story leaves an item in a spot its room doesn't have, the item goes in the room's first spot instead of sending the story back: which drawer doesn't change the case.
- Every innocent suspect has a reason police would suspect them and appears in the story; at least two have a motive as serious as the killer's, and at least one lacks an alibi, so the killer isn't obvious.
- If the AI cast still has the wrong number of suspects or witnesses after repairs, code turns extra innocent suspects into witnesses and removes extra witnesses.
- V1 cases are murders only. Other crimes would need a different case-close scoring.
- The pipeline is built so theft, robbery and other crimes can be added as one module each; everything that isn't specific to murder is shared.
- A murder's cover-up can't move the body: the crime scene is always where the body is found.
- A murder by a fall has no weapon item: the push is the weapon, and the autopsy proves it.
- Kimi generates in plain JSON mode rather than strict schema mode (faster, cheaper); code checks every reply against the schema.
- Only the weapon's move must happen in a story event; other items can end up somewhere without one, since players find them where they end up.
- Case briefs never use weekdays (cases run on Day 1, Day 2...), and generated character descriptions give no clock times; the story sets every time.
- The murder weapon hidden in the killer's home counts as decisive evidence once the lab ties it to the victim, and the killer buying the weapon by card links it to them.
- Lying isn't compulsory: innocent people tell the truth to clear themselves and lie only when the truth would do real damage (arrest, job, reputation, family). The killer always has a cover story. At most 2/3/4 innocent liars on easy/normal/hard.
- Innocent suspects don't need a provable alibi; some cases leave people unaccounted for. Nothing decisive may point at an innocent.
- Not everyone has a secret.
# Development case

- Interview proof is selected from shared, already-discovered evidence; detectives do not have to pin it to the clueboard first. Pinning remains an optional deduction/organization action and is still required for the current final-report evidence selector.

- During UI development, a new room opens the completed Union Station Death case as a fixed fixture. Case generation is intentionally bypassed until the gameplay surfaces are ready.
- The game shell is full-screen; account profile controls are not shown during play.
- The bureau scene owns the full viewport on the signed-in home screen; the shell does not add a second background or scrolling page.
- Screen navigation is represented by URL paths so browser reload preserves the current screen.
- Investigation screen URLs are nested under the room code so simultaneous games remain isolated.
- The case brief is read from Convex's latest passed generation job and exposes only title, summary, and initial facts to the client.

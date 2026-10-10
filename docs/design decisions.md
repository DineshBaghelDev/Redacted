# Design Decisions

## 2026-10-10 — Investigation symbols and quieter lists

- Keep the whole case-close flow on one paper dossier material, including the editable five-finding form and final confirmation. Use ruled evidence rows so a long pinned list remains scannable without a wall of boxes; retain clear input borders for editable fields.
- The place screen uses its room scene and a room icon for loading/unavailable states, matching the other investigation station fallbacks. Keep the return path to the map.
- Fallback states for interviews and lab work use their actual room backdrop and the established dossier or terminal frame. Keep one short status line and one return action; interviews return to the bureau and lab work returns to the map.
- Character portraits combine a few strongly different silhouettes at roster size: hair length/cut, face outline, coat/shirt shape, palette, and occasional glasses. Keep each portrait deterministic from its ID and illustrative only; investigative appearance still comes from the written case description.
- Camera time controls need extra horizontal clearance inside the wide terminal illustration; keep the narrow panel compact. Camera and map loading/empty states should use their station scene, existing icon, and one return action instead of a generic floating box.
- Give stable V1 places recognizable pixel silhouettes beyond the five broad place kinds. Use a six-cell transparent companion atlas for flats, park, cafe, station, hotel, and garage; unknown place IDs retain a kind-based symbol. Keep the marker background transparent and names readable on selection or focus.
- The phone map and place panel occupy content-sized grid rows. The map canvas may scroll sideways, but it must finish before the panel begins; enlarging its symbols must not collapse that vertical space.
- Use the dossier art's inner paper area for both the final case-file opening and the scored result. Long opening titles use a smaller phone size; findings, scoring, and submission behavior stay the same.
- Keep Sentry's tunnel in production, where it avoids ad blockers. In development, send events directly so Next's external rewrite proxy does not emit repeated response-listener warnings.
- In the case brief, a long generated title takes the full paper width on phones. The room stamp moves below it, and generous top and bottom space keeps text and actions inside the dossier's printed border.
- Keep the Join room code entry as six direct character cells. At narrow widths, use smaller gaps and type while preserving full-size cells from the small breakpoint upward; use an accessible icon Close action to preserve title space.
- Use the same deterministic portrait language for connected detectives in the waiting room. Keep player status under each name and give the illustrated terminal frame enough inner vertical space so its metal seams never cross text or controls. Treat Leave room as a secondary action.
- On phones, keep the clueboard's navigation and note action in the first toolbar row, with string colors below. Keep the board hint short so it does not cover the working canvas. In an interview file, reserve the portrait row for identity and let the public description span the dossier width.
- Show the bureau's station icons and names directly on the room art, with no enclosing icon tiles. Keep broad hotspots for pointer use and the icon menu at narrow/tablet widths.
- Use one six-cell transparent pixel atlas for common investigation verbs and objects. At small sizes, each symbol has one recognizable silhouette and no written detail. These symbols are navigation cues, never evidence representations.
- Room navigation and lab examinations use thin dividers and a restrained dark backing instead of a box around every entry. Keep the dossier frame where players need to read long immutable record text.
- Let long generated names and evidence text wrap inside fixed-width clueboard and report surfaces. The full wording remains available; cards do not truncate case data.
- Match map marker size to the real 20-place fixture, keeping mobile controls compact and enlarging desktop silhouettes. The mobile map scrolls horizontally instead of compressing all 20 places into a narrow viewport; the named place picker recenters it. Districts are a small colored underline beneath each icon, with no icon backing plate.
- Keep the map canvas at least 44rem on phones and 50rem from tablet size upward. Small desktop windows can scroll the map while the route list and place picker still provide direct selection.
- The scrollable map must not enlarge its parent grid; let its viewport contain the wide canvas. Show names for uncrowded markers on large screens, while crowded names appear on selection, hover, or focus. Keep travel minutes in the direct-routes list so place names stay clear.
- At wide desktop sizes, enlarge map symbols and place names enough for the pixel font to remain legible at normal viewing distance. Leave enough inner space inside the illustrated camera time frame for controls and instructions.
- On narrow camera screens, use a compact two-column local camera list with its own short scroll area so the written-log time control remains in reach.
- In a building on phones, show the current room and its actions first. Keep all rooms in an explicit chooser above it and close that chooser after movement; retain the always-visible sidebar on desktop.
- Keep the records search field full height on phones. An empty term reads as browsing files, including when a shared general browse was saved earlier.
- Let room titles, player names, and case brief titles wrap within their flex rows so generated text remains readable at narrow widths.
- A camera access point can have zero cameras after location filtering; show an empty state with a way back to the previous location.

## 2026-10-10 — Cameras belong to their places

- The bureau security desk lists only street and bureau cameras. A building camera appears as a room action in its own building, with that room marked in the room list. Review, window reads, and pins are location-gated on the server.
- Camera choices are a short, visible icon list at each access point. The long camera dropdown is removed. Each camera still uses the same text-only time review and five-minute action.
- Map icons use the generated silhouettes at a larger size without backing squares. Select and focus states use a restrained glow; place names remain readable without clipping case data.
- Character files combine stable pixel hair, face, skin, clothing, and accessory layers from a person ID. These portraits identify a file visually; the public case description remains the authoritative appearance evidence.
- The detective profile uses the same layered portrait component, keyed to the entered name. It is cosmetic and adds no saved avatar or gameplay state.
- The new detective form stays above the mobile menu scrim, and its name field fills only the inner frame width.
- Station artwork is kept visible through a lighter content scrim. Mobile bureau navigation uses the generated station symbols without individual card borders; the whole button remains a touch target.

## 2026-10-10 — City map visual language

- The map background is a blank drafting texture; only stored place coordinates and street connections draw the geography. Place icons communicate kind, dashed red routes communicate cameras, and selected streets remain highlighted. Travel minutes appear in the direct-routes list.
- On narrow screens, the named place selector remains the reliable touch path. Marker labels surface on selection or focus; wide screens can show them all. The map preserves its existing travel and pin actions.

## 2026-10-10 — Camera records as an ordered log

- The CCTV desk presents one accessible camera at a time. Time selection, the five-minute review, and the written results appear in order on one scroll surface; there is no visual footage or thumbnail. Camera access is localized in the newer decision above.


## 2026-10-10 — Physical interface surfaces

- Use the generated metal frame for major terminal actions and control panels and the paper frame for case files and records. One illustrated environment per station group establishes place; the data remains a real interactive layer above it.
- Reuse the eight-object pixel atlas for navigation and station headers. Keep environmental plates sparse, with quiet center space and no generated writing, clues, people, or CCTV footage. Use the live graph and actual case data for all information-bearing visuals.
- Use a blank cork plate under the real shared clueboard nodes. Exploration uses a neutral terminal layout because a fixed room illustration could imply places or objects absent from the generated case.
- On narrow screens, crop the menu scene to the city and dim it behind controls. Keep large touch targets and visible Back actions on full-screen stations.
- Authentication remains Clerk-owned; the game supplies the scene, title, Back path, and a dark appearance footer so the existing sign-in and sign-up controls are readable.


## 2026-10-10 — No service worker in V1

- The game does not register or serve a service worker. Requests for `/sw.js` receive a plain 404 outside the Clerk-wrapped page tree.

## 2026-10-10 — Pixel-noir interface direction

- Use charcoal, petrol teal, and aged amber for the player UI, with red reserved for warnings and irreversible actions. Avoid purple or white app-like surfaces.
- Keep environment art sparse and text-free so actual controls and case data stay readable. The bureau scene has a text-only CCTV terminal; no visual footage, stills, or thumbnails appear in generated art.
- Use Pixelify Sans for titles and actions, Geist Mono for longer reading, and a clear keyboard focus outline. Keep physical paper surfaces only where the game is presenting a dossier, statement, or clueboard note.
- The main menu appears by itself. The archive and settings occupy their own screen, while desktop bureau hotspots and a compact mobile station menu retain the existing navigation paths.

## 2026-10-09 — Replay deadline and submitted-room behavior

- Offer an optional custom shared deadline when creating a replay room. Blank uses the frozen case estimate plus one day. It cannot change after room creation.
- Once the shared clock passes due, label the time Overdue but keep investigating and do not penalize the five-star report.
- Submitting the final report makes the room review-only for both detectives. Existing timed work may settle, and the case file and result stay readable. A fresh replay remains available.
- V1 interviews remain bureau-only: a called NPC arrives immediately, and each question costs three shared minutes.


## 2026-10-09 — Clueboard connection controls

- Keep direct pin-to-pin string dragging, but provide a compact two-card selector for players who cannot drag. Both routes save through the same shared clueboard edge rules and use the currently chosen string color.

## 2026-10-09 — Mobile map scroll ownership

- On narrow screens, the place picker, map, and route details share one vertical scroll container; the map and details do not create nested scroll areas. Desktop keeps independently scrollable panels.
- The irreversible Leave game confirmation is a modal decision: keyboard focus remains in it, and Escape means Stay. The existing leave mutation and room rules are unchanged.

## 2026-10-09 — Clueboard placement at larger case sizes

- Automatically pinned cards keep advancing down the board after each row of four; do not cycle back over existing cards after sixteen. Players can still rearrange cards directly.

## 2026-10-09 — Generation tester visibility

- The allowlisted generation tester remains a local development tool, but its page is not rendered in a production Next build. Player-facing case choice stays limited to frozen previous cases.

## 2026-10-09 — Body-based forensic tests

- Preserve the generated `body:<victim>` subject as an explicit victim source in frozen forensic rows. Body tests are available at the lab like the autopsy, but their results still require a timed request and deliberate view. Existing published rows may restore only that deterministic source link; never infer a body source from general person associations or invent an item/room.

## 2026-10-09 — Submitted rooms on the home screen

- A room with a submitted theory remains accessible to its detectives as a case report; its home entry opens the case-file result/retry screen instead of inviting further investigation. Replaying the same frozen case still starts a fresh room.

## 2026-10-09 — Travel on an old Explore route

- If browser history opens Explore during an active journey, show the existing travel notice so the player can return to the map; do not describe the destination as an empty place.

## 2026-10-09 — Saved search labels

- The public-records terminal treats case and repeated whitespace as equivalent when labeling recent saved and pending searches, matching the existing server rule. Unknown searches have a neutral button label because an older saved search may also reopen for free; the cost rule stays explained below the field.

## 2026-10-09 — Reliable interview replies

- Use the configured Moonshot provider for short live NPC replies because the NVIDIA-hosted model returned 404 for this deployment. Save each reply when complete instead of streaming token deltas; the existing waiting state covers the delay and provider errors can reach the retry action.

## 2026-10-09 — Deadline display

- Show the stored due time beside the shared case clock as a compact, read-only reference. Do not imply that the case ends or actions stop at that time until the expiry rule is decided.

## 2026-10-09 — Investigation clock placement

- Show elapsed case time in a compact strip above every investigation station; keep the station surface below it instead of floating a clock over controls. Do not imply a deadline outcome until its rules are settled.

## 2026-10-09 — Profile edit cancellation

- Back to menu discards an unsaved detective-name edit; only Save changes the name used for new rooms.

## 2026-10-09 — Replay picker errors

- Room-creation failures are shown in plain language beside the case choices, where the detective can retry; the menu does not carry a stale picker error after leaving.

## 2026-10-09 — Previous-case picker return

- The picker keeps Back to menu outside its scrolling card list, so the exit remains available on mobile and desktop without changing any room state.

## 2026-10-09 — Continue menu eligibility

- A room with a case row but no completed publication marker is not a playable previous game and stays out of Continue. Its stored data is preserved for private repair.

## 2026-10-09 — Existing replay rooms

- Older playing rooms with a published case receive the same frozen default deadline without restarting their investigation. Legacy rooms without a published case are not assigned a guessed deadline or case.

## 2026-10-08 — Default replay deadline

- A replay's default deadline is fixed from the case's published optimal-time estimate plus one in-game day, with minute zero as the session origin. Waiting does not advance the clock.

## 2026-10-08 — Replay deadline source

- The code-generated optimal-time estimate is copied once into the published case, including existing published cases via a private repair. Replay sessions must use that frozen value, never a generation draft.

## 2026-10-08 — Short-screen map access

- On narrow, short viewports the stacked city map scrolls as one surface so route details and travel remain reachable; desktop keeps its two-panel layout.

## 2026-10-08 — Recovery of older passed cases

- Older passed generation jobs are published one at a time through an internal-only repair function. The player list remains restricted to fully frozen published cases; it does not generate or expose drafts during replay. Legacy `killerId` and `timeOfDeath` fields can be read as the same canonical crime facts, but missing cast members and the removed body-moving mechanic are not silently repaired.

## 2026-10-08 — Recorded-statement access

- Asking what an NPC witnessed is an explicit 3-minute bureau question. Its completion shares the NPC's prewritten statements with the session; events they intentionally lie about are withheld. The free-form reply never becomes canonical evidence.
- Earned statements may be pinned, shown in a later interview, or cited in the final report. Each server operation checks the same session acquisition record.

## 2026-10-08 — Canonical statement source

- A usable witness statement comes from the case's frozen generated evidence, not from a free-form AI interview reply. Publication stores it privately; session access must be earned through an interview before it can be shown as proof.
- Replaying a published case does not consult generation drafts. Older cases receive the same frozen statement rows through an explicit internal backfill.

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
- Reopening the exact reviewed window is free. CCTV reference cards require access at the camera's location and the record must fall inside a completed review.
- The terminal keeps its textual timeline; CCTV has no footage, stills, or thumbnails.

## 2026-10-07 — Lab turnaround on the shared clock

- A submitted lab test takes 5 minutes of the detective's time, then its frozen turnaround continues on the shared clock. Ready time includes both costs. Concurrent detective actions overlap instead of adding minutes.
- Tests appear only once their source is legitimately available: collected object, searched room, or the known victim body. The result is a deliberate, shared reveal at the lab, not an automatic clue or conclusion.
- A lab report becomes pin-able only after it has been viewed. Final-report evidence choices accept pinned objects and reports alongside records, while the server resolves each to its frozen case evidence ID for grading.
- Choosing a collected weapon uses its item identity for exact case-close grading; the free-text weapon field remains for cases whose weapon is not a collected object.

## 2026-10-07 — Physical investigation stays player-driven

- Explore shows the current building's connected rooms; moving across a room edge costs 1 game minute, or 2 across floors. A room can be searched once per shared session for 15 game minutes.
- Finding an object does not declare it a clue. Its stored description appears only after a 2-minute inspection, and collectible objects enter shared inventory only after a player chooses Collect.
- Pinning a found object is an explicit player choice; its clueboard card names the object but does not reveal uninspected details or infer a connection.
- Public-record cards require bureau-terminal access when first pinned. CCTV cards require the camera's access point. Existing shared pins remain readable elsewhere.
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

- Replays create fresh sessions from a selected published `caseId`; the fixed Union Station development fixture is superseded.
- The game shell is full-screen; account profile controls are not shown during play.
- The bureau scene owns the full viewport on the signed-in home screen; the shell does not add a second background or scrolling page.
- Screen navigation is represented by URL paths; the current path is the source of truth for both reload and browser Back/Forward, rather than a separate remembered screen state.
- Investigation screen URLs are nested under the room code so simultaneous games remain isolated.
- The case brief is read from the session’s published case and exposes only title, summary, and initial facts to the client.

- Leaving cancels unfinished interview, CCTV, and record-search actions. Shared record access keeps other searches and any earlier access intact.
- Publication runs separately after generation passes; publication errors mark the job failed at the publish stage.
- Replay deadline overrides must be at least one hour and are rounded to whole minutes.

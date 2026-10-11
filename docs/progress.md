# Progress

## 2026-10-11 — One way to confront

- Fixed: confronting with evidence picked from the notebook failed with a server validation error (an extra `label` field was sent).
- Interviews now have one path to catch a lie: **Show evidence** → pick it in the notebook → **Confront**. Removed the clickable reply sentences (Press / Show evidence per line) and dropping evidence on the portrait. While picking, the notebook shows only evidence, your notes as plain text, and "Show this". The table line reads "Showing · … Press Confront." and the box invites an optional remark.
- Checked in Chrome on ZYZTSR: the debt record that caused the error now confronts cleanly ("They don't budge", since it disproves nothing). 174 tests and lint pass.

## 2026-10-11 — Show evidence from the notebook

- "Show evidence" in an interview opens the shared notebook in a picking mode instead of the small tray: evidence only, the same groups and notes, search focused, items already on the clueboard marked, and a "Show this" button on each entry. Picking puts it on the table; if a reply line was chosen first, it confronts straight away. Dragging evidence onto the portrait still works.
- The notebook now renders above the game's top bar wherever it opens from. Search treats every kind of space alike (generated text used narrow spaces, so "7 pm" found nothing) and says when nothing matches.
- Checked in Chrome on room ZYZTSR: "7 pm" finds both phones' copies of the meeting text, "Show this" puts it on the table, and the button changes to "Confront · 3 min". 174 tests and lint pass.

## 2026-10-11 — Autopsy task, crowd safety, phone pass

- **Autopsy:** the pathologist now dictates four body regions in a seeded order ("the neck, then the body's left arm…"). You examine each on an unlabelled body; left and right are the body's own. A wrong region gets a correction, not a reset. The task shows no findings.
- **Camera crowd:** passers-by never use a height or clothing word from any cast member's public description, so they can't be mistaken for a character. They are linked to nobody and never break a lie or count for the score. Cases that already had filler get the crowd redone on their next replay (filler version 2, same record IDs). On Whitlock, the cast spans 5'5"–6'1" and the crowd uses only 5'2", 5'4", 5'10" and 6'2".
- **Phone pass (390×844 frame, signed in):** menu, How to play, Case history, archive, solo lobby, brief, scene, bureau, security desk, interview with the evidence tray, notebook, pause menu, case file, clueboard, and the given-up result with its buttons. No page-wide sideways scroll anywhere. Fixed: How to play scrolled inside its frame and the frame's seam crossed the text (now a plain reading panel). The pause menu's title and bottom touched the frame (more padding; keyboard controls hidden on phones). "Close the file" wrapped (icon-only on phones).
- 174 tests, TypeScript and lint pass.

## 2026-10-11 — Final audit fixes

- **Interviews:** statements are taken by any whereabouts or "what did you see" question, and the first-time tip explains it. Only "your phone" triggers a handover. Proof that disproves nothing shows a grey "They don't budge" stamp. NPCs may lie only about scripted topics and know the current case time. The transcript drops the repeated "Name asks:" prefix and shows presented evidence on its own line. Statement titles read "Statement of …". "Tag clue" and "Prove it wrong" are now "Show evidence".
- **Evidence matching:** either phone's copy of a call or message counts as the same evidence for lies and the evidence star (`convex/lib/evidenceIds.ts`). Checked live: showing the victim's copy of the 7 pm text now stamps Contradiction.
- **Noise:** phones, laptops and cameras get seeded filler on case open (`convex/lib/publishFiller.ts`). The Whitlock street camera went from 1 sighting to 9; the victim's phone from 1 message to 6 plus 3 calls. Clutter descriptions were rewritten to full sentences, refreshed on existing cases, and never duplicated in a room. The reversed code clue no longer says "backwards!".
- **Records:** searches need 2+ characters (no browse-all). Card payments are a "Card payment" type with their time, backfilled on case open. Record types show plain labels.
- **Brief:** known details include the victim's home and workplace.
- **Cameras:** the bureau's own cameras are hidden from the security desk; the fake "▶ Play" label is gone.
- **Lab:** removed the dead turnaround UI (pending bar, "Tear open the report", "The lab called" notice and its query). The victim's bag uses the evidence icon.
- **Result:** detective rank (stars + on-time), badges, "You said / The truth" beside What really happened, Share result, and Main menu / Another case / Replay this case.
- **Menus:** Case history with stats (closed rooms no longer expire; `caseClose.backfillClosedRooms` marked 2 older rooms on dev), How to play (menu and pause), Main menu and Report a problem in pause, played/solved/in-progress stamps and a case of the day in the archive, a replay warning on solved cases, and suspect counts per difficulty. The archive's deadline text now matches the real ×1.5 default.
- **Rooms:** solo lobby shows only Start; Start counts as the starter's ready; invite links (/join/CODE); started rooms can be rejoined by code while a seat is free.
- **Notebook and settings:** notebook search, one-line team notes per entry, a message box to the partner, Large text, and the detective name saved to the account.
- **Checks:** 173 tests across 37 files, TypeScript and lint pass. Backend pushed to the dev deployment. A signed-in Chrome run on a fresh Whitlock room covered: solo lobby, brief leads, clutter and code clue text, phone filler, street camera filler, records with payment times, interview statement, no accidental handover, "They don't budge", Contradiction on the victim's copy of the text, give up, after-case buttons, Main menu, and Case history. Not run: `next build` (the dev server was using `.next`).

## 2026-10-11 — Final pre-ship audit

- Wrote `docs/audit/FINAL_AUDIT.md` (game, design, and developer review with a ship order) and `docs/audit/ARTWORK_NEEDED.md` (artwork list by priority), now in `docs/audit/` with `MISSING_FEATURES.md` (player features the game lacks, such as case history and a non-destructive way back to the menu). No code changed.

## 2026-10-11 — Lighter menu controls and site icon

- Replaced the opaque fill behind the existing raster button frames with a translucent dark tint. Main menu actions now use a compact, consistent width and shorter padding while keeping their labels readable on mobile.
- Replaced the starter favicon with a small PNG derived from the existing REDACTED dossier emblem.

## 2026-10-11 — Pin toggles, raster plate fit, and archive summaries

- Removed the boxes around icon-only pin, close, and bag controls, plus station returns, the bureau HUD, and the note control when their labels hide on mobile. The pin uses two appearances from the existing pixel icon atlas and flips immediately on press. Pressing an attached pin deletes that shared clueboard card using the existing mutation; a failed write restores the prior appearance.
- Trimmed only transparent padding from the original generated button plate and used its raster edges as a scalable frame. Checked complete top, bottom, and end caps on short and wide buttons.
- Previous-case descriptions are shown directly instead of behind “Read case brief.”

## 2026-10-11 — Button alignment and clueboard pin states

- Centered labels within the existing illustrated menu and control plates, and applied those plates to map travel/entry, interview, lab report, device opening, and other primary station actions.
- Replaced repeated clueboard pin text and inconsistent icons in records, CCTV, map, interiors, devices, interviews, lab reports, and the notebook with one accessible icon control. Unpinned, pinning, and pinned states have distinct labels; pinned evidence remains visibly marked.
- Verified menu plate alignment and zero page overflow at 320px, 390px, and 1440px; the full 172-test suite, TypeScript, lint, and production build pass. Four backend tests timed out during a parallel run and passed when rerun with one test worker.

## 2026-10-11 — Logo, controls, and audio pass

- Added an inspected transparent case-file emblem, a restrained metal button plate, and an eight-symbol control atlas. The live REDACTED title stays as readable text beside the emblem on signed-out, sign-in, loading, and signed-in screens. Main menu, archive replay, opening brief, pause, station returns, device return, and interview evidence controls now use the shared asset language.
- Added a quiet four-chord synthesized score beneath the rain, plus search, open, and close cues. The shared game shell starts music on the title menu and continues it through navigation; pointer or keyboard input resumes browser-suspended audio. Mute stops both loops immediately; unmuting restarts them and plays a confirmation ping. Music, effects, and volume are available in both menu settings and the pause menu.
- The archive now keeps full public summaries under “Read case brief” on each card, putting replay actions in view sooner. First-time tips across investigation stations have been shortened to one or two control hints.
- At 320px, the interview header uses an icon return, the portrait is smaller, appearance is disclosed on demand, and the evidence tray opens above the composer. Pinned clueboard evidence is listed first and marked in the tray. Menu, archive, and interview had no document-wide horizontal overflow in a signed-in Playwright pass.
- Browser audio instrumentation saw score oscillators and rain sources start; muting stopped new score notes and unmuting restarted them. All 171 tests across 35 files, TypeScript, focused lint, and the production build pass. Signed-in 320px captures of archive, interview, map, CCTV, and records show no document-wide horizontal overflow.

## 2026-10-11 — Smoother building navigation

- Doors always name the room behind them; no more "Unexplored" doors or "?" rooms. The map shows every room on a floor by name (explored ones inked solid) and any room can be tapped to walk there.
- Stairs and lifts are floor buttons ("Lift: G 1 2 3"), not a pile of stair doors; one tap takes you to that floor's corridor. Doors between floors in houses say "upstairs"/"downstairs".
- An empty search says "✓ Nothing here" once, on the furniture; the list under the room only shows spots where something was found.
- Arriving at a place no longer shows the "Step inside" card; a short toast names the place and its mood instead.

## 2026-10-11 — Exploring buildings

- Inside a building you stand in one room seen from above: furniture you press and hold to search, and doors cut into the walls to the rooms next door (stairs lead to other floors). Doors to rooms nobody has entered say "Unexplored".
- A small paper map beside the room fills in as either detective walks the building ("Explored 4/9"); unentered rooms next to explored ones show as "?". Tap an explored room on the map to walk back.
- Entering a room fades it in with a door sound; walking shows "Walking to …" over the room.
- New shared `visitedRooms` record (arrival, cold open, finished moves). What was found in the room is listed under it.

## 2026-10-11 — Clutter pass

- Places: the floor plan is now a thin strip of rooms across the top (ordered by doors from the entrance), so the search area gets the full width. Each spot card is itself the press-and-hold target; no separate buttons.
- The "Carried evidence" dropdown is gone from search screens; bagged objects stay on their spot card marked "Bagged".
- Found objects: Bag and Pin are small icons in the card's header; "No code? Have the lab crack it" is a quiet link under the keypad.
- Notebook: Pin and Show partner appear only when you point at an entry (always shown on touch screens); pinned entries keep a small mark.
- Interviews: the "What did you see?" and "Hand me your phone" chips are gone. Asking in your own words ("where were you", "what happened", "can I see your phone") does the same.
- Tips: only the first tip of a visit opens; later ones arrive as a one-line pill you can tap open.
- Cameras: the hour log is folded away by default; the monitor has its own small pin button next to the face slot.

## 2026-10-11 — Faces on camera sightings

- Each camera sighting has a photo slot. Drag a face from the notebook or the "Compare with people" panel onto a sighting (on the monitor or in the hour log), or tap "Who is it?" and pick a face. The slot shows the portrait and name; ✕ clears it.
- The mark is shared with the partner and synced everywhere: the notebook entry for the sighting, the person's People card ("You placed them on camera: …"), and a pinned clueboard card ("You think: …"), even if it was pinned before marking.
- Any drop zone now glows while a card is dragged over it.

## 2026-10-11 — Code clues and plain descriptions

- A device's code clue now sits in the same room as the device, in another spot when the room has one. Older cases are moved on the next session start.
- The clue varies by device (seeded): a plain sticky note, a scrap with the digits written backwards, the owner's birthday card (day + month), or an engraved keyring date. None says what it unlocks.
- Found objects show their description straight away; the magnifier sweep is gone. Real analysis stays at the lab bench.
- Every lab tool is its own small task instead of the same rub: powder brush (dust until a print shows), UV lamp (sweep in the dark, click each glowing spot), DNA swab (stay on a drifting circle), tox kit (hold to fill, let go in the green band), lifting tape (pull from the tab across in one stroke), casting kit (stir circles), comparison scope (slide the lower bullet until its grooves match), autopsy (tap the marks in order). Layouts are seeded per evidence; Enter finishes any of them for keyboard players.
- Lab tests show their result as soon as you finish the task: no turnaround wait or progress bar, only 5 bench minutes.
- The extra progress bar under a spot after hold-to-search is gone. Rubbing at the lab no longer selects page text or drags the card.

## 2026-10-11 — Hands-on investigation

- Removed suggestions that did the thinking: interview topic chips, records name chips, and the "check cameras at this time" link. Names you already know are finished only once you start typing them.
- Found phones and laptops are locked with a 4-digit code derived from the device ID. A sticky note with the digits is hidden in the same building (seeded code, no generation); typing it unlocks in 5 minutes, or the lab cracks it in 60.
- Spots are searched by pressing and holding; objects are examined by running a magnifier over them.
- The lab is a bench: drag (or tap) a bag onto it, pick a tool (powder brush, UV lamp, DNA swab, tox kit, lifting tape, casting kit, comparison scope, autopsy), and rub over the evidence to run that test.
- Interviews keep free chat. Any line of a reply can be pressed ("Press · 3 min") or proved wrong with evidence, and evidence can be dropped straight onto the portrait.
- Camera sightings can be marked "looks like …" by choosing or dropping a person. The mark is shared, shown on the tape and in the notebook, and never checked.
- The final report is a sentence with blanks: drop or tap people, bagged objects, and evidence; motive and method stay in your own words. Evidence dropped from the notebook is pinned automatically.
- Notebook entries can be dragged onto the clueboard, a portrait, the lab bench, and the report; the notebook fades out while you drag.
- Server error text is cleaned to its plain sentence everywhere (no Convex request wrapper).
- Checked in a signed-in Playwright run: hold-to-search, magnifier, wrong code, bench brushing, press/prove menu, type-ahead, and the report. 169 tests, TypeScript, and lint pass.

## 2026-10-11 — Audit follow-ups

- Everyday objects are scattered through every searchable room in the city (seeded code, no generation) when a case is published or replayed, so finding something no longer means a room matters. Existing cases get the scatter on their next replay.
- The scored result shows case time from discovery to filing and how far that was from the deadline. No penalty.
- People named aloud in an interview join the People file ("First seen in: Interview with …").
- Interview replies stream word by word; if streaming fails the reply falls back to a whole message.
- First-time tips on the bureau, place, map, interview, camera, lab, and notebook screens, plus "Show tips again" and a volume slider in the pause menu. Animations honor the system reduce-motion setting.
- A notice tells the team when a lab result is ready while they are elsewhere. Arrival cards add building size, time-of-day atmosphere, and where the partner is.
- Exploring the bureau as a building returns to the bureau scene. A full reload shows a branded loading screen instead of a blank page. The map has a "Find a place" list for phones.
- An empty clueboard explains how to pin from the notebook. The dark grid board stays (the cork plate was tried and reverted at the player's request). Person cards no longer repeat "Person".
- The laptop is now a laptop: bezel and webcam, a Files window with the list beside the open document on paper, and a keyboard deck.
- Checked with a two-browser Playwright session: partner status and floor-plan markers, notebook "Show partner" pings, the map finder, streaming replies, the clueboard, and tips. 169 tests, TypeScript, and lint pass.

## 2026-10-10 — From app to game: loop, time, and discovery pass

- Cold open: Begin investigation now places both detectives in the crime-scene room (frozen `sceneRoomId`) with an arrival card instead of the bureau menu. The case clock starts at the story's discovery minute, so the clock, CCTV, calls, and messages share one calendar.
- Time: one game minute is now 100 ms (was 1 s); a spot search resolves in under half a second. The default deadline is the best-route estimate plus 50% after discovery. At the deadline all new timed work stops server-side and the bureau asks for the report; reading, the notebook, the clueboard, and the report stay available.
- People: the roster lists only people the team has come across: the victim, people named in the brief, anyone called in, and anyone named in uncovered evidence. Each shows "First seen in". Role labels (suspect/witness) are gone everywhere, including clueboard cards. Calling someone in, pinning them, and naming them as culprit all require that they are known.
- Buildings: a clickable floor plan replaces room lists. Walking to any reachable room costs the shortest path (1 per door, 2 across floors). Rooms are searched spot by spot (4 min each); template and generated spot names are normalized, which removed duplicate spots like "On the body" / "The body". Found objects flip in as reveal cards.
- CCTV: hour-of-tape blocks replace the minute slider (each review covers the full hour). The log prints line by line in a terminal. "Compare with people" opens known descriptions beside the log, and calls and messages link to "Check street cameras at this time".
- Interviews: portrait-led layout, topic chips from the team's own discoveries, "Show evidence" from anything discovered (not just pins), and a stamped "Contradiction" with a sting when proof breaks a lie. Quick asks read as spoken lines.
- Lab: detectives choose any test for any collected object, searched room, or the victim. Tests with nothing stored return "No usable result" after a 30-minute turnaround. The lab no longer reveals which tests apply.
- Shell: corner clock with part of day and time left, partner location and activity, a shared notebook overlay (N), an Esc pause menu holding sound and Leave, M/B/C shortcuts, notices for new discoveries and partner pings, synthesized sound (no audio files), a night tint, a swipeable bureau panorama on phones instead of the tab bar, and in-world exit labels.
- Co-op: partner markers on the map and floor plan, and "Show partner" pings from the notebook. Travel shows a moving marker and walks straight into the destination on arrival.
- Ending: after scoring, the case file shows "What really happened" with the culprit, motive, method, explanation, and the frozen event timeline.
- Checks: 168 tests, TypeScript, and lint pass. Signed-in Playwright playthroughs at 1440×900 and 390×844 covered brief → scene → spot search → notebook → pause → map travel → bureau → people → CCTV → interview → case file, with no console errors.
- Follow-up the same day: CCTV is now a scrubbable tape (drag, wheel, or swipe under a fixed playhead; sighting marks; last/next sighting), and watching is instant and free. The deadline no longer stops play; it shows Overdue. A "Give up and see the solution" action in the case file ends the room for both detectives and shows the epilogue.
- Camera choice is a wall of monitor tiles grouped by area (Streets, Police Bureau…) with short names and "No signal" tiles; picking one opens its tape, "Change camera" returns to the wall.
- Bug fix: asking for a phone in your own words ("can I see your phone?") now triggers the same handover as the quick button, so the read/open phone actions appear. People with no phone in the case say so instead of pretending to hand one over.
- Speed: in-game screen changes use the native history API instead of `router.push`, removing a server round trip per move (≈1 s → 0.1–0.3 s measured). Live queries go through `convex-helpers`' query cache, so returning to a screen is instant, and station code is preloaded while the brief is open. A full page reload still spends ≈1.2 s on page start and sign-in and ≈1.3 s on the live-data connection handshake, measured on a production build.
- Every found object can be bagged, including everyday clutter, so "Bag it" no longer marks the real evidence.
- The map's side panel is gone. Tapping a place opens a small card above it with Travel / Go inside / Pin, and a status line under the map shows where you are or the journey in progress.
- Not done: a lab-ready notice while away from the lab, and a "time saved by splitting up" summary.

## 2026-10-10 — Player flow refinements

- Case roster portraits now read the stored cast's public gender and written build/clothing to guide hair, face, and outfit layers. The person ID still chooses stable palette and unused details. Existing published cases get the same metadata from their frozen cast draft; no live evidence or portrait generation is added.
- The case archive uses one full-screen scroll area, including its header and case cards. A signed-in 390px Playwright check scrolled from the header into later cases. The custom shared game-time deadline is a disclosed option with an explanation of the default and Overdue behavior.
- The initial case brief is narrower and uses smaller reading type and padding. Its repeated initial-facts list is available under “Known details,” leaving the case summary and Begin investigation action in the first phone viewport.

## 2026-10-10 — Investigation surface asset pass

- A signed-in local Playwright walkthrough reached an existing case, lobby, bureau, city map, street/bureau camera desk, roster, records, and a building room. The room screen exposed a flat dark backdrop; it now uses a sparse object-free pixel wall behind the existing room controls, preserving generated-case truth. The local walkthrough also confirmed the room's camera action is on site.
- A room with a single camera now opens directly on that camera's title and time controls, without repeating its name in a one-item chooser. Empty unsearchable rooms say nothing was found instead of asking for an impossible search.
- Moved the five-finding final theory form, confirmation, and interrupted-review state onto the same illustrated dossier as the opening and scored result. Evidence choices use paper rules instead of separate boxes. A 390px tall-form capture shows the entire form and actions inside the printed border; a desktop capture confirms the top layout.
- Place loading/unavailable states now use the exploration room backdrop, a room symbol, and the established terminal frame with one return route. This completes the plain fallback-box sweep across map, camera, lab, interview, and place screens.
- Replaced the plain interview and forensic loading/unavailable boxes with their room scenes, station icons, and the existing paper/terminal frames. A 390px capture of both and a desktop interview capture show the messages and return action inside the illustrated safe area. The lab fallback correctly labels its return to the map.
- An eight-person portrait capture at actual roster size showed the original layers reading as one suit and face. Added distinct long, close-cut, and short hair silhouettes, four upper-body outfits, and three face outlines while keeping the same deterministic ID-based portrait. The new capture reads as varied people without adding small decorative noise.
- Captured the six-camera written-log screen at 390px and 1440px. Its time controls now sit further inside the illustrated terminal frame on wide screens. Loading, unavailable, and no-camera camera/map states use the same scene and icon language as the active stations; the no-camera state was checked on phone and desktop.
- Added a second inspected six-symbol city atlas for flats, parks, shops, stations, hotels, and garages. The live map selects these silhouettes by stable V1 place ID and falls back to the existing kind art for other places; routes, coordinates, and travel stay unchanged.
- A 390px capture found the location panel starting over the map because its grid row could shrink below the wide canvas. The map row now keeps its full height before the panel, and the icon art is larger at phone and desktop sizes. Fresh 390px and 1440px captures show separated panels and clearer symbols.
- The case-file opening and scored-result dossiers now keep their text inside the printed paper border at 320px. The opening title drops one size on phones so long generated names wrap by word.
- Traced the repeated development `MaxListenersExceededWarning` to Next's external proxy for Sentry's `/monitoring` rewrite. The development tunnel is disabled; the production rewrite remains in the built route manifest. `/sw.js` continues to return its intentional 404 without Clerk middleware errors.
- A 320px case-brief capture exposed the room badge compressing a long generated title into single letters. The brief now gives the title full width on phones and starts its content inside the illustrated paper border; desktop still keeps the room stamp beside the title.
- A narrow phone capture exposed the Join room title, Close control, and six code cells colliding with the illustrated frame. The dialog now gives the frame clear inner space, uses a compact icon Close control, and keeps all six code cells readable at 320px.
- The waiting room now shows both detectives as portrait ID strips, gives the case title a clear reading band, and keeps Ready/Start as the main actions with Leave room quieter below. Long names and titles wrap inside the terminal frame; the room code and copy action remain available.
- Tightened the clueboard's phone toolbar so Back, title, and Add note sit above the string colors, and shortened the help overlay. Interview detail now places the public description beneath the portrait and name, giving long case text the full dossier width.
- Bureau stations now have visible pixel icon labels over their corresponding room objects on desktop. The compact station menu remains available through tablet widths, where the scene crops too much for reliable hotspot placement.
- Station hotspots leave the focus order while a station or the away notice covers the bureau scene.
- Kept the 20-place map at a readable minimum width through tablet and small desktop sizes; the place picker stays available while the map needs horizontal scrolling.
- The detective name and profile screens now show the same deterministic layered upper-body portrait language used by the case roster, with one small portrait beside the name field.
- Styled fixture captures exposed a phone map overflow, clustered Midtown labels, and a camera list that pushed the time control below the first phone viewport. The map now contains its own sideways scroll, hides only crowded labels until focus or selection, and shows travel minutes in the direct-routes list instead of over place names. The camera list is two columns and height-limited on phones, with a shorter station header.
- Removed repeated camera instructions and shortened the time-window explanation; the 20-minute range on either side and 5-minute action are unchanged.
- A font-accurate capture prompted larger desktop map symbols and labels and more inner padding for the illustrated camera time panel.
- Menu captures found and fixed a detective-name input that extended beyond the metal frame and a mobile scene scrim that dimmed the new detective screen. Settings and case archive layouts were checked at phone and desktop sizes.
- A nine-room phone capture showed the current room and its building-camera action pushed below the entire room list. Phones now start with a compact room chooser; opening it shows the same rooms, and entering a room returns to the current-room actions. The mobile grid no longer stretches the closed chooser into empty space. Desktop keeps the visible sidebar.
- Records and case-file reading captures showed the paper layout stays legible with a long title. The records search field had collapsed inside its mobile flex column; it now retains full input height and uses the clearer “Browse files” label for an empty query.
- Added an inspected six-symbol pixel atlas for rooms, search, physical evidence, devices, lab work, and files. The sprites have transparent backgrounds and stay readable at their small in-game sizes.
- Replaced repeated room-button boxes and the oversized lab frame with quieter, icon-led rows. Evidence records now use a file symbol inside the existing dossier treatment; all actions, states, durations, and location rules remain the same.
- Improved long generated text handling on clueboard cards, report forms, room names, lab sources, and record titles. Final-report scoring rows use ruled paper lines instead of five heavy boxes.
- Checked the player map against all 20 stored fixture places and 25 streets. Increased desktop marker and label size, added small district-color underlines beneath the artwork, and replaced boxed place and route rows with simpler dividers. On phones the map keeps its readable scale and scrolls horizontally; selecting a place centers it.
- Finished a narrow-width text pass on the lobby, case brief, interview, camera, place, and lab headers. A camera access point with no local cameras now shows a clear empty state instead of trying to open a missing camera.
- Latest check: 166 tests across 33 files, TypeScript, focused lint, and the production build pass. Map, camera, menu, archive, place, lab, records, and case-file layouts were captured with actual components, fixture data, and production CSS at desktop or phone sizes. Signed-in gameplay screens still need a live visual check.

## 2026-10-10 — Local camera access and larger map art

- Replaced the city marker squares with larger transparent place icons and kept a clear focus state. Long case titles and generated text wrap inside menus, dossiers, and station panels.
- Split CCTV by physical access point: street and bureau cameras at the bureau, building cameras in their actual camera room. The room list marks camera rooms and opens the same written log there. The server now filters the list, reads, reviews, and pins by location; the long dropdown is gone.
- Added stable pixel upper-body portraits assembled from face, hair, skin, clothing, and accessory variations in the people roster and interview record. Portrait art is illustrative; public descriptions remain the source for investigative appearance details.
- Reduced the station-wide dark overlay so generated room art remains visible, and removed redundant borders behind mobile bureau station icons.

## 2026-10-10 — Player map legibility pass

- Replaced the numbered square markers with generated pixel place icons for homes, workplaces, public buildings, the bureau, and the lab. A restrained generated drafting-paper plate sits behind the live city graph; it contains no invented streets, places, or labels.
- Brought the useful tester-map cues into play: district-colored markers, visible names on wide screens, direct-route travel times, and dashed camera streets with a compact legend. The SVG now scales on the same percentage coordinates as the clickable markers, so route lines meet their destinations.
- Kept the actual case graph, travel action, location gating, and mobile place selector unchanged.

## 2026-10-10 — Initial camera log navigation (superseded by local access above)

- Replaced the long nested camera-button scroller with a named camera picker and previous/next controls. The screen now gives the existing action a clear order: choose camera, choose time, review written activity.
- Kept the same stored camera windows, 20-minute range either side of the selected time, 5-minute review cost, and pin actions. Offline, pending, ready, and empty states now sit next to the action they explain. No camera imagery was added.


## 2026-10-10 — Illustrated game interface, in progress

- Generated and inspected a restrained eight-icon pixel atlas, a reusable metal terminal frame, a paper dossier frame, and separate archive, records, lab, interview, and report-desk scenes. All plates are text-free; the CCTV icon is a terminal symbol and no screen includes camera imagery.
- Integrated framed menu actions, station icons, case archive and interview dossiers, and scene-backed records, CCTV, lab, interview, and report screens. The live city graph remains the map; its frame is decorative.
- Added a blank generated cork surface behind the editable clueboard and framed the live exploration room list, forensic work area, and case-report paper. Repeated item and test rows stay simple to keep dense cases readable. The illustrations do not depict case-specific rooms, people, or evidence.
- Kept routes, room actions, timers, queries, and case data untouched. TypeScript and focused TSX lint pass. Local Playwright desktop and mobile signed-out captures were inspected; signed-in station captures still need verification.
- The sign-in and sign-up routes now use the menu scene and game navigation. A Playwright capture caught a white Clerk footer with unreadable text; the Clerk appearance footer now matches the dark card, verified on desktop sign-in and mobile sign-up.
- Full suite: 158 tests passed with a 20-second test timeout after updating a brittle archive test index for the new heading. The unrelated generation-publication test exceeded its default 5-second limit twice but passed alone and in the full suite with the higher limit. Production build, TypeScript, and focused lint passed. The generated panel and dossier frames were also rendered at desktop and mobile sizes in a local surface preview; this does not replace an authenticated gameplay capture.


## 2026-10-10 — Missing service-worker request

- `/sw.js` is not an app asset, but requests for it fell through to the Clerk-wrapped catch-all page while the default proxy matcher skipped `.js` files. That produced repeated Clerk middleware errors and HTTP 500 responses.
- An explicit `/sw.js` route now answers 404 without rendering the app. Authentication and the proxy matcher remain unchanged.
- Live local checks: `/sw.js` changed from HTTP 500 to 404 with an empty response, `/` remained HTTP 200, and TypeScript plus focused lint passed.

## 2026-10-10 — Pixel-noir player UI refresh

- Replaced the player menu and bureau backgrounds with inspected, deliberately sparse pixel-art scenes. The bureau art contains text-only terminals, not CCTV footage, and its six click targets were aligned to the visible objects.
- Reworked the title menu into icon-led game actions. Case archive and settings now take their own focused screen instead of sitting beside the persistent menu; the archive alone scrolls through cases.
- Applied a shared charcoal, petrol-teal, and amber palette across the lobby, brief, map, exploration, records, CCTV, lab, interviews, clueboard, and case report. Dossier surfaces remain muted paper against dark surroundings. Raised micro-labels to a 12px minimum and kept keyboard focus visible.
- No Convex functions, routes, action durations, evidence rules, or game mechanics changed. The generated UI concept frames were references only; fictional records and extra navigation in those frames were not implemented.
- Verification: TypeScript, focused lint, all 158 tests, and the production build passed. A signed-in visual playtest remains unverified because neither available browser surface could open the local app.

## 2026-10-09 — Review corrections

- Clueboard reads return null when the playing room is unavailable; records searches report an active action before the bureau-location error.
- Publication failures are recorded separately from generation status updates. Leaving cancels owned interview turns, CCTV reviews, and record searches while preserving other shared record access.
- Replay deadline input validates hours and rounds to whole minutes; API and development-case documentation match published-case replay.
- Validation: all 158 tests passed across the full-suite run and corrected-fixture rerun; TypeScript and lint passed (existing lint warnings). Convex sync is blocked in this sandbox because the local backend requires a newer glibc.

## 2026-10-09 — Replay deadline and review-only rooms

- Replay creation accepts an optional, fixed shared deadline in whole game minutes; omitted input keeps the frozen estimate plus 1,440 minutes. Invalid numeric deadlines are rejected server-side.
- A submitted final report now blocks new travel, searches, inspections, lab work, records/CCTV review, interviews, and clueboard edits for both players. Reads and grading retry remain available, and already-started timed work may settle. The deadline itself never blocks play or reduces the report score.
- Focused replay and review-only tests passed, followed by all 139 tests, TypeScript, lint (no errors), production build, and a personal-dev Convex function sync. A signed-in browser check is still unverified; the full 18-case playthrough sweep is intentionally skipped per player direction.
- A follow-up read-only data check confirmed text CCTV records across all 18 published cases (3,562 rows in the personal dev deployment). An initial partial count was caused by truncated command output, not missing records. No case data was changed.


## 2026-10-09 — Clueboard connection without dragging

- A detective can tie two selected board cards from the clueboard header using the existing shared edge action and chosen string color. This gives keyboard and touch users a non-drag route while retaining pin-to-pin dragging; the server still rejects invalid or cross-room links.
- Keyboard movement of cards and a signed-in touch/keyboard playtest remain open.

## 2026-10-09 — Map and leave-confirmation usability

- The stacked map now has one vertical scroll surface on narrow screens, so the place picker, map, and route actions move together. Desktop retains separate map and detail scrolling. A signed-in visual check at a short mobile viewport is still open.
- The in-game Leave confirmation now uses the same native modal-dialog behavior as the room modals. Keyboard focus stays in the decision, and Escape cancels rather than leaving. A signed-in keyboard pass is still open.
- In a synthetic dev replay, an earlier toxicology request progressed to minute 247, became ready, and showed its frozen result only after the detective viewed it at the forensic lab. An outsider could not read that room's lab data.

## 2026-10-09 — Interview and scene-path live check

- In a synthetic dev replay of Keel Street Incident, calling Dina Hartigan at the bureau made her immediately available. Asking what she witnessed completed at shared game minute 3 and exposed her stored statement; no field interview was needed or added.
- The same detective travelled to 14 Keel Street (minute 26), moved through the hallway to the main bedroom (minute 29), searched it (minute 44), and found Freya Winslow's phone. A separate five-minute read exposed its frozen call and message rows at minute 49. The shared clock paused between actions.
- A read-only audit of all 18 published cases matched every decisive evidence reference to one frozen runtime row and found no invalid or provably unreachable acquisition route through rooms, lab, CCTV, records, devices, or interviews. This is a static reachability check plus one live path, not 18 full playthroughs or signed-in browser UX verification.

## 2026-10-09 — All-published-case startup smoke

- On the personal dev deployment, all 18 published cases created a fresh synthetic replay, readied and started a one-player lobby, and returned a public brief, 20-place map, NPC list, 60-camera list, and an available bureau public-record search. The test rooms remain under a synthetic identity. This covers replay boot and initial safe queries, not complete case playthroughs or signed-in browser UX.

## 2026-10-09 — Clueboard pin placement

- Auto-placed notes and evidence cards now continue into new rows after the sixteenth card instead of wrapping onto the first row and covering earlier pins. The board still has its existing 100-node limit.

## 2026-10-09 — Keep case generation off the player site

- The existing allowlisted generation tester route now returns 404 outside Next development mode, matching the other development-only example route. A local production server returned HTTP 404 for `/dev/generation`. The normal player menu still offers only replays of published cases; dev tester functions retain their separate server allowlist.

## 2026-10-09 — Body-source lab repair

- The nine inaccessible optional lab rows all trace to exact `body:<victim>` subjects in their frozen evidence drafts. Publication and lab access now preserve an explicit victim source for body-based tests, while keeping their results behind the normal request, wait, and view steps. A strict internal repair matches draft evidence ID and victim before patching an older row.
- The personal dev deployment repaired 27 source links across all 18 published cases (18 autopsy rows and nine additional body tests); a second pass changed zero. In a fresh replay of Keel Street Incident, travel to the lab exposed its toxicology test as available with no result text. Requesting it moved it to pending with the result still hidden, and a non-member saw no lab data. The full timed ready/view path is covered by the fixture test, not a live playthrough.

## 2026-10-09 — Published replay data audit

- A read-only dev audit found 18 published replay cases. Each has a valid frozen estimate, a bureau, a connected 20-place city, NPC scripts for all living people, and the decisive evidence IDs present in runtime tables. Every case has stored camera records, confirmed again by a full untruncated count.
- Nine cases each have one optional, non-decisive lab result without an item or room source, so that result cannot currently be requested. Frozen-data presence does not prove the complete player journey; per-case signed-in playthroughs and a safe repair for these lab links remain open.

## 2026-10-09 — Reopening a submitted report

- Continue now distinguishes a room with a submitted final report from an active investigation. It opens the existing case-file result/retry screen for that room, including while grading is in progress, without treating the published case as consumed. A fresh replay remains available from Previous cases.

## 2026-10-09 — Explore during travel

- Revisiting Explore from browser history while travelling now shows the existing travel notice and map route instead of saying the current place has no rooms. Signed-in browser verification is still open.

## 2026-10-09 — Live final-report check

- A test-only dev replay submitted a pinned camera record and complete five-part theory. Private grading returned a completed five-category star result; outsider and anonymous callers received no result. This verifies one backend case-close path, not the signed-in UI or every published replay.
- The written case-close API now matches the live room-code contract, including retry after a grading failure.

## 2026-10-09 — Saved records-search wording

- The public-records button now recognizes repeated spaces and case changes in a recent saved search. Searches not on the recent list use a neutral label because an older saved search may still reopen for free; the pending state now uses the server's normalization too. Signed-in visual verification remains open.
- A dev replay camera check hid a frozen record before review, kept it pending during the 5-minute action, then exposed and pinned it to the shared clueboard at minute 11. A non-member could not read the window.

## 2026-10-09 — Live interview provider repair

- A fresh dev replay of Whitlock Office Murder started at bureau with its frozen deadline and a paused clock. Calling Priya Kaur was immediate, and one question consumed 3 shared minutes, but the configured NVIDIA-hosted Kimi endpoint returned 404 for this account and the streamed reply left the turn stuck in processing.
- Interviews now use the existing Moonshot-hosted Kimi model and save a short reply as one message. A modeled provider failure moves the turn to a retryable failed state instead of leaving it processing. A live retry confirmed that behavior without another time charge, but produced reasoning with no spoken text; the worker now forwards the existing thinking-off option and treats empty replies as failed.
- A second live question returned a visible 599-character NPC answer, with the shared clock paused at minute 6. A dev-wide read-back found no remaining processing interview turns. Signed-in browser presentation is still unverified.
- Provider failures now log only the error message, not the raw request object that can contain an NPC's private script.

## 2026-10-09 — Deadline visibility

- The investigation strip now shows each replay room's stored due time beside the shared case clock, including across station screens. This is display-only; deadline override and expiry behavior still await player decisions.
- A signed-in read-only query against an existing dev replay returned the expected due minute (1,815) alongside its paused shared clock (minute 20). All 136 tests, type-check, lint, and production build passed; signed-in visual sizing remains unverified.

## 2026-10-09 — Shared case-time display

- A slim case-time strip now stays visible across the bureau and investigation stations, using the existing shared clock. It advances only while timed work is active and reserves its own space above station controls. Expiry behavior remains separate pending a player decision.

## 2026-10-09 — Profile edit return

- The profile panel now has Back to menu. Leaving without Save restores the stored detective name, so an unsaved edit does not silently affect the next room.

## 2026-10-09 — Replay creation feedback

- Failed replay-room creation now shows its error in the previous-case picker instead of silently leaving the detective on the same list. Entering or leaving the picker clears unrelated old errors.

## 2026-10-09 — Previous-case picker navigation

- Added a visible Back to menu action above the scrolling case list, so detectives can leave the picker without browser navigation or opening a case.

## 2026-10-09 — Continue menu only shows playable cases

- An older room linked to an unpublished case no longer appears in the Continue menu. The room and its data remain untouched; only fully published cases are offered as replay rooms.

## 2026-10-09 — Replay test fixtures

- Updated three published-case fixtures with frozen time estimates so replay creation and start tests exercise the required deadline contract again.

## 2026-10-09 — Older active replay deadlines

- A private idempotent repair can add the published case's default deadline to an already-playing room without resetting its clock, conversation, or evidence. It refuses waiting, case-less, and unpublished rooms.
- The seven eligible dev rooms were repaired. A read-back found all eight current published-case rooms (seven playing, one waiting) have the expected default deadline, with no missing or mismatched values. Legacy case-less and unpublished rooms were left unchanged.

## 2026-10-08 — Replay deadline state

- New replay rooms now store a paused game clock at minute zero and a default deadline of the case's frozen estimate plus 1,440 minutes. Previously created waiting rooms receive the same default on start.
- A live dev replay of a case with a 375-minute estimate stored minute 0 and a 1,815-minute deadline as expected. Override entry, deadline display, and expired-action rules remain open; older already-playing sessions were repaired on October 9.

## 2026-10-08 — Frozen replay time estimate

- Publication now copies the positive integer investigation estimate into the immutable case record. Re-publishing an older published case fills that missing field idempotently from its original generated draft; replay will not have to read drafts to set a deadline.
- Verified the dev deployment: all 18 playable published cases now have positive frozen estimates. One older row remains unpublished and hidden because its original cast/statement data is inconsistent. Deadline selection and enforcement remain open.

## 2026-10-08 — Short-screen city map

- The mobile map's route details can now be reached by scrolling when the stacked map and details exceed the available height. Desktop keeps its separate map and details scrolling.
- A signed-in short-screen visual check remains open.

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

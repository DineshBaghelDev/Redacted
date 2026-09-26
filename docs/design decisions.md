# Design Decisions

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

- During UI development, a new room opens the completed Union Station Death case as a fixed fixture. Case generation is intentionally bypassed until the gameplay surfaces are ready.
- The game shell is full-screen; account profile controls are not shown during play.
- The bureau scene owns the full viewport on the signed-in home screen; the shell does not add a second background or scrolling page.
- Screen navigation is represented by URL paths so browser reload preserves the current screen.
- Investigation screen URLs are nested under the room code so simultaneous games remain isolated.
- The case brief is read from Convex's latest passed generation job and exposes only title, summary, and initial facts to the client.

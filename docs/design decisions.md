# Design Decisions

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
- Each lie says how the person reacts when caught: tells the whole truth, admits only what the proof shows, or switches to a backup lie (which needs different proof).
- Finding something taken from the victim's home inside the killer's home counts as decisive evidence.
- The victim's phone is found "on the body" at the scene.
- Any evidence the players have found can be shown to break a lie, not only physical items they picked up.
- For variety, code picks each AI case's motive type, weapon type and crime-scene place from the seed; the AI builds the case around them.
- Witnesses per case: 3–6.
- When AI output fails the checks, the AI gets its answer back with the exact problems, up to 2 times; lies and written texts that still fail are dropped rather than failing the case.
- The case brief tells players only who died, where, when, who reported it, and the weapon only if it was left at the scene.
- The time estimate must be between the minimum a perfect investigation needs and 4 times that.
- Lying isn't compulsory: innocent people tell the truth to clear themselves and lie only when the truth would do real damage (arrest, job, reputation, family). The killer always has a cover story. At most 2/3/4 innocent liars on easy/normal/hard.
- Innocent suspects don't need a provable alibi; some cases leave people unaccounted for. Nothing decisive may point at an innocent.
- Not everyone has a secret.

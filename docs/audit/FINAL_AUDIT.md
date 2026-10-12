# Final pre-ship audit — 2026-10-11

Written from three seats: a player who wants to be entertained, a designer who wants it to feel like a game, and a developer who wants it to survive real players. Sound and artwork are excluded (artwork list: `docs/audit/ARTWORK_NEEDED.md`).

**How this was audited:** a full read of every player screen, the server rules behind them (`convex/`), and the recorded Union Station case, then a live solo playthrough of the easy case *Whitlock Office Murder* (room ZYZTSR) in Chrome: scene search, phone unlock, bank sweep, interview, records, cameras, lab. Findings from that run are in **Live playtest** below. Before shipping, still do one blind playtest with someone who has never seen the game (see the end).

## Status after fixes — 2026-10-11

Fixed and checked (tests and a signed-in Chrome run; details in `docs/progress.md`):

- **P0-1 Time stake:** detective rank from stars + on time, plus badges. Five stars unchanged.
- **P0-2 Exploits:** records need a search term. The lab menu and free proof remain, but now cost rank time, and wrong proof gets a visible "They don't budge". The code clue is subtler.
- **P0-3 Magic words:** broader statement triggers, explained in the interview tip; phone handover only for "your phone".
- **P0-4 Prove it wrong:** honest "Show evidence" wording plus "They don't budge" feedback. Also fixed the root bug found while testing: either phone's copy of a message now counts as the same evidence (lies and evidence star).
- **P0-5 Where to go:** victim's home and workplace in the brief.
- **P0-6 Fair scoring:** "You said / The truth" beside What really happened.
- **Live playtest 2–18:** duplicate clutter, clutter tell, near-empty phones and cameras (seeded filler), improvised NPC lies, NPC time sense, statement titles, "Name asks:" prefix, bureau cameras, fake Play label, payment times, lab leftovers, "Other" record labels, Main menu exit, solo lobby. The victim's bag now uses the evidence icon (a new icon would need art).
- **P1:** one name per station and action, one notification stack, archive deadline text, interviews-at-bureau hint, solo "1–2 detectives" wording, team notes on notebook entries, interview transcript restyled without new art.
- **Docs drift:** current lab workflow now agrees in `GAME_SYSTEMS.md` and `DECISIONS.md`; historical decisions remain dated in `design decisions.md`.

Still open after the 2026-10-12 art pass:

- **Art pass:** room sprites, object icons, portrait expressions, interview room foreground, clueboard surface, missing map icons, and four clock-driven light variants have shipped. The last optional treatments and rejected forensic image attempts are resolved in `ARTWORK_NEEDED.md`; the live lab tasks retain their clearer interactive graphics.
- **Clueboard controls:** the remaining graph toolbar and attribution were removed from the board scene. A pixel-art view control opens keyboard-accessible zoom and fit actions; scroll and pinch still work. Checked at 390px and desktop width, including a live zoom action.
- **Design calls left as they are:** the lab still offers every tool on every bag (the autopsy task was reworked into a dictation); the report keeps three written answers because motive and method are separate stars.
- **Phone layout:** checked at 390×844 and fixed (see progress). Signed-in Chrome checks at 390×844 covered Pier 9's interior and the active lab task, with no document-wide horizontal overflow; a 500×698 pass covered both screens, and a separate 390×844 Playwright capture covered the signed-out menu. **Not measured:** render churn on a mid-range phone. A server test verifies that a returning teammate can settle an overdue journey; a solo Chrome return from a closed tab confirmed arrival and a paused clock after a 22-minute journey.
- **Not reproduced:** the main-menu "never finishes loading" seen twice in the first run. The menu loaded normally in the second run and in a fresh signed-in tab on 2026-10-12.
- **Build:** an isolated `next build --webpack` passed on 2026-10-12. The default Turbopack build could not compile from that isolated checkout because its linked `node_modules` target sat outside the checkout root.

## Live playtest — Whitlock Office Murder (solo, easy)

What happened, in order, and what it showed:

1. **Brief:** victim, job, place, time, reporter. No home address, which confirms P0-5.
2. **Scene:** labelled boxes on a brown grid. "On the body" is a button with no body. Every piece of real evidence in the bank (phone, memo, code scrap) was in this first room. The other 8 rooms held a box of gloves and two copies of the same bulbs. **Bug:** duplicate clutter ("Spare bulbs" ×2 in one spot).
3. **Clutter tell:** clutter reads "A box of spare light bulbs." while real evidence is a long, specific sentence. Players can sort evidence by text length. The clutter needs richer one-liners, or the evidence needs plainer ones.
4. **Code clue:** "9385, underlined twice: backwards!" gives the answer away. Fine for easy; hard cases need subtler clues.
5. **Victim's phone:** one message, zero calls. A near-empty phone tells you its one message is the clue. **Devices need clutter too:** a few ordinary texts, calls and files. The same goes for cameras: the bank's street camera has **one sighting in two days**.
6. **People:** Priya joined from the memo. Nice, and it works.
7. **Interview (the best moment):** I showed the "meet at 7 pm" message, and Priya cracked and admitted the meeting. **But the game recorded no caught lie** (no Contradiction, no "Caught out"). The AI invented that lie and then dropped it by itself, so the server-checked lie system is bypassed in both directions. The prompt must stop NPCs inventing denials outside their script, or players will get confessions the game never counts.
8. **Magic words confirmed:** "What were you doing on the evening of Day 2?" gave an answer but no statement. "Where were you at 7 pm?" took the statement. The statement's title is machine wording: "Priya Kaur saw Viktor Dunmore, Marcus Whitlock, Clara Esposito".
9. **Accidental phone handover confirmed:** "Did you see *his* phone?" handed over **Priya's own phone** ("Go through their phone · 5 min" appeared) while her reply said "No."
10. **NPC time sense:** at 22:57 on Day 2, an hour after discovery, Priya said she "only learned what happened the next morning". NPCs need the current game time and when they were told about the death.
11. **Wrong proof:** showing the box of gloves got a shrug and no game feedback, which confirms P0-4.
12. **Detective lines repeat the player's name** inside the bubble ("feNRIR asks: …") under a "Detective" label. Drop the prefix.
13. **Records:** one empty "Browse files" search returned the whole database (31 records), including people not yet met. Confirms the P0-2 exploit. Card payments carry no time, which makes them nearly useless. Most records sit under a vague "Other" heading.
14. **Cameras:** the security desk lists **7 cameras inside the police bureau itself**. They can never matter, so they're noise; hide them. "▶ Play" on the monitor looks like a button but isn't. Next sighting works well.
15. **Lab:** the body's bag uses a folder icon. The autopsy task is "tap 1–4", trivial. The result was good, and the death window (18:15–19:45) puts Priya, who left at 19:05, in the frame. That's the deduction loop working.
16. **Exit:** the pause menu has only Resume, sound, tips and **Leave case**. There's no way back to the menu without leaving permanently (see `MISSING_FEATURES.md` #2).
17. **Main menu load (unverified):** twice, the title screen never reached "loaded" for the browser tools, while game screens did. Something on the menu may keep the page busy, possibly the audio loop. Check with the Performance tab.
18. **Solo lobby:** a lone player still has to press Ready, then Start.

---

## Verdict

**It is a real game, with an app's skin in the places you spend the most time.**

The design underneath is strong. You get a cold open at the scene, a living cast that lies and only cracks under real proof, generated evidence that never changes, a shared notebook and clueboard, and a five-star report written in your own words. That is the core of *Her Story*, *Return of the Obra Dinn* and *Ace Attorney*, and very few games try it. You have taken ownership seriously: no hint system, no suspicion meter, no auto-deduction. That is the game's identity. Protect it.

The game has two problems:

1. **Nothing costs anything.** Time has no consequence, and wrong guesses have no consequence. So the best strategy is always "do everything to everything". Brute force replaces deduction, and brute force is where players get bored.
2. **The screens you use most look like forms.** The room you search is labelled text boxes on a dark floor. Interviews are a chat app. Every found object has the same icon. Those three screens are about 70% of play time, and they read as "app".

Fix the first before shipping, because it decides whether this is a puzzle or a chore. The second is mostly the artwork list.

---

## P0 — fix before ship

### 1. The clock has no teeth, so brute force always wins
- One game minute is 100 ms (`convex/lib/clock.ts:4`). A 4-minute search takes 0.4 s, a 60-minute code crack 6 s, a 10-minute records search 1 s.
- Passing the deadline only shows "Overdue". The score ignores time (design decision 2026-10-10).
- **Result:** the clock, the deadline, the "split up to save time" co-op idea and every "· 4 min" label are decoration. The only real cost is the player's patience, so the optimal play is the most tedious one.
- **Smallest fix (needs your decision, because it changes a locked rule):** keep the five stars, but add one visible result for time. For example, a sixth "Closed in time" stamp like the accomplice bonus badge, or a detective rank (Rookie, Inspector, Chief) from stars plus time. The players then have a reason to choose rather than try everything. No other system needs to change.

### 2. Four brute-force exploits that skip the deduction
| Exploit | Where | Why it hurts |
|---|---|---|
| **Browse files with an empty search** returns up to 50 records for one 10-minute search | `convex/publicRecords.ts:29` | Skips "find a name, then look it up". On most cases that is the whole records puzzle. Require a term of 2+ characters. |
| **Run all 8 lab tools on every bag** (autopsy on a coffee mug included) | `forensic-lab-screen.tsx` | Eight mini-games per object. Once the novelty wears off, this is the most boring loop in the game. |
| **Show every piece of evidence to every person** | `npcConversations.ts:222-227` | A wrong proof costs 3 game minutes (0.3 s) and gets no reaction, so spamming proof is free. |
| **"Have the lab crack it (60 min)"** | `place-screen.tsx` | 6 real seconds. No one will hunt for the sticky note or work out the birthday code, and that small aha moment is wasted. |

Fixing #1 shrinks all four. Separately, the records one is a one-line fix and should go in anyway.

### 3. Hidden "magic words" decide whether you get key evidence
- A witness's statement is only taken if your question matches a regex: "where were you", "what happened", "what did you see"… (`npcConversations.ts:52`). In the recorded case, **two witness statements are disproof for the killer's main lie.** Ask "What were you doing on Thursday morning?" and you get a reply but no statement, and you never learn statements exist.
- Phone handover is also a regex (`:47`). "Did you see his phone?" matches "see" plus "phone" and quietly hands over the witness's own phone. That is accidental and confusing.
- **Fix:** keep free typing, but say the rule once. The interview's first-time tip can explain the control: "Ask where they were or what they saw to take a formal statement. Ask for their phone to examine it." That explains controls, not the case, so it fits the tips rule. Also make the phone pattern require "your" (your phone / your mobile).

### 4. "Prove it wrong" pretends to check the line you picked
- The UI lets you pick one sentence and present proof against it. The server ignores the sentence. It checks the proof against **every** lie that person has (`npcConversations.ts:222-227`).
- Proof can therefore break a lie in a different sentence, and you get a "Contradiction" stamp on a line that was true. Players learn the wrong lesson.
- Failed proof gets **no feedback at all**. Nothing tells the player whether the proof was wrong or whether this person admits only part of the truth.
- **Fix:** let a failed confrontation say so in the game's voice: a "They don't budge" stamp, with the NPC told the proof didn't land. If you add a cost (see #1), this becomes Ace Attorney's best mechanic instead of a free guess. Either drop the line picker or label it honestly ("Confront them with proof").

### 5. The first ten minutes: where do I go?
- You start at the scene, search it, and then face 20 places with dozens of rooms between them, flats named "Flat 2B" with no residents, and no addresses on People cards.
- The brief gives the victim's job but **not where they live or work**. Any real detective would have that on minute one, and it is legitimate starting information, not a hint.
- **Fix:** add the victim's home and workplace to the brief's known details, generated or code-filled from `homeUnitId` / `job.placeId`. That one change gives every case a natural second and third stop.

### 6. Verify the scoring feels fair, or players will feel cheated
- Killer and weapon are exact matches. Motive, method and evidence are judged by an LLM from free text, and the only feedback is "The motive does not fit the case."
- A player who is right in different words loses a star and never finds out why.
- **Fix (cheap, uses data already released):** on the result screen, show **your answer next to what really happened** for each star. The epilogue already reveals the truth, so this just lines it up.

---

## P1 — makes it feel like a game

### Where it gets boring
1. **Searching buildings.** Meridian Tower has 12 flats plus corridors, every room has 2–4 spots, and every spot has seeded clutter. Without addresses (P0-5) players search entire buildings. The hold-to-search is a nice touch the first 20 times, not the 200th.
2. **Lab mini-games on repeat.** Each one is fun once. Repeated on clutter, they become a chore. If time costs something, players will choose tests instead of running them all.
3. **CCTV.** "Next sighting ▶▶" and the orange marks turn the tape into a list. That's the right call for 48-hour tapes. The fun is matching descriptions to faces, and that works. Leave it.
4. **The report form.** It needs three typed paragraphs of 10+ characters after a long case. It works, but it is the most "form" moment at the climax. Consider letting motive and method be one paragraph.

### Where it feels like an app
- **Room view** (`building-view.tsx`): furniture is a labelled box and doors are "▯ Kitchen · 1 min" buttons. This is the main screen of the game, and it needs sprites (see the artwork list).
- **Interviews:** chat bubbles, "Detective" / "Name · speaking". Restyle as a typed interview transcript or a dialogue box under the portrait. Same data, game feel.
- **Clueboard:** lucide icons, React Flow zoom buttons, a dark grid, and a "Tie string without dragging" form. It is the most software-looking screen. Hide the zoom controls behind pinch/scroll, swap lucide for the pixel icon set, and bring back a board texture (the cork plate was reverted, so maybe a darker felt board).
- **Found objects** all share one generic "evidence" icon, so a knife and a receipt look identical.
- **Notifications** appear in three places: the arrival toast at top right, tips at bottom left, notebook and lab toasts at bottom right. Pick one.

### Where it deceives or confuses
- **The archive's deadline text is wrong.** "The case default gives your team its suggested time plus one day" (`previous-games.tsx`), but the code uses estimate × 1.5 (`convex/sessions.ts:18`).
- **The lab has leftovers from the old turnaround model.** Requests are written already-viewed (`convex/forensics.ts:120`). So "Tear open the report", the pending progress bar, "x min left" and the "The lab called: a result is ready" toast can never appear in normal play. Delete them so no one wonders where results went.
- **"Overdue" in red** suggests a penalty that doesn't exist. Either give it one (P0-1) or make it neutral grey.
- **The same action has three names:** "Tag clue" (interview), "Show evidence" (docs and tips) and a pin icon on the button, while pinning means something else. Call it "Show evidence" everywhere, with its own icon, not the pin.
- **The same place has several names:** "Records room", "Records", "Public records", "Bureau records terminal"; "Interview room" vs "People we know of". Pick one name per station.

### Where people get stuck
1. After the scene search, with no addresses (P0-5).
2. Never taking statements (P0-3).
3. Not knowing that interviews only work **at the bureau**. The message only shows after you try. The People list could say "Interviews at the bureau" when you're away.
4. **The report needs at least one pinned piece of evidence.** Explained, but only on the case-file screen. The notebook already drags into the report, which is good.
5. **Solo players.** The game supports one player, but co-op is the pitch. Solo, you do everything alone with no time pressure, so it plays fine but loses its hook. Say "1–2 detectives" on the menu so solo doesn't feel like a lesser mode.

### Where ownership is protected (keep these)
- No hints, no suspect ranking, no auto-links: the player is the detective.
- Free-text interviews, free-text motive and method.
- CCTV "Who is it?" faces are clearly the player's guess and never graded.
- People join the file only when the team uncovers them.
- Clutter is everywhere, so finding something doesn't mean it matters.

One thing quietly takes ownership away: **the notebook logs everything automatically.** That is the right default for convenience, but the player never writes anything outside the clueboard. Consider letting a notebook entry take a one-line personal note ("lying about the dentist?"), shown on its pinned card. Cheap, and it makes the notebook *theirs*.

---

## P2 — developer and longevity

- **Content runway.** The game is replay-only from the archive, and a solved case has close to zero replay value because the solution never changes. The number of published, validated cases at launch is the game's length. Decide whether launch is "N handmade-quality cases" or "generate a new case", which is currently disabled for players. That is a product decision, and it decides whether people come back.
- **Interview reliability and cost.** Every question is a live LLM call: latency, provider outages (one already forced a provider switch) and cost per player-hour. Budget for it, and make sure the "That answer was lost. Asking again costs no time." path is tested on a slow network.
- **Regex triggers are English-only and brittle** (P0-3). They need tests with real player phrasings.
- **Render churn.** The bureau shell re-renders every 200 ms for the clock (`bureau-screen.tsx`), and place, lab and map run 100 ms intervals. Fine on desktop. Check battery and heat on a mid-range phone during a 1-hour session.
- **The clock settles from the client.** Actions finish when a client's timer calls `finishAction` / `finishTravel`. If both detectives close the tab mid-action, it settles on the next load. Probably fine; confirm with a test.
- **Docs drift.** `GAME_SYSTEMS.md` still says lab results wait 30 minutes and earlier decisions say "+1 day". Tidy them so the next change doesn't follow stale rules.

---

## What's already good (don't lose it in polish)
- Cold open at the crime scene, on the story's own clock.
- Lies that only break with server-checked proof; the killer never confesses.
- Device codes hidden as personal clues (birthday card, keyring date).
- The co-op touches: partner on the map and floor plan, "Show partner" pings, the shared notebook.
- "What really happened" timeline after the result is a great payoff. Make it bigger, not smaller.
- Hold to search, the lab bench tools, "Contradiction" stamp and sting: the right instincts for game feel.

---

## Recommended ship order
1. Decide the time stake (P0-1). Everything else depends on it.
2. One-line and copy fixes: records empty search, phone "your", archive deadline text, delete lab leftovers, one name per action and station.
3. Victim home and work in the brief (P0-5), and the interview tip that explains statements and phones (P0-3).
4. Failed-proof feedback, plus honest "Confront" wording (P0-4).
5. "Your answer vs the truth" on the result screen (P0-6).
6. Room sprites, object icons and the interview transcript style (with the artwork pass).
7. **One blind playtest:** two people who've never seen the game, one case, you silent and taking notes. Watch for the first moment each one asks "what now?"; that is your real stuck point.

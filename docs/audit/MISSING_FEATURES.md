# Missing player features — 2026-10-11

Features a normal player expects around the case itself: menus, history, sharing, settings. Each one is checked against the code. Ordered by how much a player will notice the gap. Keep the fixes small (YAGNI); most reuse data that already exists.

## Status after fixes — 2026-10-11

Built: 1 case history (closed rooms never expire), 2 Main menu exit, 3 archive stamps and replay warning, 4 after-result buttons, 5 invite links, 6 How to play, 7 solo start, 8 profile stats (on the Case history screen), 9 name saved to the account, 10 rejoin a started room by code, 11 Large text, 12 notebook search, 13 Report a problem (Sentry feedback), 14 Share result (text), 15 case of the day, 16 badges, 18 partner messages in the notebook.

Not built: **17 watch-replay timeline.** The game doesn't record when each discovery was made, so a team timeline needs a new action log. Deferred rather than faked.

## Must have before ship

### 1. My played games (case history)
**Now:** the menu's Continue list (`convex/sessions.ts` `listMine`) shows only rooms that have not expired. Rooms expire **7 days** after creation (`ROOM_TTL_MS`, `sessions.ts:11`), and the list stops at the latest 12 rooms. After that, a finished case, its stars and its "What really happened" are gone for good. In the live check, the signed-in menu showed no Continue entries at all before a new room was created.
**Needed:** a "Case history" screen with one row per finished case: title, difficulty, stars, case time, solved/given up, partner name, date. Tapping a row reopens the result and epilogue. Smallest version: keep finished rooms readable (no expiry once a report or give-up exists) and list them separately from Continue.

### 2. A way back to the menu that isn't "Leave"
**Now:** in a case, the pause menu offers Resume, sound, tips, and **Leave case**, which permanently removes you (`sessions.ts` `leave`). The only other route is the browser's address bar. After filing a report, a player who wants the main menu has to leave, and that takes the report off their Continue list.
**Needed:** "Main menu" in the pause menu and on the result screen that just navigates home. The room keeps running and shows up under Continue. Leave stays as the separate, destructive option.

### 3. Archive cards show whether you've played a case
**Now:** "Play a previous case" lists every published case the same way (`cases.ts` `listPassed`). You can't tell which ones you've played or solved.
**Needed:** a stamp on each card: Not played, In progress, Solved ★★★★☆, or Given up. A solved case also needs a warning before replaying: "You know the answer — replay anyway?". Also show difficulty clearly and the suspect count.

### 4. What to do after the result
**Now:** the result screen ends at the epilogue. There is no "Play another case", "Replay this case" or "Main menu".
**Needed:** three buttons at the bottom of the result screen: Main menu, Another case (opens the archive), and Replay with a new room.

### 5. Inviting a partner
**Now:** the lobby copies the 6-character room code only. The partner has to open the game, find Join room and type the code.
**Needed:** "Copy invite link" (e.g. `/join/ABC123`), which opens the join flow with the code already filled in after sign-in.

### 6. How to play
**Now:** first-time tips explain controls on each screen. Nothing explains the goal and the loop before you begin: five stars, people lie until you show proof, the clock, pinning evidence, and filing the report.
**Needed:** a one-page "How to play" on the main menu (short pictured steps), also reachable from pause. Explain controls and rules only, never case content.

## Should have

7. **Play solo is not obvious.** The lobby waits for "ready", and the menu never says one detective is fine. Label it "Play alone or with a partner", and let a solo player skip ready.
8. **Profile stats.** Cases solved, average stars, fastest solve. These come for free once #1 exists.
9. **Your name follows you across devices.** The detective name lives in browser storage (`room-hub.tsx`, `redacted.detectiveName`), so a new device asks again. Store it on the account (Clerk already has the user).
10. **Rejoin after leaving or a crash.** Leaving is permanent, and so is accidentally confirming Leave. Allow a rejoin by code while the room is still in play and has a free seat.
11. **Text size and reading options.** Long case text uses small monospace type. Add one text-size setting (normal or large) next to volume.
12. **Notebook search and filter.** Late in a hard case the notebook holds dozens of entries across 8 groups. Add a text filter.
13. **Report a problem.** One link from pause ("Something wrong with this case?") that saves the room code and a note. That's needed when NPC replies or judging go wrong after launch. Sentry is already wired up.

## Nice to have (after launch)
14. Share your result as a spoiler-free card: title, stars, time.
15. Daily or featured case on the menu.
16. Achievements: all lies exposed, solved without giving up, solved before the deadline.
17. A spectator or "watch replay" timeline of the team's moves after the case closes.
18. Text chat or quick pings between partners beyond "Show partner". Most co-op players will be on voice anyway, so this is low priority.

## Not adding (by spec)
Hint system, suspicion meters, auto-deductions, creating new cases from the menu (until generation is opened deliberately), CCTV visuals.

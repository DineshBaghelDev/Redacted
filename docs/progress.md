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

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

# Asset handoff — 2026-10-12

## Scope and current state

This is the handoff for the **artwork assignment only**. The other AI can take over gameplay, UI layout, backend, performance, and release checks. The active artwork pass has produced or integrated the raster files below; this handoff does not claim that every screen or the entire game is finished. No new image was generated while writing this handoff.

The target look is restrained pixel noir: charcoal and petrol teal surfaces, aged amber controls, readable live case text, and a few strong illustrated focal points per screen. Art must stay clean at phone size. Do not put case facts, evidence, people, dialogue, or generated labels into backgrounds. CCTV remains text/data only, with **no stills, thumbnails, or footage**. Portraits are deterministic layers assembled from identity traits; they are not model-generated face images.

The current `public/assets/` contains **65 PNG files**, and `src/app/` contains **3 PNG metadata exports**. Dimensions below are actual file dimensions, not export targets. `RGBA` means the file supports transparency; it does not imply every pixel is transparent. An atlas contains multiple sprites cut by CSS or component positioning. `Ready` means present and referenced by game code or metadata. `Source/unused` means present but not itself used by the running UI.

## What I completed

- Replaced large portions of the original pale, purple, form-like skin with scene art, raster frames, illustrated buttons, icon atlases, and paper/metal/felt materials while keeping case text selectable and accessible.
- Built a 12-material interior floor set, normal/searched furniture atlases, room-control art, window/covered-body/shed art, object-category atlases, named map silhouettes, and detective/car tokens. Room topology and search rules remain data-driven.
- Added interview room/transcript/foreground/stamps; deterministic portrait expression layers; lab room/bench/tools/props/task tray; clueboard felt/cards/controls; phone/laptop shells and keypad; case-opened/result/stars/timeline art; sharing and app-icon exports.
- Integrated the existing card artwork into the clueboard's full-detail and empty states, removed the extra CSS paper fill, and enlarged invisible icon tap areas. This is the last in-progress artwork integration from the preceding turn.
- Added browser-synthesized music/ambience/effects earlier in this pass. There are **no audio files** in the asset inventory; sound design is implemented in code, with separate level controls. A hardware listening pass is still useful.

## Asset inventory

### Scenes, surfaces, frames, and controls

| File under `public/assets/` | Size | Status and use |
|---|---:|---|
| `menu-noir.png` | 1672×941 RGB | Ready — signed-out and menu backdrop. |
| `bureau-noir.png` | 1672×941 RGB | Ready — bureau hub scene. |
| `archive-room.png` | 1672×941 RGB | Ready — previous cases scene. |
| `interview-room.png` | 1672×941 RGB | Ready — interview background. |
| `lab-room.png` | 1672×941 RGB | Ready — lab background. |
| `records-room.png` | 1672×941 RGB | Ready — records desk scene. |
| `report-desk.png` | 1672×941 RGB | Ready — final report scene. |
| `exploration-wall.png` | 1672×941 RGB | Ready — interior scene wall material. |
| `city-grid.png` | 1672×941 RGB | Ready — city map base. |
| `clueboard-felt.png` | 1254×1254 RGB | Ready — dark board surface. |
| `clueboard-cork.png` | 1672×941 RGB | Source/unused — lighter version rejected in favor of felt. |
| `dossier-frame.png` | 1254×1254 RGBA | Ready — framed dossier panels. |
| `terminal-frame.png` | 1254×1254 RGBA | Ready — terminal panels. |
| `control-plate-trim.png` | 2148×393 RGBA | Ready — trimmed transparent-edge raster button plate and face. |
| `control-plate.png` | 2172×724 RGBA | Source/unused — original untrimmed plate; retain as source. |
| `control-icons.png` | 1774×887 RGBA | Ready — shared button/control icons and both pin states. |
| `station-icons.png` | 1774×887 RGBA | Ready — bureau/station destinations. |
| `investigation-icons.png` | 1536×1024 RGBA | Ready — investigation actions. |

### Interiors and found objects

| File under `public/assets/` | Size | Status and use |
|---|---:|---|
| `floors/corridor.png` | 181×181 RGB | Ready — corridor repeating material. |
| `floors/living.png` | 181×181 RGB | Ready — living-room material. |
| `floors/kitchen.png` | 181×181 RGB | Ready — kitchen material. |
| `floors/bedroom.png` | 181×181 RGB | Ready — bedroom material. |
| `floors/bathroom.png` | 181×181 RGB | Ready — bathroom material. |
| `floors/garage.png` | 181×181 RGB | Ready — garage material. |
| `floors/yard.png` | 181×181 RGB | Ready — yard material. |
| `floors/unit.png` | 181×181 RGB | Ready — flat/hotel unit material. |
| `floors/office.png` | 181×181 RGB | Ready — office material; also reused for `special` rooms. |
| `floors/storage.png` | 181×181 RGB | Ready — storage material. |
| `floors/shopfloor.png` | 181×181 RGB | Ready — shop floor material. |
| `floors/outdoor.png` | 181×181 RGB | Ready — outdoor material. |
| `room-furniture.png` | 1264×1244 RGBA | Ready — ordinary search-spot sprites, selected by `FurnitureSprite`. |
| `room-furniture-searched.png` | 1265×1244 RGBA | Ready — searched/open variants of the same spots. |
| `room-controls.png` | 2172×724 RGBA | Ready — doors, stairs, lift, and wall camera controls. |
| `room-special-spots.png` | 1774×887 RGBA | Ready — neutral covered-body and shed spots. |
| `room-window.png` | 2172×724 RGBA | Ready — decorative interior window. |
| `evidence-objects-primary.png` | 1272×1236 RGBA | Ready — first found-object icon atlas, selected by `ObjectIcon`. |
| `evidence-objects-secondary.png` | 1254×1254 RGBA | Ready — second found-object icon atlas and neutral fallback. |

### Map and travel

| File under `public/assets/` | Size | Status and use |
|---|---:|---|
| `map-places.png` | 1536×1024 RGBA | Ready — common place silhouettes. |
| `map-places-extra.png` | 1536×1024 RGBA | Ready — additional place silhouettes. |
| `map-places-named.png` | 1448×1086 RGBA | Ready — distinct houses, bank, clinic, pier, bureau, lab, shop, bar, and diner. |
| `map-tokens.png` | 2172×724 RGBA | Ready — car and two detective markers on the city/building maps. |

### Interview, lab, board, and devices

| File under `public/assets/` | Size | Status and use |
|---|---:|---|
| `interview-foreground.png` | 2172×724 RGBA | Ready — quiet table/chair layer around the portrait. |
| `interview-transcript.png` | 1024×1536 RGBA | Ready — blank paper dialogue surface. |
| `stamps/contradiction.png` | 690×292 RGBA | Ready — blank frame for live contradiction text. |
| `stamps/missed.png` | 687×292 RGBA | Ready — blank frame for failed-proof feedback. |
| `stamps/statement.png` | 691×293 RGBA | Ready — blank frame for live statement text. |
| `lab-bench.png` | 2103×748 RGB | Ready — top-down bench. |
| `lab-tools.png` | 1774×887 RGBA | Ready — eight tool sprites. |
| `lab-props.png` | 1915×821 RGBA | Ready — sealed/open bags and blank report sheet. |
| `lab-task-tray.png` | 1672×941 RGBA | Ready — low-detail tray behind live task graphics. |
| `clueboard-cards.png` | 1453×1083 RGBA | Ready — person, record, lab, and note papers; also used by full-detail/empty states. |
| `clueboard-controls.png` | 1983×793 RGBA | Ready — board action/view icons; pins use shared raster art. |
| `phone-shell.png` | 1024×1536 RGBA | Ready — blank phone frame around live apps. |
| `laptop-shell.png` | 1536×1024 RGBA | Ready — blank laptop frame, hidden in compact layout. |
| `device-app-icons.png` | 2172×724 RGBA | Ready — messages, calls, and files. |
| `device-keypad.png` | 1086×1448 RGBA | Ready — blank lock keypad under live controls. |
| `call-directions.png` | 2172×724 RGBA | Ready — incoming/outgoing call marks. |

### Case moments and packaging

| File under `public/assets/` | Size | Status and use |
|---|---:|---|
| `redacted-emblem.png` | 1422×1106 RGBA | Ready — game logo mark beside live REDACTED wordmark. |
| `case-opened.png` | 1374×1145 RGBA | Ready — compact case brief opener. |
| `case-stamp-frame.png` | 1983×793 RGBA | Ready — blank close/give-up result stamps. |
| `case-star-filled.png` | 1254×1254 RGBA | Ready — filled score star. |
| `case-star-empty.png` | 1254×1254 RGBA | Ready — empty score star. |
| `timeline-rivet.png` | 1254×1254 RGBA | Ready — neutral epilogue event marker. |
| `key-art.png` | 1730×909 RGB | Source — two-detective share artwork; exported to metadata images below. |
| `app-icon.png` | 1254×1254 RGBA | Source — square emblem; small site icon export below. |

| Metadata export in `src/app/` | Size | Status and use |
|---|---:|---|
| `icon.png` | 64×64 RGBA | Ready — browser favicon from emblem. |
| `opengraph-image.png` | 1730×909 RGB | Ready — social preview from key art. |
| `twitter-image.png` | 1730×909 RGB | Ready — social preview from key art. |

## What remains for an asset-only assignment

There is **no unresolved must-have raster request** in the current `ARTWORK_NEEDED.md` audit. Its original checklist remains below its completion notes, so reading the checklist alone gives a false impression of missing assets. The following are possible asset tasks, with their real constraints:

1. **Optional store capsule/export sizes.** A separate store capsule was requested but no storefront dimensions or publishing destination have been chosen. The existing 1730×909 key art covers social sharing; make a capsule only to a real storefront specification. The requested 1200×630/512px dimensions are not the actual current exports.
2. **Optional special-room floor tile.** `special` rooms currently reuse the office tile. A separate quiet 181×181 tile is possible if those rooms look repetitive in a real case; it should not suggest evidence.
3. **Optional forensic task art.** Fingerprint, UV, bullet, and footprint graphics are procedural and tied to seeded interactions. Two generated replacement attempts had halos/stray pixels and were rejected. Only replace one after inspecting all cells at game size and confirming the live task still communicates the correct state; do not add fixed findings to art.
4. **Optional arrival/loading and event symbols.** Arrival uses the shared notice stack, loading uses the pulsing emblem, and the result timeline stores free-text events with one neutral rivet. Extra art would need a clear non-cluttering use; typed timeline icons would require reliable event types rather than guessing from text.
5. **Optional physical audio check.** The synthesized score/effects and volume controls exist, but audibility on actual phone and laptop speakers has not been measured. This is an asset-quality check, not a reason to change game rules.

The remaining non-art acceptance work belongs to the other AI/team: blind first-time-player test, mid-range phone render/performance measurement, final browser/build pass, and any newly found UI/gameplay bugs. `FINAL_AUDIT.md` and `MISSING_FEATURES.md` contain historical findings plus status updates; do not treat their old “Now/Needed” paragraphs as an open list without reading the status sections.

## Where to look before changing art

- CSS atlas slices and scene backgrounds: `src/app/globals.css`.
- Furniture and object atlas selection: `src/components/room-hub/furniture-sprite.tsx`, `src/components/room-hub/object-icon.tsx`.
- Portrait traits/expressions: `src/components/room-hub/character-portrait.tsx` and the interview screen.
- Board art and interactions: `src/components/room-hub/screens/clue-board-screen.tsx`.
- Artwork decisions and verification history: `docs/audit/ARTWORK_NEEDED.md`, `docs/design decisions.md`, `docs/progress.md`.

Keep text live, labels accessible, sprites transparent where intended, silhouettes readable at their actual CSS size, and atlas cuts free of neighboring-cell artifacts. Any new image should be viewed at native resolution and in the game at desktop and phone widths before calling it complete.

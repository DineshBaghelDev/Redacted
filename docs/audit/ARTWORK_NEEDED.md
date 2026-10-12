# Artwork needed — 2026-10-11

Style: the existing pixel-noir set (charcoal, petrol teal, aged amber; transparent PNG sprites; no lettering baked into art). Rules that still apply: **no CCTV visuals of any kind**, no art that implies case facts (no clues, blood or people painted into rooms), and generated case text stays live text.

## Already in `public/assets/`
bureau-noir, menu-noir, archive-room, interview-room, lab-room, records-room, report-desk, exploration-wall, city-grid, clueboard-cork (reverted), dossier-frame, terminal-frame, control-plate(+trim), control-icons, station-icons, investigation-icons, device-app-icons, map-places, map-places-extra, redacted-emblem.

**Update:** room-furniture and room-furniture-searched atlases cover the common search spots; evidence-objects-primary and evidence-objects-secondary cover 25 found-object categories. Twelve floor materials, named-place silhouettes, car/detective map tokens in both the city and building maps, door/stair/lift/camera/window pieces, and covered-body/shed spots are now in use. The remaining work is listed by station below.

**Interview update:** transcript paper, table/chair foreground, three blank stamp frames, and deterministic portrait expressions are now in use.

**Lab update:** all eight tool sprites, the bench, sealed/open evidence bags, and a blank report sheet are now in use. Per-task visuals remain open.

**Board/device update:** dark felt, four blank card variants, raster board controls, image pin, phone/laptop shells, illustrated keypad, message bubble tails, and incoming/outgoing call icons are in use. No missed-call type exists in stored phone data.

**Moment/packaging update:** compact case-opened dossier, blank result stamps, star art, a brass-rivet result timeline, four subtle clock-driven scene light variants, two-detective key art, social share images, and square app emblem are in use. Arrival notices remain text in the shared notification stack. The current result timeline has only free-text events, so specific event-type icons would guess at case facts; it retains a neutral marker.

**Final art choices:** search targets already get a focus/hover outline, so a second illustrated hover frame would add clutter. The illustrated board pins are the string endpoints; separate knot sprites would make them harder to grab. The lab tasks keep their interactive, seeded graphics: generated fingerprint and task sheets showed stray pixels and were rejected. Arrival notices and the loading emblem stay compact so they do not cover investigation controls. The share banner is 1730×909 and the app emblem is 1254×1254, both supplied at the intended aspect ratios rather than exact suggested export dimensions.

## Priority 1 — the screens players spend most time on

### A. Room interiors (biggest "app vs game" gap)
The room view today is labelled boxes on a CSS floor (`building-view.tsx`). Needed, all top-down, one tile size:
- **Floor tiles per room kind (12):** corridor, living, kitchen, bedroom, bathroom, garage, yard, unit (flat/hotel room), office, storage, shopfloor, outdoor, special.
- **Furniture spot sprites, one per search spot (≈26), each with a normal state and a "searched" state (drawer open, doors ajar):** sofa cushions, bookshelf, side table drawer, kitchen drawer, bin, fridge, wardrobe, bedside drawer, under the bed, cabinet, workbench, tool shelf, shed, flower bed, desk, desk drawer, filing cabinet, shelves, boxes, under the counter, bushes. Add the generated spot names that recur (e.g. "on the body": use a neutral covered-sheet or chalk outline, no injury detail).
- **Wall pieces:** door (closed/open), door to stairs, stairs icon, lift doors, window. A highlight frame for the hovered spot.
- **Player and partner markers:** a small top-down detective token in two colours.
- **A small sprite for the room camera** (the box on the wall, not footage).

### B. Found-object icons
Every found object shows the same "evidence" icon today. Make an atlas of ~24 category icons and map items by keyword or type:
phone, laptop, letter/note, sticky note, receipt, card/ID, keys/keyring, birthday card, photo (blank frame), bottle, vial/pill bottle, cup/mug, glass, knife, blunt object, rope/cord, gun, clothing, shoe, bag/wallet, tool, document folder, cash, jewellery, generic "small object".

### C. Interview presentation
- **Interview-room foreground:** a table edge and chair back to frame the portrait, so it reads as a room rather than a chat window.
- **Dialogue box frame:** a transcript-paper or typed-record frame to replace the chat bubbles.
- **Stamps:** "CONTRADICTION" (exists as CSS; make it art), a new "THEY DON'T BUDGE" (if the failed-proof feedback ships), "STATEMENT TAKEN".
- **Portrait expressions:** at least neutral, nervous, angry and caught, as overlay layers on the existing layered portraits (eyes/brows/mouth). Used when lies are exposed. This is the cheapest big upgrade to feel.

## Priority 2 — finishing the world

### D. Map places without their own silhouette
These fall back to a generic kind icon (`map-screen.tsx` `placeArtwork`): **keel-14, harlow-3, marlow-27** (houses), **gable-row**, **civic-bank**, **st-clare-clinic**, **pier-9**, **police-bureau**, **forensic-lab**. Also give **quik-stop** (shop), **blue-lantern** (bar) and **route-9-diner** (diner) their own icons; they currently reuse the cafe icon. Add a **taxi/car token** for the travelling marker.

### E. Lab bench
- Tool sprites (8): powder brush, UV lamp, DNA swab, tox kit/pipette, lifting tape, casting kit, comparison scope, autopsy tray.
- Bench surface plate (top-down), an evidence bag sprite (sealed/open), and a generic printed lab-report sheet frame.
- Per-task visuals: fingerprint whorl (exists in code, make it art), UV glow spots, bullet striation strips, footprint cast.

### F. Clueboard
- A board surface that isn't the dark grid (felt or darker cork; the light cork was rejected).
- Pin sprites (exist), string end knots, card paper variants per type (person card with a photo corner, record card, lab-report card, note card).
- Replace the lucide icons (Plus, Link, Trash, Maximize, X) with pixel versions in the control atlas.

### G. Devices
- Phone body frame (top-down pixel phone), laptop frame (exists as CSS; make it art), lock-screen keypad, message bubble tails, call-log icons (incoming/outgoing/missed).

## Priority 3 — moments and packaging

### H. Moment art
- **Case brief opener:** "case opened" splash (dossier being stamped).
- **Arrival cards:** optional per-place exterior silhouettes for the arrival toast (reuse map icons large if budget is tight).
- **Result screen:** the five-star stamp set (filled/empty star stamps), "CASE CLOSED" and "CASE GIVEN UP" stamps, and rank badges if a time rank ships.
- **Epilogue:** a timeline strip frame and small event icons (meeting, call, travel, the crime itself as a neutral red mark).
- **Time of day:** four light overlays (morning, afternoon, evening, night) for room and bureau scenes; night tint exists as a CSS filter.

### I. Packaging
- Store and Open Graph share image (1200×630), store capsule art, a key-art illustration of the two detectives at the clueboard, and a 512px app icon (favicon done).
- Loading-screen variants (currently the emblem with a pulse).

## Explicitly not needed (by spec)
CCTV stills, thumbnails or footage; per-case generated scene art; art showing evidence in place; portraits generated by a model (portraits stay deterministic layers).

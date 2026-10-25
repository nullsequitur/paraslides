# Ticket: T05-05 - Overview Menu Dedicated Key m & Strict Vim Movement

- **Status:** DONE
- **Sprint:** Sprint 05
- **Target Layer:** Adapters (`src/adapters/render/map-mode.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Refine the 2D Overview Map / Menu Mode (`src/adapters/render/map-mode.js`) to provide strict Vim navigation ergonomics and dedicated confirmation / cancellation semantics:
1. **Dedicated Toggle Key (`m`):**
   - Opened and closed via `m`. (Remove Space bar from opening the menu; Space is reserved for `NEXT_SLIDE`).
2. **Strict Vim Grid Navigation:**
   - Inside menu mode, only strict grid motions (`h`, `j`, `k`, `l`, `0`, `$`, `gg`, `G`, and counts) move the selection cursor around the 2D matrix of slides.
   - Movements do NOT wrap across sections inside the menu.
3. **Selection & Cancellation:**
   - `Enter` and `Space`: confirm the active highlighted slide, jump to its coordinates (`NAVIGATE_TO`), and close the menu.
   - `m` or `Escape`: cancel and close the menu, returning to the slide that was active before opening.
4. **Visual Polish:**
   - Clearly display Rows (Sections) and Columns (Pages) in the grid overlay, indicating attached Detour stacks on slides.

## 2. Acceptance Criteria
- [x] `m` toggles the overview menu overlay.
- [x] In menu mode, `h/j/k/l` strictly move selection without wrapping.
- [x] `Enter` and `Space` confirm selection and close the menu.
- [x] `m` and `Escape` cancel selection and restore previous slide.
- [x] Full unit test coverage in `tests/adapters/render/map-mode.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented `selectedY`, `selectedX`, `originalY`, `originalX` cursor model inside `attachMapMode`.
- Implemented strict Vim motions (`h`, `j`, `k`, `l`, `0`, `$`, `gg`, `G`, and count buffers `[count]key`) with zero wrapping across rows.
- Implemented confirmation via `Enter` and `Space` dispatching `NAVIGATE_TO` and closing the menu.
- Implemented abort/cancellation via `Escape` or `m` closing the menu without changing presentation position.
- Added `isMapOverlayOpen(target)` guard in `vim-keys.js` to ensure background presentation doesn't advance while browsing menu.
- Added 4 new test suites in `tests/adapters/map-mode.test.js` and updated integration presentation tests.

# Ticket: T05-01 - Core Sticky Column, Section Wrapping & NEXT_SLIDE

- **Status:** DONE
- **Sprint:** Sprint 05
- **Target Layer:** Core (`src/core/state.js`, `src/core/navigator.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Refactor the pure core navigation domain to adopt the **Vim Document Metaphor** (Section = Row, Page = Column):
1. Replace per-section cursor memory (`lastX[y]`) with a sticky target column (`desiredX`) on the active state:
   - Moving horizontally (`MOVE_LEFT`, `MOVE_RIGHT`, `JUMP_START`) sets `desiredX = nextX`.
   - `JUMP_END` (`$`) sets `desiredX = Infinity` (or sticky EOL flag).
   - Moving vertically (`MOVE_UP`, `MOVE_DOWN`, `JUMP_ROW`, `NAVIGATE_TO`) preserves `desiredX`:
     - Clamps active column to `Math.min(desiredX, xMax(newY))`.
     - When later navigating to a row with more columns, restores column to `desiredX`.
     - An explicit horizontal move (`h`, `l`, `0`) while clamped updates `desiredX`.
2. Implement **Continuous Section Wrapping** on horizontal movement:
   - When on the last page of a row (`x === xMax(y)`), `MOVE_RIGHT` wraps to the first page of the next row (`y + 1, x = 0`), unless already on the last row.
   - When on the first page of a row (`x === 0`), `MOVE_LEFT` wraps to the last page of the previous row (`y - 1, x = xMax(y - 1)`), unless already on row 0.
   - Detour horizontal movement stays clamped inside detour boundaries (`z = 1 .. zMax`) without section wrapping.
3. Implement `COMMAND_NEXT_SLIDE` (`NEXT_SLIDE`):
   - Advances 1 slide forward (`x + 1`); if at row end, wraps to `y + 1, x = 0`. Stops at end of deck.
4. Add Row Jumps:
   - Support `COMMAND_JUMP_ROW` or `NAVIGATE_TO` with target row `y` and restoration of `desiredX`.
5. Enhance Capabilities / Outbound State Payload:
   - Emit `willWrapNextSection: boolean` (true when `x === xMax(y) && y < yMax`)
   - Emit `willWrapPrevSection: boolean` (true when `x === 0 && y > 0`)

## 2. Acceptance Criteria
- [x] `createInitialState` initializes `desiredX = 0`.
- [x] `updateCoordinates` manages `desiredX` and sticky `$`.
- [x] `MOVE_DOWN` / `MOVE_UP` clamp when row is shorter and restore `desiredX` when row is longer.
- [x] `MOVE_RIGHT` wraps to next row at row boundary; `MOVE_LEFT` wraps to previous row at row start.
- [x] `NEXT_SLIDE` advances linearly through all slides and sections.
- [x] `feedback.verticalLockedAttempt` continues to fire on `MOVE_UP`/`MOVE_DOWN` inside detours.
- [x] 100% test coverage in `tests/core/state.test.js` and `tests/core/navigator.test.js`.
- [x] 100% pure JavaScript with zero DOM, CSS, or external dependencies.

## 3. Worker Notes & Retro Feedback
- Implemented `desiredX` and `isStickyEol` on Core state in `src/core/state.js`, maintaining sticky column tracking across rows.
- Implemented `COMMAND_NEXT_SLIDE`, `COMMAND_JUMP_TOP_ROW`, `COMMAND_JUMP_BOTTOM_ROW`, and `COMMAND_JUMP_ROW` in `src/core/navigator.js`.
- Implemented continuous section wrapping on `COMMAND_MOVE_RIGHT` and `COMMAND_MOVE_LEFT`.
- Emitted `willWrapNextSection` and `willWrapPrevSection` in `computeCapabilities` and `buildStatePayload`.
- All 291 unit and integration tests passing with 100% pass rate. Pure JavaScript core invariants completely preserved.

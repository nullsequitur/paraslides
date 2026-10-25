# Ticket: T05-02 - Keyboard Count Buffer, gg/G Jumping & Space/Enter Linear Flow

- **Status:** DONE
- **Sprint:** Sprint 05
- **Target Layer:** Adapters (`src/adapters/input/vim-keys.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Enhance the Inbound Keyboard Adapter to support Vim multiplier counts, standard line jump keybindings (`gg`, `G`), linear presentation keys, and dedicated menu toggling:
1. **Numeric Count Buffer:**
   - Pressing digits `1`-`9` initiates a numeric count multiplier. Subsequent digits `0`-`9` append to the buffer.
   - When a navigation command is executed (`h`, `l`, `j`, `k`), the command is dispatched `count` times (or passed with multiplier count).
   - `0` without a preceding count triggers `COMMAND_JUMP_START`. If a count buffer is active, `0` appends digit 0.
   - Pressing `Escape` or a 2-second timeout clears any pending count buffer.
2. **Line / Row Jumps (`gg`, `G`):**
   - Pressing `g` enters a sequence buffer:
     - Second `g` triggers jump to Row 1 (`y = 0`) (or `[count]gg` jumps to Row `count`, 1-indexed).
   - Pressing `G` jumps to the last Row (`y = yMax`) (or `[count]G` jumps to Row `count`, 1-indexed).
3. **Linear Forward Progression (`Space` & `Enter`):**
   - Map both `Space` and `Enter` to `COMMAND_NEXT_SLIDE`.
4. **Dedicated Menu Toggle (`m`):**
   - Dedicate `m` to `COMMAND_TOGGLE_MAP`. (Remove `Space` from menu toggle).
5. **Escape Key Handling:**
   - In `DETOUR_MODE`: `Escape` or `o` triggers `COMMAND_EXIT_DETOUR`.
   - If count buffer is active: `Escape` clears the count buffer without exiting detour.

## 2. Acceptance Criteria
- [x] Count multipliers work for `3l`, `2j`, `2k`, `3h`.
- [x] `gg` jumps to top row; `G` jumps to bottom row; `5gg` and `5G` jump to row 5.
- [x] `Space` and `Enter` advance slides continuously across rows.
- [x] `0` jumps to column 0 when no count is active.
- [x] `m` toggles map mode; Space does not trigger map mode.
- [x] Full unit test coverage in `tests/adapters/vim-keys.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented count multiplier buffer for numeric prefixes in `src/adapters/input/vim-keys.js`.
- Implemented two-key sequence `'gg'` (`COMMAND_JUMP_TOP_ROW`) and `[count]gg` (`COMMAND_JUMP_ROW`).
- Implemented `'G'` (`COMMAND_JUMP_BOTTOM_ROW`) and `[count]G` (`COMMAND_JUMP_ROW`).
- Mapped `Space` and `Enter` to `COMMAND_NEXT_SLIDE` for seamless linear forward presentation.
- Mapped `m` exclusively to `COMMAND_TOGGLE_MAP`.
- Ensured `Escape` clears active count buffers before affecting detour or modal states.
- 298 / 298 tests passing across all test suites with 100% pass rate.

# Ticket: T06-02 - Core Presenter Commands, Feedback Payloads & Vim Keybindings

- **Status:** DONE
- **Sprint:** Sprint 06
- **Target Layer:** Core (`src/core/navigator.js`) & Input Adapter (`src/adapters/input/vim-keys.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Add abstract presenter tool commands to the pure domain Core and wire them to Vim keyboard navigation:
1. `src/core/navigator.js`:
   - Export commands: `COMMAND_TOGGLE_LASER`, `COMMAND_TOGGLE_TELESTRATOR`, `COMMAND_CLEAR_TELESTRATOR`.
   - Update `processCommand` to recognize these commands and produce non-destructive state transitions with feedback flags:
     - `COMMAND_TOGGLE_LASER` &rarr; `feedback.toggleLaser = true`
     - `COMMAND_TOGGLE_TELESTRATOR` &rarr; `feedback.toggleTelestrator = true`
     - `COMMAND_CLEAR_TELESTRATOR` &rarr; `feedback.clearTelestrator = true`
   - Ensure coordinate state (`y`, `x`, `z`, `desiredX`) is untouched.
2. `src/adapters/input/vim-keys.js`:
   - Bind <kbd>p</kbd> &rarr; `COMMAND_TOGGLE_LASER` (Laser Pointer)
   - Bind <kbd>t</kbd> &rarr; `COMMAND_TOGGLE_TELESTRATOR` (Telestrator Pen)
   - Bind <kbd>c</kbd> &rarr; `COMMAND_CLEAR_TELESTRATOR` (Clear Drawings)
   - Support custom keybinding mappings provided via declarative config or adapter options.

## 2. Acceptance Criteria
- [x] `COMMAND_TOGGLE_LASER`, `COMMAND_TOGGLE_TELESTRATOR`, `COMMAND_CLEAR_TELESTRATOR` exported in `COMMANDS` object and as individual constants.
- [x] `processCommand` preserves coordinates and emits appropriate feedback flags.
- [x] `vim-keys.js` maps `p`, `t`, `c` keys unless in editable elements or overview map overlay.
- [x] Keybinding map allows overrides passed via configuration options.
- [x] 100% test coverage in `tests/core/navigator.test.js` and `tests/adapters/vim-keys.test.js`.
- [x] Core invariants completely preserved: pure JavaScript, zero DOM dependencies in `src/core/`.

## 3. Worker Notes & Retro Feedback
- Added `COMMAND_TOGGLE_LASER`, `COMMAND_TOGGLE_TELESTRATOR`, and `COMMAND_CLEAR_TELESTRATOR` in `src/core/navigator.js` and registered them in `COMMANDS`.
- Updated `processCommand` to emit `{ toggleLaser: true }`, `{ toggleTelestrator: true }`, and `{ clearTelestrator: true }` in `feedback` while keeping coordinates completely unchanged.
- Bound <kbd>p</kbd>, <kbd>t</kbd>, and <kbd>c</kbd> in `src/adapters/input/vim-keys.js`.
- All 86 tests in `navigator.test.js` and `vim-keys.test.js` pass with 100%. Pure hexagonal isolation preserved.

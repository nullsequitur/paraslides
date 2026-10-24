# Ticket: T02-02 - Vim & Arrow Key Input Adapter

- **Status:** DONE
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Input
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/input/vim-keys.js` that binds to keyboard events and translates navigation keys into abstract commands for the `NavigationCommandPort` (`createCommandDispatcher`).

## 2. Acceptance Criteria
- [x] Implement `attachKeyboardAdapter(dispatcher, target = window, options = {})`:
  - Maps `h`, `ArrowLeft` -> `MOVE_LEFT`
  - Maps `l`, `ArrowRight` -> `MOVE_RIGHT`
  - Maps `j`, `ArrowDown` -> `MOVE_DOWN`
  - Maps `k`, `ArrowUp` -> `MOVE_UP`
  - Maps `i` -> `ENTER_DETOUR`
  - Maps `o`, `Escape` -> `EXIT_DETOUR`
  - Maps `0` -> `JUMP_START`
  - Maps `$` -> `JUMP_END`
- [x] Ignores keystrokes when user is focused inside form elements (`<input>`, `<textarea>`, `<select>`, `contenteditable`).
- [x] Ignores keystrokes when modifier keys (`ctrlKey`, `metaKey`, `altKey`) are pressed (preventing collision with browser shortcuts like Ctrl+R).
- [x] Calls `event.preventDefault()` only for handled navigation keys to avoid unwanted browser scrolling.
- [x] Returns a cleanup function `detach()` that removes the event listener cleanly.
- [x] Unit tests in `tests/adapters/vim-keys.test.js` verifying key mappings, modifier ignoring, input focus handling, and clean detach.

## 3. Worker Notes & Retro Feedback
- Implemented `src/adapters/input/vim-keys.js` with zero runtime dependencies.
- Exported frozen `KEY_BINDINGS` constant conforming to `DOMAIN_SPEC.md` section 4.
- Implemented `attachKeyboardAdapter(dispatcher, target, options)` with input element checks (`<input>`, `<textarea>`, `<select>`, `isContentEditable`, `[contenteditable]`, and `activeElement`), modifier key filters (allowing Shift for `$` while blocking Ctrl, Alt, Meta, and chorded Shifts), and preventDefault handling.
- Implemented dual-style return value: callable `detach()` cleanup function and `{ detach }` object property.
- Added comprehensive unit tests in `tests/adapters/vim-keys.test.js` (26 unit test assertions across 6 test suites) covering all key bindings, modifier combinations, editable element bypasses, detach cleanup, and end-to-end integration with `createCommandDispatcher`.
- All 176 test cases pass cleanly with 100% pass rate.

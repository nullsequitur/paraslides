# Ticket: T02-02 - Vim & Arrow Key Input Adapter

- **Status:** TODO
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Input
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/input/vim-keys.js` that binds to keyboard events and translates navigation keys into abstract commands for the `NavigationCommandPort` (`createCommandDispatcher`).

## 2. Acceptance Criteria
- [ ] Implement `attachKeyboardAdapter(dispatcher, target = window, options = {})`:
  - Maps `h`, `ArrowLeft` -> `MOVE_LEFT`
  - Maps `l`, `ArrowRight` -> `MOVE_RIGHT`
  - Maps `j`, `ArrowDown` -> `MOVE_DOWN`
  - Maps `k`, `ArrowUp` -> `MOVE_UP`
  - Maps `i` -> `ENTER_DETOUR`
  - Maps `o`, `Escape` -> `EXIT_DETOUR`
  - Maps `0` -> `JUMP_START`
  - Maps `$` -> `JUMP_END`
- [ ] Ignores keystrokes when user is focused inside form elements (`<input>`, `<textarea>`, `<select>`, `contenteditable`).
- [ ] Ignores keystrokes when modifier keys (`ctrlKey`, `metaKey`, `altKey`) are pressed (preventing collision with browser shortcuts like Ctrl+R).
- [ ] Calls `event.preventDefault()` only for handled navigation keys to avoid unwanted browser scrolling.
- [ ] Returns a cleanup function `detach()` that removes the event listener cleanly.
- [ ] Unit tests in `tests/adapters/vim-keys.test.js` verifying key mappings, modifier ignoring, input focus handling, and clean detach.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

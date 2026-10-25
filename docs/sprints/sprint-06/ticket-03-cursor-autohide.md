# Ticket: T06-03 - Fullscreen Cursor Auto-Hide Adapter

- **Status:** TODO
- **Sprint:** Sprint 06
- **Target Layer:** Adapters (`src/adapters/render/cursor-auto-hide.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement the Outbound Cursor Auto-Hide Adapter to keep presentation viewports distraction-free:
1. `src/adapters/render/cursor-auto-hide.js`:
   - Debounce inactivity timer (`delayMs`, default 2500ms).
   - When idle beyond threshold:
     - Apply `.is-cursor-hidden` / `data-cursor-hidden="true"` to container or root document (`cursor: none !important`).
   - Listen to pointer interactions (`pointermove`, `pointerdown`, `mousemove`) and reset inactivity timer:
     - Instantly remove `.is-cursor-hidden` upon pointer movement.
   - Awareness of Fullscreen API:
     - If `fullscreenOnly: true`, only activate timer while document is in fullscreen mode.
     - When fullscreen exits, instantly restore cursor visibility.
   - Lifecycle:
     - Provide `attachCursorAutoHide(targetElement, options)` returning `{ show, hide, reset, destroy, isHidden }`.
     - Clean removal of all event listeners and timers on `destroy()`.
   - Export `CURSOR_AUTO_HIDE_STYLES` and `injectCursorAutoHideStyles(doc)`.

## 2. Acceptance Criteria
- [ ] Inactivity timer hides cursor after configured `delayMs`.
- [ ] Mouse movement restores cursor immediately and resets timer.
- [ ] Respects `fullscreenOnly` option when configured.
- [ ] Exported stylesheet applies `cursor: none !important` when hidden.
- [ ] Lifecycle controls (`show`, `hide`, `destroy`) function cleanly without leaking event listeners or timers.
- [ ] Comprehensive unit tests in `tests/adapters/cursor-auto-hide.test.js`.

## 3. Worker Notes & Retro Feedback
[Populated upon completion]

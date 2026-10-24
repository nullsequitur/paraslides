# Ticket: T02-03 - CSS Viewport Renderer Outbound Adapter

- **Status:** TODO
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Render
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/render/viewport.js` that subscribes to state change events from `NavigationCommandPort` and updates DOM attributes, active classes, and slide visibility conforming to `docs/HTML_SCHEMA.md`.

## 2. Acceptance Criteria
- [ ] Implement `attachViewportRenderer(dispatcher, rootElement, options = {})`:
  - Updates root attributes on `#deck`:
    - `data-mode`: `'MAIN'` or `'DETOUR'`
    - `data-active-y`: `${y}`
    - `data-active-x`: `${x}`
    - `data-active-z`: `${z}`
  - Applies `.is-active` exclusively to the active slide matching current `(y, x, z)`. Removes `.is-active` from prior slides.
  - Applies `.has-detour` to all primary slides (`z === 0`) that have attached detour sequences (`Z_max > 0`).
  - Sets custom data attributes on sections/pages (e.g. `data-y`, `data-x`) for CSS positioning and 3D transforms.
  - Supports smooth CSS transitions and primary/detour color theme shifts as specified in `HTML_SCHEMA.md`.
  - Returns cleanup/unsubscribe function `destroy()`.
- [ ] Unit tests in `tests/adapters/viewport.test.js` validating attribute synchronization, class toggling, and cleanup.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

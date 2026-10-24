# Ticket: T02-03 - CSS Viewport Renderer Outbound Adapter

- **Status:** DONE
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Render
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/render/viewport.js` that subscribes to state change events from `NavigationCommandPort` and updates DOM attributes, active classes, and slide visibility conforming to `docs/HTML_SCHEMA.md`.

## 2. Acceptance Criteria
- [x] Implement `attachViewportRenderer(dispatcher, rootElement, options = {})`:
  - [x] Updates root attributes on `#deck`:
    - `data-mode`: `'MAIN'` or `'DETOUR'`
    - `data-active-y`: `${y}`
    - `data-active-x`: `${x}`
    - `data-active-z`: `${z}`
  - [x] Applies `.is-active` exclusively to the active slide matching current `(y, x, z)`. Removes `.is-active` from prior slides.
  - [x] Applies `.has-detour` to all primary slides (`z === 0`) that have attached detour sequences (`Z_max > 0`).
  - [x] Sets custom data attributes on sections/pages (e.g. `data-y`, `data-x`) for CSS positioning and 3D transforms.
  - [x] Supports smooth CSS transitions and primary/detour color theme shifts as specified in `HTML_SCHEMA.md`.
  - [x] Returns cleanup/unsubscribe function `destroy()`.
- [x] Unit tests in `tests/adapters/viewport.test.js` validating attribute synchronization, class toggling, and cleanup.

## 3. Worker Notes & Retro Feedback
- Implemented `src/adapters/render/viewport.js`:
  - Pure ES module with zero external runtime dependencies.
  - Exposes `attachViewportRenderer(dispatcher, rootElement, options = {})`:
    - Resolves root element from Element or selector.
    - Uses pre-built `options.slideMap` or automatically runs `loadDeckFromDOM(rootElement)` if omitted.
    - Synchronizes global `#deck` state attributes: `data-mode` (`MAIN` | `DETOUR`), `data-active-y`, `data-active-x`, `data-active-z`.
    - Synchronizes CSS custom properties `--active-y`, `--active-x`, `--active-z`, `--mode` on root element when `style.setProperty` is available.
    - Updates active classes (`.is-active`, `.is-active-section`, `.is-active-page`) and `data-active="true"`, ensuring only current active elements hold active status.
    - Ensures `.has-detour` and `data-has-detour="true"` are on primary slides (`z === 0`) that have attached detour sequences.
    - Ensures spatial coordinate attributes (`data-y`, `data-x`, `data-z`) and CSS variables (`--y`, `--x`, `--z`) exist across all sections, pages, and slides for 3D transformations.
    - Returns a destroy handle function `destroy()` with `destroy.destroy = destroy` for callable and property invocation, safely unsubscribing from dispatcher.
  - Exports `VIEWPORT_BASE_STYLES`: Complete CSS rules covering two-state theme variables (`--bg-main`, `--bg-detour`, `--accent-main`, `--accent-detour`), 3D spatial transforms (`translateY`, `translateX`, `translateZ`), perspective, active slide visibility, and detour dot badges.
  - Exports `injectViewportStyles(target)` helper for attaching stylesheet to document/head.
- Implemented unit tests in `tests/adapters/viewport.test.js`:
  - 14 tests covering hydration, coordinate & mode updates across `MOVE_RIGHT`, `MOVE_LEFT`, `MOVE_DOWN`, `MOVE_UP`, `ENTER_DETOUR`, `EXIT_DETOUR`.
  - Verified class toggling (`is-active`, `is-active-section`, `is-active-page`, `has-detour`), dataset reflections, CSS variable binding, `onRender` callback hook, and idempotent destruction.
- Run `npm test`: 191 tests passing cleanly across 52 suites with 0 failures.

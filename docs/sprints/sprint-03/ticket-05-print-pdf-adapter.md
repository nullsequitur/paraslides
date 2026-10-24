# Ticket: S03-T05 - Print-to-PDF Adapter & Flattening Layout

- **Status:** DONE
- **Sprint:** Sprint 03
- **Target Layer:** Adapters (Render / Print)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement static Print-to-PDF layout flattening as specified in `docs/ROADMAP.md` Phase 2 Deliverable 4:
- Goal: Static export fallback ensuring presentations can be printed or saved to PDF via browser `Ctrl+P` / `window.print()`.
- Flattening rules:
  - `@media print`:
    - Overrides 3D viewport perspectives, fixed overlays (`#hud`, `#paraslides-map`), and relative/absolute 100vh page-flipping styles.
    - Flattens presentation slides into sequential pages (`page-break-after: always; break-after: page;`).
    - Standard print typography and clean background colors (light background option or high-contrast print).
  - Configurable flattening modes on the adapter:
    - `'main-only'`: Prints only primary slides (`z === 0`), hiding all detour slides (`display: none !important`).
    - `'interleaved'`: Prints primary slide followed immediately by its attached detour slides in sequential order (`z = 1, 2, ...`).
    - `'appendix'`: Prints all primary slides first, followed by an appendix section of all detour slides with breadcrumbs/callouts pointing to their parent coordinates.
  - Runtime adapter `src/adapters/render/print.js`:
    - `attachPrintAdapter(rootElement, options)`:
      - Applies `data-print-mode="main-only|interleaved|appendix"` attribute on `#deck` or container.
      - Provides `setPrintMode(mode)` method.
      - Handles `beforeprint` and `afterprint` window events (or mock equivalents).
      - Exports `PRINT_BASE_STYLES` and `injectPrintStyles()`.

## 2. Acceptance Criteria
- [x] `PRINT_BASE_STYLES` implemented with `@media print` rules, page breaks, and print mode selectors.
- [x] `attachPrintAdapter(rootElement, options)` implemented in `src/adapters/render/print.js`.
- [x] Modes supported: `'main-only'`, `'interleaved'`, `'appendix'`.
- [x] Detour slides hidden in `'main-only'` mode.
- [x] Overlays (`#hud`, `#paraslides-map`) hidden in `@media print`.
- [x] Comprehensive unit tests in `tests/adapters/print.test.js`.
- [x] 100% test pass rate.

## 3. Worker Notes & Retro Feedback
- Implemented `PRINT_BASE_STYLES` with `@page { size: landscape }`, sequential page breaks, and high-contrast light print typography.
- Implemented `attachPrintAdapter` in `src/adapters/render/print.js` supporting `'main-only'`, `'interleaved'`, and `'appendix'` modes.
- Added `beforeprint` and `afterprint` event lifecycle hooks and `print()` trigger.
- Added unit tests in `tests/adapters/print.test.js`. All 245 tests pass.

# Ticket: T05-06 - Standalone Interactive Tutorial & Feature Showcase Deck

- **Status:** DONE
- **Sprint:** Sprint 05
- **Target Layer:** Presentation / Documentation (`index.html`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Expand the standalone `index.html` demo file into a rich, self-documenting presentation that fulfills two critical roles:
1. **Interactive User Tutorial:**
   - Teaches presenters and viewers how to navigate paraslides:
     - Document Metaphor: Rows (Sections), Columns (Pages), Depth (Detours).
     - Vim Navigation: `h`, `j`, `k`, `l`, `0`, `$`, `gg`, `G`, and count multipliers (e.g. `3l`, `2j`).
     - Linear Progression: using `Space` and `Enter` with section wrapping.
     - Detours: pressing `i` to enter deep dives, `h`/`l` to scrub, and `o`/`Esc` to return.
     - Overview Menu: pressing `m` to open the 2D grid, navigating, and pressing `Enter`/`Space` to jump.
2. **Feature Showcase:**
   - Demonstrates practical slide types: title slide, conceptual cards, deep-dive technical appendices, code snippets, and math equations.
   - Synchronizes embedded CSS with the new HUD fixed layout, mild 3D transitions, and horizontal detour scrubbing.

## 2. Acceptance Criteria
- [x] `index.html` contains at least 4 semantic sections with multiple pages and multi-slide detours.
- [x] Live slides teach every keybinding interactively.
- [x] Incorporates all Sprint 05 styling updates (fixed HUD, mild 3D transitions, no colliding dots).
- [x] Validated with browser integration tests in `tests/integration/standalone-demo.test.js`.

## 3. Worker Notes & Retro Feedback
- Expanded `index.html` into 4 semantic sections covering Introduction & Vim Metaphor, Geometry & Detours, Overview Menu & HUD, and Reference & Architecture.
- Embedded rich multi-slide detour sequence with technical code blocks and math equation formatting.
- Removed deprecated `.slide.slide-main.has-detour::after` orange blob and synchronized HUD styles with fixed dimensions.
- Created `tests/integration/standalone-demo.test.js` covering HTML extraction, 4 sections, multi-slide detours, and full lifecycle execution with 100% pass rate.

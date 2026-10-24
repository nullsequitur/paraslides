# Ticket: T01-01 - Project Scaffolding & Test Fixture Factory

- **Status:** TODO
- **Sprint:** sprint-01
- **Target Layer:** Scaffold / Test
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Establish the canonical directory structure, empty module stubs, and a reusable test fixture factory (`tests/fixtures/deck-fixture.js`) so that all subsequent ticket unit tests test against identical mock topology shapes.

## 2. Acceptance Criteria
- [ ] Create stub files for `src/core/model.js`, `src/core/state.js`, `src/core/navigator.js`.
- [ ] Create stub files for `src/ports/input.js`, `src/ports/output.js`.
- [ ] Create `tests/fixtures/deck-fixture.js` returning a standard 3x3 mock deck with attached detours (Section 0 with 2 pages, Section 1 with 3 pages and 2 detours on page 1, Section 2 with 1 page).
- [ ] `npm test` passes cleanly with a smoke test verifying the fixture.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

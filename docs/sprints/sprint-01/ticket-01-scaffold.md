# Ticket: T01-01 - Project Scaffolding & Test Fixture Factory

- **Status:** DONE
- **Sprint:** sprint-01
- **Target Layer:** Scaffold / Test
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Establish the canonical directory structure, empty module stubs, and a reusable test fixture factory (`tests/fixtures/deck-fixture.js`) so that all subsequent ticket unit tests test against identical mock topology shapes.

## 2. Acceptance Criteria
- [x] Create stub files for `src/core/model.js`, `src/core/state.js`, `src/core/navigator.js`.
- [x] Create stub files for `src/ports/input.js`, `src/ports/output.js`.
- [x] Create `tests/fixtures/deck-fixture.js` returning a standard 3x3 mock deck with attached detours (Section 0 with 2 pages, Section 1 with 3 pages and 2 detours on page 1, Section 2 with 1 page).
- [x] `npm test` passes cleanly with a smoke test verifying the fixture.

## 3. Worker Notes & Retro Feedback
- Created ES module stubs for core domain modules (`src/core/model.js`, `src/core/state.js`, `src/core/navigator.js`) and ports (`src/ports/input.js`, `src/ports/output.js`).
- Implemented `tests/fixtures/deck-fixture.js` exporting:
  - `createMockDeck()`: returns fresh deep copy of the standard mock deck with 3 sections matching the specification:
    - Section 0: 2 pages (0 detours, 0 detours)
    - Section 1: 3 pages (0 detours, 2 detours, 0 detours)
    - Section 2: 1 page (0 detours)
  - `createMockSections()`: convenience helper returning only the sections array.
  - `MOCK_DECK_SPEC`: frozen metadata descriptor of expected section/page/detour counts.
- Created `tests/core/smoke.test.js` validating:
  - Clean syntax & importability of all core and port stubs.
  - Structural conformity and detour distribution of `createMockDeck()`.
  - Object independence across fixture invocations.
- Test outcome: `npm test` executed via Node.js native test runner (`node --test`), passing all 5 tests (0 failures, duration ~211ms).
- Zero external runtime or test dependencies introduced.

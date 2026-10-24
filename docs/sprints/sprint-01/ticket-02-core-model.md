# Ticket: T01-02 - Deck Topology Model & Validation

- **Status:** DONE
- **Sprint:** sprint-01
- **Target Layer:** Core
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/core/model.js` representing the immutable sparse presentation tree (`Section -> Page -> Detour Slides`) and querying methods for maximum bounds (`X_max(y)`, `Z_max(y, x)`).

## 2. Acceptance Criteria
- [x] Implement `createDeckTopology(sections)` validating valid array inputs and non-empty sections.
- [x] Implement helper methods:
  - `getYMax(topology)`: returns highest valid `y` index (`sections.length - 1`).
  - `getXMax(topology, y)`: returns highest valid `x` index for section `y`.
  - `getZMax(topology, y, x)`: returns detour count (`Z_max`) for `(y, x)` (0 if no detours).
  - `isValidCoordinate(topology, y, x, z)`: returns boolean confirming coordinate exists.
- [x] Zero dependencies, zero DOM/CSS references.
- [x] Unit tests in `tests/core/model.test.js` covering valid decks, single-page sections, out-of-bounds queries, and negative coordinate queries.

## 3. Worker Notes & Retro Feedback
- Implemented `src/core/model.js` with zero runtime dependencies and zero DOM/CSS/window references.
- `createDeckTopology(input)`:
  - Accepts both a sections array and a deck object `{ sections: [...] }`.
  - Thorough structural validation: ensures non-empty sections, each section having at least one page, detours are arrays if defined, and malformed inputs throw appropriate `TypeError` or `RangeError`.
  - Enforces deep immutability via deep cloning and recursive `Object.freeze` on topology root, sections, pages, and detours. Original input objects remain isolated from external post-init mutations.
- Bounds & coordinate queries:
  - `getYMax(topology)`: returns `sections.length - 1`, or -1 if invalid.
  - `getXMax(topology, y)`: returns max page index for section `y`, or -1 if out of bounds or non-integer.
  - `getZMax(topology, y, x)`: returns detour count for `(y, x)`, 0 if no detours, -1 if invalid coordinates.
  - `isValidCoordinate(topology, y, x, z)`: validates `z === 0` (main track) and `1 <= z <= Z_max` (detours), rejecting negative, non-integer, or out-of-bounds values.
  - Added ergonomic helpers: `getSection`, `getPage`, `getDetour` (1-indexed detour retrieval), `getSectionCount`, `getPageCount`, and `hasDetours`.
- Comprehensive test coverage in `tests/core/model.test.js`:
  - 35 test cases covering input validation, deep immutability, boundary calculations, negative/float coordinates, and ergonomic helpers.
  - Full test suite execution (`npm test`): 40 total tests passing (0 failures, 281ms duration).

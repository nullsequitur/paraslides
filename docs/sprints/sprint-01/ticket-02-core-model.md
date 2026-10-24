# Ticket: T01-02 - Deck Topology Model & Validation

- **Status:** TODO
- **Sprint:** sprint-01
- **Target Layer:** Core
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/core/model.js` representing the immutable sparse presentation tree (`Section -> Page -> Detour Slides`) and querying methods for maximum bounds (`X_max(y)`, `Z_max(y, x)`).

## 2. Acceptance Criteria
- [ ] Implement `createDeckTopology(sections)` validating valid array inputs and non-empty sections.
- [ ] Implement helper methods:
  - `getYMax(topology)`: returns highest valid `y` index (`sections.length - 1`).
  - `getXMax(topology, y)`: returns highest valid `x` index for section `y`.
  - `getZMax(topology, y, x)`: returns detour count (`Z_max`) for `(y, x)` (0 if no detours).
  - `isValidCoordinate(topology, y, x, z)`: returns boolean confirming coordinate exists.
- [ ] Zero dependencies, zero DOM/CSS references.
- [ ] Unit tests in `tests/core/model.test.js` covering valid decks, single-page sections, out-of-bounds queries, and negative coordinate queries.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

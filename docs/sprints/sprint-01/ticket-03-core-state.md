# Ticket: T01-03 - Coordinate State & Cursor Memory

- **Status:** TODO
- **Sprint:** sprint-01
- **Target Layer:** Core
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/core/state.js` representing the presentation's active navigation state, operating mode (`MAIN` vs. `DETOUR`), and persistent cursor memory arrays (`lastX[y]`, `lastZ[y][x]`) as specified in `docs/DOMAIN_SPEC.md`.

## 2. Acceptance Criteria
- [ ] Implement `createInitialState(topology)` initializing coordinates to `{ y: 0, x: 0, z: 0, mode: 'MAIN' }`.
- [ ] Initialize cursor memory:
  - `lastX`: array of length `Y_max + 1`, filled with `0`.
  - `lastZ`: 2D array matrix matching each `(y, x)` page, initialized with `1` (default starting detour index).
- [ ] Provide pure state clone / update helpers:
  - Updating `(y, x, z)` automatically derives `mode = (z === 0 ? 'MAIN' : 'DETOUR')`.
  - Section switch updates departing `lastX[oldY] = oldX`.
  - Detour navigation updates `lastZ[y][x] = z`.
- [ ] Unit tests in `tests/core/state.test.js` validating initial state generation and cursor memory tracking.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

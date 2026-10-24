# Ticket: T01-03 - Coordinate State & Cursor Memory

- **Status:** DONE
- **Sprint:** sprint-01
- **Target Layer:** Core
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/core/state.js` representing the presentation's active navigation state, operating mode (`MAIN` vs. `DETOUR`), and persistent cursor memory arrays (`lastX[y]`, `lastZ[y][x]`) as specified in `docs/DOMAIN_SPEC.md`.

## 2. Acceptance Criteria
- [x] Implement `createInitialState(topology)` initializing coordinates to `{ y: 0, x: 0, z: 0, mode: 'MAIN' }`.
- [x] Initialize cursor memory:
  - `lastX`: array of length `Y_max + 1`, filled with `0`.
  - `lastZ`: 2D array matrix matching each `(y, x)` page, initialized with `1` (default starting detour index).
- [x] Provide pure state clone / update helpers:
  - Updating `(y, x, z)` automatically derives `mode = (z === 0 ? 'MAIN' : 'DETOUR')`.
  - Section switch updates departing `lastX[oldY] = oldX`.
  - Detour navigation updates `lastZ[y][x] = z`.
- [x] Unit tests in `tests/core/state.test.js` validating initial state generation and cursor memory tracking.

## 3. Worker Notes & Retro Feedback
- Implemented `src/core/state.js` conforming strictly to Hexagonal boundaries (100% pure JS, zero dependencies, zero DOM/CSS/window references).
- `createInitialState(input)`:
  - Accepts a validated topology object, raw sections array, or deck tree object.
  - Initializes coordinates to `{ y: 0, x: 0, z: 0, mode: 'MAIN' }`.
  - Initializes `lastX` as array of size `Y_max + 1` filled with `0`.
  - Initializes `lastZ` as 2D array matrix `[Y_max + 1][X_max(y) + 1]` filled with `1`.
  - Guarantees deep immutability via `freezeState` (freezing state root, `lastX`, `lastZ`, and each `lastZ[y]` row).
- Mode Derivation & Helpers:
  - `deriveMode(z)` derives `MAIN` for `z === 0` and `DETOUR` for `z > 0`, throwing `TypeError` on negative or non-integer values.
  - `cloneState(state)` creates an independent, deeply frozen clone with decoupled memory arrays.
  - `updateCoordinates(state, coordsOrY, xOrTopology, z, maybeTopology)` (and `updateState` alias):
    - Updates coordinates while deriving new `mode`.
    - Enforces cursor memory rules:
      - Section change (`nextY !== oldY`): records departing section page `lastX[oldY] = oldX`.
      - Main track page navigation (`nextZ === 0`): records `lastX[nextY] = nextX`.
      - Detour track navigation (`nextZ > 0`): records `lastZ[nextY][nextX] = nextZ`.
      - Exiting detour (`nextZ === 0`): retains last visited `z` in `lastZ[y][x]`.
    - Validates coordinates and boundaries against `topology` if provided.
  - `resetDetourMemory(state, y, x)` resets `lastZ` back to 1 for a specific page or deck-wide.
  - `getLastX(state, y)` and `getLastZ(state, y, x)` provide ergonomic cursor memory readers.
- Comprehensive Unit Tests (`tests/core/state.test.js`):
  - 23 test cases in 6 test suites covering initial state generation, mode derivation, immutability, state cloning, cursor memory tracking (`lastX` and `lastZ`), detour memory resets, and boundary query getters.
  - Total test suite: 63 tests passing across 17 test suites (0 failures, duration ~285ms).

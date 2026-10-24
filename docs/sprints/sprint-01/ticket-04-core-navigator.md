# Ticket: T01-04 - Transition Matrix & Command Processor

- **Status:** DONE
- **Sprint:** sprint-01
- **Target Layer:** Core
- **Assigned Model Tier:** Gemini Flash (or Inherit)

## 1. Objective
Implement `src/core/navigator.js` providing the deterministic transition function `processCommand(topology, currentState, command)` executing all directional and mode commands from `docs/DOMAIN_SPEC.md`.

## 2. Acceptance Criteria
- [x] Implement commands:
  - `MOVE_RIGHT`: Increments `x` in `MAIN` mode; increments `z` in `DETOUR` mode up to `Z_max`.
  - `MOVE_LEFT`: Decrements `x` in `MAIN` mode down to `0`; decrements `z` in `DETOUR` mode down to `1`.
  - `MOVE_DOWN`: Increments `y` in `MAIN` mode, restoring `x = lastX[newY]`. In `DETOUR` mode: **strictly locked** (no coordinate change, emits vertical-lock flag).
  - `MOVE_UP`: Decrements `y` in `MAIN` mode, restoring `x = lastX[newY]`. In `DETOUR` mode: **strictly locked** (no coordinate change, emits vertical-lock flag).
  - `ENTER_DETOUR`: If `Z_max(y, x) > 0`, transitions to `DETOUR_MODE` with `z = lastZ[y][x]`. Else no-op.
  - `EXIT_DETOUR`: If in `DETOUR_MODE`, returns to `z = 0` at parent `(y, x)` in `MAIN_MODE`. Else no-op.
  - `JUMP_START` & `JUMP_END`: Jump to start/end of current axis (`x` in MAIN, `z` in DETOUR).
- [x] Outbound state payload generation:
  - Generates bounds and capabilities: `canMoveLeft`, `canMoveRight`, `canMoveUp`, `canMoveDown`, `hasDetour`, `detourCount`, `isVerticalLocked`.
- [x] Comprehensive unit tests in `tests/core/navigator.test.js` validating the full transition matrix, boundaries, and vertical lock invariant.

## 3. Worker Notes & Retro Feedback
- Implemented `src/core/navigator.js` strictly following hexagonal architecture and pure JS rules (zero external dependencies, zero DOM/CSS/window/document references).
- Exported command constants `COMMAND_MOVE_LEFT`, `COMMAND_MOVE_RIGHT`, `COMMAND_MOVE_UP`, `COMMAND_MOVE_DOWN`, `COMMAND_ENTER_DETOUR`, `COMMAND_EXIT_DETOUR`, `COMMAND_JUMP_START`, `COMMAND_JUMP_END`, and frozen dictionary `COMMANDS`.
- Implemented `computeCapabilities(topology, state)` adhering strictly to `DOMAIN_SPEC.md` section 5.
- Implemented `buildStatePayload(topology, state, feedback)` generating frozen outbound snapshots with merged and nested capabilities, coordinates, and transient feedback flags.
- Implemented `processCommand(topology, currentState, command)` handling both string commands and `{ type: string }` command objects:
  - Preserves referential equality `nextState === currentState` on no-op boundary hits.
  - Enforces strict vertical axis lock in `DETOUR` mode, emitting `verticalLockedAttempt: true` in feedback and state payload without coordinate mutations.
  - Correctly restores `x = lastX[newY]` when switching sections across `MOVE_DOWN` / `MOVE_UP`.
  - Correctly remembers and restores `lastZ[y][x]` on `ENTER_DETOUR` re-entry.
- Added comprehensive unit test suite in `tests/core/navigator.test.js` with 25 test cases.
- All test suites passing 100% (94 passing tests across 4 test suites).

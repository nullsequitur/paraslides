# Ticket: T01-04 - Transition Matrix & Command Processor

- **Status:** TODO
- **Sprint:** sprint-01
- **Target Layer:** Core
- **Assigned Model Tier:** Gemini Flash (or Inherit)

## 1. Objective
Implement `src/core/navigator.js` providing the deterministic transition function `processCommand(topology, currentState, command)` executing all directional and mode commands from `docs/DOMAIN_SPEC.md`.

## 2. Acceptance Criteria
- [ ] Implement commands:
  - `MOVE_RIGHT`: Increments `x` in `MAIN` mode; increments `z` in `DETOUR` mode up to `Z_max`.
  - `MOVE_LEFT`: Decrements `x` in `MAIN` mode down to `0`; decrements `z` in `DETOUR` mode down to `1`.
  - `MOVE_DOWN`: Increments `y` in `MAIN` mode, restoring `x = lastX[newY]`. In `DETOUR` mode: **strictly locked** (no coordinate change, emits vertical-lock flag).
  - `MOVE_UP`: Decrements `y` in `MAIN` mode, restoring `x = lastX[newY]`. In `DETOUR` mode: **strictly locked** (no coordinate change, emits vertical-lock flag).
  - `ENTER_DETOUR`: If `Z_max(y, x) > 0`, transitions to `DETOUR_MODE` with `z = lastZ[y][x]`. Else no-op.
  - `EXIT_DETOUR`: If in `DETOUR_MODE`, returns to `z = 0` at parent `(y, x)` in `MAIN_MODE`. Else no-op.
  - `JUMP_START` & `JUMP_END`: Jump to start/end of current axis (`x` in MAIN, `z` in DETOUR).
- [ ] Outbound state payload generation:
  - Generates bounds and capabilities: `canMoveLeft`, `canMoveRight`, `canMoveUp`, `canMoveDown`, `hasDetour`, `detourCount`, `isVerticalLocked`.
- [ ] Comprehensive unit tests in `tests/core/navigator.test.js` validating the full transition matrix, boundaries, and vertical lock invariant.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

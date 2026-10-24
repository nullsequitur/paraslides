# Ticket: T01-05 - Inbound & Outbound Hexagonal Ports

- **Status:** DONE
- **Sprint:** sprint-01
- **Target Layer:** Ports
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/ports/input.js` (Inbound Port driving the Core) and `src/ports/output.js` (Outbound Port driven by the Core) to isolate the Core state machine from DOM and keyboard listeners.

## 2. Acceptance Criteria
- [x] Implement `createCommandDispatcher(topology, initialState)` in `src/ports/input.js`:
  - Exposes `dispatch(commandIntent)` translating string/symbol intents into `navigator.js` transitions.
  - Exposes `subscribe(listener)` to notify Outbound listeners of every state emission.
  - Exposes `getState()` to retrieve the current state snapshot synchronously.
- [x] Implement `src/ports/output.js` defining standard subscriber callback contracts and validation for state payload conformity.
- [x] Unit tests in `tests/ports/dispatcher.test.js` validating command dispatch, subscriber notification sequence, and immutable state snapshots.

## 3. Worker Notes & Retro Feedback
- **Inbound Command Dispatcher (`src/ports/input.js`):**
  - Implemented `createCommandDispatcher(topology, initialState = null)` satisfying hexagonal architecture constraints (zero DOM/window/document references).
  - Maintains internal presentation state and automatically binds default origin `(0, 0, 0)` via `createInitialState` when `initialState` is omitted. Also accepts and validates pre-configured custom initial states.
  - Exposes `dispatch(command)`, routing abstract navigation intents directly through `navigator.processCommand`. State is updated deterministically and all subscribers are notified synchronously. Returns `{ state, payload, feedback }`.
  - Exposes `subscribe(listener)`, registering outbound callbacks and immediately executing initial hydration with current state payload and metadata `{ state, payload, previousPayload: null, command: null, ...payload }`. Returns an unsubscribe function.
  - Exposes synchronous getters: `getState()`, `getPayload()`, and `getTopology()`.

- **Outbound State Broadcast Port (`src/ports/output.js`):**
  - Defined JSDoc contracts for `StatePayload`, `StateChangeEvent`, `StateSubscriber`, and `UnsubscribeFunction`.
  - Implemented schema and invariant validation:
    - `isValidStatePayload(payload)`: Boolean query validating coordinate integrity (`y`, `x`, `z`), mode consistency (`MAIN` vs. `DETOUR`), navigation capability booleans, `detourCount`/`hasDetour` agreement, and vertical lock state.
    - `assertValidStatePayload(payload)`: Throws descriptive `TypeError` on schema or invariant failure.
    - `validateStatePayload(payload, optionsOrThrows)`: Maintained for backward compatibility with initial test stubs.
  - Implemented `createSubscriberRegistry()` to encapsulate safe subscriber registration, listener snapshot iteration during dispatch, and unregistration.

- **Verification & Test Suite (`tests/ports/dispatcher.test.js`):**
  - Added 27 unit tests in `tests/ports/dispatcher.test.js` covering:
    - Schema validation, edge cases, and invalid payload rejection.
    - Dispatcher initialization, default origin, and custom initial states.
    - Command dispatching across MAIN and DETOUR modes, memory preservation (`lastX`), and vertical lock feedback.
    - Immediate subscriber hydration, multi-subscriber ordering, self-unsubscribing listeners, and idempotent unsubscribe calls.
    - Error handling for invalid topologies, malformed initial states, non-function listeners, and unrecognized navigation commands.
    - Payload conformity across continuous multi-step navigation sequences.
  - Full test suite passes cleanly with 121 tests across 31 suites (100% pass rate, zero failures or skips).

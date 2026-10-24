# Ticket: T01-05 - Inbound & Outbound Hexagonal Ports

- **Status:** TODO
- **Sprint:** sprint-01
- **Target Layer:** Ports
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/ports/input.js` (Inbound Port driving the Core) and `src/ports/output.js` (Outbound Port driven by the Core) to isolate the Core state machine from DOM and keyboard listeners.

## 2. Acceptance Criteria
- [ ] Implement `createCommandDispatcher(topology, initialState)` in `src/ports/input.js`:
  - Exposes `dispatch(commandIntent)` translating string/symbol intents into `navigator.js` transitions.
  - Exposes `subscribe(listener)` to notify Outbound listeners of every state emission.
  - Exposes `getState()` to retrieve the current state snapshot synchronously.
- [ ] Implement `src/ports/output.js` defining standard subscriber callback contracts and validation for state payload conformity.
- [ ] Unit tests in `tests/ports/dispatcher.test.js` validating command dispatch, subscriber notification sequence, and immutable state snapshots.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

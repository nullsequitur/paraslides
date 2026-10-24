# Sprint 01: Core Domain & Ports (Phase 1 MVP - Part 1)

## 1. Goal
Implement the pure, zero-dependency **Core Presentation Engine** and the **Hexagonal Port Interfaces** according to `docs/ARCHITECTURE.md` and `docs/DOMAIN_SPEC.md`.

## 2. Invariants
- 100% pure JavaScript in `src/core/` (zero DOM, zero CSS, zero window/document references).
- 100% unit test coverage for state transitions, coordinate math, and vertical locking in `DETOUR_MODE`.
- Serial execution across tickets to guarantee state machine determinism.

## 3. Ticket Index
- [x] **[ticket-01-scaffold.md](./ticket-01-scaffold.md)**: Project file skeleton, shared test fixture factory, and test harness.
- [ ] **[ticket-02-core-model.md](./ticket-02-core-model.md)**: DeckTopology data structure, bounds validation, and empty-check guards.
- [ ] **[ticket-03-core-state.md](./ticket-03-core-state.md)**: State model and cursor memory arrays (`lastX[y]`, `lastZ[y][x]`).
- [ ] **[ticket-04-core-navigator.md](./ticket-04-core-navigator.md)**: Deterministic command processor, transition matrix, and locked axes.
- [ ] **[ticket-05-ports.md](./ticket-05-ports.md)**: Inbound NavigationCommandPort & Outbound StateSubscriberPort interfaces.

## 4. Retrospective & Gate
- **Status:** READY
- **Evaluator:** Gemini Flash Medium (Main Orchestrator)
- **Escalation Trigger:**
  - Clean & 100% tests &rarr; Proceed directly to Sprint 02 (Adapters & HTML Presentation).
  - Partial debt notes &rarr; Gemini Flash High retro review (`docs/sprints/sprint-01/retro.md`).
  - Test failures / Blocked &rarr; Sonnet strategic triage.
  - Breaking core redesign &rarr; Prompt user for Opus approval.

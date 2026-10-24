# Sprint 02: Adapters & Minimal HTML Presentation (Phase 1 MVP - Part 2)

## 1. Goal
Wire the pure Core Domain and Ports to browser adapters: HTML DOM Loader, Vim Keyboard listener, CSS Viewport Renderer, minimal HUD radar, and standalone `index.html` presentation demo according to `docs/ARCHITECTURE.md`, `docs/HTML_SCHEMA.md`, and `docs/ROADMAP.md`.

## 2. Invariants
- Zero external runtime dependencies: runs natively in any standard modern browser.
- Strict Hexagonal isolation: `src/core/` remains untouched and 100% pure. Adapters interact exclusively through ports.
- Semantic HTML schema: exactly conforms to `docs/HTML_SCHEMA.md`.
- Comprehensive automated test coverage for all adapters.

## 3. Ticket Index
- [ ] **[ticket-01-dom-loader.md](./ticket-01-dom-loader.md)**: HTML DOM Loader adapter (`src/adapters/parsers/dom-loader.js`).
- [ ] **[ticket-02-keyboard-adapter.md](./ticket-02-keyboard-adapter.md)**: Vim & Arrow key input adapter (`src/adapters/input/vim-keys.js`).
- [ ] **[ticket-03-viewport-renderer.md](./ticket-03-viewport-renderer.md)**: CSS Viewport Renderer outbound adapter (`src/adapters/render/viewport.js`).
- [ ] **[ticket-04-hud-renderer.md](./ticket-04-hud-renderer.md)**: Minimal HUD & Radar indicator adapter (`src/adapters/render/hud.js`).
- [ ] **[ticket-05-standalone-demo.md](./ticket-05-standalone-demo.md)**: Standalone `index.html` presentation and end-to-end integration test.

## 4. Retrospective & Gate
- **Status:** READY
- **Evaluator:** Gemini Flash Medium (Main Orchestrator)
- **Escalation Trigger:**
  - Clean & 100% tests -> Phase 1 Complete (Level 0).
  - Partial debt notes -> Gemini Flash High retro review (`docs/sprints/sprint-02/retro.md`).
  - Test failures / Blocked -> Sonnet strategic triage.
  - Breaking core redesign -> Prompt user for Opus approval.

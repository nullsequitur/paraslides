# Sprint 06: Presenter Tools (Fullscreen Cursor Auto-Hide, Glowing Laser Spotlight, Ephemeral Fading Telestrator & Declarative Config)

## 1. Goal
Implement Epic 06 Presenter Tools according to `docs/ARCHITECTURE.md`, `docs/HTML_SCHEMA.md`, and `docs/ROADMAP.md`:
1. Declarative configuration system (`src/core/config.js` and `src/adapters/parsers/config-loader.js`) supporting declarative JSON script tags, HTML dataset attributes, and normalized domain options.
2. Core presenter commands (`COMMAND_TOGGLE_LASER`, `COMMAND_TOGGLE_TELESTRATOR`, `COMMAND_CLEAR_TELESTRATOR`) and keyboard input bindings (<kbd>p</kbd>, <kbd>t</kbd>, <kbd>c</kbd>) in `src/core/navigator.js` and `src/adapters/input/vim-keys.js`.
3. Outbound Fullscreen Cursor Auto-Hide adapter (`src/adapters/render/cursor-auto-hide.js`) with inactivity debouncing, immediate unhide on movement, and fullscreen awareness.
4. Outbound Glowing Laser Spotlight adapter (`src/adapters/render/laser-pointer.js`) with smooth 60fps tracking, configurable radius, glow halo, and presentation accent synchronization.
5. Outbound Ephemeral Fading Telestrator adapter (`src/adapters/render/telestrator.js`) using zero-dependency HTML5 Canvas with quadratic bezier stroke smoothing, theme-accent colors, immediate clear, and smooth timestamp-based opacity decay.
6. Interactive showcase deck in `index.html`, comprehensive automated test coverage, and documentation updates in `README.md`, `docs/HTML_SCHEMA.md`, and `docs/ROADMAP.md`.

## 2. Invariants
- Zero external runtime dependencies: all features must run natively in standard modern browsers.
- Strict Hexagonal isolation: `src/core/` remains 100% pure JavaScript with zero DOM, CSS, or `window` references.
- Test-First Core & Adapter Verification: comprehensive unit tests for every ticket with 100% test pass rate.
- Granular, atomic git commits conforming to Conventional Commits: one commit per completed ticket immediately after tests pass.
- Continuous documentation: update `README.md` and specification documents in tandem with features.

## 3. Ticket Index
- [x] **[ticket-01-declarative-config.md](./ticket-01-declarative-config.md)**: [T06-01] Declarative configuration schema, validation, and DOM loader (`src/core/config.js`, `src/adapters/parsers/config-loader.js`).
- [x] **[ticket-02-presenter-commands.md](./ticket-02-presenter-commands.md)**: [T06-02] Core presenter commands, feedback payloads, and vim keybindings (`src/core/navigator.js`, `src/adapters/input/vim-keys.js`).
- [x] **[ticket-03-cursor-autohide.md](./ticket-03-cursor-autohide.md)**: [T06-03] Fullscreen cursor auto-hide adapter with inactivity debouncing (`src/adapters/render/cursor-auto-hide.js`).
- [x] **[ticket-04-laser-pointer.md](./ticket-04-laser-pointer.md)**: [T06-04] Glowing laser spotlight adapter with tracking & theme sync (`src/adapters/render/laser-pointer.js`).
- [ ] **[ticket-05-telestrator.md](./ticket-05-telestrator.md)**: [T06-05] Ephemeral fading canvas telestrator adapter with quadratic smoothing & decay loop (`src/adapters/render/telestrator.js`).
- [ ] **[ticket-06-demo-and-docs.md](./ticket-06-demo-and-docs.md)**: [T06-06] Interactive showcase deck in `index.html`, continuous documentation & integration verification.

## 4. Retrospective & Gate
- **Status:** IN_PROGRESS
- **Evaluator:** Main Orchestrator (Level 0 - Clean Sprint target)
- **Escalation Trigger:**
  - Clean & 100% tests passing -> Level 0 (Sprint Complete).
  - Partial debt notes -> Gemini Flash High retro review.
  - Test failures / Blocked -> Sonnet strategic triage.
  - Breaking core redesign -> Prompt user for Opus approval.

# Sprint 05: Vim Document Metaphor & QA Stabilization

## 1. Goal
Implement the recommendations from the end-to-end QA session (`docs/qa/qa-session-report.md`):
1. Migrate the Core Domain navigation state to the **Vim Document Metaphor** (Section = Row, Page = Column, sticky `desiredX` column, sticky `$`, continuous section wrap, and `NEXT_SLIDE` linear forward command).
2. Implement standard Vim numeric count prefixes (`[count]h/l/j/k`, `[count]gg/G`), dedicated `m` menu toggle, and `Space`/`Enter` linear slide progression.
3. Tone down 3D detour transitions to mild depth shifts, implement horizontal slide scrubbing in detour mode, and remove the colliding slide-level orange dot.
4. Redesign the HUD to fixed dimensions with `Col x/X · Row y/Y` and `Col x/X · Dep z/Z` readouts, morphing `[i]`/`[o]` indicator button, and section wrapping radar cues.
5. Enhance Overview Menu (`m`) with strict Vim grid movement, `Enter`/`Space` selection, and `m`/`Esc` cancellation.
6. Expand `index.html` into an interactive tutorial and rich presentation demo.

## 2. Invariants
- Zero external runtime dependencies: runs natively in any standard modern browser.
- Strict Hexagonal isolation: `src/core/` remains untouched by DOM or CSS, with 100% pure JS state transitions.
- All core state logic thoroughly unit tested with 100% pass rate.
- Granular, atomic git commits per completed ticket conforming to Conventional Commits.

## 3. Ticket Index
- [x] **[ticket-01-core-vim-navigation.md](./ticket-01-core-vim-navigation.md)**: [T05-01] Core sticky column (`desiredX`), continuous section wrap, and `NEXT_SLIDE` command (`src/core/`).
- [x] **[ticket-02-keyboard-counts.md](./ticket-02-keyboard-counts.md)**: [T05-02] Keyboard count buffer, `gg`/`G` row jumping, and `Space`/`Enter` linear flow (`src/adapters/input/vim-keys.js`).
- [x] **[ticket-03-viewport-animations.md](./ticket-03-viewport-animations.md)**: [T05-03] Viewport mild 3D depth shift, horizontal detour slide scrubbing, and blob removal (`src/adapters/render/viewport.js`).
- [x] **[ticket-04-hud-overhaul.md](./ticket-04-hud-overhaul.md)**: [T05-04] HUD fixed dimensions, `Col/Row/Dep` coordinates, morphing `[i]`/`[o]` slot, and wrapping radar cues (`src/adapters/render/hud.js`).
- [x] **[ticket-05-overview-menu.md](./ticket-05-overview-menu.md)**: [T05-05] Overview menu dedicated key `m`, strict Vim navigation, and `Enter`/`Space` selection (`src/adapters/render/map-mode.js`).
- [x] **[ticket-06-expanded-demo-deck.md](./ticket-06-expanded-demo-deck.md)**: [T05-06] Interactive documentation and feature showcase deck in `index.html`.

## 4. Retrospective & Gate
- **Status:** COMPLETED
- **Evaluator:** Main Orchestrator (Level 0 - Clean Sprint, 100% test pass rate)
- **Escalation Trigger:**
  - Clean & 100% tests passing -> Level 0 (Sprint Complete).
  - Partial debt notes -> Gemini Flash High retro review.
  - Test failures / Blocked -> Sonnet strategic triage.
  - Breaking core redesign -> Prompt user for Opus approval.

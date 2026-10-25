# Ticket: T06-06 - Interactive Showcase Deck, Continuous Docs & E2E Verification

- **Status:** TODO
- **Sprint:** Sprint 06
- **Target Layer:** Presentation, Documentation & E2E Tests (`index.html`, `README.md`, `docs/HTML_SCHEMA.md`, `docs/ROADMAP.md`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Complete Epic 06 integration by wiring all presenter tools into the interactive presentation demo and updating documentation across the repository:
1. `index.html`:
   - Include declarative `<script type="application/json" id="paraslides-config">` block showcasing configuration capabilities.
   - Wire `loadConfigFromDOM`, `attachCursorAutoHide`, `attachLaserPointer`, and `attachTelestrator` in script initialization.
   - Add an interactive showcase slide dedicated to Presenter Tools explaining:
     - Inactivity cursor auto-hide (<kbd>f</kbd> + pause mouse)
     - Glowing laser spotlight (<kbd>p</kbd>)
     - Ephemeral fading telestrator (<kbd>t</kbd> to draw, <kbd>c</kbd> to clear, watch strokes fade)
     - Declarative config customization
2. Documentation:
   - `README.md`: Update keyboard shortcuts table (<kbd>p</kbd>, <kbd>t</kbd>, <kbd>c</kbd>), presenter tools guide, and declarative config JSON schema.
   - `docs/HTML_SCHEMA.md`: Document presenter tool DOM elements (`#laser-spotlight`, `#telestrator-canvas`), CSS custom properties, and declarative config script contract.
   - `docs/ROADMAP.md`: Update roadmap deliverables for Phase 2 / Epic 06.
3. Verification:
   - End-to-end integration tests verifying presenter tools initialization and interaction lifecycle.
   - Run `npm test` to ensure 100% test pass rate across the entire test suite.

## 2. Acceptance Criteria
- [ ] `index.html` showcases all presenter tools with interactive instructional slides.
- [ ] Declarative config loaded and passed to all presenter adapters in `index.html`.
- [ ] `README.md` updated with presenter tools documentation and shortcut reference.
- [ ] `docs/HTML_SCHEMA.md` and `docs/ROADMAP.md` updated without documentation drift.
- [ ] All unit and integration tests passing with 100% pass rate.
- [ ] Zero external runtime dependencies preserved.

## 3. Worker Notes & Retro Feedback
[Populated upon completion]

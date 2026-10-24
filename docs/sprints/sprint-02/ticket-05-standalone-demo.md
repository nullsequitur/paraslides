# Ticket: T02-05 - Standalone Presentation Entrypoint & End-to-End Demo

- **Status:** TODO
- **Sprint:** sprint-02
- **Target Layer:** Presentation / Demo
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Assemble the complete zero-dependency, browser-native presentation in `index.html` and write integration smoke tests verifying that DOM Loader, Dispatcher, Viewport, HUD, and Keyboard adapters function end-to-end.

## 2. Acceptance Criteria
- [ ] Implement `index.html`:
  - Fully runnable directly via file URI or simple web server in any modern browser with zero build steps or external CDNs.
  - Semantic `#deck` HTML schema with at least 3 sections, multiple pages per section, and attached multi-slide detours.
  - Complete, polished CSS styles implementing:
    - 3D spatial translations/perspectives.
    - Two-state theme variables (`--bg-main`, `--fg-main`, `--accent-main` vs. `--bg-detour`, `--fg-detour`, `--accent-detour`).
    - Active slide positioning and detour badge styling.
    - Minimal floating HUD styling.
  - Standard ES module script initializing the presentation:
    `const { topology, slideMap } = loadDeckFromDOM(document.getElementById('deck'));`
    `const dispatcher = createCommandDispatcher(topology);`
    `attachViewportRenderer(dispatcher, document.getElementById('deck'), { slideMap });`
    `attachHudRenderer(dispatcher, document.getElementById('hud'));`
    `attachKeyboardAdapter(dispatcher, window);`
- [ ] End-to-end integration test in `tests/integration/presentation.test.js`:
  - Simulates DOM load -> dispatch commands -> verifies state changes, active slide updates, and HUD readout updates end-to-end.
- [ ] All test suites (`npm test`) pass cleanly.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

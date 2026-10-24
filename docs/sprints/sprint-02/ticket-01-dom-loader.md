# Ticket: T02-01 - HTML DOM Loader Adapter

- **Status:** TODO
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Parsers
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/parsers/dom-loader.js` that parses a semantic `#deck` HTML element (or document container) into a validated `DeckTopology` and creates a spatial coordinate lookup table to DOM elements.

## 2. Acceptance Criteria
- [ ] Parse `<section class="deck-section">` children sequentially as `y = 0, 1, ... Y_max`.
- [ ] Parse `<div class="deck-page">` children within each section sequentially as `x = 0, 1, ... X_max(y)`.
- [ ] For each page:
  - First `<article class="slide">` maps to `z = 0` (Main Track).
  - Any subsequent `<article class="slide">` (or `.slide-detour`) siblings map to `z = 1, 2, ... Z_max(y, x)` (Detour Track).
- [ ] Returns `{ topology, slideMap }` where:
  - `topology` is created via `createDeckTopology` from `src/core/model.js`.
  - `slideMap` provides an efficient lookup helper or mapping `getSlideElement(y, x, z)` returning the corresponding DOM element.
- [ ] Handles titles/metadata: extracts `data-section-title` from sections, headings from slides, etc.
- [ ] Zero external dependencies; works with standard browser DOM (`Element`, `Document`) and testable via mock DOM tree or standard DOM API.
- [ ] Unit tests in `tests/adapters/dom-loader.test.js` validating valid decks, single-page sections, pages with and without detours, and error handling for missing/empty decks.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

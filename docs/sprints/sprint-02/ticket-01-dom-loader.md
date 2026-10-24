# Ticket: T02-01 - HTML DOM Loader Adapter

- **Status:** DONE
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Parsers
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/parsers/dom-loader.js` that parses a semantic `#deck` HTML element (or document container) into a validated `DeckTopology` and creates a spatial coordinate lookup table to DOM elements.

## 2. Acceptance Criteria
- [x] Parse `<section class="deck-section">` children sequentially as `y = 0, 1, ... Y_max`.
- [x] Parse `<div class="deck-page">` children within each section sequentially as `x = 0, 1, ... X_max(y)`.
- [x] For each page:
  - First `<article class="slide">` maps to `z = 0` (Main Track).
  - Any subsequent `<article class="slide">` (or `.slide-detour`) siblings map to `z = 1, 2, ... Z_max(y, x)` (Detour Track).
- [x] Returns `{ topology, slideMap }` where:
  - `topology` is created via `createDeckTopology` from `src/core/model.js`.
  - `slideMap` provides an efficient lookup helper or mapping `getSlideElement(y, x, z)` returning the corresponding DOM element.
- [x] Handles titles/metadata: extracts `data-section-title` from sections, headings from slides, etc.
- [x] Zero external dependencies; works with standard browser DOM (`Element`, `Document`) and testable via mock DOM tree or standard DOM API.
- [x] Unit tests in `tests/adapters/dom-loader.test.js` validating valid decks, single-page sections, pages with and without detours, and error handling for missing/empty decks.

## 3. Worker Notes & Retro Feedback
- Implemented `src/adapters/parsers/dom-loader.js`:
  - Resolves root element from Element, Document, or CSS selector string `#deck` (or falls back to global document).
  - Sequentially parses `.deck-section` elements into sections (`y`), `.deck-page` elements into pages (`x`), and slide articles into Main (`z = 0`) and Detours (`z = 1..Z_max`).
  - Automatically annotates DOM elements with spatial coordinates: `data-y`, `data-x`, `data-z`, `data-track` (`main` | `detour`), and marks parent main slides with `data-has-detour="true"` and CSS class `has-detour` when detour slides exist.
  - Generates immutable Deck Topology via pure Core Domain `createDeckTopology`.
  - Constructs `slideMap` lookup helper exposing:
    - `getSlide(y, x, z = 0)` / `getSlideElement(y, x, z = 0)`
    - `getSection(y)` and `getPage(y, x)`
    - `getAllSlides()` returning slide descriptor metadata records
    - `getAllSlideElements()` returning direct array of DOM elements
    - `has(y, x, z = 0)` and `size` getter
    - `[Symbol.iterator]` for ergonomic `for (const slide of slideMap)` iteration
  - Robust metadata extraction: prioritizes `data-*-title` attributes, checks internal `<h1..h6>` headings, and provides intuitive fallbacks.
  - Strict error handling rejecting missing/invalid roots, empty decks, empty sections, and empty pages.
- Created lightweight DOM testing fixture in `tests/fixtures/mock-dom.js` supporting standard selector queries, attribute reflection, and classList manipulations with zero dependencies.
- Added comprehensive unit tests in `tests/adapters/dom-loader.test.js` (20 tests covering 3-section deck with detours, single-page decks, metadata extractors, container/document resolution, error cases, and integration with command dispatcher).
- All 141 tests in the project pass cleanly.

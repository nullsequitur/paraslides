# Ticket: T04-02 - Markdown Inbound Adapter

- **Status:** DONE
- **Sprint:** Sprint 04
- **Target Layer:** Adapters (Parsers)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement `src/adapters/parsers/markdown.js` to parse paraslides-formatted Markdown text into:
1. `parseMarkdownToTopology(markdownText, options)`: Returns an immutable `DeckTopology` conforming to `src/core/model.js`.
2. `parseMarkdownToHTML(markdownText, options)`: Returns a semantic HTML string conforming to `docs/HTML_SCHEMA.md` (`<main id="deck">...`).
3. Support custom delimiters:
   - `# Section Title`: Splits sections (`y`).
   - `---`: Splits pages (`x`).
   - `+++`: Splits detour slides (`z > 0`).
   - `## Slide Title`: Slide title within a page or detour.
4. Support slide metadata (titles, data attributes) and basic inline markdown formatting (bold, italic, code, links).

## 2. Acceptance Criteria
- [x] Correctly builds 3-axis sparse topology from multi-section, multi-page, multi-detour Markdown text.
- [x] Generates valid HTML matching `docs/HTML_SCHEMA.md` with appropriate classes (`deck-section`, `deck-page`, `slide-main`, `slide-detour`, `has-detour`).
- [x] Handles edge cases (empty sections, whitespace-only delimiters, missing slide headings).
- [x] Full unit test coverage in `tests/adapters/markdown.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented `parseMarkdownToTopology`, `parseMarkdownToHTML`, and `serializeTopologyToMarkdown` in `src/adapters/parsers/markdown.js`.
- Implemented lightweight block and inline markdown renderers (`renderInlineMarkdown`, `renderSlideBodyHTML`).
- Created unit tests in `tests/adapters/markdown.test.js` validating multi-axis parsing, HTML generation, and round-trip serialization. Zero external dependencies.


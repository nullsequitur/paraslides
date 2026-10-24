# Ticket: T04-03 - Math Rendering Adapter

- **Status:** DONE
- **Sprint:** Sprint 04
- **Target Layer:** Adapters (Parsers)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement `src/adapters/parsers/math.js` for lightweight LaTeX math rendering integration:
1. `renderMathInText(text, options)`: Detects inline (`$...$`) and display (`$$...$$`) math blocks and renders them using a pluggable renderer or fallback HTML wrappers (`<span class="math-inline" data-latex="...">`, `<div class="math-display" data-latex="...">`).
2. Pluggable renderer support: allows binding to KaTeX (`window.katex` or passed renderer) or MathJax.
3. Preserves raw LaTeX equations unaltered when raw export is required.

## 2. Acceptance Criteria
- [x] Correctly identifies `$math$` without false positive matching on escaped currency or multiline anomalies.
- [x] Correctly identifies `$$display math$$`.
- [x] Supports custom renderer function `(latex, { displayMode }) => string`.
- [x] Safe fallback rendering with data attributes when no third-party math library is loaded.
- [x] Full unit test coverage in `tests/adapters/math.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented `extractMath`, `defaultMathRenderer`, `renderMathInText`, and `attachMathToDOM` in `src/adapters/parsers/math.js`.
- Supports pluggable custom renderers, auto-detects `globalThis.katex`, and defaults to accessible HTML `<span class="math-inline">` and `<div class="math-display">`.
- Unit tests implemented in `tests/adapters/math.test.js` passing 100%.


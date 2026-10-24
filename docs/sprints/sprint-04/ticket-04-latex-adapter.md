# Ticket: T04-04 - Bidirectional LaTeX Beamer Adapter

- **Status:** DONE
- **Sprint:** Sprint 04
- **Target Layer:** Adapters (Parsers & Exporters)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement `src/adapters/parsers/latex.js` providing bidirectional translation between LaTeX Beamer and paraslides:
1. `parseLatexToTopology(latexText, options)`: Parses Beamer source into an immutable `DeckTopology`.
   - `\section{Title}` &rarr; Section (`y`)
   - `\begin{frame}{Title} ... \end{frame}` &rarr; Page (`x`, `z = 0`)
   - `\begin{depthframe}{Title} ... \end{depthframe}` &rarr; Detour slide attached to preceding page (`z >= 1`).
2. `parseLatexToHTML(latexText, options)`: Generates semantic HTML matching `docs/HTML_SCHEMA.md`.
3. `serializeTopologyToLatex(topology, options)`: Serializes `DeckTopology` into valid, standalone compilable LaTeX Beamer `.tex` document.
   - Preamble includes `\documentclass{beamer}` and `\newenvironment{depthframe}[1]{\begin{frame}{#1}}{\end{frame}}` for standard PDF compiler compatibility.
4. Preserves raw math environments (`equation`, `align`, `$...$`, `$$...$$`).

## 2. Acceptance Criteria
- [x] Correctly parses `\section`, `\begin{frame}`, and `\begin{depthframe}` environments.
- [x] Generates valid Beamer `.tex` source from `DeckTopology` including preamble macro definitions.
- [x] Bidirectional round-trip fidelity: parsing output and re-serializing preserves section/page/detour structure.
- [x] Full unit test coverage in `tests/adapters/latex.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented `parseLatexToTopology`, `parseLatexToHTML`, and `serializeTopologyToLatex` in `src/adapters/parsers/latex.js`.
- Implemented `stripLatexComments` and `renderLatexBodyHTML` formatting handlers.
- Auto-registered `'latex'` and `'beamer'` with `getDefaultSerializerRegistry()` from `src/ports/serialization.js`.
- Added unit tests in `tests/adapters/latex.test.js` validating syntax parsing, HTML generation, and round-trip fidelity. Zero external dependencies.


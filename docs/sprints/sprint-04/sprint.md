# Sprint 04: Phase 3 - Modular Format Translators (Markdown & LaTeX Beamer)

## 1. Goal
Implement Phase 3 of paraslides according to `docs/ROADMAP.md` and `docs/ARCHITECTURE.md`:
1. `SerializationPort` & Serializer Registry (`src/ports/serialization.js`) defining outbound export contracts for internal deck topologies.
2. Markdown Inbound Adapter (`src/adapters/parsers/markdown.js`) supporting 3-axis delimiters (`# Section`, `---` Page, `+++` Detour) compiling directly to `DeckTopology` and semantic HTML DOM strings.
3. Math Rendering Integration (`src/adapters/parsers/math.js`) with KaTeX/MathJax pluggability for inline (`$`) and display (`$$`) equations.
4. Bidirectional LaTeX Beamer Adapter (`src/adapters/parsers/latex.js`) with `.tex` parsing (`\section`, `\begin{frame}`, `\begin{depthframe}`) and Beamer `.tex` export serialization.
5. Automated test suites across all new modules and live demo format loading.

## 2. Invariants
- Zero external runtime dependencies: parsers run cleanly in standard modern browsers and Node.js without requiring heavy third-party build tools.
- Strict Hexagonal isolation: `src/core/` remains untouched and 100% pure JavaScript. All parsing and translation logic resides in `src/adapters/parsers/`.
- Bidirectional round-trip fidelity: topologies parsed from Beamer or Markdown can be serialized to Beamer `.tex` or HTML schema without loss of structural hierarchy.
- 100% test pass rate across all new unit and integration suites.

## 3. Ticket Index
- [x] **[ticket-01-serialization-port.md](./ticket-01-serialization-port.md)**: SerializationPort outbound contract & serializer registry (`src/ports/serialization.js`).
- [x] **[ticket-02-markdown-adapter.md](./ticket-02-markdown-adapter.md)**: Markdown Inbound Adapter (`src/adapters/parsers/markdown.js`).
- [x] **[ticket-03-math-adapter.md](./ticket-03-math-adapter.md)**: Math rendering adapter (`src/adapters/parsers/math.js`).
- [x] **[ticket-04-latex-adapter.md](./ticket-04-latex-adapter.md)**: Bidirectional LaTeX Beamer adapter (`src/adapters/parsers/latex.js`).
- [x] **[ticket-05-integration-tests.md](./ticket-05-integration-tests.md)**: Integration testing and format demo integration.

## 4. Retrospective & Gate
- **Status:** COMPLETED (Clean Sprint - Level 0 - Phase 3 Complete)
- **Evaluator:** Main Orchestrator (Gemini Flash Medium)
- **Test Results:** 284 / 284 tests passing (100% pass rate) across 96 test suites. 0 failures.
- **Escalation Trigger:** Level 0 (Clean & 100% tests passing -> Phase 3 complete).


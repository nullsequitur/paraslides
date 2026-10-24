# paraslides: Development Roadmap & Feature Phases

## Guiding Development Principle

Build and verify the **Core Domain** and **Minimal HTML Engine (Phase 1)**
completely before introducing external format compilers or advanced UI adapters.
Each phase must leave the repository in a working, testable state.

---

## Phase 1: Core Engine & Minimal HTML Prototype (v0.1 — Current Focus)

**Goal:** A working, zero-dependency HTML presentation engine implementing the
3-axis coordinate model, cursor memory, Vim navigation, and two-state visual
theming.

### Deliverables

1. **Core Domain (`src/core/`):**
   - Sparse deck topology data structure (`Section -> Page -> Detour`).
   - Deterministic state machine supporting `MAIN_MODE` (`z = 0`) and
     `DETOUR_MODE` (`z > 0`).
   - Cursor memory arrays (`lastX[y]` for sections, `lastZ[y][x]` for detours).
   - Unit test suite verifying all state transitions, boundary stops, and
     vertical axis locking in `DETOUR_MODE`.
2. **Ports (`src/ports/`):**
   - Inbound command dispatcher and Outbound state subscriber interfaces.
3. **Adapters (`src/adapters/`):**
   - **DOM Loader:** Hydrates the Core topology from semantic `<section>`,
     `<div class="deck-page">`, and `<article class="slide">` markup.
   - **Vim Keyboard Adapter:** Maps `h`, `j`, `k`, `l`, arrow keys, `i`, `o`,
     `Escape`, `0`, and `$` to Core commands.
   - **Viewport Renderer:** Applies active classes, CSS 3D/spatial transitions,
     and switches between Primary Hue and Detour Hue.
   - **Minimal HUD:** Displays current coordinates, detour availability badge
     (`[i]`), and vertical lock indicator in `DETOUR_MODE`.
4. **Standalone Bundle (`index.html`):**
   - Single runnable HTML file demonstrating multi-section navigation, section
     cursor memory, and multi-slide detours.

---

## Phase 2: UX Polish, 3D Radar & Print Fallback (v0.2)

**Goal:** Enhance presenter awareness during live talks and provide static
export fallbacks.

### Deliverables

1. **3D Spatial Radar / Compass Adapter:**
   - Directional HUD widget indicating valid adjacent moves (`h/j/k/l/i/o`).
   - Look-ahead indicators warning the presenter when adjacent pages in the
     current section contain hidden detour sequences.
   - Visual shake or pulse feedback when pressing locked keys (`j/k` inside a
     detour).
2. **URL Hash Routing Adapter:**
   - Bidirectional sync between `#y/x/z` URL hash and Core State so page reloads
     preserve exact position.
3. **Overview / Map Mode (`m` or `Space`):**
   - Zoomed-out 2D grid view of all sections and pages, visually flagging pages
     that have attached detour stacks.
4. **Print-to-PDF Adapter (`@media print`):**
   - Configurable flattening rules for static PDF export (e.g., Main Track only
     vs. Main Track + interleaved or appendix Detours).

---

## Phase 3: Modular Format Translators — Markdown & LaTeX (v0.3+)

**Goal:** Allow authoring in Markdown or LaTeX Beamer while compiling to (and
exporting from) the core paraslides HTML schema.

### Deliverables

1. **Markdown Inbound Adapter:**
   - Lightweight parser mapping custom delimiters (e.g., `# Section`, `---`
     Page, `+++` Detour) into the Core Deck Topology.
2. **Math Rendering Integration:**
   - Optional KaTeX / MathJax adapter for rendering raw LaTeX equations inside
     HTML slides.
3. **Bidirectional LaTeX Beamer Adapter:**
   - **LaTeX -> HTML:** Parses `\section{}`, `\begin{frame}`, and custom
     `\begin{depthframe}` blocks into the paraslides topology while preserving
     raw math environments.
   - **HTML -> LaTeX:** Serializes the Core Deck Topology back into a valid,
     compilable Beamer `.tex` document (including preamble macro
     `\newenvironment{depthframe}` for standard PDF compatibility).

---

## Out of Scope (Anti-Goals)

- **No Heavy Runtime Frameworks:** Avoid React, Vue, or mandatory Node server
  runtimes for viewing presentations.
- **No Freeform Rotation Sickness:** Keep transitions strictly grid-aligned (`X`
  horizontal, `Y` vertical, `Z` depth/scale) rather than arbitrary 3D camera
  rotations.
- **No Core Coupling:** Parsers (LaTeX/Markdown) must never be imported into
  `src/core/`.

# paraslides: Architecture Specification

> **paraslides** (*parallel* decks for extra slides, *parallax* depth, and *paragliding* through 3D slides all at once) is a zero-dependency, browser-native 3D presentation engine.

## 1. Architectural Pattern: Hexagonal (Ports & Adapters)

The project strictly separates the **Core Domain** (navigation state, coordinate
geometry, and transition rules) from external concerns (DOM rendering, keyboard
inputs, file formats, and parsers).

### Core Principles

1. **Zero-Dependency Core:** The Core Domain is written in pure,
   environment-agnostic code. It must have zero references to `window`,
   `document`, CSS, HTML tags, Markdown, or LaTeX.
2. **HTML-First Portability:** The compiled output or base runtime must run
   natively in any modern web browser without requiring a backend server or
   third-party runtime during a presentation.
3. **Strict Modularity:** Features such as LaTeX bidirectional translation,
   Markdown parsing, PDF printing, and advanced HUD radars are external
   adapters. Removing them must never break the core presentation engine.
4. **Sparse Data Representation:** The underlying data model and DOM only store
   slides that actually exist. No dummy or cloned nodes are generated to pad
   empty coordinates.

---

## 2. System Layers

### A. Core Domain (Inside the Hexagon)

- **Deck Topology Model:** Holds the immutable structural tree of the
  presentation (Sections, Pages, and attached Detour sequences).
- **Navigation State Machine:** Tracks the active coordinate state, mode (Main
  Track vs. Detour Mode), and historical cursor memory (e.g., last visited page
  per section).
- **Command Processor:** Pure functions that accept navigation intents
  (`MOVE_LEFT`, `MOVE_RIGHT`, `MOVE_UP`, `MOVE_DOWN`, `ENTER_DETOUR`,
  `EXIT_DETOUR`) and compute the next valid state.

### B. Ports (Interfaces)

- **Inbound Ports (Driving the Core):**
  - `NavigationCommandPort`: Receives abstract navigation intents from user
    input adapters.
  - `DeckLoaderPort`: Receives a structured deck tree from a parser or DOM
    reader to initialize the Core.
- **Outbound Ports (Driven by the Core):**
  - `StateSubscriberPort`: Emits the updated coordinate state, active mode, and
    boundary metadata (e.g., available adjacent moves, available detours)
    whenever a state transition occurs.
  - `SerializationPort`: Exports the internal deck topology to target formats
    (used by external compiler/translator modules).

### C. Adapters (Outside the Hexagon)

- **Inbound Adapters:**
  - **Keyboard Adapter:** Maps Vim mnemonics (`h`, `j`, `k`, `l`, `i`, `o`,
    etc.) and standard arrow keys to `NavigationCommandPort` intents.
  - **HTML DOM Loader (v0.1):** Parses semantic HTML markup on initial load to
    hydrate the Core Domain.
  - **Format Compilers (Future):** LaTeX Beamer (`.tex`) and Markdown (`.md`)
    parsers.
- **Outbound Adapters:**
  - **Viewport Renderer:** Translates state changes into CSS transforms,
    visibility toggles, and theme/hue shifts (Main vs. Detour visual states).
  - **HUD / Radar Renderer:** Reads boundary metadata from the state emission to
    display current coordinates, detour availability indicators, and locked-axis
    warnings.
  - **Format Exporters (Future):** Bidirectional LaTeX serializer and
    Print-to-PDF layout flattener.

---

## 3. Directory & Module Boundaries

    src/
    ├── core/                 # Pure domain logic (Zero DOM/format dependencies)
    │   ├── model.js          # Topology data structures & validation
    │   ├── state.js          # Coordinate state & cursor memory
    │   └── navigator.js      # State transition rules & command handlers
    ├── ports/                # Contract definitions / event emitters
    │   ├── input.js          # Inbound command interface
    │   └── output.js         # Outbound state broadcast interface
    ├── adapters/
    │   ├── input/
    │   │   └── vim-keys.js   # Keyboard listener -> Inbound Port
    │   ├── render/
    │   │   ├── viewport.js   # Outbound Port -> DOM/CSS slide transitions
    │   │   └── hud.js        # Outbound Port -> Navigation indicators & radar
    │   └── parsers/          # Modular format translators (HTML, LaTeX, MD)
    └── index.html            # Standalone entry point

---

## 4. Architectural Constraints for Agents & Contributors

- **Never** mutate DOM elements inside `src/core/`.
- **Never** hardcode keybindings inside the state machine; the Core only
  understands abstract directional and mode intents.
- **Always** ensure state transitions are deterministic and synchronous so unit
  tests can verify navigation rules without a browser environment.
- **Keep visual theming decoupled:** The Core only signals whether the state is
  in `MAIN` mode or `DETOUR` mode (and the current indices); the Viewport
  Renderer determines how to apply color palettes or CSS transitions.

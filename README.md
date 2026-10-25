# paraslides

> **paraslides** (*parallel* decks for extra slides, *parallax* depth, and *paragliding* through 3D slides all at once) is a zero-dependency, browser-native 3D presentation engine with Vim navigation and attached detour sequences.

---

## Key Features

- **3-Axis Presentation Topology:**
  - **Y-Axis (`y` — Sections):** Vertical sequence of primary presentation themes.
  - **X-Axis (`x` — Pages):** Horizontal sequence of primary slides within section `y`.
  - **Z-Axis (`z` — Detour Track):** Linear sequence of supplementary, appendix, or backup slides attached directly to a parent slide `(y, x)` without cluttering the main flow.
- **Vim & Arrow Key Navigation:** Full spatial control using `h`, `j`, `k`, `l`, `i`, `o`, `0`, and `$`.
- **Intelligent Cursor Memory:** Section switches remember the last visited page (`lastX[y]`), and returning to detours preserves reading position (`lastZ[y][x]`).
- **3D Spatial Radar & Lookahead HUD:** Compass indicators warn presenters when adjacent slides contain hidden detour stacks.
- **Ambient Presenter Status Orb (<kbd>B</kbd>):** A subtle, pulsating corner beacon indicating standard, detour, and section-end states with non-overlapping horizontal docking.
- **Distraction-Free Fullscreen (<kbd>f</kbd>) & Navigation Bar Toggle (<kbd>b</kbd>):** Seamless immersion with independent HUD bar and orb visibility toggles.
- **Vim Browser Extension Shield:** Built-in heuristic detector and non-intrusive advisory for Vimium, Vimium C, and Surfingkeys users.
- **Bidirectional URL Hash Routing:** Instant bookmarking and refresh preservation (`#y/x/z`).
- **2D Overview Map Mode (<kbd>m</kbd> / <kbd>Space</kbd>):** Bird's-eye matrix view with visual detour indicator stacks and click-to-jump navigation.
- **Print-to-PDF Layout (<kbd>Ctrl</kbd>+<kbd>P</kbd>):** Automatic layout flattening for PDF exports and printing.
- **Modular Format Translators:** Author presentations directly in Markdown or LaTeX Beamer with native LaTeX math rendering (`$` and `$$`).
- **Zero Runtime Dependencies:** No npm build steps, no bundlers, and no frameworks required. Pure browser-native HTML, CSS, and ES modules.
- **Strict Hexagonal Architecture:** Clean separation of pure coordinate logic (`src/core/`), boundary ports (`src/ports/`), and browser/format adapters (`src/adapters/`).


---

## Quick Start

Open [`index.html`](file:///home/lampros/Projects/paraslides/index.html) directly in any modern browser:

```bash
# Using standard browser open
open index.html          # macOS
xdg-open index.html      # Linux

# Or via any local static file server
npx serve .
# or
python3 -m http.server
```

---

## Navigation Controls (Vim Document Metaphor)

paraslides treats your slide deck like an open document in Vim: **Sections are Rows** and **Pages are Columns**.

| Key | Alternative | Action in Main Track (`z === 0`) | Action in Detour Mode (`z > 0`) |
| :--- | :--- | :--- | :--- |
| **`l`** | `ArrowRight` | Next column (`x + 1`, wraps to next row at row end) | Next detour slide (`z + 1`) |
| **`h`** | `ArrowLeft` | Previous column (`x - 1`, wraps to prev row at row start) | Previous detour slide (`z - 1`) |
| **`j`** | `ArrowDown` | Next row (`y + 1`, preserves sticky column `desiredX`) | **Locked** (emits warning pulse) |
| **`k`** | `ArrowUp` | Previous row (`y - 1`, preserves sticky column `desiredX`) | **Locked** (emits warning pulse) |
| **`Space`** / **`Enter`** | — | **Linear next slide** (advances forward across pages & rows) | Next detour slide / return to main track |
| **`i`** | — | **Enter Detour** (if slide has detours) | No-op (already in Detour) |
| **`o`** | `Escape` | No-op | **Exit Detour** (returns to parent slide) |
| **`f`** | — | **Toggle Fullscreen** (native distraction-free display) | **Toggle Fullscreen** (native distraction-free display) |
| **`b`** | — | **Toggle Navigation Bar** (hide/show HUD in any mode) | **Toggle Navigation Bar** (hide/show HUD in any mode) |
| **`B`** | `Shift + b` | **Toggle Presenter Status Orb** (ambient beacon in any mode) | **Toggle Presenter Status Orb** (ambient beacon in any mode) |
| **`0`** | — | Jump to row start (`x = 0`, resets sticky column) | Jump to detour start (`z = 1`) |
| **`$`** | `Shift + 4` | Jump to row end (`x = X_max`, sticky end-of-row) | Jump to detour end (`z = Z_max`) |
| **`gg`** / **`G`** | — | Jump to top row (`y = 0`) / bottom row (`y = Y_max`) | **Locked** (emits warning pulse) |
| **`m`** | — | Toggle 2D Overview Map Mode | Toggle 2D Overview Map Mode |
| **`Ctrl + P`** | — | Print / Save to PDF | Print / Save to PDF |

### Overview Menu Mode (`m`)
- **Strict Vim Navigation:** Inside menu mode, `h`, `j`, `k`, `l`, `0`, `$`, `gg`, `G`, and numeric counts (`[count]key`) navigate the 2D grid matrix of slides strictly without line wrapping.
- **Confirm Selection:** `Enter` or `Space` confirms the active highlighted slide, jumps directly to it, and closes the menu.
- **Cancel:** `m` or `Escape` closes the menu and restores the slide position from before opening.

### Presenter Status Orb (<kbd>B</kbd>) & Navigation Bar (<kbd>b</kbd>)
The bottom-right corner provides ambient presentation awareness without visual distraction:
- **Status Orb Colors:**
  - **Blue (`var(--orb-color-normal)`):** Standard presentation slide.
  - **Orange (`var(--orb-color-detour)`):** Attached detour sequence available, or currently inside a detour.
  - **Purple (`var(--orb-color-section-end)`):** Final slide of the current section (the next linear advance wraps into the next row).
  - **Dual Ring (`detour-and-section-end`):** Slide is both the end of the section and has attached detours. Detour priority displays an orange core encircled by a purple halo outline.
- **Horizontal Docking Layout:**
  - The status orb is always anchored at the bottom right corner.
  - When the HUD navigation bar is visible, it sits on the same horizontal line immediately to the left of the orb with breathing space.
  - If the orb is hidden with <kbd>B</kbd>, the HUD bar smoothly slides into the bottom right corner.
  - If the HUD bar is hidden with <kbd>b</kbd>, the orb remains undisturbed at the corner.
  - Both indicators can be toggled on or off independently in standard or fullscreen mode.

### Vim Browser Extension Compatibility
If you use Vim browser extensions (such as Vimium, Vimium C, Surfingkeys, or Tridactyl), they may attempt to intercept keystrokes like `j`, `k`, `h`, `l`.
- **Capture Priority:** paraslides attaches keydown listeners in the DOM capture phase with `stopPropagation()` to prioritize presentation commands.
- **Automatic Advisory:** An advisory banner alerts users when extension signatures are detected.
- **Recommended Practice:** Enter insert / passthrough mode (e.g. press <kbd>i</kbd> in Vimium) or add a URL exclusion rule for your presentation origin.


---

## Semantic HTML Markup

Presentations are defined in clean, semantic HTML:

```html
<main id="deck">
  <!-- Y-Axis: Section -->
  <section class="deck-section" data-section-title="Architecture">

    <!-- X-Axis: Page -->
    <div class="deck-page">
      <!-- Primary Slide (z = 0) -->
      <article class="slide slide-main">
        <h1>Hexagonal Design</h1>
        <p>Core presentation logic is isolated from the DOM.</p>
      </article>

      <!-- Attached Detour Sequence (z = 1..N) -->
      <article class="slide slide-detour">
        <h1>Detour 1: Deep Dive on Inbound Ports</h1>
        <p>Supplementary technical details.</p>
      </article>
      <article class="slide slide-detour">
        <h1>Detour 2: Outbound State Broadcasting</h1>
        <p>Further implementation details.</p>
      </article>
    </div>

  </section>
</main>

<!-- Floating HUD -->
<aside id="hud" aria-live="polite"></aside>
```

Initialize via ES modules:

```javascript
import { loadDeckFromDOM } from './src/adapters/parsers/dom-loader.js';
import { createCommandDispatcher } from './src/ports/input.js';
import { attachViewportRenderer } from './src/adapters/render/viewport.js';
import { attachHudRenderer } from './src/adapters/render/hud.js';
import { attachKeyboardAdapter } from './src/adapters/input/vim-keys.js';
import { attachHashRouter } from './src/adapters/input/hash-router.js';
import { attachMapMode, injectMapStyles } from './src/adapters/render/map-mode.js';
import { attachPrintAdapter, injectPrintStyles } from './src/adapters/render/print.js';
import { attachFullscreenAdapter } from './src/adapters/render/fullscreen.js';
import { attachVimExtensionAdvisory } from './src/adapters/input/vim-extension-advisory.js';
import { attachPresenterOrb, injectPresenterOrbStyles } from './src/adapters/render/presenter-orb.js';

const deck = document.getElementById('deck');
const hud = document.getElementById('hud');

const { topology, slideMap } = loadDeckFromDOM(deck);
const dispatcher = createCommandDispatcher(topology);

injectMapStyles();
injectPrintStyles();
injectPresenterOrbStyles();

attachViewportRenderer(dispatcher, deck, { slideMap });
attachHudRenderer(dispatcher, hud);
attachKeyboardAdapter(dispatcher, window);
attachHashRouter(dispatcher, window);
attachMapMode(dispatcher, deck, { topology });
attachPrintAdapter(deck, window);
attachFullscreenAdapter(dispatcher, document.documentElement);
attachVimExtensionAdvisory(document.body);
attachPresenterOrb(dispatcher, document.body);
```

---

## Authoring in Markdown

Write presentations with native 3-axis delimiters:
- `# Section Title`: Splits thematic sections (`Y`-axis)
- `---`: Splits pages within a section (`X`-axis)
- `+++`: Splits attached detour slides (`Z`-axis, `z >= 1`)

```markdown
# Section 1: Intro
## Primary Slide Title
Main track content with inline math: $E = mc^2$.

+++

## Detour: Technical Deep Dive
Supplementary depth slide on the Z-axis.
Display equation:
$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

---

## Page 2
Second page in Section 1.
```

Parse directly into Core Topology or HTML:

```javascript
import { parseMarkdownToTopology, parseMarkdownToHTML } from './src/adapters/parsers/markdown.js';

const topology = parseMarkdownToTopology(markdownSource);
const html = parseMarkdownToHTML(markdownSource);
```

---

## Authoring in LaTeX Beamer

paraslides supports bidirectional LaTeX Beamer translation:

```latex
\documentclass{beamer}
\begin{document}

\section{Spatial Architecture}

\begin{frame}{Primary Slide}
Slide content on the main track.
\end{frame}

\begin{depthframe}{Detour Slide}
Attached Z-axis detour sequence.
\end{depthframe}

\end{document}
```

```javascript
import { parseLatexToTopology, serializeTopologyToLatex } from './src/adapters/parsers/latex.js';

// LaTeX -> Deck Topology
const topology = parseLatexToTopology(latexSource);

// Deck Topology -> Compilable Beamer .tex
const texString = serializeTopologyToLatex(topology);
```

---

## Outbound Serialization Port

Export presentation topologies to any registered format:

```javascript
import { serializeDeck } from './src/ports/serialization.js';

const beamerCode = serializeDeck(topology, 'latex');
const markdownCode = serializeDeck(topology, 'markdown');
const jsonCode = serializeDeck(topology, 'json');
```

---

## Testing

Run the test suite using Node's native test runner (zero external test dependencies):

```bash
npm test
```

Includes **323 unit and integration tests** (100% pass rate) across 104 test suites covering:
- Pure topology bounds, sparse tree structures, and validation
- Deterministic state machine transitions & cursor memory (`lastX`, `lastZ`)
- Inbound and Outbound Hexagonal Ports & contracts
- DOM Loader, Keyboard listener, Viewport CSS transforms, 3D Radar HUD, Hash Router, 2D Overview Map, and Print-to-PDF
- Native Fullscreen, Vim browser extension shield, and Presenter Status Orb
- Markdown, LaTeX Beamer, Math equation rendering, and bidirectional serialization round-trips.


---

## Architecture & Documentation

- [`docs/ARCHITECTURE.md`](file:///home/lampros/Projects/paraslides/docs/ARCHITECTURE.md): Hexagonal boundaries and directory rules.
- [`docs/DOMAIN_SPEC.md`](file:///home/lampros/Projects/paraslides/docs/DOMAIN_SPEC.md): 3-axis coordinate geometry and state transitions.
- [`docs/HTML_SCHEMA.md`](file:///home/lampros/Projects/paraslides/docs/HTML_SCHEMA.md): DOM structure, data attributes, and CSS variables.
- [`docs/ROADMAP.md`](file:///home/lampros/Projects/paraslides/docs/ROADMAP.md): Phases and roadmap.
- [`docs/WORKFLOW.md`](file:///home/lampros/Projects/paraslides/docs/WORKFLOW.md): Multi-agent sprint dispatch protocol.

---

## License

MIT

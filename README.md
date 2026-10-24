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
- **Two-State Spatial Theming:** Fluid visual transitions between Main Track (primary hue) and Detour Mode (supplementary hue).
- **Zero Runtime Dependencies:** No npm build steps, no bundlers, and no frameworks required. Pure browser-native HTML, CSS, and ES modules.
- **Strict Hexagonal Architecture:** Clean separation of pure coordinate logic (`src/core/`), boundary ports (`src/ports/`), and browser adapters (`src/adapters/`).

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

## Navigation Controls

| Key | Alternative | Action in Main Track (`z === 0`) | Action in Detour Mode (`z > 0`) |
| :--- | :--- | :--- | :--- |
| **`l`** | `ArrowRight` | Next page within section (`x + 1`) | Next detour slide (`z + 1`) |
| **`h`** | `ArrowLeft` | Previous page within section (`x - 1`) | Previous detour slide (`z - 1`) |
| **`j`** | `ArrowDown` | Next section (`y + 1`, restores `x`) | **Locked** (emits warning pulse) |
| **`k`** | `ArrowUp` | Previous section (`y - 1`, restores `x`) | **Locked** (emits warning pulse) |
| **`i`** | — | **Enter Detour** (if slide has detours) | No-op (already in Detour) |
| **`o`** | `Escape` | No-op | **Exit Detour** (returns to parent slide) |
| **`0`** | — | Jump to section start (`x = 0`) | Jump to detour start (`z = 1`) |
| **`$`** | `Shift + 4` | Jump to section end (`x = X_max`) | Jump to detour end (`z = Z_max`) |

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

const deck = document.getElementById('deck');
const hud = document.getElementById('hud');

const { topology, slideMap } = loadDeckFromDOM(deck);
const dispatcher = createCommandDispatcher(topology);

attachViewportRenderer(dispatcher, deck, { slideMap });
attachHudRenderer(dispatcher, hud);
attachKeyboardAdapter(dispatcher, window);
```

---

## Testing

Run the test suite using Node's native test runner (zero external test dependencies):

```bash
npm test
```

Includes 200+ unit and integration tests covering:
- Pure topology bounds and validation
- Deterministic state machine transitions & cursor memory
- Port dispatchers and subscriber contracts
- DOM loading, keyboard event mapping, viewport rendering, HUD cues, and end-to-end integration flows.

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

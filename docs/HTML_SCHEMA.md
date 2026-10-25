# paraslides: HTML Schema & Visual Contract (v0.1)

## 1. Semantic DOM Hierarchy

The HTML structure directly mirrors the sparse 3-axis domain model
(`Section -> Page -> Slide`). No duplicate or placeholder DOM nodes are created
for empty coordinates.

### Markup Pattern

    <main id="deck">
      <!-- Y-Axis: Section -->
      <section class="deck-section" data-section-title="Section Title">

        <!-- X-Axis: Page (Container for Main Slide + Optional Detour Sequence) -->
        <div class="deck-page">

          <!-- Z = 0: Primary Slide (Main Track) -->
          <article class="slide slide-main">
            <h1>Primary Slide Title</h1>
            <p>Main presentation content.</p>
          </article>

          <!-- Z > 0: Optional Detour / Backup Sequence -->
          <article class="slide slide-detour">
            <h1>Detour Slide 1</h1>
            <p>Supplementary content (z = 1).</p>
          </article>

          <article class="slide slide-detour">
            <h1>Detour Slide 2</h1>
            <p>Supplementary content (z = 2).</p>
          </article>

        </div>

      </section>
    </main>

    <!-- Outbound HUD / Radar Container -->
    <aside id="hud" aria-live="polite"></aside>

---

## 2. Structural Rules for the DOM Loader Adapter

1. **Sections (`y`):** Every `<section class="deck-section">` child inside
   `#deck` maps sequentially to `y = 0, 1, ... Y_max`.
2. **Pages (`x`):** Every `<div class="deck-page">` child inside a section maps
   sequentially to `x = 0, 1, ... X_max(y)`.
3. **Main vs. Detour Slides (`z`):**
   - Within a `.deck-page`, the **first** `<article class="slide">` is always
     indexed as `z = 0` (`MAIN_MODE`).
   - Any subsequent `<article class="slide">` siblings inside the same
     `.deck-page` are indexed sequentially as `z = 1, 2, ... Z_max(y, x)`
     (`DETOUR_MODE`).
   - If a `.deck-page` has only one `<article>`, then `Z_max(y, x) = 0` (no
     detour available).

---

## 3. Visual State & CSS Contract

The Viewport Renderer Adapter updates data attributes and CSS classes on `#deck`
and active elements based on the Core State snapshot.

### Root State Attributes

The `#deck` element reflects global operating state for CSS theming:

- `data-mode="MAIN"` or `data-mode="DETOUR"`
- `data-active-y="{y}"`
- `data-active-x="{x}"`
- `data-active-z="{z}"`

### Slide Visibility & Transitions

- `.is-active`: Applied exclusively to the `<article>` matching the current
  `(y, x, z)` coordinate.
- `.has-detour`: Applied to a main slide (`z = 0`) when `Z_max(y, x) > 0`,
  allowing CSS to render a subtle visual indicator that supplementary depth
  slides exist.

### Two-State Color Theming (CSS Custom Properties)

Colors are decoupled from logic via CSS variables on `:root` or per
`.deck-section`:

    :root {
      --bg-main: #12141a;
      --fg-main: #eef0f6;
      --accent-main: #5c9eff;

      --bg-detour: #1c141c;
      --fg-detour: #f6eef6;
      --accent-detour: #ff8c5c;
    }

- When `#deck[data-mode="MAIN"]` is active, slides inherit `--bg-main`,
  `--fg-main`, and `--accent-main`.
- When `#deck[data-mode="DETOUR"]` is active, slides transition smoothly to
  `--bg-detour`, `--fg-detour`, and `--accent-detour`.
- Individual sections may optionally override `--accent-main` or `--bg-main` via
  inline styles or data attributes without affecting the Core.

---

## 4. Minimal HUD Contract (v0.1)

The `#hud` adapter subscribes to the Outbound State Payload and renders minimal,
fixed-dimension, non-intrusive status indicators:

1. **Coordinate Readout:** Current position in standard Vim statusline notation:
   - `MAIN_MODE`: `Col {x + 1}/{totalX} · Row {y + 1}/{totalY}`
   - `DETOUR_MODE`: `Col {x + 1}/{totalX} · Dep {z}/{detourCount}` (or `Dep {z}/{detourCount}` in compact mode)
2. **Fixed Detour Button Slot:** Morphing button maintaining constant HUD dimensions:
   - `MAIN_MODE`: Displays `[i]` (dimmed when no detour is available on current page, illuminated and clickable when detour exists).
   - `DETOUR_MODE`: Displays `[o]` (illuminated and clickable, signaling exit/return).
3. **Directional Radar & Section Wrap Indicators:**
   - 4-way hints (`↑`, `↓`, `←`, `→`).
   - Reflects continuous section wrapping: `↳` (next section wrap on right arrow) and `↰` (prev section wrap on left arrow).
   - Reflects vertical lock pulse (`is-locked-pulse`) during locked vertical navigation attempts in detour mode.

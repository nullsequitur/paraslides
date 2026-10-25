# paraslides: End-to-End QA Session Report

- **Date:** 2026-10-25
- **Assigned Evaluator:** Gemini Flash High
- **Scope:** Full-deck end-to-end user evaluation, Vim keybinding ergonomics, visual layout, animations, and HUD contract.

---

## 1. QA Findings & Design Decisions

### Issue 1: Navigation Model Mismatch (Per-Section Memory vs. True Vim Cursor)
- **Observed Behavior:** The core engine preserved `lastX[y]` independently per section. Moving across sections jumped to whatever page was previously visited in that section, rather than acting like a cursor moving across rows in a text file.
- **Decision:** Shift to the **Vim Document Metaphor**:
  - Each **Section is a Row** (rows 1..N).
  - Each **Page is a Column** (cols 1..M).
  - The core maintains a sticky target column (`desiredX`).
  - Horizontal movement (`h`, `l`, `0`, `$`) updates `desiredX`.
  - `$`: Sticky end-of-row behavior.
  - Vertical movement (`j`, `k`, `gg`, `G`, counts) preserves `desiredX`, clamping to `Math.min(desiredX, xMax(newY))` when visiting shorter sections, and restoring back out to `desiredX` when returning to longer sections.
  - An explicit horizontal movement while clamped resets `desiredX` to the clamped position.

### Issue 2: Keybind Depth & Count Buffers
- **Observed Behavior:** Only single key presses were supported.
- **Decision:**
  - Support standard Vim numeric count prefixes: `[count]h`, `[count]l`, `[count]j`, `[count]k`.
  - Add `gg` (jump to Row 1) and `G` (jump to last Row).
  - With counts: `[count]gg` or `[count]G` jumps directly to Row `count` (1-indexed).
  - Digits `1`-`9` start the count buffer; subsequent digits `0`-`9` append to it.
  - `Escape` or timeout resets the count buffer.
  - `0` without a preceding count triggers `JUMP_START`.

### Issue 3: Linear Progression & Continuous Section Wrapping
- **Observed Behavior:** Pressing `l` at the end of a section hit a hard stop. Presenters expect common presentation keys (`Space` / `Enter`) to seamlessly advance through the presentation.
- **Decision:**
  - `Space` and `Enter` execute `NEXT_SLIDE`: advances 1 slide to the right; at the end of a section, wraps to the first slide (`x = 0`) of the next section (`y + 1`).
  - `h` and `l` also connect sections:
    - Pressing `l` at `x === xMax(y)` wraps to `y + 1, x = 0`.
    - Pressing `h` at `x === 0` (with `y > 0`) wraps to `y - 1, x = xMax(y - 1)`.
  - The HUD radar visually highlights this wrapping behavior so the presenter knows section transition will occur.

### Issue 4: Detour Animations & Scrubbing Ergonomics
- **Observed Behavior:** The 3D animation when entering a detour (`i`) and exiting (`o`/`Esc`) was too intense and disruptive (-600px warp). Furthermore, inside detour mode, moving with `h`/`l` used z-depth stacking rather than natural slide progression.
- **Decision:**
  - Tone down the 3D transition for `i` and `o`/`Esc` to a mild, subtle depth shift and background hue accent.
  - Inside detour mode (`z > 0`), navigating with `h` and `l` scrubs horizontally with standard left-to-right slide animations, matching intra-section page navigation.

### Issue 5: Slide Markup & Detour Cues
- **Observed Behavior:** A pulsating orange dot (`.slide.slide-main.has-detour::after`) was rendered on slides containing detours, but it was positioned at `bottom: 2rem; right: 2rem`, hiding right behind the floating HUD bar. Adjacent radar arrows also showed look-ahead orange dots for detours on neighboring slides, adding visual noise.
- **Decision:**
  - Remove the slide-level animated orange blob.
  - Remove the adjacent detour look-ahead indicator on radar arrows.
  - Detour availability is conveyed cleanly and exclusively by the HUD.

### Issue 6: HUD Dimensions, Labels & Morphing Key Indicator
- **Observed Behavior:** HUD dimensions shifted dynamically as status strings appeared and disappeared. Readouts used `Sec` and `Page`.
- **Decision:**
  - Enforce fixed dimensions and layout on the HUD pill container.
  - Readout labels:
    - `MAIN_MODE`: `Col {x + 1}/{totalX} · Row {y + 1}/{totalY}`
    - `DETOUR_MODE`: `Col {x + 1}/{totalX} · Dep {z}/{totalZ}`
  - Dedicated Detour Key Slot:
    - In `MAIN_MODE`: Shows `[i]`. Grayed out / disabled when no detour exists; illuminated / active when detours are available.
    - In `DETOUR_MODE`: Morphs to illuminated `[o]` (to return).
  - Remove dynamic cue text (`[h/l] Scrub · [o] Return...`).
  - Radar arrows highlight section wrapping (`↳` or accent color on right arrow at row end; `↰` on left arrow at row start).

### Issue 7: Overview Menu (`m`) Keybinding & Strict Movement
- **Observed Behavior:** Space was shared with `m` to toggle the overview menu.
- **Decision:**
  - Space is dedicated to `NEXT_SLIDE`.
  - `m` exclusively toggles the overview menu.
  - Inside the overview menu, only strict Vim movements (`h`, `j`, `k`, `l`, `0`, `$`, `gg`, `G`) navigate the grid (no section wrapping).
  - `Enter` and `Space` confirm selection, jump to the chosen slide, and close the menu.
  - `m` or `Escape` aborts and closes the menu without jumping.

### Issue 8: Comprehensive Interactive Tutorial (`index.html`)
- **Observed Behavior:** The standalone demo had basic placeholders.
- **Decision:** Expand `index.html` into a complete, self-documenting presentation that teaches the user how to use paraslides (rows, columns, depths, Vim keys, count multipliers, linear flow, and detours) while demonstrating all capabilities.

---

## 2. Action Plan

These findings form the backlog for **Sprint 05: Vim Document Metaphor & QA Stabilization**.

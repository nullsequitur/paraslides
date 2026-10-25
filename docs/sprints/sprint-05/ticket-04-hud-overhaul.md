# Ticket: T05-04 - HUD Fixed Dimensions, Col/Row/Dep Labels & Wrapping Cues

- **Status:** DONE
- **Sprint:** Sprint 05
- **Target Layer:** Adapters (`src/adapters/render/hud.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Overhaul the Outbound HUD & Radar Adapter to enforce fixed dimensions, display Vim-standard coordinate notation, provide a dedicated morphing `[i]`/`[o]` detour button, and visually indicate continuous section wrapping:
1. **Fixed Dimensions:**
   - Enforce fixed width / min-width and structured flex layout on the HUD pill container (`#hud`) so the dimensions never resize or jitter when state changes.
2. **Coordinate Readout:**
   - `MAIN_MODE`: `Col {x + 1}/{totalX} · Row {y + 1}/{totalY}`
   - `DETOUR_MODE`: `Col {x + 1}/{totalX} · Dep {z}/{totalZ}`
3. **Dedicated Detour Key Button Slot:**
   - In `MAIN_MODE`:
     - Displays `[i]`.
     - Active / illuminated styling when the current page has detours (`hasDetour === true`).
     - Grayed out / disabled styling (`aria-disabled="true"`, dimmed opacity) when no detour is available.
   - In `DETOUR_MODE`:
     - Displays `[o]`.
     - Active / illuminated styling indicating return action.
   - Remove extra dynamic text (`[h/l] Scrub · [o] Return · [j/k] Locked`).
4. **Section Wrapping Cues in Radar:**
   - When `willWrapNextSection` is true: Right arrow (`→`) visually indicates section wrap (e.g. morphs into `↳` or applies distinct highlight styling with tooltip "Next Row").
   - When `willWrapPrevSection` is true: Left arrow (`←`) indicates section wrap (e.g. morphs into `↰` or distinct highlight styling with tooltip "Prev Row").
   - Remove adjacent detour look-ahead indicator dots (`has-detour-lookahead`) from radar arrows.

## 2. Acceptance Criteria
- [x] HUD layout dimensions remain fixed across mode switches and coordinate changes.
- [x] Readout renders `Col x/X · Row y/Y` (Main) and `Col x/X · Dep z/Z` (Detour).
- [x] Detour slot shows dimmed `[i]` (no detour), active `[i]` (detour exists), and active `[o]` (inside detour).
- [x] Radar arrows visually reflect section wrapping at boundary edges.
- [x] Look-ahead dots removed from radar arrows.
- [x] Full unit test coverage in `tests/adapters/render/hud.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented fixed dimensions (`min-width: 270px;`, structured flex box) in `HUD_BASE_STYLES`.
- Replaced coordinates with Vim standard notation `Col x/X · Row y/Y` and `Col x/X · Dep z/Z`.
- Converted dynamic detour text to fixed interactive button slot `[i]` / `[o]`.
- Implemented radar wrapping symbols (`↳` for next section wrap on right arrow, `↰` for prev section wrap on left arrow).
- Removed look-ahead dot indicator rules and attributes.
- Updated all HUD and presentation integration tests.

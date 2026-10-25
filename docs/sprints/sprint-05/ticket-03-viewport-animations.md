# Ticket: T05-03 - Viewport Mild 3D Transitions & Horizontal Detour Scrubbing

- **Status:** DONE
- **Sprint:** Sprint 05
- **Target Layer:** Adapters (`src/adapters/render/viewport.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Refine the CSS Viewport Renderer to eliminate visual jarring and align detour animations with intra-section horizontal navigation:
1. **Mild Detour Depth Transitions:**
   - Tone down the `z`-axis transition when entering (`i`) and exiting (`o`/`Esc`) detour mode.
   - Replace disruptive -600px zoom with a subtle, elegant scale shift (e.g., `scale(0.96)`) and soft depth blur / opacity transition while shifting background theme hue.
2. **Horizontal Detour Slide Scrubbing:**
   - In `DETOUR_MODE`, navigating between detour slides via `h` and `l` (`z = 1 .. zMax`) must use **standard horizontal slide transitions** (`translateX`), identical to moving between pages in a section.
   - Detour slides slide in from the right (`l`) or left (`h`) rather than stacking in 3D depth.
3. **Remove Slide-Level Detour Dot:**
   - Delete `.slide.slide-main.has-detour::after` pulsating orange blob that was clashing with and hiding behind the HUD.
   - Ensure primary slides with detours remain cleanly styled without obstructing HUD elements.

## 2. Acceptance Criteria
- [x] Entering and exiting detour mode features a gentle, non-disruptive 3D transition.
- [x] Detour slides scrub horizontally using CSS `translateX` transforms.
- [x] Pulsating orange dot pseudo-element is removed from CSS styles and DOM.
- [x] All existing viewport tests in `tests/adapters/viewport.test.js` updated and passing.

## 3. Worker Notes & Retro Feedback
- Updated `VIEWPORT_BASE_STYLES` in `src/adapters/render/viewport.js` with mild 3D depth transition (`translateZ(-150px) scale(0.95)`).
- Configured horizontal `translateX` slide scrubbing for `.slide.slide-detour` when navigating within detour sequences.
- Removed `.slide.slide-main.has-detour::after` pulsating orange dot pseudo-element to prevent collision with HUD.
- Added assertions in `tests/adapters/viewport.test.js` verifying the new styling invariants.
- 298 / 298 tests passing across all 98 suites with 100% pass rate.

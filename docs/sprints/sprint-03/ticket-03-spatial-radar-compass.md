# Ticket: S03-T03 - 3D Spatial Radar & Compass HUD Adapter

- **Status:** DONE
- **Sprint:** Sprint 03
- **Target Layer:** Adapters (Render / HUD)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Enhance `src/adapters/render/hud.js` to fulfill Phase 2 deliverable:
1. **3D Spatial Radar / Compass Widget:**
   - Directional indicator showing valid moves in 3D:
     - Vertical section navigation: `↑` (`k`) / `↓` (`j`)
     - Horizontal page / detour scrub: `←` (`h`) / `→` (`l`)
     - Depth / detour transition: `[i] In` (when detours exist) / `[o] Out` (when in detour mode)
2. **Look-Ahead Cues:**
   - Visual look-ahead indicators signaling hidden detour stacks on adjacent pages in the current section:
     - `hasDetourLeft` (`data-has-detour-left="true"`, dot or subtle indicator on left hint)
     - `hasDetourRight` (`data-has-detour-right="true"`, dot or subtle indicator on right hint)
3. **Axis Feedback:**
   - Preserve and polish locked-axis visual shake / pulse feedback on locked keys (`j/k` during detour).
4. Fully backwards-compatible with Phase 1 HUD styling and accessibility (`role="status"`, `aria-live="polite"`).

## 2. Acceptance Criteria
- [x] Directional radar includes depth indicators (`[i]` enter detour / `[o]` exit detour) when applicable.
- [x] Look-ahead indicators reflect `hasDetourLeft` and `hasDetourRight` attributes and visual cues.
- [x] Locked-axis pulse animation operates cleanly on vertical locked attempts.
- [x] Unit tests updated in `tests/adapters/hud.test.js` verifying compass depth cues and look-ahead metadata.
- [x] 100% test pass rate.

## 3. Worker Notes & Retro Feedback
- Added depth indicator `.hud-hint-depth` (`⤓` for entering detour in MAIN, `⤒` for returning from DETOUR).
- Added `.has-detour-lookahead` class and styling for adjacent page detour cues on horizontal directional hints.
- Updated `tests/adapters/hud.test.js` to verify look-ahead cues and depth compass transitions.
- All 226 tests pass.

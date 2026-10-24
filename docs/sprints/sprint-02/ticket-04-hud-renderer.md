# Ticket: T02-04 - Minimal HUD & Radar Indicator Adapter

- **Status:** DONE
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Render
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/render/hud.js` that subscribes to the outbound state broadcast port and renders minimal, non-intrusive status indicators into the `#hud` container conforming to `docs/HTML_SCHEMA.md` section 4.

## 2. Acceptance Criteria
- [x] Implement `attachHudRenderer(dispatcher, hudElement, options = {})`:
  - Renders coordinate readout:
    - In `MAIN_MODE`: `Sec ${y + 1}/${totalY} · Page ${x + 1}/${totalX}`
    - In `DETOUR_MODE`: `Detour ${z}/${detourCount}` (and parent sec/page context)
  - Detour Availability Cue:
    - Visible when `hasDetour === true` in `MAIN_MODE` (e.g. `[i] Detour (${detourCount})`).
    - Hidden or inactive when no detour exists.
  - Detour Active / Return Cue:
    - Visible in `DETOUR_MODE`: `[h/l] Scrub · [o] Return · [j/k] Locked`.
  - Locked-axis warning / pulse:
    - When `event.feedback?.verticalLockedAttempt` occurs, triggers a visual cue (e.g., temporary `.is-locked-pulse` class or shake effect).
  - Returns cleanup/unsubscribe function `destroy()`.
- [x] Accessible markup with appropriate `aria-live` or accessibility attributes.
- [x] Unit tests in `tests/adapters/hud.test.js` validating indicator text, visibility toggles across MAIN and DETOUR modes, locked feedback pulse, and cleanup.

## 3. Worker Notes & Retro Feedback
- Implemented `src/adapters/render/hud.js` with pure ES modules and zero external runtime dependencies.
- Subscribes to `NavigationCommandPort`, updates `.hud-coordinates`, `.hud-detour-cue`, and directional radar indicators.
- In DETOUR mode, displays scrub and return cues while signaling locked vertical axes.
- Vertical lock feedback emits `.is-locked-pulse` and `data-locked-attempt="true"` with automatic timeout and immediate reset on valid moves.
- 14 tests in `tests/adapters/hud.test.js` pass with 100% success rate.

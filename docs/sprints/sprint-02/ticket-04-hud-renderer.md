# Ticket: T02-04 - Minimal HUD & Radar Indicator Adapter

- **Status:** TODO
- **Sprint:** sprint-02
- **Target Layer:** Adapters / Render
- **Assigned Model Tier:** Gemini Flash

## 1. Objective
Implement `src/adapters/render/hud.js` that subscribes to the outbound state broadcast port and renders minimal, non-intrusive status indicators into the `#hud` container conforming to `docs/HTML_SCHEMA.md` section 4.

## 2. Acceptance Criteria
- [ ] Implement `attachHudRenderer(dispatcher, hudElement, options = {})`:
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
- [ ] Accessible markup with appropriate `aria-live` or accessibility attributes.
- [ ] Unit tests in `tests/adapters/hud.test.js` validating indicator text, visibility toggles across MAIN and DETOUR modes, locked feedback pulse, and cleanup.

## 3. Worker Notes & Retro Feedback
<!-- Worker to populate upon completion -->

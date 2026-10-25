# Ticket: T06-05 - Ephemeral Fading Telestrator Canvas Adapter

- **Status:** DONE
- **Sprint:** Sprint 06
- **Target Layer:** Adapters (`src/adapters/render/telestrator.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement the zero-dependency Ephemeral Fading Telestrator Adapter for live freehand annotations:
1. `src/adapters/render/telestrator.js`:
   - Outbound adapter subscribing to `NavigationCommandPort` dispatcher for `feedback.toggleTelestrator` and `feedback.clearTelestrator`.
   - Creates a full-screen `<canvas id="telestrator-canvas">` overlay (`z-index: 999`).
   - When active (`isActive = true`):
     - `pointer-events: auto` to intercept drawing gestures.
     - Custom pen cursor (`crosshair` or custom pen indicator).
     - Captures `pointerdown`, `pointermove`, `pointerup` to record stroke points.
     - Quadratic bezier curve smoothing between consecutive points for natural ink feel.
   - Ephemeral decay animation loop:
     - Each drawn stroke segment records its timestamp (`Date.now()`).
     - Uses `requestAnimationFrame` to render strokes with decaying opacity based on `fadeDurationMs` (default 3000ms).
     - Automatically purges expired strokes from memory once alpha reaches 0, stopping the animation loop when canvas is empty.
   - Clear command (`COMMAND_CLEAR_TELESTRATOR` / <kbd>c</kbd>) immediately flushes all strokes.
   - Dynamic theme color:
     - Uses active accent hue (`--accent-main` in Main track, `--accent-detour` in Detour mode) or user-configured stroke color.
   - Window resize handler updates canvas dimensions and devicePixelRatio scaling without distortion.
   - Exposes programmatic API: `toggle()`, `enable()`, `disable()`, `clear()`, `isActive()`, `destroy()`.

## 2. Acceptance Criteria
- [x] Canvas element overlays slides and toggles between passive (`pointer-events: none`) and active drawing mode.
- [x] Responds to `COMMAND_TOGGLE_TELESTRATOR` (<kbd>t</kbd>) and `COMMAND_CLEAR_TELESTRATOR` (<kbd>c</kbd>).
- [x] Smooth quadratic bezier stroke interpolation during drawing.
- [x] Ephemeral fading loop reduces opacity over `fadeDurationMs` and purges expired strokes to prevent memory accumulation.
- [x] `clear()` immediately flushes all active strokes and clears the canvas.
- [x] Automatically resizes with window/viewport changes using high-DPI scaling (`devicePixelRatio`).
- [x] Clean lifecycle teardown on `destroy()`.
- [x] Comprehensive unit tests in `tests/adapters/telestrator.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented `attachTelestrator`, `injectTelestratorStyles`, and `TELESTRATOR_BASE_STYLES` in `src/adapters/render/telestrator.js`.
- High-DPI Canvas overlay with quadratic bezier curve stroke smoothing and timestamp-based opacity decay (`requestAnimationFrame`).
- Integrated clear command (<kbd>c</kbd> / `COMMAND_CLEAR_TELESTRATOR`) and toggle (<kbd>t</kbd> / `COMMAND_TOGGLE_TELESTRATOR`).
- Dynamic theme synchronization for `--accent-main` vs `--accent-detour`.
- All 8 unit tests passing with 100% pass rate. Pure browser-native zero-dependency implementation.

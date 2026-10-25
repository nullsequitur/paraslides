# Ticket: T06-04 - Glowing Laser Spotlight Adapter

- **Status:** TODO
- **Sprint:** Sprint 06
- **Target Layer:** Adapters (`src/adapters/render/laser-pointer.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement the Glowing Laser Spotlight Adapter for live presentations:
1. `src/adapters/render/laser-pointer.js`:
   - Outbound adapter subscribing to `NavigationCommandPort` dispatcher for `feedback.toggleLaser`.
   - Mounts a high-visibility spotlight element (`#laser-spotlight`) styled via CSS variables (`--laser-color`, `--laser-size`, `--laser-glow`).
   - Tracks cursor position on `pointermove` / `mousemove` using smooth hardware-accelerated transforms (`translate3d(x, y, 0)`).
   - Dynamic hue synchronization:
     - Defaults to active presentation hue (`--accent-main` in Main track, `--accent-detour` in Detour mode) or high-visibility red (`#ff3344`) if configured.
   - When laser is enabled:
     - Applies custom cursor styling or hides native cursor over slides while showing glowing spotlight dot.
   - Hides spotlight when cursor auto-hide triggers inactivity timeout.
   - Exposes programmatic API: `toggle()`, `enable()`, `disable()`, `isEnabled()`, `destroy()`.
   - Injects `LASER_POINTER_BASE_STYLES`.

## 2. Acceptance Criteria
- [ ] Laser spotlight element mounts into DOM and follows mouse movement accurately.
- [ ] Toggles on/off in response to `COMMAND_TOGGLE_LASER` feedback event or programmatic call.
- [ ] Uses CSS custom properties for styling (zero hardcoded color locks).
- [ ] Syncs with presentation mode (switches between Main and Detour hue when configured).
- [ ] Cleans up elements and event listeners on `destroy()`.
- [ ] Comprehensive unit tests in `tests/adapters/laser-pointer.test.js`.

## 3. Worker Notes & Retro Feedback
[Populated upon completion]

# Ticket: T06-01 - Declarative Configuration Schema, Validation & DOM Loader

- **Status:** DONE
- **Sprint:** Sprint 06
- **Target Layer:** Core & Adapters (`src/core/config.js`, `src/adapters/parsers/config-loader.js`)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Design and implement a declarative presentation configuration module:
1. Define a pure JavaScript domain module `src/core/config.js`:
   - Schema defaults factory `createDefaultConfig()`.
   - Defensive validation and deep-merge utility `mergeConfig(defaultConfig, userConfig)`.
   - Settings:
     - `cursorAutoHide`: `{ enabled: true, delayMs: 2500, fullscreenOnly: false }`
     - `laserPointer`: `{ enabled: true, size: 16, glowSpread: 14, color: null }` (null falls back to CSS `--accent-main` / `--laser-color`)
     - `telestrator`: `{ enabled: true, fadeDurationMs: 3000, strokeWidth: 3, color: null }` (null falls back to CSS `--accent-main` / `--telestrator-color`)
     - `navigation`: `{ continuousWrap: true, countTimeoutMs: 1500 }`
2. Implement Inbound DOM Adapter `src/adapters/parsers/config-loader.js`:
   - Extracts declarative configuration from HTML:
     - Script tag: `<script type="application/json" id="paraslides-config">`
     - Dataset attribute: `data-paraslides-config` or `data-config` on `#deck` or root
     - Merges extracted config with programmatic overrides.
   - Gracefully handles JSON syntax errors without crashing presentation initialization.

## 2. Acceptance Criteria
- [x] `createDefaultConfig()` returns frozen or deep-cloned default configuration.
- [x] `mergeConfig()` cleanly deep-merges user overrides while validating types and bounds (e.g., negative timeouts clamp or reject).
- [x] `loadConfigFromDOM()` reads configuration from `<script type="application/json" id="paraslides-config">`.
- [x] `loadConfigFromDOM()` reads configuration from element dataset attribute.
- [x] Malformed JSON logs a warning and returns valid fallback defaults.
- [x] 100% pure JavaScript in `src/core/config.js` with zero DOM or browser globals.
- [x] Comprehensive unit test suite in `tests/core/config.test.js` and `tests/adapters/config-loader.test.js`.

## 3. Worker Notes & Retro Feedback
- Implemented pure configuration schema, validation, and defensive merger in `src/core/config.js`.
- Implemented inbound DOM parser `loadConfigFromDOM` in `src/adapters/parsers/config-loader.js`.
- All 13 new unit tests passing with 100% pass rate. Pure JavaScript core invariants preserved with zero external dependencies.

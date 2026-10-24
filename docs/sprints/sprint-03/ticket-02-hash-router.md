# Ticket: S03-T02 - URL Hash Routing Adapter

- **Status:** DONE
- **Sprint:** Sprint 03
- **Target Layer:** Adapters (Inbound / Outbound)
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
Implement `src/adapters/input/hash-router.js`:
- Bidirectional synchronization between `#y/x/z` (or `#y/x` when `z=0`) URL hash and Core presentation state.
- On initialization:
  - Parses initial `window.location.hash` (e.g. `#/1/2/1` or `#1/2/0` or `#1/2`).
  - Dispatches `NAVIGATE_TO` command if a valid coordinate is present in hash.
- On state change:
  - Subscribes to the command dispatcher and updates `window.location.hash` (e.g. `#1/2` or `#1/2/1`).
  - Avoids infinite loop between hash updates and state subscriptions.
  - Supports configurable format (`oneIndexed`, `alwaysIncludeZ`, `useReplaceState`).
- On browser back/forward (`popstate` or `hashchange`):
  - Listens for hash change and dispatches `NAVIGATE_TO` to synchronize state with user's browser navigation.
- Cleanup method `destroy()` to detach listeners and unsubscribe.

## 2. Acceptance Criteria
- [x] `attachHashRouter(dispatcher, windowTarget, options)` implemented in `src/adapters/input/hash-router.js`.
- [x] Parses hashes correctly: `#0/1`, `#/0/1/2`, standard numbers, and 1-indexed option.
- [x] Bidirectional sync: state changes update hash; browser hash changes dispatch `NAVIGATE_TO`.
- [x] Infinite loops prevented via internal update guard flag.
- [x] Comprehensive unit tests in `tests/adapters/hash-router.test.js`.
- [x] 100% test pass rate.

## 3. Worker Notes & Retro Feedback
- Implemented `parseHash`, `formatHash`, and `attachHashRouter` in `src/adapters/input/hash-router.js`.
- Added mock window tests in `tests/adapters/hash-router.test.js`.
- Tested initial hash hydration, outbound state updates, `useReplaceState`, `hashchange` event dispatch, and cleanup.
- All 226 tests passing.

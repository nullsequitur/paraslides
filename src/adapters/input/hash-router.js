/**
 * @file hash-router.js
 * @description Inbound & Outbound URL Hash Routing Adapter for paraslides.
 *
 * Synchronizes core presentation state with the browser's URL hash (#y/x/z):
 * - Preserves presentation position across page reloads and browser bookmarks.
 * - Updates URL hash when state changes (without cluttering history or triggering loops).
 * - Reacts to browser back/forward buttons (hashchange / popstate) to navigate core state.
 *
 * Pure ES module with zero external runtime dependencies.
 */

import { COMMAND_NAVIGATE_TO } from '../../core/navigator.js';

/**
 * Parses a URL hash string into coordinate integers { y, x, z }.
 * Supports formats:
 * - `#y/x` (implicitly z = 0)
 * - `#y/x/z`
 * - `#/y/x/z`
 *
 * @param {string} hash - The raw hash string (e.g. `"#1/2/1"` or `"/0/3"`).
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.oneIndexed=false] - Whether coordinates in the URL are 1-indexed.
 * @returns {{ y: number, x: number, z: number } | null} Parsed coordinates or null if invalid.
 */
export function parseHash(hash, options = {}) {
  if (typeof hash !== 'string') {
    return null;
  }

  // Strip leading '#' and '/'
  const clean = hash.replace(/^#+/, '').replace(/^\/+/, '').trim();
  if (!clean) {
    return null;
  }

  const parts = clean.split('/').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const rawY = Number.parseInt(parts[0], 10);
  const rawX = Number.parseInt(parts[1], 10);
  const rawZ = parts.length === 3 ? Number.parseInt(parts[2], 10) : 0;

  if (!Number.isInteger(rawY) || !Number.isInteger(rawX) || !Number.isInteger(rawZ)) {
    return null;
  }

  const offset = options.oneIndexed ? 1 : 0;
  const y = rawY - offset;
  const x = rawX - offset;
  const z = parts.length === 3 ? rawZ - offset : 0;

  if (y < 0 || x < 0 || z < 0) {
    return null;
  }

  return { y, x, z };
}

/**
 * Formats coordinates into a canonical URL hash string.
 *
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @param {number} [z=0] - Detour index.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.oneIndexed=false] - Whether coordinates should be formatted as 1-indexed.
 * @param {boolean} [options.alwaysIncludeZ=false] - If true, always formats as `#y/x/z` even when z is 0.
 * @returns {string} Formatted hash string (e.g. `"#1/2"` or `"#1/2/1"`).
 */
export function formatHash(y, x, z = 0, options = {}) {
  const offset = options.oneIndexed ? 1 : 0;
  const safeY = Math.max(0, y) + offset;
  const safeX = Math.max(0, x) + offset;
  const safeZ = Math.max(0, z) + offset;

  if (z > 0 || options.alwaysIncludeZ) {
    return `#${safeY}/${safeX}/${safeZ}`;
  }

  return `#${safeY}/${safeX}`;
}

/**
 * Attaches the URL Hash Router to a Navigation Command Dispatcher.
 * Provides bidirectional sync between `window.location.hash` and Core State.
 *
 * @param {object} dispatcher - Navigation command dispatcher with `dispatch`, `subscribe`, and `getState`.
 * @param {Window|object} [windowTarget] - Window or mock window target (defaults to global window).
 * @param {object} [options={}] - Configuration options.
 * @param {boolean} [options.oneIndexed=false] - If true, treats URL coordinates as 1-indexed.
 * @param {boolean} [options.alwaysIncludeZ=false] - If true, always outputs 3 components `#y/x/z`.
 * @param {boolean} [options.useReplaceState=false] - If true, uses `history.replaceState` instead of direct `location.hash` assignment.
 * @returns {{ destroy: () => void } & (() => void)} Handle with callable `destroy()` method.
 * @throws {TypeError} If dispatcher is missing or invalid.
 */
export function attachHashRouter(
  dispatcher,
  windowTarget = (typeof window !== 'undefined' ? window : null),
  options = {}
) {
  if (!dispatcher || typeof dispatcher.dispatch !== 'function' || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide dispatch() and subscribe() methods.');
  }

  if (!windowTarget || typeof windowTarget !== 'object') {
    throw new TypeError('A valid window or mock window object is required.');
  }

  const location = windowTarget.location || {};
  const history = windowTarget.history || {};

  let isInternalUpdate = false;

  /**
   * Reads the current location hash string.
   * @returns {string}
   */
  function getCurrentHash() {
    return (location.hash !== undefined && location.hash !== null)
      ? String(location.hash)
      : '';
  }

  /**
   * Sets the window location hash without triggering circular update loops.
   *
   * @param {string} newHash - The formatted hash to set.
   */
  function setLocationHash(newHash) {
    const currentHash = getCurrentHash();
    if (currentHash === newHash || currentHash === `#${newHash}`) {
      return;
    }

    isInternalUpdate = true;
    try {
      if (options.useReplaceState && typeof history.replaceState === 'function') {
        const fullUrl = (location.pathname || '') + (location.search || '') + newHash;
        history.replaceState(null, '', fullUrl);
        // Sync property on mock objects if needed
        if (location.hash !== undefined) {
          location.hash = newHash;
        }
      } else {
        location.hash = newHash;
      }
    } finally {
      // In asynchronous browser event queues, reset flag on next tick
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => {
          isInternalUpdate = false;
        });
      } else {
        setTimeout(() => {
          isInternalUpdate = false;
        }, 0);
      }
    }
  }

  /**
   * Handles inbound browser hash change events (e.g. bookmark click, back/forward button).
   */
  function handleHashChange() {
    if (isInternalUpdate) {
      return;
    }

    const hash = getCurrentHash();
    const coords = parseHash(hash, options);
    if (!coords) {
      return;
    }

    const state = typeof dispatcher.getState === 'function' ? dispatcher.getState() : null;
    if (state && state.y === coords.y && state.x === coords.x && state.z === coords.z) {
      return;
    }

    dispatcher.dispatch({
      type: COMMAND_NAVIGATE_TO,
      y: coords.y,
      x: coords.x,
      z: coords.z
    });
  }

  // 1. Initial hydration: Parse initial URL hash if present
  const initialHash = getCurrentHash();
  const initialCoords = parseHash(initialHash, options);
  if (initialCoords) {
    dispatcher.dispatch({
      type: COMMAND_NAVIGATE_TO,
      y: initialCoords.y,
      x: initialCoords.x,
      z: initialCoords.z
    });
  }

  // 2. Subscribe to outbound core state changes
  const unsubscribe = dispatcher.subscribe((event) => {
    const y = typeof event.y === 'number' ? event.y : 0;
    const x = typeof event.x === 'number' ? event.x : 0;
    const z = typeof event.z === 'number' ? event.z : 0;

    const formatted = formatHash(y, x, z, options);
    setLocationHash(formatted);
  });

  // 3. Listen for browser hashchange / popstate
  if (typeof windowTarget.addEventListener === 'function') {
    windowTarget.addEventListener('hashchange', handleHashChange);
    windowTarget.addEventListener('popstate', handleHashChange);
  }

  /**
   * Cleanup and unsubscribe.
   */
  const destroy = function destroy() {
    if (typeof windowTarget.removeEventListener === 'function') {
      windowTarget.removeEventListener('hashchange', handleHashChange);
      windowTarget.removeEventListener('popstate', handleHashChange);
    }
    unsubscribe();
  };

  destroy.destroy = destroy;

  return destroy;
}

export default attachHashRouter;

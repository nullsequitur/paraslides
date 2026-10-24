/**
 * @file hud.js
 * @description Outbound HUD & Radar Indicator Adapter for paraslides.
 *
 * Subscribes to the NavigationCommandPort dispatcher and renders minimal,
 * non-intrusive status indicators into the `#hud` container:
 * - Real-time coordinate readout (.hud-coordinates):
 *   - MAIN_MODE: `Sec ${y + 1}/${totalY} · Page ${x + 1}/${totalX}`
 *   - DETOUR_MODE: `Sec ${y + 1}/${totalY} · Detour ${z}/${detourCount}`
 * - Detour Availability and active scrub cues (.hud-detour-cue):
 *   - MAIN_MODE: `[i] Detour (${detourCount})` when detours exist, hidden otherwise
 *   - DETOUR_MODE: `[h/l] Scrub · [o] Return · [j/k] Locked`
 * - Directional Radar hints (.hud-radar):
 *   - Reflects navigation capabilities (canMoveUp, canMoveLeft, canMoveDown, canMoveRight)
 * - Locked-axis transient pulse (.is-locked-pulse and data-locked-attempt="true"):
 *   - Triggers transient warning pulse when attempting vertical movement in DETOUR mode
 * - Accessible status container (role="status", aria-live="polite")
 *
 * Pure ES module with zero external runtime dependencies.
 */

import { MODE_MAIN, MODE_DETOUR } from '../../core/state.js';
import { getSectionCount, getPageCount } from '../../core/model.js';

/**
 * Minimal sleek floating CSS styles conforming to HTML_SCHEMA.md Section 4.
 * Provides floating pill layout, subtle contrast, locked pulse animation, and theme accents.
 *
 * @constant {string}
 */
export const HUD_BASE_STYLES = `
:root {
  --hud-bg: rgba(18, 20, 26, 0.85);
  --hud-fg: #eef0f6;
  --hud-border: rgba(255, 255, 255, 0.12);
  --hud-accent: #5c9eff;
  --hud-accent-detour: #ff8c5c;
  --hud-locked-warning: #ff4757;
}

#hud,
.paraslides-hud {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background-color: var(--hud-bg);
  color: var(--hud-fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  line-height: 1.2;
  border: 1px solid var(--hud-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  user-select: none;
  pointer-events: auto;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;
}

#hud[data-mode="MAIN"],
.paraslides-hud[data-mode="MAIN"] {
  --hud-current-accent: var(--hud-accent);
}

#hud[data-mode="DETOUR"],
.paraslides-hud[data-mode="DETOUR"] {
  --hud-current-accent: var(--hud-accent-detour);
  border-color: rgba(255, 140, 92, 0.35);
}

.hud-coordinates {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.hud-detour-cue {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--hud-current-accent);
  font-size: 0.78rem;
  font-weight: 500;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hud-detour-cue[data-visible="false"],
.hud-detour-cue.is-hidden {
  display: none !important;
}

.hud-radar {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
}

.hud-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  font-size: 0.75rem;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.hud-hint.has-detour-lookahead::after {
  content: "";
  position: absolute;
  top: -2px;
  right: -2px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--hud-accent-detour);
  box-shadow: 0 0 4px var(--hud-accent-detour);
}

.hud-hint.is-active {
  color: var(--hud-fg);
  background: rgba(255, 255, 255, 0.18);
  font-weight: 600;
}

.hud-hint.is-disabled {
  opacity: 0.25;
  pointer-events: none;
}

#hud.is-locked-pulse,
.paraslides-hud.is-locked-pulse {
  animation: hud-locked-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  border-color: var(--hud-locked-warning) !important;
  box-shadow: 0 0 14px rgba(255, 71, 87, 0.6) !important;
}

.hud-locked-warning {
  color: var(--hud-locked-warning);
  font-weight: 600;
  font-size: 0.78rem;
}

@keyframes hud-locked-shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60% { transform: translate3d(3px, 0, 0); }
}
`.trim();

/**
 * Injects the base HUD stylesheet into a target document or head container.
 *
 * @param {Document|ShadowRoot|object|null} [target] - Target document or container.
 * @returns {Element|null} The created or existing style element.
 */
export function injectHudStyles(target = (typeof document !== 'undefined' ? document : null)) {
  if (!target || typeof target.createElement !== 'function') {
    return null;
  }
  const existing = target.getElementById ? target.getElementById('paraslides-hud-styles') : null;
  if (existing) {
    return existing;
  }
  const styleEl = target.createElement('style');
  styleEl.id = 'paraslides-hud-styles';
  styleEl.textContent = HUD_BASE_STYLES;
  const head = target.head || (target.querySelector ? target.querySelector('head') : null) || target.body || target;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(styleEl);
  }
  return styleEl;
}

/**
 * Creates a lightweight fallback DOM element for headless or mock test environments.
 *
 * @private
 * @param {string} tagName - Tag name.
 * @returns {object} Mock DOM element.
 */
function createFallbackElement(tagName) {
  const classSet = new Set();
  const attrs = new Map();
  const children = [];

  function syncAttrFromClasses() {
    if (classSet.size === 0) {
      attrs.delete('class');
    } else {
      attrs.set('class', Array.from(classSet).join(' '));
    }
  }

  function syncClassesFromAttr(val) {
    classSet.clear();
    String(val || '')
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => classSet.add(token));
  }

  const el = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    textContent: '',
    children,
    parentNode: null,
    parentElement: null,
    dataset: {},

    classList: {
      add(...tokens) {
        tokens.forEach((t) => {
          if (t) classSet.add(String(t));
        });
        syncAttrFromClasses();
      },
      remove(...tokens) {
        tokens.forEach((t) => classSet.delete(String(t)));
        syncAttrFromClasses();
      },
      contains(token) {
        return classSet.has(String(token));
      },
      toggle(token, force) {
        const str = String(token);
        const has = classSet.has(str);
        const add = force !== undefined ? Boolean(force) : !has;
        if (add) classSet.add(str);
        else classSet.delete(str);
        syncAttrFromClasses();
        return add;
      }
    },

    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },

    setAttribute(name, value) {
      const val = String(value);
      attrs.set(name, val);
      if (name === 'class') syncClassesFromAttr(val);
      if (name.startsWith('data-')) {
        const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        el.dataset[camel] = val;
      }
    },

    hasAttribute(name) {
      return attrs.has(name);
    },

    removeAttribute(name) {
      attrs.delete(name);
      if (name === 'class') classSet.clear();
      if (name.startsWith('data-')) {
        const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        delete el.dataset[camel];
      }
    },

    appendChild(child) {
      if (!child || typeof child !== 'object') {
        throw new TypeError('Child must be an object.');
      }
      if (child.parentNode && typeof child.parentNode.removeChild === 'function') {
        child.parentNode.removeChild(child);
      }
      child.parentNode = el;
      child.parentElement = el;
      children.push(child);
      return child;
    },

    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentNode = null;
        child.parentElement = null;
      }
      return child;
    },

    querySelector(selector) {
      const trimmed = selector.trim();
      if (trimmed.startsWith('.')) {
        const cls = trimmed.slice(1);
        for (const child of children) {
          if (child.classList?.contains?.(cls)) return child;
          const nested = child.querySelector?.(selector);
          if (nested) return nested;
        }
      }
      return null;
    }
  };

  return el;
}

/**
 * Retrieves an existing child element matching a CSS class, or creates and appends one.
 *
 * @private
 * @param {Element|object} parent - Parent element.
 * @param {string} className - Class name to match and assign.
 * @param {string} [tagName='div'] - Element tag name.
 * @param {object} [options={}] - Options containing optional custom createElement.
 * @returns {Element|object} Retrieved or created child element.
 */
function getOrCreateChild(parent, className, tagName = 'div', options = {}) {
  let child = parent.querySelector ? parent.querySelector(`.${className}`) : null;
  if (!child) {
    if (typeof options.createElement === 'function') {
      child = options.createElement(tagName);
    } else {
      const doc = parent.ownerDocument || (typeof document !== 'undefined' ? document : null);
      if (doc && typeof doc.createElement === 'function') {
        child = doc.createElement(tagName);
      } else {
        child = createFallbackElement(tagName);
      }
    }

    if (child.classList && typeof child.classList.add === 'function') {
      child.classList.add(className);
    } else {
      child.className = className;
    }

    parent.appendChild(child);
  }
  return child;
}

/**
 * Resolves the HUD container element from an Element, document, or CSS selector string.
 *
 * @private
 * @param {Element|string|null|undefined} input - Element or selector.
 * @returns {Element|object} Resolved HUD element.
 * @throws {TypeError} If HUD element cannot be resolved.
 */
function resolveHudElement(input) {
  let target = input;
  if (typeof target === 'string') {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      const found = document.querySelector(target);
      if (!found) {
        throw new TypeError(`No DOM element found matching selector "${target}".`);
      }
      target = found;
    } else {
      throw new TypeError(`Cannot resolve selector "${target}" without a global document.`);
    }
  }

  if (target === null || target === undefined) {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      target = document.querySelector('#hud');
    }
  }

  if (!target || typeof target !== 'object') {
    throw new TypeError('HUD container element must be a valid DOM element or selector.');
  }

  return target;
}

/**
 * Updates a directional hint indicator element's active and accessible states.
 *
 * @private
 * @param {Element|object|null} hintEl - Hint indicator element.
 * @param {boolean} isEnabled - Whether navigation in this direction is currently possible.
 */
function updateHintElement(hintEl, isEnabled) {
  if (!hintEl) return;
  if (isEnabled) {
    hintEl.classList?.add('is-active');
    hintEl.classList?.remove('is-disabled');
    hintEl.setAttribute?.('data-enabled', 'true');
    hintEl.setAttribute?.('aria-disabled', 'false');
  } else {
    hintEl.classList?.remove('is-active');
    hintEl.classList?.add('is-disabled');
    hintEl.setAttribute?.('data-enabled', 'false');
    hintEl.setAttribute?.('aria-disabled', 'true');
  }
}

/**
 * Attaches the HUD & Radar Outbound Adapter to a Navigation Command Dispatcher.
 * Renders real-time coordinate readouts, detour cues, directional radar indicators,
 * and locked-axis pulse feedback into the `#hud` container.
 *
 * @param {object} dispatcher - Navigation command dispatcher implementing `subscribe(listener)`.
 * @param {Element|string|object} [hudElement] - Container element or CSS selector (defaults to `#hud`).
 * @param {object} [options={}] - Configuration options.
 * @param {object} [options.topology] - Deck topology. If omitted, derived from `dispatcher.getTopology()`.
 * @param {boolean} [options.injectStyles=false] - Whether to automatically inject default CSS styles.
 * @param {number} [options.pulseDuration=600] - Duration in ms for locked-axis transient pulse.
 * @param {boolean} [options.compactDetour=false] - If true, detour mode formats coordinates as `Detour z/Z_max`.
 * @param {(event: object) => void} [options.onRender] - Optional callback invoked on each render pass.
 * @returns {{ destroy: () => void } & (() => void)} Handle with callable `destroy()` method.
 * @throws {TypeError} If dispatcher or hudElement is invalid.
 */
export function attachHudRenderer(dispatcher, hudElement, options = {}) {
  if (!dispatcher || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide a subscribe() function.');
  }

  const container = resolveHudElement(hudElement || options.hudElement);

  if (options.injectStyles) {
    injectHudStyles();
  }

  // Ensure container accessibility attributes
  if (typeof container.setAttribute === 'function') {
    if (!container.hasAttribute?.('role')) {
      container.setAttribute('role', 'status');
    }
    if (!container.hasAttribute?.('aria-live')) {
      container.setAttribute('aria-live', 'polite');
    }
  }

  if (container.classList && typeof container.classList.add === 'function') {
    container.classList.add('paraslides-hud');
  }

  // Retrieve or create sub-elements
  const coordinatesEl = getOrCreateChild(container, 'hud-coordinates', 'div', options);
  const detourCueEl = getOrCreateChild(container, 'hud-detour-cue', 'div', options);
  const radarEl = getOrCreateChild(container, 'hud-radar', 'div', options);
  if (radarEl && typeof radarEl.setAttribute === 'function') {
    radarEl.setAttribute('aria-label', 'Directional Radar');
  }

  // Create directional radar hints inside .hud-radar
  const hintUp = getOrCreateChild(radarEl, 'hud-hint-up', 'span', options);
  const hintLeft = getOrCreateChild(radarEl, 'hud-hint-left', 'span', options);
  const hintDown = getOrCreateChild(radarEl, 'hud-hint-down', 'span', options);
  const hintRight = getOrCreateChild(radarEl, 'hud-hint-right', 'span', options);
  const hintDepth = getOrCreateChild(radarEl, 'hud-hint-depth', 'span', options);

  if (hintUp) {
    hintUp.classList?.add('hud-hint');
    if (!hintUp.textContent) hintUp.textContent = '↑';
    hintUp.setAttribute?.('title', 'Up (k)');
  }
  if (hintLeft) {
    hintLeft.classList?.add('hud-hint');
    if (!hintLeft.textContent) hintLeft.textContent = '←';
    hintLeft.setAttribute?.('title', 'Left (h)');
  }
  if (hintDown) {
    hintDown.classList?.add('hud-hint');
    if (!hintDown.textContent) hintDown.textContent = '↓';
    hintDown.setAttribute?.('title', 'Down (j)');
  }
  if (hintRight) {
    hintRight.classList?.add('hud-hint');
    if (!hintRight.textContent) hintRight.textContent = '→';
    hintRight.setAttribute?.('title', 'Right (l)');
  }
  if (hintDepth) {
    hintDepth.classList?.add('hud-hint');
    if (!hintDepth.textContent) hintDepth.textContent = '⤓';
    hintDepth.setAttribute?.('title', 'Detour (i)');
  }

  let lockedTimer = null;
  const pulseDuration = typeof options.pulseDuration === 'number' ? options.pulseDuration : 600;

  /**
   * Clears any active locked-axis transient pulse state.
   */
  function clearLockedPulse() {
    if (lockedTimer !== null) {
      clearTimeout(lockedTimer);
      lockedTimer = null;
    }
    container.classList?.remove('is-locked-pulse');
    container.removeAttribute?.('data-locked-attempt');
  }

  /**
   * Triggers the locked-axis visual pulse and accessibility cue.
   */
  function triggerLockedPulse() {
    clearLockedPulse();
    container.classList?.add('is-locked-pulse');
    container.setAttribute?.('data-locked-attempt', 'true');
    lockedTimer = setTimeout(() => {
      clearLockedPulse();
    }, pulseDuration);
  }

  /**
   * State subscriber callback triggered on every state emission and initial hydration.
   *
   * @param {object} event - State change event.
   */
  function handleStateChange(event) {
    if (!event || typeof event !== 'object') {
      return;
    }

    const y = typeof event.y === 'number' ? event.y : 0;
    const x = typeof event.x === 'number' ? event.x : 0;
    const z = typeof event.z === 'number' ? event.z : 0;
    const mode = event.mode || (z === 0 ? MODE_MAIN : MODE_DETOUR);
    const hasDetour = Boolean(event.hasDetour);
    const detourCount = typeof event.detourCount === 'number' ? event.detourCount : 0;

    // Resolve topology to determine total section and page counts
    const topology = options.topology || (typeof dispatcher.getTopology === 'function' ? dispatcher.getTopology() : null);
    const totalY = topology ? getSectionCount(topology) : (typeof options.totalSections === 'number' ? options.totalSections : y + 1);
    const totalX = topology ? getPageCount(topology, y) : (typeof options.totalPages === 'number' ? options.totalPages : x + 1);

    // 1. Synchronize container root attributes
    container.setAttribute?.('data-mode', mode);
    container.setAttribute?.('data-active-y', String(y));
    container.setAttribute?.('data-active-x', String(x));
    container.setAttribute?.('data-active-z', String(z));

    // 2. Format coordinate readout
    if (mode === MODE_MAIN || z === 0) {
      coordinatesEl.textContent = `Sec ${y + 1}/${totalY} · Page ${x + 1}/${totalX}`;
    } else {
      if (options.compactDetour) {
        coordinatesEl.textContent = `Detour ${z}/${detourCount}`;
      } else {
        coordinatesEl.textContent = `Sec ${y + 1}/${totalY} · Detour ${z}/${detourCount}`;
      }
    }

    // 3. Update Detour Availability & Mode Cues
    if (mode === MODE_MAIN || z === 0) {
      if (hasDetour) {
        detourCueEl.textContent = `[i] Detour (${detourCount})`;
        detourCueEl.classList?.add('is-visible');
        detourCueEl.classList?.remove('is-hidden');
        detourCueEl.setAttribute?.('data-visible', 'true');
        detourCueEl.removeAttribute?.('aria-hidden');
      } else {
        detourCueEl.textContent = '';
        detourCueEl.classList?.remove('is-visible');
        detourCueEl.classList?.add('is-hidden');
        detourCueEl.setAttribute?.('data-visible', 'false');
        detourCueEl.setAttribute?.('aria-hidden', 'true');
      }
    } else {
      // In DETOUR_MODE
      detourCueEl.textContent = '[h/l] Scrub · [o] Return · [j/k] Locked';
      detourCueEl.classList?.add('is-visible');
      detourCueEl.classList?.remove('is-hidden');
      detourCueEl.setAttribute?.('data-visible', 'true');
      detourCueEl.removeAttribute?.('aria-hidden');
    }

    // 4. Directional Radar Hints & 3D Compass
    const canMoveLeft = Boolean(event.canMoveLeft);
    const canMoveRight = Boolean(event.canMoveRight);
    const canMoveUp = Boolean(event.canMoveUp);
    const canMoveDown = Boolean(event.canMoveDown);
    const hasDetourLeft = Boolean(event.hasDetourLeft);
    const hasDetourRight = Boolean(event.hasDetourRight);

    updateHintElement(hintUp, canMoveUp);
    updateHintElement(hintLeft, canMoveLeft);
    updateHintElement(hintDown, canMoveDown);
    updateHintElement(hintRight, canMoveRight);

    // Look-ahead detour indicators on horizontal hints
    if (hasDetourLeft) {
      hintLeft.classList?.add('has-detour-lookahead');
      hintLeft.setAttribute?.('data-has-detour-adjacent', 'true');
    } else {
      hintLeft.classList?.remove('has-detour-lookahead');
      hintLeft.removeAttribute?.('data-has-detour-adjacent');
    }

    if (hasDetourRight) {
      hintRight.classList?.add('has-detour-lookahead');
      hintRight.setAttribute?.('data-has-detour-adjacent', 'true');
    } else {
      hintRight.classList?.remove('has-detour-lookahead');
      hintRight.removeAttribute?.('data-has-detour-adjacent');
    }

    // Depth cue in compass (z-axis transition)
    if (hintDepth) {
      if (mode === MODE_MAIN || z === 0) {
        hintDepth.textContent = '⤓';
        hintDepth.setAttribute?.('title', hasDetour ? 'Enter Detour (i)' : 'No Detours');
        updateHintElement(hintDepth, hasDetour);
      } else {
        hintDepth.textContent = '⤒';
        hintDepth.setAttribute?.('title', 'Exit Detour (o)');
        updateHintElement(hintDepth, true);
      }
    }

    radarEl.setAttribute?.('data-can-move-left', String(canMoveLeft));
    radarEl.setAttribute?.('data-can-move-right', String(canMoveRight));
    radarEl.setAttribute?.('data-can-move-up', String(canMoveUp));
    radarEl.setAttribute?.('data-can-move-down', String(canMoveDown));
    radarEl.setAttribute?.('data-has-detour-left', String(hasDetourLeft));
    radarEl.setAttribute?.('data-has-detour-right', String(hasDetourRight));

    // 5. Locked-axis Warning / Pulse
    const isLockedAttempt = Boolean(event.feedback?.verticalLockedAttempt || event.verticalLockedAttempt);
    if (isLockedAttempt) {
      triggerLockedPulse();
    } else {
      clearLockedPulse();
    }

    // 6. Optional onRender callback
    if (typeof options.onRender === 'function') {
      options.onRender(event);
    }
  }

  // Subscribe to command dispatcher (immediately invokes handleStateChange with current state)
  let unsubscribe = dispatcher.subscribe(handleStateChange);

  /**
   * Unsubscribes from dispatcher, cancels timers, and cleans up HUD references.
   */
  const destroy = function destroy() {
    clearLockedPulse();
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  destroy.destroy = destroy;

  return destroy;
}

export default attachHudRenderer;

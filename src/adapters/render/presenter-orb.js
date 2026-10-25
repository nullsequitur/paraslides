/**
 * @file presenter-orb.js
 * @description Outbound Presenter Status Orb Adapter for paraslides.
 *
 * Renders an ambient, non-intrusive glowing status orb at the bottom-right corner:
 * - Normal State: Subtle ambient glow in primary accent (`var(--accent-main)`).
 * - Detour Available State: Gentle pulsating glow in detour accent (`var(--accent-detour)`).
 * - In Detour State: Glowing in detour accent (`var(--accent-detour)`).
 * - End of Section State: Gentle pulsating glow in section-end accent (`var(--orb-color-section-end)`),
 *   indicating the next linear step wraps into the next row.
 * - Non-overlapping: Dynamically shifts position above `#hud` when `#hud` is visible,
 *   and nests cleanly at the bottom-right when `#hud` is hidden.
 * - Toggled via `COMMAND_TOGGLE_ORB` (<kbd>B</kbd>).
 * - Clickable: Clicking when a detour is available enters detour; clicking inside detour returns.
 *
 * Pure ES module with zero external runtime dependencies.
 */

import { MODE_MAIN, MODE_DETOUR } from '../../core/state.js';
import { COMMAND_ENTER_DETOUR, COMMAND_EXIT_DETOUR } from '../../core/navigator.js';

/**
 * Base stylesheet for the Presenter Status Orb.
 * Uses CSS custom properties exclusively (zero hardcoded colors).
 *
 * @constant {string}
 */
export const ORB_BASE_STYLES = `
:root {
  --dock-bottom: 1.75rem;
  --dock-right: 2rem;
  --orb-size: 11px;
  --dock-gap: 0.85rem;
  --orb-color-normal: var(--accent-main, #5c9eff);
  --orb-color-detour: var(--accent-detour, #ff8c5c);
  --orb-color-section-end: #c084fc;
  --orb-glow-spread: 8px;
}

#presenter-orb,
.paraslides-presenter-orb {
  position: fixed;
  bottom: calc(var(--dock-bottom) + 11.5px);
  right: var(--dock-right);
  z-index: 1001;
  width: var(--orb-size);
  height: var(--orb-size);
  border-radius: 50%;
  background-color: var(--orb-current-color, var(--orb-color-normal));
  box-shadow: 0 0 var(--orb-glow-spread) var(--orb-current-color, var(--orb-color-normal));
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
  box-sizing: border-box;
  animation: paraslides-orb-breathe 2.4s infinite ease-in-out;
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1),
              background-color 0.3s ease,
              box-shadow 0.3s ease,
              opacity 0.25s ease;
}

/* When the orb is active and visible on the page, shift the HUD navigation bar to its left on the same horizontal line */
#hud.has-orb-adjacent,
body:has(#presenter-orb:not(.is-hidden)) #hud,
.paraslides-hud.has-orb-adjacent {
  right: calc(var(--dock-right) + var(--orb-size) + var(--dock-gap)) !important;
}

/* Hidden state when toggled off with B */
#presenter-orb.is-hidden,
.paraslides-presenter-orb.is-hidden,
#presenter-orb[data-hidden="true"],
.paraslides-presenter-orb[data-hidden="true"] {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: scale(0.4) !important;
}

/* Fullscreen support */
:fullscreen #presenter-orb,
:-webkit-full-screen #presenter-orb {
  z-index: 10001;
}

/* Status variants */
#presenter-orb[data-status="normal"],
.paraslides-presenter-orb[data-status="normal"] {
  --orb-current-color: var(--orb-color-normal);
  opacity: 0.7;
}

#presenter-orb[data-status="detour-available"],
.paraslides-presenter-orb[data-status="detour-available"] {
  --orb-current-color: var(--orb-color-detour);
  opacity: 1;
}

#presenter-orb[data-status="in-detour"],
.paraslides-presenter-orb[data-status="in-detour"] {
  --orb-current-color: var(--orb-color-detour);
  opacity: 1;
}

#presenter-orb[data-status="section-end"],
.paraslides-presenter-orb[data-status="section-end"] {
  --orb-current-color: var(--orb-color-section-end);
  opacity: 0.95;
}

/* When both detour is available and it is the last slide in the section:
   Detour is primary (core color), encircled by a subtle section-end halo ring! */
#presenter-orb[data-status="detour-and-section-end"],
.paraslides-presenter-orb[data-status="detour-and-section-end"] {
  --orb-current-color: var(--orb-color-detour);
  opacity: 1;
  box-shadow: 0 0 7px var(--orb-color-detour), 0 0 14px var(--orb-color-section-end);
  outline: 1.5px solid var(--orb-color-section-end);
  outline-offset: 2px;
}

/* Always-on subtle, gentle breathing pulse */
@keyframes paraslides-orb-breathe {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 var(--orb-glow-spread) var(--orb-current-color, var(--orb-color-normal));
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 calc(var(--orb-glow-spread) + 4px) var(--orb-current-color, var(--orb-color-normal));
  }
}
`.trim();

/**
 * Injects the base presenter orb stylesheet into the document head.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {Element|null}
 */
export function injectPresenterOrbStyles(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  if (doc.getElementById && doc.getElementById('paraslides-presenter-orb-styles')) {
    return doc.getElementById('paraslides-presenter-orb-styles');
  }
  const style = doc.createElement('style');
  style.id = 'paraslides-presenter-orb-styles';
  style.textContent = ORB_BASE_STYLES;
  const head = doc.head || doc.body;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(style);
  }
  return style;
}

/**
 * Attaches the Presenter Status Orb Outbound Adapter.
 *
 * @param {object} dispatcher - Navigation command dispatcher.
 * @param {Element|object} [container] - Container element to mount orb (defaults to document.body).
 * @param {object} [options={}] - Options.
 * @param {Document|object} [options.document] - Document override.
 * @param {boolean} [options.injectStyles=false] - Whether to inject CSS styles.
 * @param {(status: string) => void} [options.onStatusChange] - Callback invoked on status update.
 * @returns {{
 *   toggle: () => boolean,
 *   show: () => void,
 *   hide: () => void,
 *   isVisible: () => boolean,
 *   getStatus: () => string,
 *   destroy: () => void
 * } & (() => void)}
 */
export function attachPresenterOrb(dispatcher, container, options = {}) {
  if (!dispatcher || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide a subscribe() function.');
  }

  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  const parent = container || (doc && doc.body) || null;

  if (options.injectStyles) {
    injectPresenterOrbStyles(doc);
  }

  // Retrieve or create orb element
  let orbEl = (doc && typeof doc.getElementById === 'function') ? doc.getElementById('presenter-orb') : null;
  let created = false;

  if (!orbEl && doc && typeof doc.createElement === 'function' && parent) {
    orbEl = doc.createElement('aside');
    orbEl.id = 'presenter-orb';
    orbEl.classList?.add('paraslides-presenter-orb');
    orbEl.setAttribute?.('role', 'status');
    orbEl.setAttribute?.('aria-label', 'Presenter Status Beacon');
    parent.appendChild(orbEl);
    created = true;
  }

  let isOrbVisible = true;
  let currentStatus = 'normal';

  function setStatus(status) {
    currentStatus = status;
    if (orbEl) {
      orbEl.setAttribute?.('data-status', status);
      let title = 'Presenter Status: Normal';
      if (status === 'detour-available') title = 'Detour available [i]';
      else if (status === 'in-detour') title = 'Inside detour [o]';
      else if (status === 'section-end') title = 'End of section (wraps next)';
      else if (status === 'detour-and-section-end') title = 'Detour available [i] · End of section';
      orbEl.setAttribute?.('title', title);
    }
    if (typeof options.onStatusChange === 'function') {
      options.onStatusChange(status);
    }
  }

  function syncHudOverlap() {
    if (!doc) return;
    const hud = (typeof doc.getElementById === 'function' && doc.getElementById('hud'))
      || (typeof doc.querySelector === 'function' && doc.querySelector('.paraslides-hud'));
    if (hud) {
      if (isOrbVisible) {
        hud.classList?.add('has-orb-adjacent');
        hud.setAttribute?.('data-has-orb-adjacent', 'true');
      } else {
        hud.classList?.remove('has-orb-adjacent');
        hud.removeAttribute?.('data-has-orb-adjacent');
      }
    }
  }

  function toggleOrbVisibility(force) {
    isOrbVisible = force !== undefined ? Boolean(force) : !isOrbVisible;
    if (orbEl) {
      if (isOrbVisible) {
        orbEl.classList?.remove('is-hidden');
        orbEl.removeAttribute?.('data-hidden');
      } else {
        orbEl.classList?.add('is-hidden');
        orbEl.setAttribute?.('data-hidden', 'true');
      }
    }
    syncHudOverlap();
    return isOrbVisible;
  }

  function handleClick() {
    if (currentStatus === 'detour-available' || currentStatus === 'detour-and-section-end') {
      dispatcher.dispatch?.(COMMAND_ENTER_DETOUR);
    } else if (currentStatus === 'in-detour') {
      dispatcher.dispatch?.(COMMAND_EXIT_DETOUR);
    }
  }

  if (orbEl && typeof orbEl.addEventListener === 'function') {
    orbEl.addEventListener('click', handleClick);
  }

  function handleStateChange(event) {
    if (!event || typeof event !== 'object') return;

    if (event.feedback?.toggleOrb || event.toggleOrb) {
      toggleOrbVisibility();
    }

    const z = typeof event.z === 'number' ? event.z : 0;
    const mode = event.mode || (z === 0 ? MODE_MAIN : MODE_DETOUR);
    const hasDetour = Boolean(event.hasDetour);
    const willWrapNextSection = Boolean(event.willWrapNextSection);

    let nextStatus = 'normal';
    if (mode === MODE_DETOUR || z > 0) {
      nextStatus = 'in-detour';
    } else if (hasDetour && willWrapNextSection) {
      nextStatus = 'detour-and-section-end';
    } else if (hasDetour) {
      nextStatus = 'detour-available';
    } else if (willWrapNextSection) {
      nextStatus = 'section-end';
    }

    setStatus(nextStatus);
    syncHudOverlap();
  }

  // Initial HUD layout sync
  syncHudOverlap();

  // Subscribe to command dispatcher
  let unsubscribe = dispatcher.subscribe(handleStateChange);

  const destroy = function destroy() {
    if (orbEl && typeof orbEl.removeEventListener === 'function') {
      orbEl.removeEventListener('click', handleClick);
    }
    if (created && orbEl && orbEl.parentNode) {
      orbEl.parentNode.removeChild(orbEl);
    }
    const hud = (doc && typeof doc.getElementById === 'function' && doc.getElementById('hud'))
      || (doc && typeof doc.querySelector === 'function' && doc.querySelector('.paraslides-hud'));
    if (hud) {
      hud.classList?.remove('has-orb-adjacent');
      hud.removeAttribute?.('data-has-orb-adjacent');
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  destroy.toggle = () => toggleOrbVisibility();
  destroy.show = () => toggleOrbVisibility(true);
  destroy.hide = () => toggleOrbVisibility(false);
  destroy.isVisible = () => isOrbVisible;
  destroy.getStatus = () => currentStatus;
  destroy.syncOverlap = syncHudOverlap;
  destroy.destroy = destroy;

  return destroy;
}

export default attachPresenterOrb;

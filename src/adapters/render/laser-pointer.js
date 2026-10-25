/**
 * @file laser-pointer.js
 * @description Outbound Glowing Laser Spotlight Adapter for paraslides.
 *
 * Renders a hardware-accelerated glowing laser spotlight dot that follows the presenter's
 * cursor with zero external runtime dependencies and smooth GPU transforms.
 * Toggled via COMMAND_TOGGLE_LASER (<kbd>p</kbd>) or programmatic API.
 */

import { MODE_MAIN, MODE_DETOUR } from '../../core/state.js';

/**
 * Base stylesheet for the Glowing Laser Spotlight.
 *
 * @constant {string}
 */
export const LASER_POINTER_BASE_STYLES = `
:root {
  --laser-color: var(--accent-main, #ff3344);
  --laser-size: 16px;
  --laser-glow: 14px;
}

#laser-spotlight,
.paraslides-laser-spotlight {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--laser-size);
  height: var(--laser-size);
  border-radius: 50%;
  background-color: var(--laser-current-color, var(--laser-color));
  box-shadow: 0 0 var(--laser-glow) var(--laser-current-color, var(--laser-color)),
              0 0 calc(var(--laser-glow) * 1.8) var(--laser-current-color, var(--laser-color));
  pointer-events: none;
  z-index: 10000;
  transform: translate3d(-100px, -100px, 0);
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.04s ease-out;
  will-change: transform, opacity;
}

#laser-spotlight.is-active,
.paraslides-laser-spotlight.is-active {
  opacity: 1;
}

#laser-spotlight[data-mode="DETOUR"],
.paraslides-laser-spotlight[data-mode="DETOUR"] {
  --laser-current-color: var(--accent-detour, #ff8c5c);
}

body.has-laser-active,
body.has-laser-active * {
  cursor: none !important;
}
`.trim();

/**
 * Injects laser spotlight CSS styles into the document head if not already present.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {Element|null} Injected or existing style element.
 */
export function injectLaserPointerStyles(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  if (doc.getElementById && doc.getElementById('paraslides-laser-spotlight-styles')) {
    return doc.getElementById('paraslides-laser-spotlight-styles');
  }
  const style = doc.createElement('style');
  style.id = 'paraslides-laser-spotlight-styles';
  style.textContent = LASER_POINTER_BASE_STYLES;
  const head = doc.head || doc.body;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(style);
  }
  return style;
}

/**
 * Attaches the Glowing Laser Spotlight Adapter to a presentation.
 *
 * @param {object} dispatcher - Navigation command dispatcher.
 * @param {Element|object} [container] - Container element to mount spotlight (defaults to doc.body).
 * @param {object} [options={}] - Options.
 * @param {number} [options.size=16] - Laser dot diameter in px.
 * @param {number} [options.glowSpread=14] - Halo glow spread in px.
 * @param {string|null} [options.color=null] - Fixed color override (e.g. '#ff3344'). If null, syncs with active theme hue.
 * @param {Document|object} [options.document] - Target document override.
 * @param {boolean} [options.injectStyles=false] - Whether to inject stylesheet into head.
 * @param {(enabled: boolean) => void} [options.onToggle] - Callback on laser enable/disable.
 * @returns {{
 *   toggle: (force?: boolean) => boolean,
 *   enable: () => void,
 *   disable: () => void,
 *   isEnabled: () => boolean,
 *   destroy: () => void
 * } & (() => void)}
 */
export function attachLaserPointer(dispatcher, container = null, options = {}) {
  if (!dispatcher || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide a subscribe() function.');
  }

  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  const parent = container || (doc && doc.body) || null;
  const size = typeof options.size === 'number' ? Math.max(1, options.size) : 16;
  const glowSpread = typeof options.glowSpread === 'number' ? Math.max(0, options.glowSpread) : 14;
  const explicitColor = options.color || null;

  if (options.injectStyles) {
    injectLaserPointerStyles(doc);
  }

  // Create or locate laser spotlight element
  let laserEl = (doc && typeof doc.getElementById === 'function') ? doc.getElementById('laser-spotlight') : null;
  let created = false;

  if (!laserEl && doc && typeof doc.createElement === 'function' && parent) {
    laserEl = doc.createElement('aside');
    laserEl.id = 'laser-spotlight';
    laserEl.classList?.add?.('paraslides-laser-spotlight');
    laserEl.setAttribute?.('aria-hidden', 'true');
    laserEl.setAttribute?.('data-mode', 'MAIN');

    if (size !== 16 || glowSpread !== 14 || explicitColor) {
      const styles = [];
      if (size !== 16) styles.push(`--laser-size: ${size}px`);
      if (glowSpread !== 14) styles.push(`--laser-glow: ${glowSpread}px`);
      if (explicitColor) styles.push(`--laser-current-color: ${explicitColor}`);
      laserEl.setAttribute?.('style', styles.join('; '));
    }

    parent.appendChild(laserEl);
    created = true;
  }

  let isLaserActive = false;

  function setLaserActive(active) {
    const nextState = Boolean(active);
    if (isLaserActive === nextState) return;
    isLaserActive = nextState;

    if (laserEl) {
      if (isLaserActive) {
        laserEl.classList?.add?.('is-active');
        laserEl.setAttribute?.('data-active', 'true');
      } else {
        laserEl.classList?.remove?.('is-active');
        laserEl.removeAttribute?.('data-active');
      }
    }

    const bodyEl = (doc && doc.body) || (parent && parent.tagName === 'BODY' ? parent : null);
    if (bodyEl) {
      if (isLaserActive) {
        bodyEl.classList?.add?.('has-laser-active');
      } else {
        bodyEl.classList?.remove?.('has-laser-active');
      }
    }

    if (typeof options.onToggle === 'function') {
      options.onToggle(isLaserActive);
    }
  }

  function toggleLaser(force) {
    const next = force !== undefined ? Boolean(force) : !isLaserActive;
    setLaserActive(next);
    return isLaserActive;
  }

  function handlePointerMove(e) {
    if (!laserEl) return;
    const clientX = e.clientX ?? 0;
    const clientY = e.clientY ?? 0;
    const half = size / 2;
    const transformStyle = `transform: translate3d(${clientX - half}px, ${clientY - half}px, 0);`;

    const existingStyle = laserEl.getAttribute?.('style') || '';
    const cleanedStyle = existingStyle.replace(/transform:[^;]+;?/gi, '').trim();
    const newStyle = cleanedStyle ? `${cleanedStyle} ${transformStyle}` : transformStyle;
    laserEl.setAttribute?.('style', newStyle);
  }

  // Pointer move listeners
  const moveTargets = [doc, parent].filter(Boolean);
  for (const target of moveTargets) {
    if (typeof target.addEventListener === 'function') {
      target.addEventListener('pointermove', handlePointerMove, { passive: true });
      target.addEventListener('mousemove', handlePointerMove, { passive: true });
    }
  }

  // Subscribe to command dispatcher
  let unsubscribe = dispatcher.subscribe((event) => {
    if (!event || typeof event !== 'object') return;

    if (event.feedback?.toggleLaser || event.toggleLaser) {
      toggleLaser();
    }

    const z = typeof event.z === 'number' ? event.z : 0;
    const mode = event.mode || (z === 0 ? MODE_MAIN : MODE_DETOUR);

    if (laserEl) {
      laserEl.setAttribute?.('data-mode', mode);
      if (!explicitColor) {
        if (mode === MODE_DETOUR) {
          laserEl.setAttribute?.('data-mode', 'DETOUR');
        } else {
          laserEl.setAttribute?.('data-mode', 'MAIN');
        }
      }
    }
  });

  const destroy = function destroy() {
    setLaserActive(false);

    for (const target of moveTargets) {
      if (typeof target.removeEventListener === 'function') {
        target.removeEventListener('pointermove', handlePointerMove);
        target.removeEventListener('mousemove', handlePointerMove);
      }
    }

    if (created && laserEl && laserEl.parentNode) {
      laserEl.parentNode.removeChild(laserEl);
    }

    const bodyEl = (doc && doc.body) || (parent && parent.tagName === 'BODY' ? parent : null);
    if (bodyEl) {
      bodyEl.classList?.remove?.('has-laser-active');
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  destroy.toggle = (force) => toggleLaser(force);
  destroy.enable = () => setLaserActive(true);
  destroy.disable = () => setLaserActive(false);
  destroy.isEnabled = () => isLaserActive;
  destroy.destroy = destroy;

  return destroy;
}

export default attachLaserPointer;

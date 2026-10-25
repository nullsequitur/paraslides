/**
 * @file cursor-auto-hide.js
 * @description Outbound Fullscreen Cursor Auto-Hide Adapter for paraslides.
 *
 * Automatically suppresses the mouse cursor after an inactivity threshold during presentations,
 * instantly restoring visibility on any user interaction.
 * Pure ES module with zero external runtime dependencies.
 */

import { isFullscreen } from './fullscreen.js';

/**
 * Base stylesheet for hiding cursor on presentation containers.
 *
 * @constant {string}
 */
export const CURSOR_AUTO_HIDE_STYLES = `
.is-cursor-hidden,
[data-cursor-hidden="true"],
.is-cursor-hidden *,
[data-cursor-hidden="true"] * {
  cursor: none !important;
}
`.trim();

/**
 * Injects cursor auto-hide CSS styles into the document head if not already present.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {Element|null} Injected or existing style element.
 */
export function injectCursorAutoHideStyles(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  if (doc.getElementById && doc.getElementById('paraslides-cursor-auto-hide-styles')) {
    return doc.getElementById('paraslides-cursor-auto-hide-styles');
  }
  const style = doc.createElement('style');
  style.id = 'paraslides-cursor-auto-hide-styles';
  style.textContent = CURSOR_AUTO_HIDE_STYLES;
  const head = doc.head || doc.body;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(style);
  }
  return style;
}

/**
 * Attaches the Cursor Auto-Hide Adapter to a presentation element.
 *
 * @param {Element|object} targetElement - Root or presentation container element (e.g. document.body).
 * @param {object} [options={}] - Options.
 * @param {number} [options.delayMs=2500] - Inactivity duration before cursor hides (in ms).
 * @param {boolean} [options.fullscreenOnly=false] - Only hide cursor when presentation is in fullscreen mode.
 * @param {Document|object} [options.document] - Target document override.
 * @param {boolean} [options.injectStyles=false] - Whether to inject CSS styles into document head.
 * @param {(hidden: boolean) => void} [options.onVisibilityChange] - Callback invoked when cursor hides/unhides.
 * @returns {{
 *   show: () => void,
 *   hide: () => void,
 *   reset: () => void,
 *   isHidden: () => boolean,
 *   destroy: () => void
 * } & (() => void)}
 */
export function attachCursorAutoHide(targetElement, options = {}) {
  const doc = options.document
    || (targetElement && targetElement.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);

  const element = targetElement || (doc && doc.body) || null;
  const delayMs = typeof options.delayMs === 'number' ? Math.max(0, options.delayMs) : 2500;
  const fullscreenOnly = Boolean(options.fullscreenOnly);

  if (options.injectStyles) {
    injectCursorAutoHideStyles(doc);
  }

  let isHidden = false;
  let timerId = null;

  function setCursorHidden(hidden) {
    if (isHidden === hidden) return;
    isHidden = hidden;

    if (element) {
      if (hidden) {
        element.classList?.add?.('is-cursor-hidden');
        element.setAttribute?.('data-cursor-hidden', 'true');
      } else {
        element.classList?.remove?.('is-cursor-hidden');
        element.removeAttribute?.('data-cursor-hidden');
      }
    }

    if (typeof options.onVisibilityChange === 'function') {
      options.onVisibilityChange(hidden);
    }
  }

  function shouldHide() {
    if (!fullscreenOnly) return true;
    return isFullscreen(doc);
  }

  function onInactivityTimeout() {
    timerId = null;
    if (shouldHide()) {
      setCursorHidden(true);
    }
  }

  function scheduleInactivity() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (delayMs > 0) {
      timerId = setTimeout(onInactivityTimeout, delayMs);
    }
  }

  function handleActivity() {
    if (isHidden) {
      setCursorHidden(false);
    }
    scheduleInactivity();
  }

  function handleFullscreenChange() {
    if (fullscreenOnly) {
      if (!isFullscreen(doc)) {
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
        setCursorHidden(false);
      } else {
        scheduleInactivity();
      }
    }
  }

  // Event listeners for activity
  const eventTypes = ['pointermove', 'mousemove', 'pointerdown', 'mousedown', 'keydown'];
  const listenerTargets = [element, doc].filter(Boolean);

  for (const target of listenerTargets) {
    if (typeof target.addEventListener === 'function') {
      for (const evt of eventTypes) {
        target.addEventListener(evt, handleActivity, { passive: true });
      }
    }
  }

  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('fullscreenchange', handleFullscreenChange);
    doc.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  }

  // Initial schedule
  if (shouldHide()) {
    scheduleInactivity();
  }

  const destroy = function destroy() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }

    setCursorHidden(false);

    for (const target of listenerTargets) {
      if (typeof target.removeEventListener === 'function') {
        for (const evt of eventTypes) {
          target.removeEventListener(evt, handleActivity);
        }
      }
    }

    if (doc && typeof doc.removeEventListener === 'function') {
      doc.removeEventListener('fullscreenchange', handleFullscreenChange);
      doc.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
  };

  destroy.show = () => {
    setCursorHidden(false);
    scheduleInactivity();
  };

  destroy.hide = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    setCursorHidden(true);
  };

  destroy.reset = scheduleInactivity;
  destroy.isHidden = () => isHidden;
  destroy.destroy = destroy;

  return destroy;
}

export default attachCursorAutoHide;

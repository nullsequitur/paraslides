/**
 * @file fullscreen.js
 * @description Outbound Fullscreen Adapter for paraslides.
 *
 * Subscribes to the NavigationCommandPort dispatcher and toggles presentation fullscreen
 * via the browser Fullscreen API with cross-vendor prefix fallbacks and safe rejection handling.
 * Pure ES module with zero external runtime dependencies.
 */

/**
 * Checks whether the document is currently in fullscreen mode.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {boolean} True if fullscreen is active.
 */
export function isFullscreen(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) return false;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Requests fullscreen for the specified root target element.
 *
 * @param {Element|object} [element] - Target element (defaults to document.documentElement).
 * @param {Document|object} [doc] - Target document.
 * @returns {Promise<void>|void}
 */
export function requestFullscreen(
  element = (typeof document !== 'undefined' ? document.documentElement : null),
  doc = (typeof document !== 'undefined' ? document : null)
) {
  if (!element) return;

  const req = element.requestFullscreen
    || element.webkitRequestFullscreen
    || element.mozRequestFullScreen
    || element.msRequestFullscreen;

  if (typeof req === 'function') {
    try {
      const res = req.call(element);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
      return res;
    } catch {
      // Ignore unsupported or user-rejected errors
    }
  }
}

/**
 * Exits fullscreen mode on the specified document.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {Promise<void>|void}
 */
export function exitFullscreen(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) return;

  const exit = doc.exitFullscreen
    || doc.webkitExitFullscreen
    || doc.mozCancelFullScreen
    || doc.msExitFullscreen;

  if (typeof exit === 'function') {
    try {
      const res = exit.call(doc);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
      return res;
    } catch {
      // Ignore unsupported or user-rejected errors
    }
  }
}

/**
 * Toggles fullscreen mode for the presentation.
 *
 * @param {Element|object} [element] - Target element.
 * @param {Document|object} [doc] - Target document.
 * @returns {Promise<void>|void}
 */
export function toggleFullscreen(
  element = (typeof document !== 'undefined' ? document.documentElement : null),
  doc = (typeof document !== 'undefined' ? document : null)
) {
  const targetDoc = doc || (element && element.ownerDocument) || (typeof document !== 'undefined' ? document : null);
  if (isFullscreen(targetDoc)) {
    return exitFullscreen(targetDoc);
  }
  return requestFullscreen(element, targetDoc);
}

/**
 * Attaches the Fullscreen Outbound Adapter to a Navigation Command Dispatcher.
 *
 * @param {object} dispatcher - Navigation command dispatcher.
 * @param {Element|object} [targetElement] - Target element for fullscreen (defaults to document.documentElement).
 * @param {object} [options={}] - Options.
 * @param {Document|object} [options.document] - Target document override.
 * @param {(isFullscreen: boolean) => void} [options.onChange] - Callback invoked on fullscreen change.
 * @returns {{
 *   toggle: () => void,
 *   request: () => void,
 *   exit: () => void,
 *   isFullscreen: () => boolean,
 *   destroy: () => void
 * } & (() => void)}
 */
export function attachFullscreenAdapter(dispatcher, targetElement, options = {}) {
  if (!dispatcher || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide a subscribe() function.');
  }

  const doc = options.document
    || (targetElement && targetElement.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);

  const getElement = () => targetElement
    || (doc ? doc.documentElement : null)
    || (typeof document !== 'undefined' ? document.documentElement : null);

  const unsubscribe = dispatcher.subscribe((event) => {
    if (event.feedback?.toggleFullscreen || event.toggleFullscreen) {
      toggleFullscreen(getElement(), doc);
    }
  });

  const handleFullscreenChange = () => {
    if (typeof options.onChange === 'function') {
      options.onChange(isFullscreen(doc));
    }
  };

  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('fullscreenchange', handleFullscreenChange);
    doc.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  }

  const destroy = function destroy() {
    if (doc && typeof doc.removeEventListener === 'function') {
      doc.removeEventListener('fullscreenchange', handleFullscreenChange);
      doc.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    unsubscribe();
  };

  destroy.toggle = () => toggleFullscreen(getElement(), doc);
  destroy.request = () => requestFullscreen(getElement(), doc);
  destroy.exit = () => exitFullscreen(doc);
  destroy.isFullscreen = () => isFullscreen(doc);
  destroy.destroy = destroy;

  return destroy;
}

export default attachFullscreenAdapter;

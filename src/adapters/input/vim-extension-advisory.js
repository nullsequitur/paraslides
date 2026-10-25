/**
 * @file vim-extension-advisory.js
 * @description Vim Browser Extension Detector & Advisory Notification Adapter.
 *
 * Detects common browser extensions that intercept Vim keybindings (e.g. Vimium,
 * Vimium C, Surfingkeys, cVim, Tridactyl) and provides non-intrusive advisory notifications
 * instructing users how to bypass or set exclusion rules for uninterrupted presentation flow.
 *
 * Pure ES module with zero external runtime dependencies.
 */

/**
 * Known signatures and heuristics for popular Vim browser extensions.
 *
 * @constant {Array<{ name: string, test: (doc: Document|object, win: Window|object) => boolean }>}
 */
export const EXTENSION_SIGNATURES = [
  {
    name: 'Vimium / Vimium C',
    test: (doc, win) => {
      if (!doc) return false;
      if (typeof win !== 'undefined' && (win.vimium || win.VimiumInjector)) return true;
      if (typeof doc.getElementById === 'function') {
        if (doc.getElementById('vimiumHUDFrame') || doc.getElementById('vimiumFlashHost')) return true;
      }
      if (typeof doc.querySelector === 'function') {
        if (doc.querySelector('.vimiumReset, [data-vimium-installed]')) return true;
      }
      return false;
    }
  },
  {
    name: 'Surfingkeys',
    test: (doc, win) => {
      if (typeof win !== 'undefined' && (win.surfingkeys || win.Normal?.surfingkeys)) return true;
      if (doc && typeof doc.querySelector === 'function') {
        if (doc.querySelector('#sk_hud, #sk_status, .sk_theme')) return true;
      }
      return false;
    }
  },
  {
    name: 'cVim',
    test: (doc) => {
      if (!doc || typeof doc.querySelector !== 'function') return false;
      return Boolean(doc.querySelector('#cvim_hud, #cvim_status, #cvim_link_holder'));
    }
  },
  {
    name: 'Tridactyl',
    test: (doc, win) => {
      if (typeof win !== 'undefined' && win.tri) return true;
      if (doc && typeof doc.querySelector === 'function') {
        return Boolean(doc.querySelector('.tridactyl_hint, #tridactyl-input'));
      }
      return false;
    }
  }
];

/**
 * Inspects the document and window environment for installed Vim browser extensions.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @param {Window|object} [win=window] - Target window.
 * @returns {{ detected: boolean, name: string|null }}
 */
export function detectVimExtension(
  doc = (typeof document !== 'undefined' ? document : null),
  win = (typeof window !== 'undefined' ? window : null)
) {
  if (!doc && !win) {
    return { detected: false, name: null };
  }

  for (const entry of EXTENSION_SIGNATURES) {
    try {
      if (entry.test(doc, win)) {
        return { detected: true, name: entry.name };
      }
    } catch {
      // Continue inspecting signatures on probe error
    }
  }

  return { detected: false, name: null };
}

/**
 * Base stylesheet for extension advisory banner, conforming to modular CSS variables.
 * @constant {string}
 */
export const ADVISORY_BASE_STYLES = `
.paraslides-extension-advisory {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  max-width: 90vw;
  background-color: var(--hud-bg, rgba(18, 20, 26, 0.9));
  color: var(--hud-fg, #eef0f6);
  border: 1px solid var(--hud-border, rgba(255, 255, 255, 0.15));
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  user-select: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.paraslides-extension-advisory kbd {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--hud-fg, #fff);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid var(--hud-border, rgba(255, 255, 255, 0.2));
  border-radius: 4px;
}

.paraslides-extension-advisory .advisory-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--hud-fg-dim, rgba(255, 255, 255, 0.5));
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0 0.25rem;
  border-radius: 4px;
}

.paraslides-extension-advisory .advisory-close:hover {
  color: var(--hud-fg, #fff);
  background: rgba(255, 255, 255, 0.1);
}
`.trim();

/**
 * Injects advisory styles into the document head.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {Element|null}
 */
export function injectAdvisoryStyles(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  if (doc.getElementById && doc.getElementById('paraslides-advisory-styles')) {
    return doc.getElementById('paraslides-advisory-styles');
  }
  const style = doc.createElement('style');
  style.id = 'paraslides-advisory-styles';
  style.textContent = ADVISORY_BASE_STYLES;
  const head = doc.head || doc.body;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(style);
  }
  return style;
}

/**
 * Attaches the Vim Extension Advisory Adapter to notify users if an extension is active.
 *
 * @param {Element|object} [container] - Container element to append advisory banner (defaults to document.body).
 * @param {object} [options={}] - Options.
 * @param {Document|object} [options.document] - Document override.
 * @param {Window|object} [options.window] - Window override.
 * @param {number} [options.autoDismissMs=10000] - Auto dismiss duration in ms (0 to disable).
 * @returns {{ check: () => boolean, dismiss: () => void, destroy: () => void }}
 */
export function attachVimExtensionAdvisory(container, options = {}) {
  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  const win = options.window || (typeof window !== 'undefined' ? window : null);
  const parent = container || (doc && doc.body) || null;

  let advisoryEl = null;
  let dismissTimer = null;

  function dismiss() {
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    if (advisoryEl && advisoryEl.parentNode) {
      advisoryEl.parentNode.removeChild(advisoryEl);
      advisoryEl = null;
    }
  }

  function showAdvisory(extensionName) {
    if (advisoryEl || !doc || !parent || typeof doc.createElement !== 'function') return;

    injectAdvisoryStyles(doc);

    advisoryEl = doc.createElement('aside');
    if (advisoryEl.classList && typeof advisoryEl.classList.add === 'function') {
      advisoryEl.classList.add('paraslides-extension-advisory');
    }
    advisoryEl.setAttribute?.('role', 'alert');
    advisoryEl.setAttribute?.('aria-live', 'polite');

    const message = doc.createElement('span');
    message.innerHTML = `<strong>${extensionName || 'Vim extension'} detected:</strong> If keys are intercepted, press <kbd>i</kbd> (Insert mode) or add an exclusion rule.`;
    advisoryEl.appendChild(message);

    const closeBtn = doc.createElement('button');
    if (closeBtn.classList && typeof closeBtn.classList.add === 'function') {
      closeBtn.classList.add('advisory-close');
    }
    closeBtn.textContent = '×';
    closeBtn.setAttribute?.('aria-label', 'Dismiss notification');
    closeBtn.addEventListener?.('click', dismiss);
    advisoryEl.appendChild(closeBtn);

    parent.appendChild(advisoryEl);

    const duration = typeof options.autoDismissMs === 'number' ? options.autoDismissMs : 10000;
    if (duration > 0) {
      dismissTimer = setTimeout(dismiss, duration);
    }
  }

  function check() {
    const status = detectVimExtension(doc, win);
    if (status.detected) {
      showAdvisory(status.name);
      return true;
    }
    return false;
  }

  // Initial check
  check();

  // Also check on window load if present and not yet detected
  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('load', check, { once: true });
  }

  return {
    check,
    dismiss,
    destroy() {
      dismiss();
      if (win && typeof win.removeEventListener === 'function') {
        win.removeEventListener('load', check);
      }
    }
  };
}

export default attachVimExtensionAdvisory;

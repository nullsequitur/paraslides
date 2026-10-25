/**
 * @file viewport.js
 * @description Outbound Viewport Renderer Adapter for paraslides.
 *
 * Subscribes to the NavigationCommandPort dispatcher and synchronizes presentation
 * state changes with the DOM hierarchy:
 * - Updates root `#deck` dataset attributes (`data-mode`, `data-active-y/x/z`)
 * - Manages `.is-active` and `data-active="true"` on the current slide
 * - Updates `.is-active-section` and `.is-active-page` on active containers
 * - Ensures `.has-detour` visual indicators on primary slides with detours
 * - Sets CSS custom properties (`--active-x`, `--active-y`, `--active-z`) for 3D transforms
 * - Exports base CSS styles conforming to HTML_SCHEMA.md Section 3
 *
 * Pure ES module with zero external runtime dependencies.
 */

import { loadDeckFromDOM } from '../parsers/dom-loader.js';

/**
 * Base stylesheet template conforming to HTML_SCHEMA.md.
 * Implements two-state color theming, active slide visibility, and 3D spatial transforms.
 *
 * @constant {string}
 */
export const VIEWPORT_BASE_STYLES = `
:root {
  --bg-main: #12141a;
  --fg-main: #eef0f6;
  --accent-main: #5c9eff;

  --bg-detour: #1c141c;
  --fg-detour: #f6eef6;
  --accent-detour: #ff8c5c;

  --slide-width: 100vw;
  --slide-height: 100vh;
  --transition-speed: 0.5s;
  --transition-timing: cubic-bezier(0.25, 1, 0.5, 1);
}

#deck {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-main);
  color: var(--fg-main);
  perspective: 1200px;
  transform-style: preserve-3d;
  transition: background-color var(--transition-speed) ease,
              color var(--transition-speed) ease;
}

#deck[data-mode="MAIN"] {
  --bg-current: var(--bg-main);
  --fg-current: var(--fg-main);
  --accent-current: var(--accent-main);
  background-color: var(--bg-main);
  color: var(--fg-main);
}

#deck[data-mode="DETOUR"] {
  --bg-current: var(--bg-detour);
  --fg-current: var(--fg-detour);
  --accent-current: var(--accent-detour);
  background-color: var(--bg-detour);
  color: var(--fg-detour);
}

.deck-section {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--transition-speed) var(--transition-timing),
              opacity var(--transition-speed) ease;
  transform: translateY(calc((var(--y, 0) - var(--active-y, 0)) * 100vh));
  visibility: hidden;
  pointer-events: none;
}

.deck-section.is-active-section,
.deck-section[data-active="true"] {
  visibility: visible;
  pointer-events: auto;
}

.deck-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--transition-speed) var(--transition-timing),
              opacity var(--transition-speed) ease;
  transform: translateX(calc((var(--x, 0) - var(--active-x, 0)) * 100vw));
  visibility: hidden;
  pointer-events: none;
}

.deck-page.is-active-page,
.deck-page[data-active="true"] {
  visibility: visible;
  pointer-events: auto;
}

.slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 6rem;
  opacity: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transition: opacity var(--transition-speed) ease,
              transform var(--transition-speed) var(--transition-timing);
}

/* Primary slide styling and mild depth retreat in DETOUR mode */
.slide.slide-main {
  transform: translateZ(0) scale(1);
}

#deck[data-mode="DETOUR"] .slide.slide-main {
  transform: translateZ(-150px) scale(0.95);
  opacity: 0;
  pointer-events: none;
}

/* Detour slide layout: scrubs horizontally relative to active z */
.slide.slide-detour {
  transform: translateX(calc((var(--z, 1) - var(--active-z, 1)) * 100vw));
  opacity: 0;
  pointer-events: none;
}

#deck[data-mode="MAIN"] .slide.slide-detour {
  transform: translateZ(-150px) scale(0.95);
  opacity: 0;
  pointer-events: none;
}

.slide.is-active,
.slide[data-active="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translate3d(0, 0, 0) scale(1) !important;
}

.slide.slide-main.has-detour {
  /* Detour availability is displayed cleanly by HUD indicator */
}
`.trim();

/**
 * Injects the base viewport stylesheet into a target document or container head.
 *
 * @param {Document|ShadowRoot|object|null} [target] - Target document or container.
 * @returns {Element|null} The created or existing style element.
 */
export function injectViewportStyles(target = (typeof document !== 'undefined' ? document : null)) {
  if (!target || typeof target.createElement !== 'function') {
    return null;
  }
  const existing = target.getElementById ? target.getElementById('paraslides-viewport-styles') : null;
  if (existing) {
    return existing;
  }
  const styleEl = target.createElement('style');
  styleEl.id = 'paraslides-viewport-styles';
  styleEl.textContent = VIEWPORT_BASE_STYLES;
  const head = target.head || (target.querySelector ? target.querySelector('head') : null) || target.body || target;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(styleEl);
  }
  return styleEl;
}

/**
 * Initializes spatial coordinate data attributes and CSS custom properties on
 * sections, pages, and slides.
 *
 * @private
 * @param {object} slideMap - Slide lookup map.
 */
function initializeCoordinateMetadata(slideMap) {
  if (!slideMap) return;

  // Annotate all slides
  if (typeof slideMap.getAllSlides === 'function') {
    const all = slideMap.getAllSlides();
    for (const slideInfo of all) {
      const el = slideInfo.element;
      if (el) {
        if (!el.hasAttribute?.('data-y')) el.setAttribute?.('data-y', String(slideInfo.y));
        if (!el.hasAttribute?.('data-x')) el.setAttribute?.('data-x', String(slideInfo.x));
        if (!el.hasAttribute?.('data-z')) el.setAttribute?.('data-z', String(slideInfo.z));
        if (el.style && typeof el.style.setProperty === 'function') {
          el.style.setProperty('--z', String(slideInfo.z));
        }

        // Ensure has-detour indicator on primary slides with attached detour sequences
        if (slideInfo.z === 0) {
          const hasDetour = slideMap.has ? slideMap.has(slideInfo.y, slideInfo.x, 1) : false;
          if (hasDetour) {
            el.classList?.add('has-detour');
            el.setAttribute?.('data-has-detour', 'true');
          }
        }
      }
    }
  }

  // Annotate sections and pages
  if (typeof slideMap.getSection === 'function') {
    let y = 0;
    let sec;
    while ((sec = slideMap.getSection(y)) !== null) {
      if (!sec.hasAttribute?.('data-y')) sec.setAttribute?.('data-y', String(y));
      if (sec.style && typeof sec.style.setProperty === 'function') {
        sec.style.setProperty('--y', String(y));
      }

      if (typeof slideMap.getPage === 'function') {
        let x = 0;
        let page;
        while ((page = slideMap.getPage(y, x)) !== null) {
          if (!page.hasAttribute?.('data-y')) page.setAttribute?.('data-y', String(y));
          if (!page.hasAttribute?.('data-x')) page.setAttribute?.('data-x', String(x));
          if (page.style && typeof page.style.setProperty === 'function') {
            page.style.setProperty('--x', String(x));
          }
          x++;
        }
      }
      y++;
    }
  }
}

/**
 * Resolves a root container element from an Element, document, or CSS selector string.
 *
 * @private
 * @param {Element|string|null|undefined} input - Element or selector.
 * @returns {Element} Resolved root element.
 * @throws {TypeError} If root element is invalid.
 */
function resolveRootElement(input) {
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
      target = document.querySelector('#deck') || document.body;
    }
  }

  if (!target || typeof target !== 'object') {
    throw new TypeError('Deck root element must be a valid DOM element or selector.');
  }

  return target;
}

/**
 * Attaches the Viewport Renderer Outbound Adapter to a Navigation Command Dispatcher.
 * Synchronizes core presentation state emissions with DOM classes, attributes, and CSS variables.
 *
 * @param {object} dispatcher - Navigation command dispatcher implementing `subscribe(listener)`.
 * @param {Element|string} rootElement - Root `#deck` element or container selector.
 * @param {object} [options={}] - Optional configuration.
 * @param {object} [options.slideMap] - Pre-built slide lookup map. If omitted, constructed via `loadDeckFromDOM(rootElement)`.
 * @param {boolean} [options.injectStyles=false] - Whether to automatically inject default CSS styles into document head.
 * @param {(event: object) => void} [options.onRender] - Optional callback executed on each render pass.
 * @returns {{ destroy: () => void } & (() => void)} Handle with callable `destroy()` method.
 * @throws {TypeError} If dispatcher or rootElement is invalid.
 */
export function attachViewportRenderer(dispatcher, rootElement, options = {}) {
  if (!dispatcher || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide a subscribe() function.');
  }

  const root = resolveRootElement(rootElement);

  // Obtain or build slideMap
  let slideMap = options.slideMap;
  if (!slideMap) {
    const loaded = loadDeckFromDOM(root);
    slideMap = loaded.slideMap;
  }

  if (options.injectStyles) {
    injectViewportStyles();
  }

  // Pre-annotate sections, pages, and slides with coordinate attributes
  initializeCoordinateMetadata(slideMap);

  let previousActiveSlide = null;
  let previousActiveSection = null;
  let previousActivePage = null;

  /**
   * State subscriber callback triggered on every state transition and initial hydration.
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
    const mode = event.mode || (z === 0 ? 'MAIN' : 'DETOUR');

    // 1. Synchronize root #deck attributes
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-active-y', String(y));
    root.setAttribute('data-active-x', String(x));
    root.setAttribute('data-active-z', String(z));

    // 2. Synchronize CSS custom properties on root
    if (root.style && typeof root.style.setProperty === 'function') {
      root.style.setProperty('--active-y', String(y));
      root.style.setProperty('--active-x', String(x));
      root.style.setProperty('--active-z', String(z));
      root.style.setProperty('--mode', mode);
    }

    // 3. Update active Section
    const nextSection = slideMap.getSection ? slideMap.getSection(y) : null;
    if (previousActiveSection && previousActiveSection !== nextSection) {
      previousActiveSection.classList?.remove('is-active-section');
      previousActiveSection.removeAttribute?.('data-active');
    }
    if (nextSection) {
      nextSection.classList?.add('is-active-section');
      nextSection.setAttribute?.('data-active', 'true');
      previousActiveSection = nextSection;
    }

    // 4. Update active Page
    const nextPage = slideMap.getPage ? slideMap.getPage(y, x) : null;
    if (previousActivePage && previousActivePage !== nextPage) {
      previousActivePage.classList?.remove('is-active-page');
      previousActivePage.removeAttribute?.('data-active');
    }
    if (nextPage) {
      nextPage.classList?.add('is-active-page');
      nextPage.setAttribute?.('data-active', 'true');
      previousActivePage = nextPage;
    }

    // 5. Update active Slide
    const nextSlide = slideMap.getSlide ? slideMap.getSlide(y, x, z) : (
      slideMap.getSlideElement ? slideMap.getSlideElement(y, x, z) : null
    );

    if (previousActiveSlide && previousActiveSlide !== nextSlide) {
      previousActiveSlide.classList?.remove('is-active');
      previousActiveSlide.removeAttribute?.('data-active');
    }
    if (nextSlide) {
      nextSlide.classList?.add('is-active');
      nextSlide.setAttribute?.('data-active', 'true');
      previousActiveSlide = nextSlide;
    }

    // Optional user callback
    if (typeof options.onRender === 'function') {
      options.onRender(event);
    }
  }

  // Subscribe to the dispatcher (dispatcher immediately invokes listener with initial state)
  let unsubscribe = dispatcher.subscribe(handleStateChange);

  /**
   * Unsubscribes from the command dispatcher and cleans up references.
   */
  const destroy = function destroy() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  destroy.destroy = destroy;

  return destroy;
}

export default attachViewportRenderer;

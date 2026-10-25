/**
 * @file map-mode.js
 * @description Overview / Map Mode 2D Grid Overlay Adapter for paraslides.
 *
 * Implements a zoomed-out 2D matrix view of all sections and pages:
 * - Visually flags pages that have attached detour sequences.
 * - Highlights active slide coordinate (y, x).
 * - Clicking or activating any slide cell directly navigates core state to that page and closes the map.
 * - Reacts to COMMAND_TOGGLE_MAP ('m' / 'Space') and 'Escape'.
 *
 * Pure ES module with zero external runtime dependencies.
 */

import { COMMAND_NAVIGATE_TO } from '../../core/navigator.js';
import { getSectionCount, getPageCount, getZMax, getSection, getPage } from '../../core/model.js';

/**
 * Base stylesheet for the 2D Overview Map Mode overlay.
 * Conforms to the project visual aesthetic and accessibility standards.
 *
 * @constant {string}
 */
export const MAP_BASE_STYLES = `
#paraslides-map,
.paraslides-map-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background-color: rgba(18, 20, 26, 0.94);
  color: #eef0f6;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 2.5rem;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
  overflow-y: auto;
}

#paraslides-map.is-open,
.paraslides-map-overlay.is-open,
#paraslides-map[data-open="true"],
.paraslides-map-overlay[data-open="true"] {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

.paraslides-map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: 1rem;
}

.paraslides-map-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}

.paraslides-map-help {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.paraslides-map-close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #eef0f6;
  font-size: 1.25rem;
  line-height: 1;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.paraslides-map-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.paraslides-map-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.paraslides-map-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.paraslides-map-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #5c9eff;
  margin: 0;
}

.paraslides-map-pages {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.paraslides-map-card {
  position: relative;
  width: 13rem;
  height: 8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font-family: inherit;
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1),
              border-color 0.2s ease,
              box-shadow 0.2s ease,
              background-color 0.2s ease;
  user-select: none;
}

.paraslides-map-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.paraslides-map-card.is-active-card,
.paraslides-map-card.is-selected-card,
.paraslides-map-card[data-active="true"],
.paraslides-map-card[data-selected="true"] {
  border-color: #5c9eff;
  box-shadow: 0 0 0 2px rgba(92, 158, 255, 0.4), 0 8px 20px rgba(0, 0, 0, 0.4);
  background: rgba(92, 158, 255, 0.12);
}

.paraslides-map-card-number {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

.paraslides-map-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.paraslides-map-card.has-detour-stack::before {
  content: "";
  position: absolute;
  top: -4px;
  right: -4px;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid rgba(255, 140, 92, 0.35);
  background: rgba(255, 140, 92, 0.05);
  z-index: -1;
  pointer-events: none;
}

.paraslides-map-detour-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(255, 140, 92, 0.2);
  color: #ff8c5c;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
}
`.trim();

/**
 * Injects the Overview Map stylesheet into a target document head.
 *
 * @param {Document|object|null} [target] - Target document.
 * @returns {Element|null} Created or existing style element.
 */
export function injectMapStyles(target = (typeof document !== 'undefined' ? document : null)) {
  if (!target || typeof target.createElement !== 'function') {
    return null;
  }
  const existing = target.getElementById ? target.getElementById('paraslides-map-styles') : null;
  if (existing) {
    return existing;
  }
  const styleEl = target.createElement('style');
  styleEl.id = 'paraslides-map-styles';
  styleEl.textContent = MAP_BASE_STYLES;
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
  const eventListeners = new Map();

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

    addEventListener(eventName, handler) {
      if (!eventListeners.has(eventName)) {
        eventListeners.set(eventName, new Set());
      }
      eventListeners.get(eventName).add(handler);
    },

    removeEventListener(eventName, handler) {
      if (eventListeners.has(eventName)) {
        eventListeners.get(eventName).delete(handler);
      }
    },

    click() {
      if (eventListeners.has('click')) {
        for (const handler of eventListeners.get('click')) {
          handler({ type: 'click', target: el });
        }
      }
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
      if (trimmed.startsWith('#')) {
        const id = trimmed.slice(1);
        for (const child of children) {
          if (child.getAttribute?.('id') === id) return child;
          const nested = child.querySelector?.(selector);
          if (nested) return nested;
        }
      }
      return null;
    },

    querySelectorAll(selector) {
      const results = [];
      const trimmed = selector.trim();
      const matchCls = trimmed.startsWith('.') ? trimmed.slice(1) : null;

      function traverse(node) {
        for (const child of node.children || []) {
          if (matchCls && child.classList?.contains?.(matchCls)) {
            results.push(child);
          }
          traverse(child);
        }
      }
      traverse(el);
      return results;
    }
  };

  return el;
}

/**
 * Creates an element using owner document or fallback mock.
 *
 * @private
 * @param {Element|object} container
 * @param {string} tagName
 * @returns {Element|object}
 */
function createElement(container, tagName) {
  const doc = container.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (doc && typeof doc.createElement === 'function') {
    return doc.createElement(tagName);
  }
  return createFallbackElement(tagName);
}

/**
 * Attaches the Overview Map Mode Adapter to a Navigation Command Dispatcher.
 *
 * @param {object} dispatcher - Navigation command dispatcher implementing `dispatch` and `subscribe`.
 * @param {Element|string|object} [rootTarget] - Target container element or selector.
 * @param {object} [options={}] - Options.
 * @param {boolean} [options.injectStyles=false] - Whether to automatically inject MAP_BASE_STYLES.
 * @param {object} [options.topology] - Deck topology. If omitted, derived from `dispatcher.getTopology()`.
 * @param {(isOpen: boolean) => void} [options.onToggle] - Callback invoked when map open state changes.
 * @returns {{
 *   open: () => void,
 *   close: () => void,
 *   toggle: () => void,
 *   isOpen: () => boolean,
 *   destroy: () => void
 * } & (() => void)}
 */
export function attachMapMode(dispatcher, rootTarget = (typeof document !== 'undefined' ? document.body : null), options = {}) {
  if (!dispatcher || typeof dispatcher.dispatch !== 'function' || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide dispatch() and subscribe() methods.');
  }

  let root = rootTarget;
  if (typeof root === 'string') {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      root = document.querySelector(root);
    }
  }

  if (!root || typeof root !== 'object') {
    root = (typeof document !== 'undefined' ? document.body : null);
  }

  if (!root || typeof root !== 'object') {
    throw new TypeError('A valid root DOM element or target is required.');
  }

  if (options.injectStyles) {
    injectMapStyles();
  }

  // Resolve or create #paraslides-map container
  let mapContainer = root.querySelector ? root.querySelector('#paraslides-map') : null;
  if (!mapContainer) {
    mapContainer = createElement(root, 'div');
    mapContainer.id = 'paraslides-map';
    mapContainer.classList?.add('paraslides-map-overlay');
    mapContainer.setAttribute?.('role', 'dialog');
    mapContainer.setAttribute?.('aria-modal', 'true');
    mapContainer.setAttribute?.('aria-label', 'Presentation Overview Map');
    root.appendChild(mapContainer);
  }

  let isMapOpen = false;
  let activeY = 0;
  let activeX = 0;
  let originalY = 0;
  let originalX = 0;
  let selectedY = 0;
  let selectedX = 0;
  let cardElements = [];

  let countBuffer = '';
  let pendingG = false;
  let bufferTimer = null;
  const bufferTimeout = typeof options.bufferTimeout === 'number' ? options.bufferTimeout : 2000;

  function clearBuffer() {
    countBuffer = '';
    pendingG = false;
    if (bufferTimer !== null) {
      clearTimeout(bufferTimer);
      bufferTimer = null;
    }
  }

  function resetBufferTimer() {
    if (bufferTimer !== null) {
      clearTimeout(bufferTimer);
    }
    bufferTimer = setTimeout(() => {
      clearBuffer();
    }, bufferTimeout);
  }

  const topology = options.topology || (typeof dispatcher.getTopology === 'function' ? dispatcher.getTopology() : null);

  /**
   * Updates card active and selected highlighting when selection cursor moves.
   */
  function updateSelectionHighlight() {
    for (const item of cardElements) {
      if (item.y === selectedY && item.x === selectedX) {
        item.element.classList?.add('is-active-card');
        item.element.classList?.add('is-selected-card');
        item.element.setAttribute?.('data-active', 'true');
        item.element.setAttribute?.('data-selected', 'true');
        if (typeof item.element.scrollIntoView === 'function') {
          item.element.scrollIntoView({ block: 'nearest' });
        }
      } else {
        item.element.classList?.remove('is-active-card');
        item.element.classList?.remove('is-selected-card');
        item.element.removeAttribute?.('data-active');
        item.element.removeAttribute?.('data-selected');
      }
    }
  }

  /**
   * Renders the 2D grid matrix of sections, pages, and detour indicators.
   */
  function renderGrid() {
    cardElements = [];
    while (mapContainer.children && mapContainer.children.length > 0) {
      mapContainer.removeChild(mapContainer.children[0]);
    }

    // Header
    const header = createElement(mapContainer, 'div');
    header.classList?.add('paraslides-map-header');

    const title = createElement(mapContainer, 'h2');
    title.classList?.add('paraslides-map-title');
    title.textContent = 'Overview Map';
    header.appendChild(title);

    const help = createElement(mapContainer, 'span');
    help.classList?.add('paraslides-map-help');
    help.textContent = '[h/j/k/l] Move · [Enter/Space] Select · [m/Esc] Cancel';
    header.appendChild(help);

    const closeBtn = createElement(mapContainer, 'button');
    closeBtn.classList?.add('paraslides-map-close-btn');
    closeBtn.setAttribute?.('aria-label', 'Close Overview Map');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener?.('click', () => {
      close();
    });
    header.appendChild(closeBtn);

    mapContainer.appendChild(header);

    // Grid Container
    const grid = createElement(mapContainer, 'div');
    grid.classList?.add('paraslides-map-grid');

    const sectionCount = topology ? getSectionCount(topology) : 0;

    for (let y = 0; y < sectionCount; y++) {
      const sectionObj = getSection(topology, y);
      const sectionEl = createElement(grid, 'div');
      sectionEl.classList?.add('paraslides-map-section');
      sectionEl.setAttribute?.('data-y', String(y));

      const sectionTitle = createElement(sectionEl, 'h3');
      sectionTitle.classList?.add('paraslides-map-section-title');
      sectionTitle.textContent = sectionObj?.title || `Section ${y + 1}`;
      sectionEl.appendChild(sectionTitle);

      const pagesRow = createElement(sectionEl, 'div');
      pagesRow.classList?.add('paraslides-map-pages');

      const pageCount = getPageCount(topology, y);
      for (let x = 0; x < pageCount; x++) {
        const pageObj = getPage(topology, y, x);
        const detourCount = getZMax(topology, y, x);

        const card = createElement(pagesRow, 'div');
        card.classList?.add('paraslides-map-card');
        card.setAttribute?.('data-y', String(y));
        card.setAttribute?.('data-x', String(x));
        card.setAttribute?.('role', 'button');
        card.setAttribute?.('tabindex', '0');

        const cardNumber = createElement(card, 'span');
        cardNumber.classList?.add('paraslides-map-card-number');
        cardNumber.textContent = `${y + 1}.${x + 1}`;
        card.appendChild(cardNumber);

        const cardTitle = createElement(card, 'div');
        cardTitle.classList?.add('paraslides-map-card-title');
        cardTitle.textContent = pageObj?.title || `Page ${x + 1}`;
        card.appendChild(cardTitle);

        if (detourCount > 0) {
          card.classList?.add('has-detour-stack');
          const badge = createElement(card, 'span');
          badge.classList?.add('paraslides-map-detour-badge');
          badge.textContent = `Detour (+${detourCount})`;
          card.appendChild(badge);
        }

        if (y === selectedY && x === selectedX) {
          card.classList?.add('is-active-card');
          card.classList?.add('is-selected-card');
          card.setAttribute?.('data-active', 'true');
          card.setAttribute?.('data-selected', 'true');
        }

        // On card click: jump to slide and close map
        card.addEventListener?.('click', () => {
          selectedY = y;
          selectedX = x;
          dispatcher.dispatch({
            type: COMMAND_NAVIGATE_TO,
            y,
            x,
            z: 0
          });
          close();
        });

        pagesRow.appendChild(card);
        cardElements.push({ element: card, y, x });
      }

      sectionEl.appendChild(pagesRow);
      grid.appendChild(sectionEl);
    }

    mapContainer.appendChild(grid);
  }

  /**
   * Opens the Overview Map overlay.
   */
  function open() {
    if (isMapOpen) return;
    isMapOpen = true;
    originalY = activeY;
    originalX = activeX;
    selectedY = activeY;
    selectedX = activeX;
    clearBuffer();
    renderGrid();
    mapContainer.classList?.add('is-open');
    mapContainer.setAttribute?.('data-open', 'true');
    if (typeof options.onToggle === 'function') {
      options.onToggle(true);
    }
  }

  /**
   * Closes the Overview Map overlay.
   */
  function close() {
    if (!isMapOpen) return;
    isMapOpen = false;
    clearBuffer();
    mapContainer.classList?.remove('is-open');
    mapContainer.setAttribute?.('data-open', 'false');
    if (typeof options.onToggle === 'function') {
      options.onToggle(false);
    }
  }

  /**
   * Toggles the Overview Map overlay.
   */
  function toggle() {
    if (isMapOpen) close();
    else open();
  }

  /**
   * Checks whether the map overlay is currently open.
   * @returns {boolean}
   */
  function isOpen() {
    return isMapOpen;
  }

  // Subscribe to dispatcher events
  const unsubscribe = dispatcher.subscribe((event) => {
    activeY = typeof event.y === 'number' ? event.y : 0;
    activeX = typeof event.x === 'number' ? event.x : 0;

    // React to COMMAND_TOGGLE_MAP feedback
    if (event.feedback?.toggleMap || event.toggleMap) {
      toggle();
    }
  });

  const handleKeydown = (event) => {
    if (!isMapOpen || !event) return;

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.shiftKey && event.key !== '$' && event.key !== 'G') {
      return;
    }

    // Cancel commands: 'm' or 'Escape'
    if (event.key === 'Escape' || event.key === 'm') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      if (countBuffer.length > 0 || pendingG) {
        clearBuffer();
        return;
      }
      close();
      return;
    }

    // Confirm commands: 'Enter' or ' ' (Space)
    if (event.key === 'Enter' || event.key === ' ') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      clearBuffer();
      dispatcher.dispatch({
        type: COMMAND_NAVIGATE_TO,
        y: selectedY,
        x: selectedX,
        z: 0
      });
      close();
      return;
    }

    const sectionCount = topology ? getSectionCount(topology) : 1;

    // Numeric count prefix: '1'-'9', or '0' if count buffer is active
    if (event.key >= '1' && event.key <= '9') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      pendingG = false;
      countBuffer += event.key;
      resetBufferTimer();
      return;
    }

    if (event.key === '0') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      if (countBuffer.length > 0) {
        countBuffer += '0';
        resetBufferTimer();
      } else {
        // Strict Vim jump to start of line/row
        selectedX = 0;
        updateSelectionHighlight();
      }
      return;
    }

    // '$' jump to end of line/row
    if (event.key === '$') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      clearBuffer();
      const pageCount = topology ? getPageCount(topology, selectedY) : 1;
      selectedX = Math.max(0, pageCount - 1);
      updateSelectionHighlight();
      return;
    }

    // 'gg' or [count]gg jump to row
    if (event.key === 'g') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      if (pendingG) {
        const count = countBuffer ? parseInt(countBuffer, 10) : 0;
        clearBuffer();
        if (count > 0) {
          selectedY = Math.min(sectionCount - 1, Math.max(0, count - 1));
        } else {
          selectedY = 0;
        }
        const pageCount = topology ? getPageCount(topology, selectedY) : 1;
        selectedX = Math.min(selectedX, Math.max(0, pageCount - 1));
        updateSelectionHighlight();
        return;
      }
      pendingG = true;
      resetBufferTimer();
      return;
    }

    if (pendingG && event.key !== 'g') {
      clearBuffer();
    }

    // 'G' or [count]G jump to row
    if (event.key === 'G') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      const count = countBuffer ? parseInt(countBuffer, 10) : 0;
      clearBuffer();
      if (count > 0) {
        selectedY = Math.min(sectionCount - 1, Math.max(0, count - 1));
      } else {
        selectedY = Math.max(0, sectionCount - 1);
      }
      const pageCount = topology ? getPageCount(topology, selectedY) : 1;
      selectedX = Math.min(selectedX, Math.max(0, pageCount - 1));
      updateSelectionHighlight();
      return;
    }

    // Directional keys: h, l, j, k, and arrows
    const isLeft = event.key === 'h' || event.key === 'ArrowLeft';
    const isRight = event.key === 'l' || event.key === 'ArrowRight';
    const isUp = event.key === 'k' || event.key === 'ArrowUp';
    const isDown = event.key === 'j' || event.key === 'ArrowDown';

    if (isLeft || isRight || isUp || isDown) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

      const count = countBuffer ? parseInt(countBuffer, 10) : 1;
      clearBuffer();

      const pageCount = topology ? getPageCount(topology, selectedY) : 1;

      if (isLeft) {
        // Strict Vim movement: NO section wrap inside menu!
        selectedX = Math.max(0, selectedX - count);
      } else if (isRight) {
        // Strict Vim movement: NO section wrap inside menu!
        selectedX = Math.min(Math.max(0, pageCount - 1), selectedX + count);
      } else if (isUp) {
        selectedY = Math.max(0, selectedY - count);
        const newPageCount = topology ? getPageCount(topology, selectedY) : 1;
        selectedX = Math.min(selectedX, Math.max(0, newPageCount - 1));
      } else if (isDown) {
        selectedY = Math.min(Math.max(0, sectionCount - 1), selectedY + count);
        const newPageCount = topology ? getPageCount(topology, selectedY) : 1;
        selectedX = Math.min(selectedX, Math.max(0, newPageCount - 1));
      }

      updateSelectionHighlight();
      return;
    }

    clearBuffer();
  };

  const keyTarget = options.keyTarget
    || (root && root.ownerDocument ? root.ownerDocument.defaultView : null)
    || (typeof window !== 'undefined' ? window : null);

  if (keyTarget && typeof keyTarget.addEventListener === 'function') {
    keyTarget.addEventListener('keydown', handleKeydown, true);
  }

  /**
   * Cleans up event listeners and DOM elements.
   */
  const destroy = function destroy() {
    close();
    if (keyTarget && typeof keyTarget.removeEventListener === 'function') {
      keyTarget.removeEventListener('keydown', handleKeydown, true);
    }
    unsubscribe();
    if (mapContainer && mapContainer.parentNode && typeof mapContainer.parentNode.removeChild === 'function') {
      mapContainer.parentNode.removeChild(mapContainer);
    }
  };

  destroy.open = open;
  destroy.close = close;
  destroy.toggle = toggle;
  destroy.isOpen = isOpen;
  destroy.getSelected = () => ({ y: selectedY, x: selectedX });
  destroy.destroy = destroy;

  return destroy;
}

export default attachMapMode;

/**
 * @file dom-loader.js
 * @description HTML DOM Loader Inbound Adapter for paraslides.
 *
 * Parses semantic HTML presentation markup (`#deck -> .deck-section -> .deck-page -> .slide`)
 * into a validated, immutable Deck Topology and constructs a fast spatial coordinate
 * DOM element lookup structure.
 *
 * Conforms strictly to:
 * - docs/ARCHITECTURE.md (Hexagonal Adapters Layer)
 * - docs/DOMAIN_SPEC.md (Sparse 3D coordinate geometry)
 * - docs/HTML_SCHEMA.md (Semantic DOM Hierarchy & Contracts)
 *
 * Pure ES module with zero external runtime dependencies.
 */

import { createDeckTopology } from '../../core/model.js';

/**
 * Resolves the root deck element from various input types:
 * - Element node
 * - Document or DocumentFragment
 * - CSS selector string
 * - null/undefined (searches global document for #deck)
 *
 * @private
 * @param {Element|Document|string|null|undefined} input - Element, document, or selector.
 * @returns {Element} Resolved root element.
 * @throws {TypeError} If root element is invalid or not found.
 */
function resolveRootElement(input) {
  let target = input;

  // Case 1: Selector string
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

  // Case 2: null or undefined (fallback to global document #deck)
  if (target === null || target === undefined) {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      target = document.querySelector('#deck') || document.body;
      if (!target) {
        throw new TypeError('Default #deck element not found in global document.');
      }
    } else {
      throw new TypeError('Deck root element not found or invalid.');
    }
  }

  // Case 3: Document node (nodeType === 9 or querySelector without tagName)
  if (target && (target.nodeType === 9 || (!target.tagName && typeof target.querySelector === 'function'))) {
    const deckInsideDoc = target.querySelector('#deck') || target.querySelector('.deck') || target.body;
    if (!deckInsideDoc) {
      throw new TypeError('Deck root element (#deck) not found in the provided document.');
    }
    target = deckInsideDoc;
  }

  // Case 4: Element passed that wraps or contains #deck inside
  if (target && typeof target === 'object' && target.tagName) {
    if (target.id !== 'deck' && typeof target.querySelector === 'function') {
      const nestedDeck = target.querySelector('#deck');
      if (nestedDeck) {
        target = nestedDeck;
      }
    }
  }

  if (!target || typeof target !== 'object') {
    throw new TypeError('Deck root element must be a valid DOM element.');
  }

  return target;
}

/**
 * Locates top-level section elements within the deck root element.
 *
 * @private
 * @param {Element} root - Deck root container.
 * @returns {Array<Element>} Array of section elements.
 */
function findSectionElements(root) {
  // 1. Check direct children
  if (root.children && root.children.length > 0) {
    const directSections = Array.from(root.children).filter((child) => {
      if (!child || typeof child !== 'object') return false;
      const tag = (child.tagName || '').toUpperCase();
      const hasClass = child.classList?.contains('deck-section') ||
        (typeof child.className === 'string' && child.className.split(/\s+/).includes('deck-section'));
      return hasClass || tag === 'SECTION';
    });
    if (directSections.length > 0) {
      return directSections;
    }
  }

  // 2. Query selector search (fallback)
  if (typeof root.querySelectorAll === 'function') {
    const queried = Array.from(root.querySelectorAll('.deck-section, section'));
    return queried.filter((el) => {
      const parentSection = el.parentElement ? el.parentElement.closest?.('.deck-section, section') : null;
      return !parentSection;
    });
  }

  return [];
}

/**
 * Locates page elements within a section element.
 *
 * @private
 * @param {Element} sectionEl - Section DOM element.
 * @returns {Array<Element>} Array of page elements.
 */
function findPageElements(sectionEl) {
  // 1. Check direct children
  if (sectionEl.children && sectionEl.children.length > 0) {
    const directPages = Array.from(sectionEl.children).filter((child) => {
      if (!child || typeof child !== 'object') return false;
      const hasClass = child.classList?.contains('deck-page') ||
        (typeof child.className === 'string' && child.className.split(/\s+/).includes('deck-page'));
      return hasClass;
    });
    if (directPages.length > 0) {
      return directPages;
    }
  }

  // 2. Query selector search
  if (typeof sectionEl.querySelectorAll === 'function') {
    const queried = Array.from(sectionEl.querySelectorAll('.deck-page'));
    return queried.filter((el) => {
      const closestSection = el.closest ? el.closest('.deck-section, section') : null;
      return closestSection === sectionEl || !closestSection;
    });
  }

  return [];
}

/**
 * Locates slide elements within a page element.
 *
 * @private
 * @param {Element} pageEl - Page DOM element.
 * @returns {Array<Element>} Array of slide elements.
 */
function findSlideElements(pageEl) {
  // 1. Check direct children
  if (pageEl.children && pageEl.children.length > 0) {
    const directSlides = Array.from(pageEl.children).filter((child) => {
      if (!child || typeof child !== 'object') return false;
      const tag = (child.tagName || '').toUpperCase();
      const hasClass = child.classList?.contains('slide') ||
        child.classList?.contains('slide-main') ||
        child.classList?.contains('slide-detour') ||
        (typeof child.className === 'string' && /(^|\s)(slide|slide-main|slide-detour)($|\s)/.test(child.className));
      return hasClass || tag === 'ARTICLE';
    });
    if (directSlides.length > 0) {
      return directSlides;
    }
  }

  // 2. Query selector search
  if (typeof pageEl.querySelectorAll === 'function') {
    const queried = Array.from(pageEl.querySelectorAll('article, .slide, .slide-main, .slide-detour'));
    return queried.filter((el) => {
      const closestPage = el.closest ? el.closest('.deck-page') : null;
      return closestPage === pageEl || !closestPage;
    });
  }

  return [];
}

/**
 * Extracts first heading text content inside an element.
 *
 * @private
 * @param {Element} element - Container element.
 * @returns {string} Heading text or empty string.
 */
function extractHeadingText(element) {
  if (!element || typeof element.querySelector !== 'function') {
    return '';
  }
  const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.textContent && heading.textContent.trim()) {
    return heading.textContent.trim();
  }
  return '';
}

/**
 * Extracts a section's title from data attributes, child headings, or fallback.
 *
 * @param {Element} sectionEl - Section element.
 * @param {number} y - Section index.
 * @returns {string} Extracted section title.
 */
export function extractSectionTitle(sectionEl, y) {
  const dataTitle = sectionEl.getAttribute?.('data-section-title') ||
    sectionEl.getAttribute?.('data-title');
  if (dataTitle && dataTitle.trim().length > 0) {
    return dataTitle.trim();
  }

  // Check direct children for heading first
  if (sectionEl.children) {
    for (const child of sectionEl.children) {
      if (/^H[1-6]$/i.test(child.tagName || '')) {
        const text = child.textContent?.trim();
        if (text) return text;
      }
    }
  }

  // Query heading that is not nested inside a deck-page
  if (typeof sectionEl.querySelectorAll === 'function') {
    const headings = sectionEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      const insidePage = heading.closest ? heading.closest('.deck-page') : null;
      if (!insidePage) {
        const text = heading.textContent?.trim();
        if (text) return text;
      }
    }
  }

  return `Section ${y + 1}`;
}

/**
 * Extracts a page's title from data attributes, primary slide heading, or fallback.
 *
 * @param {Element} pageEl - Page element.
 * @param {Element} [firstSlideEl=null] - Primary slide element (z = 0).
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @returns {string} Extracted page title.
 */
export function extractPageTitle(pageEl, firstSlideEl = null, y = 0, x = 0) {
  const dataTitle = pageEl.getAttribute?.('data-page-title') ||
    pageEl.getAttribute?.('data-title');
  if (dataTitle && dataTitle.trim().length > 0) {
    return dataTitle.trim();
  }

  if (firstSlideEl) {
    const slideDataTitle = firstSlideEl.getAttribute?.('data-slide-title') ||
      firstSlideEl.getAttribute?.('data-title');
    if (slideDataTitle && slideDataTitle.trim().length > 0) {
      return slideDataTitle.trim();
    }
    const headingText = extractHeadingText(firstSlideEl);
    if (headingText) {
      return headingText;
    }
  }

  return `Page ${x + 1}`;
}

/**
 * Extracts a slide's title from data attributes, heading, or fallback.
 *
 * @param {Element} slideEl - Slide element.
 * @param {number} z - Track/Detour index (0 for main, >= 1 for detours).
 * @param {string} [pageTitle=''] - Parent page title fallback.
 * @returns {string} Extracted slide title.
 */
export function extractSlideTitle(slideEl, z = 0, pageTitle = '') {
  const dataTitle = slideEl.getAttribute?.('data-slide-title') ||
    slideEl.getAttribute?.('data-title');
  if (dataTitle && dataTitle.trim().length > 0) {
    return dataTitle.trim();
  }

  const headingText = extractHeadingText(slideEl);
  if (headingText) {
    return headingText;
  }

  return z === 0 ? (pageTitle || 'Slide') : `Detour ${z}`;
}

/**
 * Loads and validates a Deck Topology tree and element lookup map from a DOM hierarchy.
 *
 * @param {Element|Document|string} [rootElement] - Container element, document, or selector for #deck.
 * @returns {Readonly<{
 *   topology: object,
 *   slideMap: Readonly<{
 *     getSlide: (y: number, x: number, z?: number) => Element|null,
 *     getSlideElement: (y: number, x: number, z?: number) => Element|null,
 *     getSection: (y: number) => Element|null,
 *     getPage: (y: number, x: number) => Element|null,
 *     getAllSlides: () => ReadonlyArray<object>,
 *     getAllSlideElements: () => ReadonlyArray<Element>,
 *     has: (y: number, x: number, z?: number) => boolean,
 *     size: number
 *   }>,
 *   rootElement: Element
 * }>}
 * @throws {TypeError} If root element is invalid or missing.
 * @throws {RangeError} If deck has no sections, or any section/page is empty.
 */
export function loadDeckFromDOM(rootElement) {
  const root = resolveRootElement(rootElement);

  const sectionEls = findSectionElements(root);
  if (sectionEls.length === 0) {
    throw new RangeError('Deck must contain at least one section.');
  }

  const sectionObjects = [];
  const slideCoordinateMap = new Map();
  const allSlideEntries = [];
  const sectionElements = [];
  const pageElements = new Map();

  sectionEls.forEach((sectionEl, y) => {
    sectionElements[y] = sectionEl;
    sectionEl.setAttribute?.('data-y', String(y));

    const sectionId = sectionEl.getAttribute?.('id') || `section-${y}`;
    const sectionTitle = extractSectionTitle(sectionEl, y);

    const pageEls = findPageElements(sectionEl);
    if (pageEls.length === 0) {
      throw new RangeError(`Section at index ${y} must contain at least one page.`);
    }

    const pageObjects = [];

    pageEls.forEach((pageEl, x) => {
      pageElements.set(`${y}:${x}`, pageEl);
      pageEl.setAttribute?.('data-y', String(y));
      pageEl.setAttribute?.('data-x', String(x));

      const pageId = pageEl.getAttribute?.('id') || `page-${y}-${x}`;
      const slideEls = findSlideElements(pageEl);
      if (slideEls.length === 0) {
        throw new RangeError(`Page at (${y}, ${x}) must contain at least one slide.`);
      }

      const mainSlideEl = slideEls[0];
      const pageTitle = extractPageTitle(pageEl, mainSlideEl, y, x);

      // Decorate primary slide (z = 0, Main Track)
      mainSlideEl.setAttribute?.('data-y', String(y));
      mainSlideEl.setAttribute?.('data-x', String(x));
      mainSlideEl.setAttribute?.('data-z', '0');
      mainSlideEl.setAttribute?.('data-track', 'main');
      if (mainSlideEl.classList) {
        mainSlideEl.classList.add('slide', 'slide-main');
      }

      const mainSlideId = mainSlideEl.getAttribute?.('id') || `${pageId}-main`;
      const mainSlideTitle = extractSlideTitle(mainSlideEl, 0, pageTitle);

      slideCoordinateMap.set(`${y}:${x}:0`, mainSlideEl);
      allSlideEntries.push(Object.freeze({
        y,
        x,
        z: 0,
        isDetour: false,
        id: mainSlideId,
        title: mainSlideTitle,
        element: mainSlideEl
      }));

      // Detour slides (z = 1..Z_max, Detour Track)
      const detourObjects = [];
      const detourSlideEls = slideEls.slice(1);

      if (detourSlideEls.length > 0) {
        mainSlideEl.setAttribute?.('data-has-detour', 'true');
        mainSlideEl.classList?.add('has-detour');
      } else {
        mainSlideEl.removeAttribute?.('data-has-detour');
        mainSlideEl.classList?.remove('has-detour');
      }

      detourSlideEls.forEach((detourEl, detourIdx) => {
        const z = detourIdx + 1;
        detourEl.setAttribute?.('data-y', String(y));
        detourEl.setAttribute?.('data-x', String(x));
        detourEl.setAttribute?.('data-z', String(z));
        detourEl.setAttribute?.('data-track', 'detour');
        if (detourEl.classList) {
          detourEl.classList.add('slide', 'slide-detour');
        }

        const detourId = detourEl.getAttribute?.('id') || `detour-${y}-${x}-${z}`;
        const detourTitle = extractSlideTitle(detourEl, z, pageTitle);

        detourObjects.push({
          id: detourId,
          title: detourTitle
        });

        slideCoordinateMap.set(`${y}:${x}:${z}`, detourEl);
        allSlideEntries.push(Object.freeze({
          y,
          x,
          z,
          isDetour: true,
          id: detourId,
          title: detourTitle,
          element: detourEl
        }));
      });

      pageObjects.push({
        id: pageId,
        title: pageTitle,
        slide: {
          id: mainSlideId,
          title: mainSlideTitle
        },
        detours: detourObjects
      });
    });

    sectionObjects.push({
      id: sectionId,
      title: sectionTitle,
      pages: pageObjects
    });
  });

  // Construct pure immutable Deck Topology via Core Domain
  const topology = createDeckTopology(sectionObjects);

  // Construct immutable slideMap lookup helper
  const slideMap = Object.freeze({
    getSlide(y, x, z = 0) {
      if (!Number.isInteger(y) || !Number.isInteger(x) || !Number.isInteger(z)) {
        return null;
      }
      return slideCoordinateMap.get(`${y}:${x}:${z}`) || null;
    },

    getSlideElement(y, x, z = 0) {
      return this.getSlide(y, x, z);
    },

    getSection(y) {
      if (!Number.isInteger(y) || y < 0 || y >= sectionElements.length) {
        return null;
      }
      return sectionElements[y] || null;
    },

    getPage(y, x) {
      if (!Number.isInteger(y) || !Number.isInteger(x)) {
        return null;
      }
      return pageElements.get(`${y}:${x}`) || null;
    },

    getAllSlides() {
      return Object.freeze([...allSlideEntries]);
    },

    getAllSlideElements() {
      return Object.freeze(allSlideEntries.map((entry) => entry.element));
    },

    has(y, x, z = 0) {
      if (!Number.isInteger(y) || !Number.isInteger(x) || !Number.isInteger(z)) {
        return false;
      }
      return slideCoordinateMap.has(`${y}:${x}:${z}`);
    },

    get size() {
      return slideCoordinateMap.size;
    },

    [Symbol.iterator]() {
      return allSlideEntries[Symbol.iterator]();
    }
  });

  return Object.freeze({
    topology,
    slideMap,
    rootElement: root
  });
}

export default loadDeckFromDOM;

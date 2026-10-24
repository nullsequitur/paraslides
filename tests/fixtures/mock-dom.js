/**
 * @file mock-dom.js
 * @description Lightweight DOM mock implementation for Node.js unit tests.
 * Zero external runtime dependencies.
 */

/**
 * Checks whether an element matches a simple CSS selector.
 * Supports tags, classes (.class), IDs (#id), compound selectors (tag.class#id),
 * attribute selectors ([attr] or [attr="val"]), and comma-separated groups.
 *
 * @param {object} element - Mock element.
 * @param {string} selector - CSS selector string.
 * @returns {boolean}
 */
export function matchesSelector(element, selector) {
  if (!element || element.nodeType !== 1) return false;
  const trimmed = selector.trim();
  if (!trimmed) return false;

  if (trimmed.includes(',')) {
    return trimmed.split(',').some((sub) => matchesSelector(element, sub.trim()));
  }

  let remaining = trimmed;
  const tagMatch = remaining.match(/^([a-zA-Z0-9_-]+)/);
  if (tagMatch) {
    if (element.tagName !== tagMatch[1].toUpperCase()) return false;
    remaining = remaining.slice(tagMatch[0].length);
  }

  while (remaining.length > 0) {
    if (remaining.startsWith('#')) {
      const idMatch = remaining.match(/^#([a-zA-Z0-9_-]+)/);
      if (!idMatch || element.id !== idMatch[1]) return false;
      remaining = remaining.slice(idMatch[0].length);
    } else if (remaining.startsWith('.')) {
      const classMatch = remaining.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!classMatch || !element.classList.contains(classMatch[1])) return false;
      remaining = remaining.slice(classMatch[0].length);
    } else if (remaining.startsWith('[')) {
      const attrMatch = remaining.match(/^\[([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/);
      if (!attrMatch) return false;
      const attrName = attrMatch[1];
      const expectedVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4];
      if (!element.hasAttribute(attrName)) return false;
      if (expectedVal !== undefined && element.getAttribute(attrName) !== expectedVal) return false;
      remaining = remaining.slice(attrMatch[0].length);
    } else {
      break;
    }
  }

  return remaining.length === 0;
}

/**
 * Creates a lightweight mock DOM element for testing.
 *
 * @param {string} tagName - HTML tag name (e.g. 'main', 'section', 'div', 'article').
 * @param {object} [options={}] - Initial element configuration.
 * @param {string} [options.id=''] - Element ID.
 * @param {string} [options.className=''] - Element CSS class string.
 * @param {object} [options.attributes={}] - Initial attribute key-value pairs.
 * @param {string} [options.textContent=''] - Initial text content.
 * @param {Array<object>} [options.children=[]] - Initial child elements.
 * @returns {object} Mock DOM element.
 */
export function createMockElement(tagName, options = {}) {
  const {
    id = '',
    className = '',
    attributes = {},
    textContent = '',
    children = []
  } = options;

  const attrs = new Map();
  const classSet = new Set();
  const childNodes = [];

  function syncClassesFromAttr(val) {
    classSet.clear();
    String(val || '')
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => classSet.add(token));
  }

  function syncAttrFromClasses() {
    if (classSet.size === 0) {
      attrs.delete('class');
    } else {
      attrs.set('class', Array.from(classSet).join(' '));
    }
  }

  const element = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    textContent: String(textContent),
    children: childNodes,
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
        const shouldAdd = force !== undefined ? Boolean(force) : !has;
        if (shouldAdd) {
          classSet.add(str);
        } else {
          classSet.delete(str);
        }
        syncAttrFromClasses();
        return shouldAdd;
      }
    },

    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },

    setAttribute(name, value) {
      const strVal = String(value);
      attrs.set(name, strVal);
      if (name === 'class') {
        syncClassesFromAttr(strVal);
      }
      if (name === 'id') {
        // ID is reflected
      }
      if (name.startsWith('data-')) {
        const camel = name
          .slice(5)
          .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        element.dataset[camel] = strVal;
      }
    },

    hasAttribute(name) {
      return attrs.has(name);
    },

    removeAttribute(name) {
      attrs.delete(name);
      if (name === 'class') {
        classSet.clear();
      }
      if (name.startsWith('data-')) {
        const camel = name
          .slice(5)
          .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        delete element.dataset[camel];
      }
    },

    appendChild(child) {
      if (!child || typeof child !== 'object') {
        throw new TypeError('Child must be an object.');
      }
      if (child.parentNode && child.parentNode.removeChild) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = element;
      child.parentElement = element;
      childNodes.push(child);
      return child;
    },

    removeChild(child) {
      const idx = childNodes.indexOf(child);
      if (idx !== -1) {
        childNodes.splice(idx, 1);
        child.parentNode = null;
        child.parentElement = null;
      }
      return child;
    },

    querySelector(selector) {
      const matches = this.querySelectorAll(selector);
      return matches.length > 0 ? matches[0] : null;
    },

    querySelectorAll(selector) {
      const results = [];
      function traverse(node) {
        for (const child of node.children) {
          if (matchesSelector(child, selector)) {
            results.push(child);
          }
          traverse(child);
        }
      }
      traverse(this);
      return results;
    },

    closest(selector) {
      let current = this;
      while (current) {
        if (matchesSelector(current, selector)) {
          return current;
        }
        current = current.parentElement || current.parentNode;
      }
      return null;
    }
  };

  Object.defineProperty(element, 'id', {
    get() {
      return attrs.get('id') || '';
    },
    set(val) {
      if (val) {
        attrs.set('id', String(val));
      } else {
        attrs.delete('id');
      }
    },
    enumerable: true
  });

  Object.defineProperty(element, 'className', {
    get() {
      return attrs.get('class') || '';
    },
    set(val) {
      if (val) {
        attrs.set('class', String(val));
        syncClassesFromAttr(val);
      } else {
        attrs.delete('class');
        classSet.clear();
      }
    },
    enumerable: true
  });

  if (id) {
    element.id = id;
  }
  if (className) {
    element.className = className;
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  for (const child of children) {
    element.appendChild(child);
  }

  return element;
}

/**
 * Creates a complete mock DOM deck hierarchy conforming to HTML_SCHEMA.md.
 * Based on the standard 3-section deck fixture:
 * - Section 0 (2 pages: [0 detours, 0 detours])
 * - Section 1 (3 pages: [0 detours, 2 detours, 0 detours])
 * - Section 2 (1 page: [0 detours])
 *
 * @param {object} [customStructure] - Optional custom structure specification.
 * @returns {object} Mock root #deck element.
 */
export function createStandardMockDeckDOM(customStructure = null) {
  const structure = customStructure || [
    {
      title: 'Section 0: Introduction',
      pages: [
        { title: 'Welcome', detours: [] },
        { title: 'Overview', detours: [] }
      ]
    },
    {
      title: 'Section 1: Architecture Deep Dive',
      pages: [
        { title: 'Hexagonal Architecture', detours: [] },
        {
          title: 'Spatial Coordinates & Detours',
          detours: [
            { title: 'Detour: Mathematical Coordinate Formulations' },
            { title: 'Detour: CSS 3D Matrix Transformations' }
          ]
        },
        { title: 'Port-Driven Execution', detours: [] }
      ]
    },
    {
      title: 'Section 2: Conclusion',
      pages: [
        { title: 'Summary & Next Steps', detours: [] }
      ]
    }
  ];

  const deck = createMockElement('main', { id: 'deck' });

  structure.forEach((sectionSpec, y) => {
    const sectionEl = createMockElement('section', {
      className: 'deck-section',
      attributes: {
        'data-section-title': sectionSpec.title
      }
    });

    // Optional heading inside section
    const secHeading = createMockElement('h2', { textContent: sectionSpec.title });
    sectionEl.appendChild(secHeading);

    sectionSpec.pages.forEach((pageSpec, x) => {
      const pageEl = createMockElement('div', {
        className: 'deck-page',
        attributes: {
          'data-page-title': pageSpec.title
        }
      });

      // Main slide (z = 0)
      const mainSlideEl = createMockElement('article', {
        className: 'slide slide-main',
        attributes: {
          'data-slide-title': pageSpec.title
        }
      });
      const mainHeading = createMockElement('h1', { textContent: pageSpec.title });
      mainSlideEl.appendChild(mainHeading);
      pageEl.appendChild(mainSlideEl);

      // Detour slides (z = 1..N)
      if (Array.isArray(pageSpec.detours)) {
        pageSpec.detours.forEach((detourSpec) => {
          const detourSlideEl = createMockElement('article', {
            className: 'slide slide-detour',
            attributes: {
              'data-slide-title': detourSpec.title
            }
          });
          const detourHeading = createMockElement('h1', { textContent: detourSpec.title });
          detourSlideEl.appendChild(detourHeading);
          pageEl.appendChild(detourSlideEl);
        });
      }

      sectionEl.appendChild(pageEl);
    });

    deck.appendChild(sectionEl);
  });

  return deck;
}

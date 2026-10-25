/**
 * @file viewport.test.js
 * @description Unit tests for Viewport Renderer Outbound Adapter (src/adapters/render/viewport.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachViewportRenderer,
  injectViewportStyles,
  VIEWPORT_BASE_STYLES
} from '../../src/adapters/render/viewport.js';

import { loadDeckFromDOM } from '../../src/adapters/parsers/dom-loader.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import {
  createMockElement,
  createStandardMockDeckDOM
} from '../fixtures/mock-dom.js';

describe('Viewport Renderer Adapter (src/adapters/render/viewport.js)', () => {
  describe('Initial State Hydration', () => {
    it('synchronizes root attributes and active classes upon attachment', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);

      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      // Root dataset attributes initialized to (0, 0, 0) in MAIN mode
      assert.strictEqual(rootElement.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(rootElement.getAttribute('data-active-y'), '0');
      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');
      assert.strictEqual(rootElement.getAttribute('data-active-z'), '0');

      // (0, 0, 0) slide is marked active
      const slide000 = slideMap.getSlide(0, 0, 0);
      assert.ok(slide000);
      assert.ok(slide000.classList.contains('is-active'));
      assert.strictEqual(slide000.getAttribute('data-active'), 'true');

      // Other slides must not be active
      const slide010 = slideMap.getSlide(0, 1, 0);
      assert.strictEqual(slide010.classList.contains('is-active'), false);
      assert.strictEqual(slide010.getAttribute('data-active'), null);

      // Section 0 and Page (0, 0) are marked active
      const sec0 = slideMap.getSection(0);
      assert.ok(sec0.classList.contains('is-active-section'));
      assert.strictEqual(sec0.getAttribute('data-active'), 'true');

      const page00 = slideMap.getPage(0, 0);
      assert.ok(page00.classList.contains('is-active-page'));
      assert.strictEqual(page00.getAttribute('data-active'), 'true');

      // Other sections/pages must not be marked active
      const sec1 = slideMap.getSection(1);
      assert.strictEqual(sec1.classList.contains('is-active-section'), false);

      renderer.destroy();
    });

    it('builds slideMap automatically when options.slideMap is omitted', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);

      // Call without options.slideMap
      const renderer = attachViewportRenderer(dispatcher, rootElement);

      assert.strictEqual(rootElement.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(rootElement.getAttribute('data-active-y'), '0');
      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');
      assert.strictEqual(rootElement.getAttribute('data-active-z'), '0');

      const slide000 = rootElement.querySelector('.slide');
      assert.ok(slide000.classList.contains('is-active'));

      renderer.destroy();
    });

    it('ensures .has-detour is applied on primary slides with detours', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);

      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      // In standard mock deck, (1, 1, 0) has 2 detours
      const mainWithDetours = slideMap.getSlide(1, 1, 0);
      assert.ok(mainWithDetours.classList.contains('has-detour'));
      assert.strictEqual(mainWithDetours.getAttribute('data-has-detour'), 'true');

      // (0, 0, 0) has no detours
      const mainWithoutDetours = slideMap.getSlide(0, 0, 0);
      assert.strictEqual(mainWithoutDetours.classList.contains('has-detour'), false);

      renderer.destroy();
    });
  });

  describe('Navigation Transitions & Attribute Sync', () => {
    it('updates active classes and coordinates on MOVE_RIGHT and MOVE_LEFT', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);
      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      const slide000 = slideMap.getSlide(0, 0, 0);
      const slide010 = slideMap.getSlide(0, 1, 0);
      const page00 = slideMap.getPage(0, 0);
      const page01 = slideMap.getPage(0, 1);

      // Move Right to (0, 1, 0)
      dispatcher.dispatch('MOVE_RIGHT');

      assert.strictEqual(rootElement.getAttribute('data-active-x'), '1');
      assert.strictEqual(rootElement.getAttribute('data-active-y'), '0');
      assert.strictEqual(rootElement.getAttribute('data-mode'), 'MAIN');

      // Slide 0,0 loses active; Slide 0,1 gains active
      assert.strictEqual(slide000.classList.contains('is-active'), false);
      assert.strictEqual(slide000.getAttribute('data-active'), null);
      assert.ok(slide010.classList.contains('is-active'));
      assert.strictEqual(slide010.getAttribute('data-active'), 'true');

      // Page 0,0 loses active; Page 0,1 gains active
      assert.strictEqual(page00.classList.contains('is-active-page'), false);
      assert.ok(page01.classList.contains('is-active-page'));

      // Move Left back to (0, 0, 0)
      dispatcher.dispatch('MOVE_LEFT');

      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');
      assert.ok(slide000.classList.contains('is-active'));
      assert.strictEqual(slide010.classList.contains('is-active'), false);
      assert.ok(page00.classList.contains('is-active-page'));
      assert.strictEqual(page01.classList.contains('is-active-page'), false);

      renderer.destroy();
    });

    it('updates active section on MOVE_DOWN and MOVE_UP with cursor memory', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);
      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      const sec0 = slideMap.getSection(0);
      const sec1 = slideMap.getSection(1);

      // Move Down to Section 1
      dispatcher.dispatch('MOVE_DOWN');

      assert.strictEqual(rootElement.getAttribute('data-active-y'), '1');
      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');

      assert.strictEqual(sec0.classList.contains('is-active-section'), false);
      assert.ok(sec1.classList.contains('is-active-section'));

      const slide100 = slideMap.getSlide(1, 0, 0);
      assert.ok(slide100.classList.contains('is-active'));

      // Move Up back to Section 0
      dispatcher.dispatch('MOVE_UP');

      assert.strictEqual(rootElement.getAttribute('data-active-y'), '0');
      assert.ok(sec0.classList.contains('is-active-section'));
      assert.strictEqual(sec1.classList.contains('is-active-section'), false);

      renderer.destroy();
    });

    it('transitions mode and coordinates on ENTER_DETOUR and EXIT_DETOUR', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);
      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      // Navigate to Section 1, Page 1 which has 2 detours
      dispatcher.dispatch('MOVE_DOWN');  // (1, 0, 0)
      dispatcher.dispatch('MOVE_RIGHT'); // (1, 1, 0)

      assert.strictEqual(rootElement.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(rootElement.getAttribute('data-active-y'), '1');
      assert.strictEqual(rootElement.getAttribute('data-active-x'), '1');
      assert.strictEqual(rootElement.getAttribute('data-active-z'), '0');

      const mainSlide110 = slideMap.getSlide(1, 1, 0);
      const detour1 = slideMap.getSlide(1, 1, 1);
      const detour2 = slideMap.getSlide(1, 1, 2);

      assert.ok(mainSlide110.classList.contains('is-active'));
      assert.strictEqual(detour1.classList.contains('is-active'), false);

      // Enter Detour Mode
      dispatcher.dispatch('ENTER_DETOUR');

      assert.strictEqual(rootElement.getAttribute('data-mode'), 'DETOUR');
      assert.strictEqual(rootElement.getAttribute('data-active-z'), '1');

      assert.strictEqual(mainSlide110.classList.contains('is-active'), false);
      assert.ok(detour1.classList.contains('is-active'));
      assert.strictEqual(detour1.getAttribute('data-active'), 'true');

      // Scrub forward in detour track
      dispatcher.dispatch('MOVE_RIGHT');

      assert.strictEqual(rootElement.getAttribute('data-mode'), 'DETOUR');
      assert.strictEqual(rootElement.getAttribute('data-active-z'), '2');
      assert.strictEqual(detour1.classList.contains('is-active'), false);
      assert.ok(detour2.classList.contains('is-active'));

      // Exit Detour Mode
      dispatcher.dispatch('EXIT_DETOUR');

      assert.strictEqual(rootElement.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(rootElement.getAttribute('data-active-z'), '0');
      assert.strictEqual(detour2.classList.contains('is-active'), false);
      assert.ok(mainSlide110.classList.contains('is-active'));

      renderer.destroy();
    });

    it('sets CSS variables when element.style.setProperty is supported', () => {
      const rootElement = createStandardMockDeckDOM();
      // Add mock style property to rootElement
      const styles = new Map();
      rootElement.style = {
        setProperty(prop, val) {
          styles.set(prop, String(val));
        },
        getPropertyValue(prop) {
          return styles.get(prop) || '';
        }
      };

      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);
      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      assert.strictEqual(styles.get('--active-y'), '0');
      assert.strictEqual(styles.get('--active-x'), '0');
      assert.strictEqual(styles.get('--active-z'), '0');
      assert.strictEqual(styles.get('--mode'), 'MAIN');

      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(styles.get('--active-x'), '1');

      renderer.destroy();
    });

    it('invokes optional onRender callback on every state change', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);

      const renderEvents = [];
      const renderer = attachViewportRenderer(dispatcher, rootElement, {
        slideMap,
        onRender: (ev) => renderEvents.push(ev)
      });

      // 1 from initial hydration
      assert.strictEqual(renderEvents.length, 1);
      assert.strictEqual(renderEvents[0].y, 0);
      assert.strictEqual(renderEvents[0].x, 0);

      // Dispatch command
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(renderEvents.length, 2);
      assert.strictEqual(renderEvents[1].x, 1);

      renderer.destroy();
    });
  });

  describe('Cleanup & Destruction', () => {
    it('stops receiving dispatcher updates after calling destroy()', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);

      const renderer = attachViewportRenderer(dispatcher, rootElement, { slideMap });

      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');

      // Call destroy
      renderer.destroy();

      // Dispatch should no longer update DOM attributes
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');

      // Multiple calls to destroy() are safe and idempotent
      assert.doesNotThrow(() => renderer.destroy());
      assert.doesNotThrow(() => renderer());
    });

    it('can be invoked as a function directly: destroy()', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(rootElement);
      const dispatcher = createCommandDispatcher(topology);

      const destroy = attachViewportRenderer(dispatcher, rootElement);
      assert.strictEqual(typeof destroy, 'function');
      assert.strictEqual(typeof destroy.destroy, 'function');

      destroy();

      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(rootElement.getAttribute('data-active-x'), '0');
    });
  });

  describe('CSS Styles & Helpers', () => {
    it('exports non-empty VIEWPORT_BASE_STYLES containing the color and transform variables', () => {
      assert.ok(VIEWPORT_BASE_STYLES);
      assert.ok(VIEWPORT_BASE_STYLES.includes('--bg-main'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('--bg-detour'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('data-mode="MAIN"'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('data-mode="DETOUR"'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('.is-active'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('.has-detour'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('perspective'));

      // Mild depth transitions and horizontal detour slide scrubbing
      assert.ok(VIEWPORT_BASE_STYLES.includes('scale(0.95)'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('.slide.slide-detour'));
      assert.ok(VIEWPORT_BASE_STYLES.includes('translateX'));

      // Slide-level orange blob pseudo-element is removed to prevent HUD collision
      assert.strictEqual(VIEWPORT_BASE_STYLES.includes('.slide.slide-main.has-detour::after'), false);
    });

    it('injectViewportStyles creates and appends a style tag to target head', () => {
      const children = [];
      const mockHead = {
        appendChild(child) {
          children.push(child);
          return child;
        }
      };
      const mockDoc = {
        head: mockHead,
        getElementById() {
          return null;
        },
        createElement(tagName) {
          return createMockElement(tagName);
        }
      };

      const styleEl = injectViewportStyles(mockDoc);
      assert.ok(styleEl);
      assert.strictEqual(styleEl.id, 'paraslides-viewport-styles');
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0], styleEl);

      // Re-injection returns existing element without creating duplicate
      mockDoc.getElementById = (id) => (id === 'paraslides-viewport-styles' ? styleEl : null);
      const secondCall = injectViewportStyles(mockDoc);
      assert.strictEqual(secondCall, styleEl);
      assert.strictEqual(children.length, 1);
    });

    it('injectViewportStyles gracefully returns null for invalid document', () => {
      assert.strictEqual(injectViewportStyles(null), null);
      assert.strictEqual(injectViewportStyles({}), null);
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws TypeError if dispatcher is invalid or missing subscribe', () => {
      const rootElement = createStandardMockDeckDOM();
      assert.throws(() => attachViewportRenderer(null, rootElement), TypeError);
      assert.throws(() => attachViewportRenderer({}, rootElement), TypeError);
      assert.throws(() => attachViewportRenderer({ subscribe: 'not-func' }, rootElement), TypeError);
    });

    it('throws TypeError if rootElement is missing or invalid', () => {
      const { topology } = loadDeckFromDOM(createStandardMockDeckDOM());
      const dispatcher = createCommandDispatcher(topology);
      assert.throws(() => attachViewportRenderer(dispatcher, 123), TypeError);
    });
  });
});

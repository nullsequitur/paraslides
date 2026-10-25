import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attachMapMode, injectMapStyles, MAP_BASE_STYLES } from '../../src/adapters/render/map-mode.js';
import { createDeckTopology } from '../../src/core/model.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import { COMMAND_TOGGLE_MAP } from '../../src/core/navigator.js';
import { createMockDeck } from '../fixtures/deck-fixture.js';
import { createMockElement } from '../fixtures/mock-dom.js';

describe('Overview / Map Mode Adapter (src/adapters/render/map-mode.js)', () => {
  const topology = createDeckTopology(createMockDeck());

  describe('Initialization & Overlay Structure', () => {
    it('creates #paraslides-map container with accessibility attributes', () => {
      const root = createMockElement('div', { id: 'deck' });
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root);

      assert.equal(mapMode.isOpen(), false);
      const overlay = root.querySelector('#paraslides-map');
      assert.ok(overlay);
      assert.equal(overlay.getAttribute('role'), 'dialog');
      assert.equal(overlay.getAttribute('aria-modal'), 'true');

      mapMode.destroy();
    });

    it('injectMapStyles appends stylesheet to document head', () => {
      const appended = [];
      const mockDoc = {
        createElement: (tag) => ({ tagName: tag, id: '', textContent: '' }),
        head: { appendChild: (el) => appended.push(el) }
      };
      const styleEl = injectMapStyles(mockDoc);
      assert.ok(styleEl);
      assert.equal(appended.length, 1);
      assert.ok(MAP_BASE_STYLES.includes('#paraslides-map'));
    });
  });

  describe('Open, Close, and Toggle Operations', () => {
    it('opens, closes, and toggles overlay state', () => {
      const root = createMockElement('div', { id: 'deck' });
      const dispatcher = createCommandDispatcher(topology);
      let toggledState = null;
      const mapMode = attachMapMode(dispatcher, root, {
        onToggle: (open) => {
          toggledState = open;
        }
      });

      const overlay = root.querySelector('#paraslides-map');

      assert.equal(mapMode.isOpen(), false);
      assert.equal(overlay.getAttribute('data-open'), null);

      mapMode.open();
      assert.equal(mapMode.isOpen(), true);
      assert.equal(overlay.getAttribute('data-open'), 'true');
      assert.ok(overlay.classList.contains('is-open'));
      assert.equal(toggledState, true);

      mapMode.close();
      assert.equal(mapMode.isOpen(), false);
      assert.equal(overlay.getAttribute('data-open'), 'false');
      assert.equal(toggledState, false);

      mapMode.toggle();
      assert.equal(mapMode.isOpen(), true);

      mapMode.toggle();
      assert.equal(mapMode.isOpen(), false);

      mapMode.destroy();
    });

    it('toggles overlay upon dispatching COMMAND_TOGGLE_MAP', () => {
      const root = createMockElement('div', { id: 'deck' });
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root);

      assert.equal(mapMode.isOpen(), false);

      dispatcher.dispatch(COMMAND_TOGGLE_MAP);
      assert.equal(mapMode.isOpen(), true);

      dispatcher.dispatch(COMMAND_TOGGLE_MAP);
      assert.equal(mapMode.isOpen(), false);

      mapMode.destroy();
    });
  });

  describe('2D Grid Matrix & Slide Selection', () => {
    it('renders sections, page cards, detour badges, and active state highlights', () => {
      const root = createMockElement('div', { id: 'deck' });
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root);

      mapMode.open();

      const overlay = root.querySelector('#paraslides-map');
      assert.ok(overlay);

      // Section titles
      const sectionTitles = overlay.querySelectorAll('.paraslides-map-section-title');
      assert.equal(sectionTitles.length, 3);
      assert.equal(sectionTitles[0].textContent, 'Section 0: Introduction');
      assert.equal(sectionTitles[1].textContent, 'Section 1: Architecture Deep Dive');

      // Cards
      const cards = overlay.querySelectorAll('.paraslides-map-card');
      // Section 0 has 2 pages, Section 1 has 3 pages, Section 2 has 1 page = 6 cards total
      assert.equal(cards.length, 6);

      // Card 0 at (0, 0) is initial active slide
      assert.ok(cards[0].classList.contains('is-active-card'));
      assert.equal(cards[0].getAttribute('data-active'), 'true');

      // Page (1, 1) has 2 detours -> should have detour stack and badge
      // Cards order: (0,0), (0,1), (1,0), (1,1), (1,2), (2,0)
      const detourCard = cards[3];
      assert.equal(detourCard.getAttribute('data-y'), '1');
      assert.equal(detourCard.getAttribute('data-x'), '1');
      assert.ok(detourCard.classList.contains('has-detour-stack'));

      const badge = detourCard.querySelector('.paraslides-map-detour-badge');
      assert.ok(badge);
      assert.equal(badge.textContent, 'Detour (+2)');

      mapMode.destroy();
    });

    it('clicking on a page card dispatches NAVIGATE_TO and closes map', () => {
      const root = createMockElement('div', { id: 'deck' });
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root);

      mapMode.open();

      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);

      const overlay = root.querySelector('#paraslides-map');
      const cards = overlay.querySelectorAll('.paraslides-map-card');

      // Click card for Section 1, Page 2
      const targetCard = cards[4];
      assert.equal(targetCard.getAttribute('data-y'), '1');
      assert.equal(targetCard.getAttribute('data-x'), '2');

      targetCard.click();

      // Core state updated
      const state = dispatcher.getState();
      assert.equal(state.y, 1);
      assert.equal(state.x, 2);
      assert.equal(state.z, 0);

      // Map automatically closed
      assert.equal(mapMode.isOpen(), false);

      mapMode.destroy();
    });

    it('clicking close button closes the map', () => {
      const root = createMockElement('div', { id: 'deck' });
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root);

      mapMode.open();
      assert.equal(mapMode.isOpen(), true);

      const overlay = root.querySelector('#paraslides-map');
      const closeBtn = overlay.querySelector('.paraslides-map-close-btn');
      assert.ok(closeBtn);

      closeBtn.click();
      assert.equal(mapMode.isOpen(), false);

      mapMode.destroy();
    });
  });

  describe('Strict Vim Keyboard Navigation & Confirmation / Cancellation', () => {
    function createMockEventTarget() {
      const listeners = [];
      return {
        addEventListener(type, handler, capture) {
          listeners.push({ type, handler, capture });
        },
        removeEventListener(type, handler) {
          const idx = listeners.findIndex((l) => l.type === type && l.handler === handler);
          if (idx !== -1) listeners.splice(idx, 1);
        },
        dispatchEvent(event) {
          const copy = [...listeners];
          for (const l of copy) {
            if (l.type === (event.type || 'keydown')) {
              l.handler(event);
            }
          }
        }
      };
    }

    function pressKey(target, key, extra = {}) {
      target.dispatchEvent({
        type: 'keydown',
        key,
        ctrlKey: Boolean(extra.ctrlKey),
        metaKey: Boolean(extra.metaKey),
        altKey: Boolean(extra.altKey),
        shiftKey: Boolean(extra.shiftKey),
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {}
      });
    }

    it('navigates grid strictly with h/j/k/l without section wrapping', () => {
      const root = createMockElement('div', { id: 'deck' });
      const keyTarget = createMockEventTarget();
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root, { keyTarget });

      mapMode.open();
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 0 });

      // Move right within Section 0 (2 pages: index 0 and 1)
      pressKey(keyTarget, 'l');
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 1 });

      // Moving right at edge of section 0 does NOT wrap to section 1
      pressKey(keyTarget, 'l');
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 1 });

      // Move down to Section 1 (3 pages)
      pressKey(keyTarget, 'j');
      assert.deepEqual(mapMode.getSelected(), { y: 1, x: 1 });

      // Move right to Section 1, page 2
      pressKey(keyTarget, 'l');
      assert.deepEqual(mapMode.getSelected(), { y: 1, x: 2 });

      // Move down to Section 2 (only 1 page, index 0): x is clamped to 0
      pressKey(keyTarget, 'j');
      assert.deepEqual(mapMode.getSelected(), { y: 2, x: 0 });

      // Move down at bottom edge remains at section 2
      pressKey(keyTarget, 'j');
      assert.deepEqual(mapMode.getSelected(), { y: 2, x: 0 });

      // Move up back to Section 1
      pressKey(keyTarget, 'k');
      assert.deepEqual(mapMode.getSelected(), { y: 1, x: 0 });

      // Moving left at start of row does NOT wrap to previous row
      pressKey(keyTarget, 'h');
      assert.deepEqual(mapMode.getSelected(), { y: 1, x: 0 });

      mapMode.destroy();
    });

    it('supports 0, $, gg, G and count multipliers', () => {
      const root = createMockElement('div', { id: 'deck' });
      const keyTarget = createMockEventTarget();
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root, { keyTarget });

      mapMode.open();

      // Jump to last page of current section with $
      pressKey(keyTarget, '$');
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 1 });

      // Jump to start of row with 0
      pressKey(keyTarget, '0');
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 0 });

      // Jump to bottom section with G
      pressKey(keyTarget, 'G');
      assert.deepEqual(mapMode.getSelected(), { y: 2, x: 0 });

      // Jump to top section with gg
      pressKey(keyTarget, 'g');
      pressKey(keyTarget, 'g');
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 0 });

      // Move down with count prefix: 2j -> Section 2
      pressKey(keyTarget, '2');
      pressKey(keyTarget, 'j');
      assert.deepEqual(mapMode.getSelected(), { y: 2, x: 0 });

      mapMode.destroy();
    });

    it('confirms selection and updates core state with Enter and Space', () => {
      const root = createMockElement('div', { id: 'deck' });
      const keyTarget = createMockEventTarget();
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root, { keyTarget });

      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);

      mapMode.open();
      // Navigate to (1, 2)
      pressKey(keyTarget, 'j');
      pressKey(keyTarget, '2');
      pressKey(keyTarget, 'l');
      assert.deepEqual(mapMode.getSelected(), { y: 1, x: 2 });

      // While in map mode, core state is NOT changed yet
      assert.equal(dispatcher.getState().y, 0);

      // Confirm with Enter
      pressKey(keyTarget, 'Enter');

      // Core state updated to selected slide and map is closed
      assert.equal(dispatcher.getState().y, 1);
      assert.equal(dispatcher.getState().x, 2);
      assert.equal(mapMode.isOpen(), false);

      // Re-open and confirm with Space
      mapMode.open();
      pressKey(keyTarget, 'k'); // Move to (0, 1) - clamped to 1
      assert.deepEqual(mapMode.getSelected(), { y: 0, x: 1 });

      pressKey(keyTarget, ' ');
      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 1);
      assert.equal(mapMode.isOpen(), false);

      mapMode.destroy();
    });

    it('cancels selection with Escape or m and preserves original position', () => {
      const root = createMockElement('div', { id: 'deck' });
      const keyTarget = createMockEventTarget();
      const dispatcher = createCommandDispatcher(topology);
      const mapMode = attachMapMode(dispatcher, root, { keyTarget });

      mapMode.open();
      // Move around
      pressKey(keyTarget, 'j');
      pressKey(keyTarget, 'l');
      assert.deepEqual(mapMode.getSelected(), { y: 1, x: 1 });

      // Abort with Escape
      pressKey(keyTarget, 'Escape');
      assert.equal(mapMode.isOpen(), false);
      // Core state was never modified
      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);

      // Re-open, move, and abort with m
      mapMode.open();
      pressKey(keyTarget, 'j');
      pressKey(keyTarget, 'm');
      assert.equal(mapMode.isOpen(), false);
      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);

      mapMode.destroy();
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws TypeError if dispatcher is invalid', () => {
      const root = createMockElement('div', { id: 'deck' });
      assert.throws(() => attachMapMode(null, root), TypeError);
    });
  });
});

/**
 * @file hud.test.js
 * @description Unit tests for HUD & Radar Indicator Outbound Adapter (src/adapters/render/hud.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachHudRenderer,
  injectHudStyles,
  HUD_BASE_STYLES
} from '../../src/adapters/render/hud.js';

import { loadDeckFromDOM } from '../../src/adapters/parsers/dom-loader.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import {
  createMockElement,
  createStandardMockDeckDOM
} from '../fixtures/mock-dom.js';

describe('HUD & Radar Indicator Adapter (src/adapters/render/hud.js)', () => {
  describe('Initial State Hydration & Accessibility', () => {
    it('initializes accessibility attributes and renders initial coordinates in MAIN mode', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer);

      // Accessibility attributes
      assert.strictEqual(hudContainer.getAttribute('role'), 'status');
      assert.strictEqual(hudContainer.getAttribute('aria-live'), 'polite');
      assert.ok(hudContainer.classList.contains('paraslides-hud'));

      // Root dataset attributes
      assert.strictEqual(hudContainer.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(hudContainer.getAttribute('data-active-y'), '0');
      assert.strictEqual(hudContainer.getAttribute('data-active-x'), '0');
      assert.strictEqual(hudContainer.getAttribute('data-active-z'), '0');

      // Coordinate readout at (0, 0, 0)
      const coordEl = hudContainer.querySelector('.hud-coordinates');
      assert.ok(coordEl);
      assert.strictEqual(coordEl.textContent, 'Col 1/2 · Row 1/3');

      // Detour cue displays dimmed [i] at (0, 0, 0) since it has 0 detours
      const cueEl = hudContainer.querySelector('.hud-detour-cue');
      assert.ok(cueEl);
      assert.strictEqual(cueEl.textContent, '[i]');
      assert.strictEqual(cueEl.getAttribute('data-visible'), 'true');
      assert.ok(cueEl.classList.contains('is-disabled'));
      assert.strictEqual(cueEl.getAttribute('aria-disabled'), 'true');

      // Radar hints at (0, 0, 0): can only move Down and Right
      const hintUp = hudContainer.querySelector('.hud-hint-up');
      const hintDown = hudContainer.querySelector('.hud-hint-down');
      const hintLeft = hudContainer.querySelector('.hud-hint-left');
      const hintRight = hudContainer.querySelector('.hud-hint-right');

      assert.ok(hintUp.classList.contains('is-disabled'));
      assert.strictEqual(hintUp.getAttribute('aria-disabled'), 'true');

      assert.ok(hintLeft.classList.contains('is-disabled'));
      assert.strictEqual(hintLeft.getAttribute('aria-disabled'), 'true');

      assert.ok(hintDown.classList.contains('is-active'));
      assert.strictEqual(hintDown.getAttribute('aria-disabled'), 'false');

      assert.ok(hintRight.classList.contains('is-active'));
      assert.strictEqual(hintRight.getAttribute('aria-disabled'), 'false');

      renderer.destroy();
    });

    it('reuses existing child elements if already present in container', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const customCoords = createMockElement('div', { className: 'hud-coordinates' });
      hudContainer.appendChild(customCoords);

      const renderer = attachHudRenderer(dispatcher, hudContainer);

      assert.strictEqual(hudContainer.querySelector('.hud-coordinates'), customCoords);
      assert.strictEqual(customCoords.textContent, 'Col 1/2 · Row 1/3');

      renderer.destroy();
    });
  });

  describe('Detour Availability Cue and Radar Wrapping in MAIN Mode', () => {
    it('displays morphing [i] button slot and section wrapping cues', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer);

      const cueEl = hudContainer.querySelector('.hud-detour-cue');
      const hintRight = hudContainer.querySelector('.hud-hint-right');
      const hintLeft = hudContainer.querySelector('.hud-hint-left');
      const hintDepth = hudContainer.querySelector('.hud-hint-depth');

      // Navigate to Section 1, Page 0 (1, 0, 0) - 0 detours
      dispatcher.dispatch('MOVE_DOWN');
      assert.strictEqual(cueEl.textContent, '[i]');
      assert.strictEqual(cueEl.getAttribute('data-visible'), 'true');
      assert.ok(cueEl.classList.contains('is-disabled'));
      assert.strictEqual(cueEl.getAttribute('aria-disabled'), 'true');

      // Prev section wrapping cue: at (1, 0, 0) hintLeft should show ↰
      assert.strictEqual(hintLeft.textContent, '↰');
      assert.ok(hintLeft.classList.contains('is-active'));
      assert.ok(hintLeft.classList.contains('is-wrap-hint'));

      // Lookahead indicators are removed
      assert.strictEqual(hintRight.classList.contains('has-detour-lookahead'), false);
      assert.strictEqual(hintLeft.classList.contains('has-detour-lookahead'), false);
      assert.ok(hintDepth.classList.contains('is-disabled'));

      // Navigate to Page 1 (1, 1, 0) - 2 detours
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(cueEl.getAttribute('data-visible'), 'true');
      assert.ok(cueEl.classList.contains('is-active'));
      assert.strictEqual(cueEl.classList.contains('is-disabled'), false);
      assert.strictEqual(cueEl.textContent, '[i]');
      assert.strictEqual(cueEl.getAttribute('aria-disabled'), 'false');
      assert.ok(hintDepth.classList.contains('is-active'));
      assert.strictEqual(hintDepth.textContent, '⤓');

      // Navigate to Page 2 (1, 2, 0) - 0 detours (last page of Section 1)
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(cueEl.textContent, '[i]');
      assert.ok(cueEl.classList.contains('is-disabled'));
      assert.strictEqual(cueEl.getAttribute('aria-disabled'), 'true');

      // Next section wrapping cue: at (1, 2, 0) hintRight should show ↳
      assert.strictEqual(hintRight.textContent, '↳');
      assert.ok(hintRight.classList.contains('is-active'));
      assert.ok(hintRight.classList.contains('is-wrap-hint'));

      renderer.destroy();
    });
  });

  describe('DETOUR Mode Transitions & Radar State', () => {
    it('updates coordinate readout, cues, and radar locks upon entering detour mode', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer);

      const coordEl = hudContainer.querySelector('.hud-coordinates');
      const cueEl = hudContainer.querySelector('.hud-detour-cue');
      const hintUp = hudContainer.querySelector('.hud-hint-up');
      const hintDown = hudContainer.querySelector('.hud-hint-down');
      const hintLeft = hudContainer.querySelector('.hud-hint-left');
      const hintRight = hudContainer.querySelector('.hud-hint-right');

      // Move to page with detours: (1, 1, 0)
      dispatcher.dispatch('MOVE_DOWN');
      dispatcher.dispatch('MOVE_RIGHT');

      assert.strictEqual(coordEl.textContent, 'Col 2/3 · Row 2/3');
      assert.strictEqual(cueEl.textContent, '[i]');
      assert.ok(cueEl.classList.contains('is-active'));

      // Enter Detour Mode
      dispatcher.dispatch('ENTER_DETOUR');

      assert.strictEqual(hudContainer.getAttribute('data-mode'), 'DETOUR');
      assert.strictEqual(hudContainer.getAttribute('data-active-z'), '1');
      assert.strictEqual(coordEl.textContent, 'Col 2/3 · Dep 1/2');
      assert.strictEqual(cueEl.textContent, '[o]');
      assert.ok(cueEl.classList.contains('is-active'));
      assert.strictEqual(cueEl.getAttribute('aria-disabled'), 'false');

      // Vertical radar directions strictly locked/disabled in detour mode
      assert.ok(hintUp.classList.contains('is-disabled'));
      assert.ok(hintDown.classList.contains('is-disabled'));

      // In DETOUR mode, depth hint represents return/exit (o)
      const hintDepth = hudContainer.querySelector('.hud-hint-depth');
      assert.ok(hintDepth.classList.contains('is-active'));
      assert.strictEqual(hintDepth.textContent, '⤒');

      // At z = 1, can scrub right but not left
      assert.ok(hintLeft.classList.contains('is-disabled'));
      assert.ok(hintRight.classList.contains('is-active'));

      // Scrub forward to z = 2
      dispatcher.dispatch('MOVE_RIGHT');

      assert.strictEqual(coordEl.textContent, 'Col 2/3 · Dep 2/2');
      assert.strictEqual(hudContainer.getAttribute('data-active-z'), '2');
      // At z = 2 (max), can scrub left but not right
      assert.ok(hintLeft.classList.contains('is-active'));
      assert.ok(hintRight.classList.contains('is-disabled'));

      // Exit detour mode
      dispatcher.dispatch('EXIT_DETOUR');

      assert.strictEqual(hudContainer.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(hudContainer.getAttribute('data-active-z'), '0');
      assert.strictEqual(coordEl.textContent, 'Col 2/3 · Row 2/3');
      assert.strictEqual(cueEl.textContent, '[i]');
      assert.ok(cueEl.classList.contains('is-active'));

      renderer.destroy();
    });

    it('formats coordinates with compactDetour option when enabled', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer, { compactDetour: true });

      dispatcher.dispatch('MOVE_DOWN');
      dispatcher.dispatch('MOVE_RIGHT');
      dispatcher.dispatch('ENTER_DETOUR');

      const coordEl = hudContainer.querySelector('.hud-coordinates');
      assert.strictEqual(coordEl.textContent, 'Dep 1/2');

      renderer.destroy();
    });

    it('allows entering and exiting detour via clicking detour cue button', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer);

      const cueEl = hudContainer.querySelector('.hud-detour-cue');

      // At (0, 0, 0) clicking disabled [i] is a no-op
      cueEl.dispatchEvent({ type: 'click' });
      assert.strictEqual(hudContainer.getAttribute('data-mode'), 'MAIN');

      // Navigate to (1, 1, 0) where detours exist
      dispatcher.dispatch('MOVE_DOWN');
      dispatcher.dispatch('MOVE_RIGHT');

      // Click active [i] button
      cueEl.dispatchEvent({ type: 'click' });
      assert.strictEqual(hudContainer.getAttribute('data-mode'), 'DETOUR');
      assert.strictEqual(cueEl.textContent, '[o]');

      // Click active [o] button to return
      cueEl.dispatchEvent({ type: 'click' });
      assert.strictEqual(hudContainer.getAttribute('data-mode'), 'MAIN');
      assert.strictEqual(cueEl.textContent, '[i]');

      renderer.destroy();
    });
  });

  describe('Locked-Axis Feedback & Pulse Effect', () => {
    it('triggers .is-locked-pulse on vertical navigation attempt during DETOUR mode', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer, { pulseDuration: 200 });

      // Navigate to detour
      dispatcher.dispatch('MOVE_DOWN');
      dispatcher.dispatch('MOVE_RIGHT');
      dispatcher.dispatch('ENTER_DETOUR');

      assert.strictEqual(hudContainer.classList.contains('is-locked-pulse'), false);
      assert.strictEqual(hudContainer.getAttribute('data-locked-attempt'), null);

      // Attempt MOVE_DOWN (locked)
      dispatcher.dispatch('MOVE_DOWN');

      assert.ok(hudContainer.classList.contains('is-locked-pulse'));
      assert.strictEqual(hudContainer.getAttribute('data-locked-attempt'), 'true');

      // Valid horizontal scrub clears locked pulse immediately
      dispatcher.dispatch('MOVE_RIGHT');

      assert.strictEqual(hudContainer.classList.contains('is-locked-pulse'), false);
      assert.strictEqual(hudContainer.getAttribute('data-locked-attempt'), null);

      // Attempt MOVE_UP (locked)
      dispatcher.dispatch('MOVE_UP');

      assert.ok(hudContainer.classList.contains('is-locked-pulse'));
      assert.strictEqual(hudContainer.getAttribute('data-locked-attempt'), 'true');

      renderer.destroy();
    });

    it('clears locked pulse automatically after pulseDuration timeout', async () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer, { pulseDuration: 50 });

      dispatcher.dispatch('MOVE_DOWN');
      dispatcher.dispatch('MOVE_RIGHT');
      dispatcher.dispatch('ENTER_DETOUR');

      // Trigger lock attempt
      dispatcher.dispatch('MOVE_DOWN');
      assert.ok(hudContainer.classList.contains('is-locked-pulse'));

      // Wait for pulse timeout
      await new Promise((resolve) => setTimeout(resolve, 80));

      assert.strictEqual(hudContainer.classList.contains('is-locked-pulse'), false);
      assert.strictEqual(hudContainer.getAttribute('data-locked-attempt'), null);

      renderer.destroy();
    });
  });

  describe('Cleanup & Destruction', () => {
    it('stops receiving updates after calling destroy()', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const renderer = attachHudRenderer(dispatcher, hudContainer);

      const coordEl = hudContainer.querySelector('.hud-coordinates');
      assert.strictEqual(coordEl.textContent, 'Col 1/2 · Row 1/3');

      renderer.destroy();

      // Dispatching after destroy should not update HUD
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(coordEl.textContent, 'Col 1/2 · Row 1/3');

      // Multiple destroy calls are idempotent
      assert.doesNotThrow(() => renderer.destroy());
      assert.doesNotThrow(() => renderer());
    });

    it('can be invoked as a direct function: destroy()', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      const hudContainer = createMockElement('aside', { id: 'hud' });
      const destroy = attachHudRenderer(dispatcher, hudContainer);

      assert.strictEqual(typeof destroy, 'function');
      assert.strictEqual(typeof destroy.destroy, 'function');

      destroy();

      const coordEl = hudContainer.querySelector('.hud-coordinates');
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(coordEl.textContent, 'Col 1/2 · Row 1/3');
    });
  });

  describe('CSS Styles & Helpers', () => {
    it('exports HUD_BASE_STYLES with essential floating and animation selectors', () => {
      assert.ok(HUD_BASE_STYLES);
      assert.ok(HUD_BASE_STYLES.includes('.paraslides-hud'));
      assert.ok(HUD_BASE_STYLES.includes('.hud-coordinates'));
      assert.ok(HUD_BASE_STYLES.includes('.hud-detour-cue'));
      assert.ok(HUD_BASE_STYLES.includes('.hud-radar'));
      assert.ok(HUD_BASE_STYLES.includes('.is-locked-pulse'));
      assert.ok(HUD_BASE_STYLES.includes('--hud-accent'));
      assert.ok(HUD_BASE_STYLES.includes('--hud-accent-detour'));
    });

    it('injectHudStyles appends style element to document head', () => {
      const appended = [];
      const mockHead = {
        appendChild(child) {
          appended.push(child);
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

      const styleEl = injectHudStyles(mockDoc);
      assert.ok(styleEl);
      assert.strictEqual(styleEl.id, 'paraslides-hud-styles');
      assert.strictEqual(appended.length, 1);
      assert.strictEqual(appended[0], styleEl);

      // Re-injection returns existing element without creating duplicate
      mockDoc.getElementById = (id) => (id === 'paraslides-hud-styles' ? styleEl : null);
      const secondCall = injectHudStyles(mockDoc);
      assert.strictEqual(secondCall, styleEl);
      assert.strictEqual(appended.length, 1);
    });

    it('injectHudStyles returns null for invalid document target', () => {
      assert.strictEqual(injectHudStyles(null), null);
      assert.strictEqual(injectHudStyles({}), null);
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws TypeError if dispatcher is invalid or missing subscribe', () => {
      const hudContainer = createMockElement('aside', { id: 'hud' });
      assert.throws(() => attachHudRenderer(null, hudContainer), TypeError);
      assert.throws(() => attachHudRenderer({}, hudContainer), TypeError);
      assert.throws(() => attachHudRenderer({ subscribe: 123 }, hudContainer), TypeError);
    });

    it('throws TypeError if hudElement is missing or invalid in headless environment', () => {
      const deckElement = createStandardMockDeckDOM();
      const { topology } = loadDeckFromDOM(deckElement);
      const dispatcher = createCommandDispatcher(topology);

      assert.throws(() => attachHudRenderer(dispatcher, 456), TypeError);
      assert.throws(() => attachHudRenderer(dispatcher, null), TypeError);
    });
  });
});

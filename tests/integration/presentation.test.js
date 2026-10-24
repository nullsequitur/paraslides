/**
 * @file presentation.test.js
 * @description End-to-End Integration Tests for the complete paraslides presentation stack.
 *
 * Verifies end-to-end integration between:
 * - DOM Loader Inbound Adapter (src/adapters/parsers/dom-loader.js)
 * - Navigation Command Port Dispatcher (src/ports/input.js)
 * - Viewport Renderer Outbound Adapter (src/adapters/render/viewport.js)
 * - HUD & Radar Outbound Adapter (src/adapters/render/hud.js)
 * - Vim & Arrow Keyboard Inbound Adapter (src/adapters/input/vim-keys.js)
 *
 * Simulates user interactions and verifies DOM attribute updates, CSS classes,
 * HUD readouts, visual lock pulse feedback, and cursor memory restoration.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadDeckFromDOM } from '../../src/adapters/parsers/dom-loader.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import { attachViewportRenderer } from '../../src/adapters/render/viewport.js';
import { attachHudRenderer } from '../../src/adapters/render/hud.js';
import { attachKeyboardAdapter } from '../../src/adapters/input/vim-keys.js';
import {
  createMockElement,
  createStandardMockDeckDOM
} from '../fixtures/mock-dom.js';

/**
 * Creates a lightweight mock EventTarget window for testing key events.
 *
 * @param {object} [options={}]
 * @returns {object} Mock window.
 */
function createMockWindow(options = {}) {
  const listeners = new Map();

  return {
    document: options.document || { activeElement: null },
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      if (listeners.has(type)) {
        listeners.get(type).delete(handler);
      }
    },
    dispatchEvent(event) {
      const type = event.type || 'keydown';
      const set = listeners.get(type);
      if (set) {
        for (const handler of Array.from(set)) {
          handler(event);
        }
      }
    }
  };
}

/**
 * Dispatches a keydown event to the mock window.
 *
 * @param {object} mockWin - Mock window instance.
 * @param {string} key - Key string (e.g. 'l', 'j', 'i', 'h', 'o', '0', '$', 'k', 'Escape').
 */
function pressKey(mockWin, key) {
  let defaultPrevented = false;
  mockWin.dispatchEvent({
    type: 'keydown',
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: null,
    preventDefault() {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    }
  });
}

describe('End-to-End Presentation Integration (index.html simulation)', () => {
  it('mounts full presentation stack and verifies navigation lifecycle, HUD cues, and cursor memory', () => {
    // 1. Arrange: Construct semantic DOM structure matching index.html
    const deckEl = createStandardMockDeckDOM();
    const hudEl = createMockElement('aside', { id: 'hud', attributes: { 'aria-live': 'polite' } });
    const mockWin = createMockWindow();

    // 2. Hydrate engine conforming to index.html module script
    const { topology, slideMap } = loadDeckFromDOM(deckEl);
    const dispatcher = createCommandDispatcher(topology);
    const viewportCleanup = attachViewportRenderer(dispatcher, deckEl, { slideMap });
    const hudCleanup = attachHudRenderer(dispatcher, hudEl);
    const keyboardCleanup = attachKeyboardAdapter(dispatcher, mockWin);

    // ------------------------------------------------------------------------
    // Step 0: Initial State Verification at (0, 0, 0)
    // ------------------------------------------------------------------------
    assert.strictEqual(deckEl.getAttribute('data-mode'), 'MAIN');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '0');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '0');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '0');

    const slide000 = slideMap.getSlide(0, 0, 0);
    assert.ok(slide000.classList.contains('is-active'));
    assert.strictEqual(slide000.getAttribute('data-active'), 'true');

    const sec0 = slideMap.getSection(0);
    assert.ok(sec0.classList.contains('is-active-section'));

    const page00 = slideMap.getPage(0, 0);
    assert.ok(page00.classList.contains('is-active-page'));

    // HUD initial readout
    const coordEl = hudEl.querySelector('.hud-coordinates');
    assert.strictEqual(coordEl.textContent, 'Sec 1/3 · Page 1/2');

    const detourCueEl = hudEl.querySelector('.hud-detour-cue');
    assert.strictEqual(detourCueEl.getAttribute('data-visible'), 'false');

    // ------------------------------------------------------------------------
    // Step 1: Navigate Right with 'l' -> (0, 1, 0)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'l');

    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');
    assert.strictEqual(slide000.classList.contains('is-active'), false);

    const slide010 = slideMap.getSlide(0, 1, 0);
    assert.ok(slide010.classList.contains('is-active'));
    assert.strictEqual(coordEl.textContent, 'Sec 1/3 · Page 2/2');

    // Boundary check: pressing 'l' at max X should no-op
    pressKey(mockWin, 'l');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');

    // ------------------------------------------------------------------------
    // Step 2: Switch Section Down with 'j' -> (1, 0, 0)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'j');

    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '0');
    assert.strictEqual(sec0.classList.contains('is-active-section'), false);

    const sec1 = slideMap.getSection(1);
    assert.ok(sec1.classList.contains('is-active-section'));

    const slide100 = slideMap.getSlide(1, 0, 0);
    assert.ok(slide100.classList.contains('is-active'));
    assert.strictEqual(coordEl.textContent, 'Sec 2/3 · Page 1/3');

    // ------------------------------------------------------------------------
    // Step 3: Navigate Right to page with Detours -> (1, 1, 0)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'l');

    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');
    const slide110 = slideMap.getSlide(1, 1, 0);
    assert.ok(slide110.classList.contains('is-active'));
    assert.ok(slide110.classList.contains('has-detour'));
    assert.strictEqual(coordEl.textContent, 'Sec 2/3 · Page 2/3');

    // Detour Cue should now be visible and announce 2 detours
    assert.strictEqual(detourCueEl.getAttribute('data-visible'), 'true');
    assert.strictEqual(detourCueEl.textContent, '[i] Detour (2)');

    // ------------------------------------------------------------------------
    // Step 4: Enter Detour with 'i' -> (1, 1, 1) in DETOUR mode
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'i');

    assert.strictEqual(deckEl.getAttribute('data-mode'), 'DETOUR');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '1');
    assert.strictEqual(hudEl.getAttribute('data-mode'), 'DETOUR');

    // Slide 110 should not be active; Detour slide 1 should be active
    assert.strictEqual(slide110.classList.contains('is-active'), false);
    const detourSlide1 = slideMap.getSlide(1, 1, 1);
    assert.ok(detourSlide1.classList.contains('is-active'));

    // HUD shows detour coordinate format and detour navigation controls
    assert.strictEqual(coordEl.textContent, 'Sec 2/3 · Detour 1/2');
    assert.strictEqual(detourCueEl.textContent, '[h/l] Scrub · [o] Return · [j/k] Locked');

    // ------------------------------------------------------------------------
    // Step 5: Scrub Detour Sequence Right with 'l' -> (1, 1, 2)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'l');

    assert.strictEqual(deckEl.getAttribute('data-active-z'), '2');
    const detourSlide2 = slideMap.getSlide(1, 1, 2);
    assert.ok(detourSlide2.classList.contains('is-active'));
    assert.strictEqual(detourSlide1.classList.contains('is-active'), false);
    assert.strictEqual(coordEl.textContent, 'Sec 2/3 · Detour 2/2');

    // ------------------------------------------------------------------------
    // Step 6: Attempt Vertical Navigation in DETOUR mode -> Strictly Locked
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'j'); // Attempt MOVE_DOWN

    // Coordinates remain locked at (1, 1, 2)
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '2');
    assert.strictEqual(deckEl.getAttribute('data-mode'), 'DETOUR');

    // HUD receives vertical locked pulse visual indicator
    assert.ok(hudEl.classList.contains('is-locked-pulse'));
    assert.strictEqual(hudEl.getAttribute('data-locked-attempt'), 'true');

    // Attempt MOVE_UP with 'k'
    pressKey(mockWin, 'k');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '2');

    // ------------------------------------------------------------------------
    // Step 7: Scrub Left in Detour with 'h' -> (1, 1, 1) & Clears Lock Pulse
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'h');

    assert.strictEqual(deckEl.getAttribute('data-active-z'), '1');
    assert.ok(detourSlide1.classList.contains('is-active'));
    // Valid move clears lock pulse
    assert.strictEqual(hudEl.classList.contains('is-locked-pulse'), false);
    assert.strictEqual(hudEl.getAttribute('data-locked-attempt'), null);

    // ------------------------------------------------------------------------
    // Step 8: Exit Detour Mode with 'o' -> Returns to (1, 1, 0) in MAIN mode
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'o');

    assert.strictEqual(deckEl.getAttribute('data-mode'), 'MAIN');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '0');
    assert.strictEqual(hudEl.getAttribute('data-mode'), 'MAIN');
    assert.ok(slide110.classList.contains('is-active'));
    assert.strictEqual(detourSlide1.classList.contains('is-active'), false);
    assert.strictEqual(coordEl.textContent, 'Sec 2/3 · Page 2/3');

    // ------------------------------------------------------------------------
    // Step 9: Jump Commands '0' and '$'
    // ------------------------------------------------------------------------
    pressKey(mockWin, '0'); // JUMP_START
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '0');
    assert.ok(slide100.classList.contains('is-active'));

    pressKey(mockWin, '$'); // JUMP_END
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '2');
    const slide120 = slideMap.getSlide(1, 2, 0);
    assert.ok(slide120.classList.contains('is-active'));

    // ------------------------------------------------------------------------
    // Step 10: Section Navigation & Cursor Memory Restoration
    // ------------------------------------------------------------------------
    // Moving UP to section 0 should restore Section 0's last visited page (which was 1)
    pressKey(mockWin, 'k');

    assert.strictEqual(deckEl.getAttribute('data-active-y'), '0');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1'); // Restored from lastX[0]
    assert.ok(slide010.classList.contains('is-active'));

    // Moving DOWN back to section 1 should restore Section 1's last visited page (which was 2)
    pressKey(mockWin, 'j');

    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '2'); // Restored from lastX[1]
    assert.ok(slide120.classList.contains('is-active'));

    // Clean up
    keyboardCleanup.detach();
    viewportCleanup.destroy();
    hudCleanup.destroy();
  });

  it('supports arrow keys and Escape key matching Vim equivalents', () => {
    const deckEl = createStandardMockDeckDOM();
    const hudEl = createMockElement('aside', { id: 'hud' });
    const mockWin = createMockWindow();

    const { topology, slideMap } = loadDeckFromDOM(deckEl);
    const dispatcher = createCommandDispatcher(topology);
    const vp = attachViewportRenderer(dispatcher, deckEl, { slideMap });
    const hud = attachHudRenderer(dispatcher, hudEl);
    const kb = attachKeyboardAdapter(dispatcher, mockWin);

    // ArrowRight -> Move right to (0, 1, 0)
    pressKey(mockWin, 'ArrowRight');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');

    // ArrowLeft -> Move left back to (0, 0, 0)
    pressKey(mockWin, 'ArrowLeft');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '0');

    // ArrowDown -> Move down to (1, 0, 0)
    pressKey(mockWin, 'ArrowDown');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');

    // ArrowRight to (1, 1, 0)
    pressKey(mockWin, 'ArrowRight');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');

    // 'i' to enter detour -> (1, 1, 1)
    pressKey(mockWin, 'i');
    assert.strictEqual(deckEl.getAttribute('data-mode'), 'DETOUR');

    // 'Escape' to exit detour -> (1, 1, 0)
    pressKey(mockWin, 'Escape');
    assert.strictEqual(deckEl.getAttribute('data-mode'), 'MAIN');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '0');

    // ArrowUp -> Move up to section 0 restoring lastX[0] = 0
    pressKey(mockWin, 'ArrowUp');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '0');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '0');

    kb.detach();
    vp.destroy();
    hud.destroy();
  });

  it('remembers last detour slide position (lastZ) on re-entry', () => {
    const deckEl = createStandardMockDeckDOM();
    const hudEl = createMockElement('aside', { id: 'hud' });
    const mockWin = createMockWindow();

    const { topology, slideMap } = loadDeckFromDOM(deckEl);
    const dispatcher = createCommandDispatcher(topology);
    const vp = attachViewportRenderer(dispatcher, deckEl, { slideMap });
    const hud = attachHudRenderer(dispatcher, hudEl);
    const kb = attachKeyboardAdapter(dispatcher, mockWin);

    // Navigate to page (1, 1, 0)
    pressKey(mockWin, 'j');
    pressKey(mockWin, 'l');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');

    // Enter detour (starts at z = 1)
    pressKey(mockWin, 'i');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '1');

    // Advance to z = 2
    pressKey(mockWin, 'l');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '2');

    // Exit detour with 'o'
    pressKey(mockWin, 'o');
    assert.strictEqual(deckEl.getAttribute('data-mode'), 'MAIN');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '0');

    // Re-enter detour with 'i' -> restores lastZ[1][1] = 2
    pressKey(mockWin, 'i');
    assert.strictEqual(deckEl.getAttribute('data-mode'), 'DETOUR');
    assert.strictEqual(deckEl.getAttribute('data-active-z'), '2');

    kb.detach();
    vp.destroy();
    hud.destroy();
  });
});

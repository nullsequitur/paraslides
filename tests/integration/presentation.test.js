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
import { attachHashRouter } from '../../src/adapters/input/hash-router.js';
import { attachMapMode } from '../../src/adapters/render/map-mode.js';
import { attachPrintAdapter } from '../../src/adapters/render/print.js';
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
  const listeners = [];
  let currentHash = options.hash || '';

  return {
    document: options.document || { activeElement: null },
    location: {
      get hash() {
        return currentHash;
      },
      set hash(val) {
        currentHash = val;
      },
      pathname: '/index.html',
      search: ''
    },
    history: {
      replaceState(state, title, url) {
        const hashIdx = url.indexOf('#');
        if (hashIdx !== -1) {
          currentHash = url.slice(hashIdx);
        }
      }
    },
    print() {},
    addEventListener(type, handler, useCapture = false) {
      listeners.push({ type, handler, capture: Boolean(useCapture) });
    },
    removeEventListener(type, handler) {
      const idx = listeners.findIndex((l) => l.type === type && l.handler === handler);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    },
    dispatchEvent(event) {
      const type = event.type || 'keydown';
      let stopped = false;
      event.stopImmediatePropagation = () => {
        stopped = true;
      };
      event.stopPropagation = () => {
        stopped = true;
      };
      // Run capture listeners first, then non-capture listeners
      const matching = listeners.filter((l) => l.type === type);
      matching.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
      for (const entry of matching) {
        if (stopped) break;
        entry.handler(event);
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
    assert.strictEqual(coordEl.textContent, 'Col 1/2 · Row 1/3');

    const detourCueEl = hudEl.querySelector('.hud-detour-cue');
    assert.strictEqual(detourCueEl.textContent, '[i]');
    assert.ok(detourCueEl.classList.contains('is-disabled'));

    // ------------------------------------------------------------------------
    // Step 1: Navigate Right with 'l' -> (0, 1, 0)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'l');

    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');
    assert.strictEqual(slide000.classList.contains('is-active'), false);

    const slide010 = slideMap.getSlide(0, 1, 0);
    assert.ok(slide010.classList.contains('is-active'));
    assert.strictEqual(coordEl.textContent, 'Col 2/2 · Row 1/3');

    // Continuous section wrap: pressing 'l' at max X wraps to section 1, page 0
    pressKey(mockWin, 'l');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '1');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '0');
    assert.strictEqual(sec0.classList.contains('is-active-section'), false);

    const sec1 = slideMap.getSection(1);
    assert.ok(sec1.classList.contains('is-active-section'));

    const slide100 = slideMap.getSlide(1, 0, 0);
    assert.ok(slide100.classList.contains('is-active'));
    assert.strictEqual(coordEl.textContent, 'Col 1/3 · Row 2/3');

    // ------------------------------------------------------------------------
    // Step 2: Navigate Right to page with Detours -> (1, 1, 0)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'l');

    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');
    const slide110 = slideMap.getSlide(1, 1, 0);
    assert.ok(slide110.classList.contains('is-active'));
    assert.ok(slide110.classList.contains('has-detour'));
    assert.strictEqual(coordEl.textContent, 'Col 2/3 · Row 2/3');

    // Detour Cue should now show active [i]
    assert.strictEqual(detourCueEl.textContent, '[i]');
    assert.ok(detourCueEl.classList.contains('is-active'));

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

    // HUD shows detour coordinate format and morphing [o] return cue
    assert.strictEqual(coordEl.textContent, 'Col 2/3 · Dep 1/2');
    assert.strictEqual(detourCueEl.textContent, '[o]');
    assert.ok(detourCueEl.classList.contains('is-active'));

    // ------------------------------------------------------------------------
    // Step 5: Scrub Detour Sequence Right with 'l' -> (1, 1, 2)
    // ------------------------------------------------------------------------
    pressKey(mockWin, 'l');

    assert.strictEqual(deckEl.getAttribute('data-active-z'), '2');
    const detourSlide2 = slideMap.getSlide(1, 1, 2);
    assert.ok(detourSlide2.classList.contains('is-active'));
    assert.strictEqual(detourSlide1.classList.contains('is-active'), false);
    assert.strictEqual(coordEl.textContent, 'Col 2/3 · Dep 2/2');

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
    assert.strictEqual(coordEl.textContent, 'Col 2/3 · Row 2/3');

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

    // ArrowUp -> Move up to section 0 preserving Vim sticky column 1
    pressKey(mockWin, 'ArrowUp');
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '0');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');

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

  it('runs full Phase 2 presentation stack with URL routing, Overview Map mode, and Print fallback', () => {
    const deckEl = createStandardMockDeckDOM();
    const hudEl = createMockElement('aside', { id: 'hud' });
    const mockWin = createMockWindow();

    const { topology, slideMap } = loadDeckFromDOM(deckEl);
    const dispatcher = createCommandDispatcher(topology);

    const vp = attachViewportRenderer(dispatcher, deckEl, { slideMap });
    const hud = attachHudRenderer(dispatcher, hudEl);
    const kb = attachKeyboardAdapter(dispatcher, mockWin);
    const router = attachHashRouter(dispatcher, mockWin);
    const map = attachMapMode(dispatcher, deckEl, { topology, keyTarget: mockWin });
    const print = attachPrintAdapter(deckEl, mockWin);

    // Initial state: (0, 0, 0)
    assert.strictEqual(mockWin.location.hash, '#0/0');
    assert.strictEqual(deckEl.getAttribute('data-print-mode'), 'interleaved');

    // 1. URL Hash routing syncs on movement
    pressKey(mockWin, 'l'); // (0, 1, 0)
    assert.strictEqual(mockWin.location.hash, '#0/1');

    pressKey(mockWin, 'h'); // Return to (0, 0, 0)
    assert.strictEqual(mockWin.location.hash, '#0/0');

    pressKey(mockWin, 'j'); // Move down to section 1, page 0: (1, 0, 0)
    assert.strictEqual(mockWin.location.hash, '#1/0');

    // Detour cue is dimmed [i] at (1, 0, 0) and look-ahead dots are removed from HUD compass
    const detourCue = hudEl.querySelector('.hud-detour-cue');
    assert.strictEqual(detourCue.textContent, '[i]');
    assert.ok(detourCue.classList.contains('is-disabled'));
    const hintRight = hudEl.querySelector('.hud-hint-right');
    assert.strictEqual(hintRight.classList.contains('has-detour-lookahead'), false);

    // Move to (1, 1, 0) and enter detour
    pressKey(mockWin, 'l');
    assert.strictEqual(mockWin.location.hash, '#1/1');
    pressKey(mockWin, 'i');
    assert.strictEqual(mockWin.location.hash, '#1/1/1');

    // 2. Overview Map mode toggle with 'm'
    assert.strictEqual(map.isOpen(), false);
    pressKey(mockWin, 'm');
    assert.strictEqual(map.isOpen(), true);

    const mapOverlay = deckEl.querySelector('#paraslides-map');
    assert.ok(mapOverlay);
    const cards = mapOverlay.querySelectorAll('.paraslides-map-card');
    assert.ok(cards.length > 0);

    // Strict Vim navigation inside menu mode: navigate to (0, 1) and confirm with Enter
    pressKey(mockWin, 'k'); // from (1, 1) move up to (0, 1)
    pressKey(mockWin, 'Enter'); // select (0, 1) and close menu

    assert.strictEqual(map.isOpen(), false);
    assert.strictEqual(deckEl.getAttribute('data-active-y'), '0');
    assert.strictEqual(deckEl.getAttribute('data-active-x'), '1');
    assert.strictEqual(mockWin.location.hash, '#0/1');

    // 3. Print layout modes
    print.setPrintMode('main-only');
    assert.strictEqual(deckEl.getAttribute('data-print-mode'), 'main-only');

    // Clean up
    router.destroy();
    map.destroy();
    print.destroy();
    kb.detach();
    vp.destroy();
    hud.destroy();
  });
});

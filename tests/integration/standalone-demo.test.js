/**
 * @file standalone-demo.test.js
 * @description Integration tests validating the expanded index.html demo presentation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { loadDeckFromDOM } from '../../src/adapters/parsers/dom-loader.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import { attachViewportRenderer } from '../../src/adapters/render/viewport.js';
import { attachHudRenderer } from '../../src/adapters/render/hud.js';
import { attachKeyboardAdapter } from '../../src/adapters/input/vim-keys.js';
import { attachHashRouter } from '../../src/adapters/input/hash-router.js';
import { attachMapMode } from '../../src/adapters/render/map-mode.js';
import { attachPrintAdapter } from '../../src/adapters/render/print.js';
import { createMockElement } from '../fixtures/mock-dom.js';

/**
 * Parses raw HTML string from index.html into a mock DOM structure for testing.
 *
 * @param {string} html
 * @returns {object} Root #deck mock element.
 */
function parseIndexHtmlToDeck(html) {
  const deck = createMockElement('main', { id: 'deck' });

  // Find <main id="deck"> ... </main>
  const mainMatch = html.match(/<main id="deck">([\s\S]*?)<\/main>/);
  if (!mainMatch) return deck;
  const mainHtml = mainMatch[1];

  // Split by <section class="deck-section"
  const sectionChunks = mainHtml.split(/<section\s+class="deck-section"/).slice(1);

  for (const secChunk of sectionChunks) {
    const titleMatch = secChunk.match(/data-section-title="([^"]+)"/);
    const secTitle = titleMatch ? titleMatch[1] : '';
    const sectionEl = createMockElement('section', {
      className: 'deck-section',
      attributes: { 'data-section-title': secTitle }
    });

    // Split section by <div class="deck-page"
    const pageChunks = secChunk.split(/<div\s+class="deck-page"/).slice(1);
    for (const pageChunk of pageChunks) {
      const pageTitleMatch = pageChunk.match(/data-page-title="([^"]+)"/);
      const pageTitle = pageTitleMatch ? pageTitleMatch[1] : '';
      const pageEl = createMockElement('div', {
        className: 'deck-page',
        attributes: { 'data-page-title': pageTitle }
      });

      // Split page by <article class="slide
      const slideChunks = pageChunk.split(/<article\s+class="slide\s+/).slice(1);
      for (const slideChunk of slideChunks) {
        const classMatch = slideChunk.match(/^([^"]+)"/);
        const slideClass = classMatch ? classMatch[1] : 'slide-main';
        const slideTitleMatch = slideChunk.match(/data-slide-title="([^"]+)"/);
        const slideTitle = slideTitleMatch ? slideTitleMatch[1] : '';

        const slideEl = createMockElement('article', {
          className: `slide ${slideClass}`,
          attributes: { 'data-slide-title': slideTitle }
        });
        pageEl.appendChild(slideEl);
      }

      sectionEl.appendChild(pageEl);
    }

    deck.appendChild(sectionEl);
  }

  return deck;
}

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
      if (idx !== -1) listeners.splice(idx, 1);
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
      const matching = listeners.filter((l) => l.type === type);
      matching.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
      for (const entry of matching) {
        if (stopped) break;
        entry.handler(event);
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

describe('Standalone index.html Presentation & Interactive Tutorial', () => {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  it('verifies index.html has at least 4 sections and multi-slide detours', () => {
    const deckEl = parseIndexHtmlToDeck(htmlContent);
    const { topology } = loadDeckFromDOM(deckEl);

    // At least 4 sections conforming to Ticket 06 & v0.1 expansion
    assert.ok(topology.sections.length >= 4, `Expected at least 4 sections, got ${topology.sections.length}`);

    // Section 0 has an attached philosophy detour (1 slide)
    assert.strictEqual(topology.sections[0].pages[2].detours.length, 1);

    // Section 1 has an attached technical deep dive sequence (3 slides)
    assert.strictEqual(topology.sections[1].pages[1].detours.length, 3);

    // Section 2 has an attached 2D matrix map detour (1 slide)
    assert.strictEqual(topology.sections[2].pages[0].detours.length, 1);

    // Section 3 has an attached input & extension collision detour (2 slides)
    assert.strictEqual(topology.sections[3].pages[0].detours.length, 2);
  });

  it('verifies old orange dot indicator is removed from index.html styles', () => {
    assert.strictEqual(htmlContent.includes('.slide.slide-main.has-detour::after'), false);
    assert.strictEqual(htmlContent.includes('has-detour-lookahead'), false);
  });

  it('runs full presentation lifecycle with Vim navigation, linear flow, detours, and overview menu', () => {
    const deckEl = parseIndexHtmlToDeck(htmlContent);
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

    // Initial state: Col 1/3 · Row 1/4 at (0, 0, 0)
    const coordEl = hudEl.querySelector('.hud-coordinates');
    const cueEl = hudEl.querySelector('.hud-detour-cue');

    assert.strictEqual(coordEl.textContent, 'Col 1/3 · Row 1/4');
    assert.strictEqual(cueEl.textContent, 'i');
    assert.ok(cueEl.classList.contains('is-disabled'));

    // 1. Linear progression using Space
    pressKey(mockWin, ' '); // Col 2/3 · Row 1/4
    assert.strictEqual(coordEl.textContent, 'Col 2/3 · Row 1/4');

    pressKey(mockWin, ' '); // Col 3/3 · Row 1/4 (Page 0.2 has 1 detour!)
    assert.strictEqual(coordEl.textContent, 'Col 3/3 · Row 1/4');
    assert.strictEqual(cueEl.textContent, 'i');
    assert.ok(cueEl.classList.contains('is-active'));

    // Space wraps to next section: Col 1/4 · Row 2/4
    pressKey(mockWin, ' ');
    assert.strictEqual(coordEl.textContent, 'Col 1/4 · Row 2/4');

    // 2. Navigate to detour page with 'l': Col 2/4 · Row 2/4
    pressKey(mockWin, 'l');
    assert.strictEqual(coordEl.textContent, 'Col 2/4 · Row 2/4');
    assert.strictEqual(cueEl.textContent, 'i');
    assert.ok(cueEl.classList.contains('is-active'));

    // 3. Enter Detour with 'i' -> Dep 1/3
    pressKey(mockWin, 'i');
    assert.strictEqual(coordEl.textContent, 'Col 2/4 · Dep 1/3');
    assert.strictEqual(cueEl.textContent, 'o');
    assert.ok(cueEl.classList.contains('is-active'));

    // Scrub inside detour with 'l' -> Dep 2/3
    pressKey(mockWin, 'l');
    assert.strictEqual(coordEl.textContent, 'Col 2/4 · Dep 2/3');

    // Vertical navigation in detour mode is locked
    pressKey(mockWin, 'j');
    assert.strictEqual(coordEl.textContent, 'Col 2/4 · Dep 2/3');
    assert.ok(hudEl.classList.contains('is-locked-pulse'));

    // Scrub to end of detour -> Dep 3/3
    pressKey(mockWin, 'l');
    assert.strictEqual(coordEl.textContent, 'Col 2/4 · Dep 3/3');

    // Exit detour with 'o' -> returns to parent slide Col 2/4 · Row 2/4
    pressKey(mockWin, 'o');
    assert.strictEqual(coordEl.textContent, 'Col 2/4 · Row 2/4');
    assert.strictEqual(cueEl.textContent, 'i');

    // 4. Vim jump to bottom with 'G'
    pressKey(mockWin, 'G');
    assert.strictEqual(dispatcher.getState().y, 3);

    // Vim jump to top with 'gg'
    pressKey(mockWin, 'g');
    pressKey(mockWin, 'g');
    assert.strictEqual(dispatcher.getState().y, 0);

    // 5. Overview Menu with 'm'
    assert.strictEqual(map.isOpen(), false);
    pressKey(mockWin, 'm');
    assert.strictEqual(map.isOpen(), true);

    // Navigate inside menu to (2, 0) using 2j then 0, and confirm with Enter
    pressKey(mockWin, '2');
    pressKey(mockWin, 'j');
    pressKey(mockWin, '0');
    pressKey(mockWin, 'Enter');

    assert.strictEqual(map.isOpen(), false);
    assert.strictEqual(dispatcher.getState().y, 2);
    assert.strictEqual(dispatcher.getState().x, 0);

    // Clean up all adapters
    router.destroy();
    map.destroy();
    kb();
    vp.destroy();
    hud.destroy();
  });
});
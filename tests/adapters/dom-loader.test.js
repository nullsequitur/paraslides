/**
 * @file dom-loader.test.js
 * @description Unit tests for HTML DOM Loader Inbound Adapter (src/adapters/parsers/dom-loader.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadDeckFromDOM,
  extractSectionTitle,
  extractPageTitle,
  extractSlideTitle
} from '../../src/adapters/parsers/dom-loader.js';

import {
  createMockElement,
  createStandardMockDeckDOM
} from '../fixtures/mock-dom.js';

import {
  getYMax,
  getXMax,
  getZMax,
  isValidCoordinate
} from '../../src/core/model.js';

import { createCommandDispatcher } from '../../src/ports/input.js';

describe('HTML DOM Loader Adapter (src/adapters/parsers/dom-loader.js)', () => {
  describe('Full Standard Deck Hierarchy', () => {
    it('correctly loads and validates standard 3-section deck with detours', () => {
      const rootElement = createStandardMockDeckDOM();
      const result = loadDeckFromDOM(rootElement);

      assert.ok(result);
      assert.strictEqual(result.rootElement, rootElement);
      assert.ok(result.topology);
      assert.ok(result.slideMap);

      // Verify topology dimensions
      assert.strictEqual(getYMax(result.topology), 2);

      // Section 0 (2 pages, 0 detours)
      assert.strictEqual(getXMax(result.topology, 0), 1);
      assert.strictEqual(getZMax(result.topology, 0, 0), 0);
      assert.strictEqual(getZMax(result.topology, 0, 1), 0);

      // Section 1 (3 pages: page 0 has 0, page 1 has 2, page 2 has 0)
      assert.strictEqual(getXMax(result.topology, 1), 2);
      assert.strictEqual(getZMax(result.topology, 1, 0), 0);
      assert.strictEqual(getZMax(result.topology, 1, 1), 2);
      assert.strictEqual(getZMax(result.topology, 1, 2), 0);

      // Section 2 (1 page, 0 detours)
      assert.strictEqual(getXMax(result.topology, 2), 0);
      assert.strictEqual(getZMax(result.topology, 2, 0), 0);

      // Check section titles
      assert.strictEqual(result.topology.sections[0].title, 'Section 0: Introduction');
      assert.strictEqual(result.topology.sections[1].title, 'Section 1: Architecture Deep Dive');
      assert.strictEqual(result.topology.sections[2].title, 'Section 2: Conclusion');

      // Check page and detour titles
      const sec1Page1 = result.topology.sections[1].pages[1];
      assert.strictEqual(sec1Page1.title, 'Spatial Coordinates & Detours');
      assert.strictEqual(sec1Page1.detours.length, 2);
      assert.strictEqual(sec1Page1.detours[0].title, 'Detour: Mathematical Coordinate Formulations');
      assert.strictEqual(sec1Page1.detours[1].title, 'Detour: CSS 3D Matrix Transformations');
    });

    it('populates slideMap lookup table with all DOM elements', () => {
      const rootElement = createStandardMockDeckDOM();
      const { slideMap } = loadDeckFromDOM(rootElement);

      // Total slides: Sec0(2) + Sec1(1+3+1 = 5) + Sec2(1) = 8 slides
      assert.strictEqual(slideMap.size, 8);

      // Valid slide lookups
      const slide000 = slideMap.getSlide(0, 0, 0);
      assert.ok(slide000);
      assert.strictEqual(slide000.getAttribute('data-y'), '0');
      assert.strictEqual(slide000.getAttribute('data-x'), '0');
      assert.strictEqual(slide000.getAttribute('data-z'), '0');
      assert.strictEqual(slide000.getAttribute('data-track'), 'main');
      assert.ok(slide000.classList.contains('slide-main'));

      // Check detour slide lookup at (1, 1, 1) and (1, 1, 2)
      const detour1 = slideMap.getSlide(1, 1, 1);
      assert.ok(detour1);
      assert.strictEqual(detour1.getAttribute('data-y'), '1');
      assert.strictEqual(detour1.getAttribute('data-x'), '1');
      assert.strictEqual(detour1.getAttribute('data-z'), '1');
      assert.strictEqual(detour1.getAttribute('data-track'), 'detour');
      assert.ok(detour1.classList.contains('slide-detour'));

      const detour2 = slideMap.getSlide(1, 1, 2);
      assert.ok(detour2);
      assert.strictEqual(detour2.getAttribute('data-z'), '2');

      // Check slideMap.getSlideElement alias
      assert.strictEqual(slideMap.getSlideElement(1, 1, 1), detour1);

      // Out of bounds lookups return null
      assert.strictEqual(slideMap.getSlide(99, 0, 0), null);
      assert.strictEqual(slideMap.getSlide(1, 1, 5), null);
      assert.strictEqual(slideMap.getSlide(-1, 0, 0), null);
      assert.strictEqual(slideMap.getSlide(0, 'invalid', 0), null);
    });

    it('provides section and page lookups in slideMap', () => {
      const rootElement = createStandardMockDeckDOM();
      const { slideMap } = loadDeckFromDOM(rootElement);

      const sec1 = slideMap.getSection(1);
      assert.ok(sec1);
      assert.strictEqual(sec1.getAttribute('data-y'), '1');
      assert.strictEqual(slideMap.getSection(5), null);
      assert.strictEqual(slideMap.getSection(-1), null);

      const page11 = slideMap.getPage(1, 1);
      assert.ok(page11);
      assert.strictEqual(page11.getAttribute('data-y'), '1');
      assert.strictEqual(page11.getAttribute('data-x'), '1');
      assert.strictEqual(slideMap.getPage(1, 99), null);
      assert.strictEqual(slideMap.getPage('bad', 0), null);
    });

    it('exposes getAllSlides and getAllSlideElements collections', () => {
      const rootElement = createStandardMockDeckDOM();
      const { slideMap } = loadDeckFromDOM(rootElement);

      const allSlides = slideMap.getAllSlides();
      assert.strictEqual(allSlides.length, 8);
      assert.strictEqual(typeof allSlides[0].y, 'number');
      assert.strictEqual(typeof allSlides[0].x, 'number');
      assert.strictEqual(typeof allSlides[0].z, 'number');
      assert.strictEqual(typeof allSlides[0].isDetour, 'boolean');
      assert.ok(allSlides[0].element);

      const allElements = slideMap.getAllSlideElements();
      assert.strictEqual(allElements.length, 8);
      assert.strictEqual(allElements[0], allSlides[0].element);

      // slideMap is iterable
      let count = 0;
      for (const slide of slideMap) {
        assert.ok(slide.element);
        count++;
      }
      assert.strictEqual(count, 8);
    });

    it('decorates slides with has-detour attribute and class on parent slide only', () => {
      const rootElement = createStandardMockDeckDOM();
      const { slideMap } = loadDeckFromDOM(rootElement);

      // (1, 1, 0) has detours
      const mainWithDetour = slideMap.getSlide(1, 1, 0);
      assert.strictEqual(mainWithDetour.getAttribute('data-has-detour'), 'true');
      assert.ok(mainWithDetour.classList.contains('has-detour'));

      // (0, 0, 0) has NO detours
      const mainWithoutDetour = slideMap.getSlide(0, 0, 0);
      assert.strictEqual(mainWithoutDetour.getAttribute('data-has-detour'), null);
      assert.strictEqual(mainWithoutDetour.classList.contains('has-detour'), false);

      // Detour slides themselves do NOT have has-detour
      const detour = slideMap.getSlide(1, 1, 1);
      assert.strictEqual(detour.getAttribute('data-has-detour'), null);
      assert.strictEqual(detour.classList.contains('has-detour'), false);
    });
  });

  describe('Single Section & Single Page Decks', () => {
    it('handles a minimal deck with 1 section, 1 page, and 0 detours', () => {
      const deck = createMockElement('main', { id: 'deck' });
      const section = createMockElement('section', { className: 'deck-section' });
      const page = createMockElement('div', { className: 'deck-page' });
      const slide = createMockElement('article', { className: 'slide' });
      const h1 = createMockElement('h1', { textContent: 'Solo Slide' });

      slide.appendChild(h1);
      page.appendChild(slide);
      section.appendChild(page);
      deck.appendChild(section);

      const { topology, slideMap } = loadDeckFromDOM(deck);
      assert.strictEqual(getYMax(topology), 0);
      assert.strictEqual(getXMax(topology, 0), 0);
      assert.strictEqual(getZMax(topology, 0, 0), 0);
      assert.strictEqual(slideMap.size, 1);
      assert.strictEqual(slideMap.getSlide(0, 0, 0), slide);
    });

    it('handles a deck with 1 section, 1 page, and 3 detours', () => {
      const deck = createMockElement('main', { id: 'deck' });
      const section = createMockElement('section', {
        className: 'deck-section',
        attributes: { 'data-section-title': 'Deep Section' }
      });
      const page = createMockElement('div', { className: 'deck-page' });
      const mainSlide = createMockElement('article', { className: 'slide' });
      page.appendChild(mainSlide);

      for (let i = 1; i <= 3; i++) {
        const detour = createMockElement('article', {
          className: 'slide slide-detour',
          attributes: { 'data-slide-title': `Detour Step ${i}` }
        });
        page.appendChild(detour);
      }
      section.appendChild(page);
      deck.appendChild(section);

      const { topology, slideMap } = loadDeckFromDOM(deck);
      assert.strictEqual(getYMax(topology), 0);
      assert.strictEqual(getXMax(topology, 0), 0);
      assert.strictEqual(getZMax(topology, 0, 0), 3);
      assert.strictEqual(slideMap.size, 4);

      assert.strictEqual(slideMap.getSlide(0, 0, 0), mainSlide);
      assert.ok(slideMap.getSlide(0, 0, 1));
      assert.ok(slideMap.getSlide(0, 0, 2));
      assert.ok(slideMap.getSlide(0, 0, 3));
      assert.strictEqual(slideMap.getSlide(0, 0, 4), null);
    });
  });

  describe('Metadata & Title Extraction', () => {
    it('extracts section title from data-section-title first', () => {
      const section = createMockElement('section', {
        className: 'deck-section',
        attributes: { 'data-section-title': 'Explicit Section' }
      });
      const h2 = createMockElement('h2', { textContent: 'Ignored Heading' });
      section.appendChild(h2);

      const title = extractSectionTitle(section, 0);
      assert.strictEqual(title, 'Explicit Section');
    });

    it('falls back to first heading in section when data-section-title is omitted', () => {
      const section = createMockElement('section', { className: 'deck-section' });
      const h2 = createMockElement('h2', { textContent: 'Heading Section' });
      section.appendChild(h2);

      const title = extractSectionTitle(section, 0);
      assert.strictEqual(title, 'Heading Section');
    });

    it('falls back to "Section N" when no title or heading is present', () => {
      const section = createMockElement('section', { className: 'deck-section' });
      const title = extractSectionTitle(section, 2);
      assert.strictEqual(title, 'Section 3');
    });

    it('extracts page title from data-page-title first', () => {
      const page = createMockElement('div', {
        className: 'deck-page',
        attributes: { 'data-page-title': 'Explicit Page' }
      });
      const slide = createMockElement('article', { className: 'slide' });
      const h1 = createMockElement('h1', { textContent: 'Slide Heading' });
      slide.appendChild(h1);

      const title = extractPageTitle(page, slide, 0, 0);
      assert.strictEqual(title, 'Explicit Page');
    });

    it('falls back to main slide heading when data-page-title is omitted', () => {
      const page = createMockElement('div', { className: 'deck-page' });
      const slide = createMockElement('article', { className: 'slide' });
      const h1 = createMockElement('h1', { textContent: 'Slide Heading Title' });
      slide.appendChild(h1);

      const title = extractPageTitle(page, slide, 0, 0);
      assert.strictEqual(title, 'Slide Heading Title');
    });

    it('extracts slide title from data-slide-title, heading, or fallback', () => {
      const slideWithAttr = createMockElement('article', {
        attributes: { 'data-slide-title': 'Attr Slide Title' }
      });
      assert.strictEqual(extractSlideTitle(slideWithAttr, 0, 'Page Title'), 'Attr Slide Title');

      const slideWithH1 = createMockElement('article');
      const h1 = createMockElement('h1', { textContent: 'Heading Slide Title' });
      slideWithH1.appendChild(h1);
      assert.strictEqual(extractSlideTitle(slideWithH1, 0, 'Page Title'), 'Heading Slide Title');

      const bareDetourSlide = createMockElement('article');
      assert.strictEqual(extractSlideTitle(bareDetourSlide, 2, 'Page Title'), 'Detour 2');
    });
  });

  describe('Container & Document Resolution', () => {
    it('locates #deck inside a parent container element', () => {
      const container = createMockElement('div', { id: 'app' });
      const deck = createMockElement('main', { id: 'deck' });
      const section = createMockElement('section', { className: 'deck-section' });
      const page = createMockElement('div', { className: 'deck-page' });
      const slide = createMockElement('article', { className: 'slide' });

      page.appendChild(slide);
      section.appendChild(page);
      deck.appendChild(section);
      container.appendChild(deck);

      const result = loadDeckFromDOM(container);
      assert.strictEqual(result.rootElement, deck);
      assert.strictEqual(result.slideMap.size, 1);
    });

    it('handles document-like mock container', () => {
      const docMock = {
        nodeType: 9,
        querySelector(sel) {
          if (sel === '#deck') return deck;
          return null;
        }
      };

      const deck = createMockElement('main', { id: 'deck' });
      const section = createMockElement('section', { className: 'deck-section' });
      const page = createMockElement('div', { className: 'deck-page' });
      const slide = createMockElement('article', { className: 'slide' });

      page.appendChild(slide);
      section.appendChild(page);
      deck.appendChild(section);

      const result = loadDeckFromDOM(docMock);
      assert.strictEqual(result.rootElement, deck);
    });
  });

  describe('Error Handling', () => {
    it('throws TypeError when input element is null, undefined, or invalid', () => {
      assert.throws(() => loadDeckFromDOM(null), TypeError);
      assert.throws(() => loadDeckFromDOM(undefined), TypeError);
      assert.throws(() => loadDeckFromDOM(123), TypeError);
      assert.throws(() => loadDeckFromDOM('not-found-selector'), TypeError);
    });

    it('throws RangeError when deck contains no sections', () => {
      const emptyDeck = createMockElement('main', { id: 'deck' });
      assert.throws(
        () => loadDeckFromDOM(emptyDeck),
        (err) => err instanceof RangeError && err.message.includes('at least one section')
      );
    });

    it('throws RangeError when a section contains zero pages', () => {
      const deck = createMockElement('main', { id: 'deck' });
      const emptySection = createMockElement('section', { className: 'deck-section' });
      deck.appendChild(emptySection);

      assert.throws(
        () => loadDeckFromDOM(deck),
        (err) => err instanceof RangeError && err.message.includes('must contain at least one page')
      );
    });

    it('throws RangeError when a page contains zero slides', () => {
      const deck = createMockElement('main', { id: 'deck' });
      const section = createMockElement('section', { className: 'deck-section' });
      const emptyPage = createMockElement('div', { className: 'deck-page' });
      section.appendChild(emptyPage);
      deck.appendChild(section);

      assert.throws(
        () => loadDeckFromDOM(deck),
        (err) => err instanceof RangeError && err.message.includes('must contain at least one slide')
      );
    });
  });

  describe('Integration with Command Dispatcher (Inbound Port)', () => {
    it('initializes command dispatcher directly with loaded topology and dispatches commands', () => {
      const rootElement = createStandardMockDeckDOM();
      const { topology, slideMap } = loadDeckFromDOM(rootElement);

      const dispatcher = createCommandDispatcher(topology);
      assert.ok(dispatcher);

      // Initial state is at (0, 0, 0)
      const initialState = dispatcher.getState();
      assert.strictEqual(initialState.y, 0);
      assert.strictEqual(initialState.x, 0);
      assert.strictEqual(initialState.z, 0);
      assert.strictEqual(initialState.mode, 'MAIN');

      // Move right to page 1
      dispatcher.dispatch('MOVE_RIGHT');
      assert.strictEqual(dispatcher.getState().x, 1);

      // Move down to section 1 (preserves sticky column 1 in Vim navigation)
      dispatcher.dispatch('MOVE_DOWN');
      assert.strictEqual(dispatcher.getState().y, 1);
      assert.strictEqual(dispatcher.getState().x, 1);

      // Enter detour on section 1, page 1
      dispatcher.dispatch('ENTER_DETOUR');
      assert.strictEqual(dispatcher.getState().mode, 'DETOUR');
      assert.strictEqual(dispatcher.getState().z, 1);

      // Lookup active DOM element from slideMap
      const activeSlideEl = slideMap.getSlide(
        dispatcher.getState().y,
        dispatcher.getState().x,
        dispatcher.getState().z
      );
      assert.ok(activeSlideEl);
      assert.strictEqual(activeSlideEl.getAttribute('data-track'), 'detour');
      assert.strictEqual(activeSlideEl.getAttribute('data-z'), '1');
    });
  });
});

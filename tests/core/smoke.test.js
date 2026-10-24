import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockDeck, createMockSections, MOCK_DECK_SPEC } from '../fixtures/deck-fixture.js';
import * as model from '../../src/core/model.js';
import * as state from '../../src/core/state.js';
import * as navigator from '../../src/core/navigator.js';
import * as inputPort from '../../src/ports/input.js';
import * as outputPort from '../../src/ports/output.js';

describe('Project Scaffolding & Smoke Tests', () => {
  it('imports core and port stubs without syntax errors', () => {
    assert.equal(typeof model.createDeckTopology, 'function');
    assert.equal(typeof model.getYMax, 'function');
    assert.equal(typeof model.getXMax, 'function');
    assert.equal(typeof model.getZMax, 'function');
    assert.equal(typeof model.isValidCoordinate, 'function');

    assert.equal(typeof state.createInitialState, 'function');
    assert.equal(typeof navigator.processCommand, 'function');
    assert.equal(typeof inputPort.createCommandDispatcher, 'function');
    assert.equal(typeof outputPort.validateStatePayload, 'function');
  });

  describe('createMockDeck fixture', () => {
    it('produces expected 3x3 sparse topology tree conforming to spec', () => {
      const deck = createMockDeck();
      assert.ok(deck);
      assert.ok(Array.isArray(deck.sections));
      assert.equal(deck.sections.length, 3, 'Should have exactly 3 sections (yMax = 2)');

      // Section 0: 2 pages, 0 detours
      const sec0 = deck.sections[0];
      assert.equal(sec0.pages.length, 2);
      assert.equal(sec0.pages[0].detours.length, 0);
      assert.equal(sec0.pages[1].detours.length, 0);

      // Section 1: 3 pages, page 1 has 2 detours, others 0
      const sec1 = deck.sections[1];
      assert.equal(sec1.pages.length, 3);
      assert.equal(sec1.pages[0].detours.length, 0);
      assert.equal(sec1.pages[1].detours.length, 2);
      assert.equal(sec1.pages[2].detours.length, 0);

      // Section 2: 1 page, 0 detours
      const sec2 = deck.sections[2];
      assert.equal(sec2.pages.length, 1);
      assert.equal(sec2.pages[0].detours.length, 0);
    });

    it('matches MOCK_DECK_SPEC metadata', () => {
      const deck = createMockDeck();
      assert.equal(deck.sections.length - 1, MOCK_DECK_SPEC.yMax);
      for (const expectedSec of MOCK_DECK_SPEC.sections) {
        const sec = deck.sections[expectedSec.y];
        assert.equal(sec.pages.length - 1, expectedSec.xMax);
        for (let x = 0; x < expectedSec.detours.length; x++) {
          assert.equal(sec.pages[x].detours.length, expectedSec.detours[x]);
        }
      }
    });

    it('returns fresh independent objects on subsequent calls', () => {
      const deckA = createMockDeck();
      const deckB = createMockDeck();
      assert.notEqual(deckA, deckB);
      assert.notEqual(deckA.sections, deckB.sections);
      assert.notEqual(deckA.sections[1].pages[1].detours, deckB.sections[1].pages[1].detours);
    });

    it('createMockSections helper returns the sections array', () => {
      const sections = createMockSections();
      assert.ok(Array.isArray(sections));
      assert.equal(sections.length, 3);
    });
  });
});

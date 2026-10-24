import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeckTopology,
  getYMax,
  getXMax,
  getZMax,
  isValidCoordinate,
  getSection,
  getPage,
  getDetour,
  getSectionCount,
  getPageCount,
  hasDetours
} from '../../src/core/model.js';
import { createMockDeck, createMockSections, MOCK_DECK_SPEC } from '../fixtures/deck-fixture.js';

describe('Deck Topology Model (src/core/model.js)', () => {
  describe('createDeckTopology - Input Validation', () => {
    it('accepts a valid sections array', () => {
      const sections = createMockSections();
      const topology = createDeckTopology(sections);
      assert.ok(topology);
      assert.equal(topology.sections.length, 3);
    });

    it('accepts a deck object with a sections array', () => {
      const deck = createMockDeck();
      const topology = createDeckTopology(deck);
      assert.ok(topology);
      assert.equal(topology.sections.length, 3);
    });

    it('throws TypeError if input is null or undefined or not an object', () => {
      assert.throws(() => createDeckTopology(null), TypeError);
      assert.throws(() => createDeckTopology(undefined), TypeError);
      assert.throws(() => createDeckTopology(42), TypeError);
      assert.throws(() => createDeckTopology('deck'), TypeError);
      assert.throws(() => createDeckTopology(true), TypeError);
    });

    it('throws TypeError if input.sections is not an array', () => {
      assert.throws(() => createDeckTopology({ sections: 'invalid' }), TypeError);
      assert.throws(() => createDeckTopology({ sections: null }), TypeError);
      assert.throws(() => createDeckTopology({}), TypeError);
    });

    it('throws RangeError if sections array is empty', () => {
      assert.throws(() => createDeckTopology([]), RangeError);
      assert.throws(() => createDeckTopology({ sections: [] }), RangeError);
    });

    it('throws TypeError if any section is not an object or is null/array', () => {
      assert.throws(() => createDeckTopology([null]), TypeError);
      assert.throws(() => createDeckTopology(['section']), TypeError);
      assert.throws(() => createDeckTopology([[]]), TypeError);
    });

    it('throws TypeError if section.pages is missing or not an array', () => {
      assert.throws(() => createDeckTopology([{ id: 's1' }]), TypeError);
      assert.throws(() => createDeckTopology([{ id: 's1', pages: null }]), TypeError);
      assert.throws(() => createDeckTopology([{ id: 's1', pages: 'page' }]), TypeError);
    });

    it('throws RangeError if section.pages is empty', () => {
      assert.throws(() => createDeckTopology([{ id: 's1', pages: [] }]), RangeError);
      assert.throws(
        () =>
          createDeckTopology([
            { id: 's1', pages: [{ id: 'p1' }] },
            { id: 's2', pages: [] }
          ]),
        RangeError
      );
    });

    it('throws TypeError if any page is not an object or is null/array', () => {
      assert.throws(() => createDeckTopology([{ pages: [null] }]), TypeError);
      assert.throws(() => createDeckTopology([{ pages: ['page'] }]), TypeError);
    });

    it('throws TypeError if page.detours is provided but not an array', () => {
      assert.throws(() => createDeckTopology([{ pages: [{ id: 'p1', detours: 'not-array' }] }]), TypeError);
      assert.throws(() => createDeckTopology([{ pages: [{ id: 'p1', detours: {} }] }]), TypeError);
    });

    it('normalizes missing detours to empty arrays', () => {
      const topology = createDeckTopology([
        {
          id: 'sec-0',
          pages: [{ id: 'p0' }] // no detours field
        }
      ]);
      assert.deepEqual(topology.sections[0].pages[0].detours, []);
      assert.equal(getZMax(topology, 0, 0), 0);
    });
  });

  describe('createDeckTopology - Deep Immutability Guarantees', () => {
    it('freezes the topology root, sections, pages, and detours', () => {
      const topology = createDeckTopology(createMockSections());
      assert.ok(Object.isFrozen(topology), 'topology root is frozen');
      assert.ok(Object.isFrozen(topology.sections), 'sections array is frozen');
      assert.ok(Object.isFrozen(topology.sections[0]), 'section object is frozen');
      assert.ok(Object.isFrozen(topology.sections[0].pages), 'pages array is frozen');
      assert.ok(Object.isFrozen(topology.sections[0].pages[0]), 'page object is frozen');
      assert.ok(Object.isFrozen(topology.sections[1].pages[1].detours), 'detours array is frozen');
      assert.ok(Object.isFrozen(topology.sections[1].pages[1].detours[0]), 'detour item is frozen');

      // Attempted mutation throws in strict mode
      assert.throws(() => {
        topology.sections = [];
      }, TypeError);

      assert.throws(() => {
        topology.sections.push({});
      }, TypeError);

      assert.throws(() => {
        topology.sections[0].id = 'mutated';
      }, TypeError);

      assert.throws(() => {
        topology.sections[0].pages.push({ id: 'p-new' });
      }, TypeError);

      assert.throws(() => {
        topology.sections[1].pages[1].detours.push({ id: 'd-new' });
      }, TypeError);
    });

    it('isolates topology from mutations to the original source objects', () => {
      const rawDeck = createMockDeck();
      const topology = createDeckTopology(rawDeck);

      // Mutate rawDeck after topology creation
      rawDeck.sections[0].pages.push({ id: 'p-injected' });
      rawDeck.sections[1].pages[1].detours.push({ id: 'd-injected' });
      rawDeck.sections.push({ id: 's-injected', pages: [{ id: 'p' }] });

      // Topology should remain unchanged
      assert.equal(topology.sections.length, 3);
      assert.equal(topology.sections[0].pages.length, 2);
      assert.equal(topology.sections[1].pages[1].detours.length, 2);
    });
  });

  describe('getYMax', () => {
    it('returns highest section index (yMax) for standard mock deck', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getYMax(topology), 2);
      assert.equal(getYMax(topology), MOCK_DECK_SPEC.yMax);
    });

    it('returns 0 for single-section deck', () => {
      const topology = createDeckTopology([{ pages: [{ id: 'p1' }] }]);
      assert.equal(getYMax(topology), 0);
    });

    it('returns -1 for invalid or empty topology input', () => {
      assert.equal(getYMax(null), -1);
      assert.equal(getYMax(undefined), -1);
      assert.equal(getYMax({}), -1);
      assert.equal(getYMax({ sections: [] }), -1);
    });
  });

  describe('getXMax', () => {
    it('returns correct xMax for each section in mock deck', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getXMax(topology, 0), 1); // 2 pages -> max index 1
      assert.equal(getXMax(topology, 1), 2); // 3 pages -> max index 2
      assert.equal(getXMax(topology, 2), 0); // 1 page -> max index 0
    });

    it('returns -1 for non-existent, negative, or invalid y coordinates', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getXMax(topology, -1), -1);
      assert.equal(getXMax(topology, 3), -1);
      assert.equal(getXMax(topology, 99), -1);
      assert.equal(getXMax(topology, 1.5), -1);
      assert.equal(getXMax(topology, '0'), -1);
      assert.equal(getXMax(topology, null), -1);
      assert.equal(getXMax(topology, NaN), -1);
    });

    it('returns -1 if topology is invalid', () => {
      assert.equal(getXMax(null, 0), -1);
      assert.equal(getXMax({}, 0), -1);
    });
  });

  describe('getZMax', () => {
    it('returns correct detour counts for pages in mock deck', () => {
      const topology = createDeckTopology(createMockSections());
      // Section 0: [0, 0]
      assert.equal(getZMax(topology, 0, 0), 0);
      assert.equal(getZMax(topology, 0, 1), 0);

      // Section 1: [0, 2, 0]
      assert.equal(getZMax(topology, 1, 0), 0);
      assert.equal(getZMax(topology, 1, 1), 2);
      assert.equal(getZMax(topology, 1, 2), 0);

      // Section 2: [0]
      assert.equal(getZMax(topology, 2, 0), 0);
    });

    it('returns -1 for out-of-bounds coordinates', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getZMax(topology, -1, 0), -1);
      assert.equal(getZMax(topology, 0, -1), -1);
      assert.equal(getZMax(topology, 0, 2), -1); // Section 0 only has pages 0 and 1
      assert.equal(getZMax(topology, 3, 0), -1); // Section 3 does not exist
      assert.equal(getZMax(topology, 1, 5), -1);
    });

    it('returns -1 for non-integer inputs', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getZMax(topology, 1.2, 0), -1);
      assert.equal(getZMax(topology, 1, 1.5), -1);
      assert.equal(getZMax(topology, '1', 1), -1);
      assert.equal(getZMax(topology, 1, null), -1);
      assert.equal(getZMax(topology, NaN, 0), -1);
    });

    it('returns -1 if topology is invalid', () => {
      assert.equal(getZMax(null, 0, 0), -1);
    });
  });

  describe('isValidCoordinate', () => {
    it('validates main track coordinates (z === 0)', () => {
      const topology = createDeckTopology(createMockSections());
      // Section 0 has pages 0 and 1
      assert.equal(isValidCoordinate(topology, 0, 0, 0), true);
      assert.equal(isValidCoordinate(topology, 0, 1, 0), true);

      // Section 1 has pages 0, 1, 2
      assert.equal(isValidCoordinate(topology, 1, 0, 0), true);
      assert.equal(isValidCoordinate(topology, 1, 1, 0), true);
      assert.equal(isValidCoordinate(topology, 1, 2, 0), true);

      // Section 2 has page 0
      assert.equal(isValidCoordinate(topology, 2, 0, 0), true);
    });

    it('validates detour coordinates (z > 0)', () => {
      const topology = createDeckTopology(createMockSections());
      // Page (1, 1) has 2 detours -> z=1 and z=2 are valid
      assert.equal(isValidCoordinate(topology, 1, 1, 1), true);
      assert.equal(isValidCoordinate(topology, 1, 1, 2), true);

      // z=3 exceeds Z_max(1, 1)=2 -> invalid
      assert.equal(isValidCoordinate(topology, 1, 1, 3), false);

      // Page (0, 0) has 0 detours -> z=1 is invalid
      assert.equal(isValidCoordinate(topology, 0, 0, 1), false);
    });

    it('rejects negative coordinates on any axis', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(isValidCoordinate(topology, -1, 0, 0), false);
      assert.equal(isValidCoordinate(topology, 0, -1, 0), false);
      assert.equal(isValidCoordinate(topology, 0, 0, -1), false);
      assert.equal(isValidCoordinate(topology, 1, 1, -1), false);
    });

    it('rejects out-of-bounds y or x coordinates', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(isValidCoordinate(topology, 3, 0, 0), false);
      assert.equal(isValidCoordinate(topology, 0, 2, 0), false);
      assert.equal(isValidCoordinate(topology, 2, 1, 0), false);
    });

    it('rejects non-integer coordinate inputs', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(isValidCoordinate(topology, 0.5, 0, 0), false);
      assert.equal(isValidCoordinate(topology, 0, 0.5, 0), false);
      assert.equal(isValidCoordinate(topology, 1, 1, 0.5), false);
      assert.equal(isValidCoordinate(topology, '0', 0, 0), false);
      assert.equal(isValidCoordinate(topology, 0, '0', 0), false);
      assert.equal(isValidCoordinate(topology, 0, 0, '0'), false);
      assert.equal(isValidCoordinate(topology, null, 0, 0), false);
      assert.equal(isValidCoordinate(topology, 0, undefined, 0), false);
      assert.equal(isValidCoordinate(topology, NaN, 0, 0), false);
    });

    it('returns false for invalid topology', () => {
      assert.equal(isValidCoordinate(null, 0, 0, 0), false);
    });
  });

  describe('Ergonomic Helper Queries', () => {
    it('getSection retrieves section by index or null', () => {
      const topology = createDeckTopology(createMockSections());
      const sec0 = getSection(topology, 0);
      assert.ok(sec0);
      assert.equal(sec0.id, 'section-0');

      assert.equal(getSection(topology, -1), null);
      assert.equal(getSection(topology, 3), null);
      assert.equal(getSection(topology, 1.5), null);
      assert.equal(getSection(null, 0), null);
    });

    it('getPage retrieves page by coordinate or null', () => {
      const topology = createDeckTopology(createMockSections());
      const p11 = getPage(topology, 1, 1);
      assert.ok(p11);
      assert.equal(p11.id, 'page-1-1');

      assert.equal(getPage(topology, 1, 3), null);
      assert.equal(getPage(topology, -1, 0), null);
      assert.equal(getPage(topology, 0, -1), null);
      assert.equal(getPage(null, 0, 0), null);
    });

    it('getDetour retrieves 1-indexed detour or null', () => {
      const topology = createDeckTopology(createMockSections());
      const d1 = getDetour(topology, 1, 1, 1);
      const d2 = getDetour(topology, 1, 1, 2);
      assert.ok(d1);
      assert.equal(d1.id, 'detour-1-1-1');
      assert.ok(d2);
      assert.equal(d2.id, 'detour-1-1-2');

      // z=0 is main slide, not a detour
      assert.equal(getDetour(topology, 1, 1, 0), null);
      // z=3 out of bounds
      assert.equal(getDetour(topology, 1, 1, 3), null);
      // z=-1 negative
      assert.equal(getDetour(topology, 1, 1, -1), null);
      // page with no detours
      assert.equal(getDetour(topology, 0, 0, 1), null);
    });

    it('getSectionCount returns section count', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getSectionCount(topology), 3);
      assert.equal(getSectionCount(null), 0);
    });

    it('getPageCount returns page count for a section', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(getPageCount(topology, 0), 2);
      assert.equal(getPageCount(topology, 1), 3);
      assert.equal(getPageCount(topology, 2), 1);
      assert.equal(getPageCount(topology, 3), 0);
      assert.equal(getPageCount(topology, -1), 0);
    });

    it('hasDetours checks whether detour exists on page', () => {
      const topology = createDeckTopology(createMockSections());
      assert.equal(hasDetours(topology, 0, 0), false);
      assert.equal(hasDetours(topology, 0, 1), false);
      assert.equal(hasDetours(topology, 1, 0), false);
      assert.equal(hasDetours(topology, 1, 1), true);
      assert.equal(hasDetours(topology, 1, 2), false);
      assert.equal(hasDetours(topology, 2, 0), false);
      assert.equal(hasDetours(topology, 9, 0), false);
    });
  });
});

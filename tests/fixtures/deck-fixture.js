/**
 * @file deck-fixture.js
 * @description Standard presentation tree fixture for unit and integration tests.
 *
 * Presentation Topology:
 * - Section 0 (2 pages):
 *   - Page 0 (0 detours)
 *   - Page 1 (0 detours)
 * - Section 1 (3 pages):
 *   - Page 0 (0 detours)
 *   - Page 1 (2 detours)
 *   - Page 2 (0 detours)
 * - Section 2 (1 page):
 *   - Page 0 (0 detours)
 */

export const MOCK_DECK_SPEC = Object.freeze({
  yMax: 2,
  sections: Object.freeze([
    Object.freeze({ y: 0, xMax: 1, detours: Object.freeze([0, 0]) }),
    Object.freeze({ y: 1, xMax: 2, detours: Object.freeze([0, 2, 0]) }),
    Object.freeze({ y: 2, xMax: 0, detours: Object.freeze([0]) })
  ])
});

/**
 * Creates a fresh deep copy of the standard mock deck tree.
 * @returns {object} Mock presentation deck tree with sections, pages, and detours.
 */
export function createMockDeck() {
  return {
    title: 'Paraslides Test Deck',
    sections: [
      {
        id: 'section-0',
        title: 'Section 0: Introduction',
        pages: [
          {
            id: 'page-0-0',
            title: 'Welcome',
            detours: []
          },
          {
            id: 'page-0-1',
            title: 'Overview',
            detours: []
          }
        ]
      },
      {
        id: 'section-1',
        title: 'Section 1: Architecture Deep Dive',
        pages: [
          {
            id: 'page-1-0',
            title: 'Hexagonal Architecture',
            detours: []
          },
          {
            id: 'page-1-1',
            title: 'Spatial Coordinates & Detours',
            detours: [
              {
                id: 'detour-1-1-1',
                title: 'Detour: Mathematical Coordinate Formulations'
              },
              {
                id: 'detour-1-1-2',
                title: 'Detour: CSS 3D Matrix Transformations'
              }
            ]
          },
          {
            id: 'page-1-2',
            title: 'Port-Driven Execution',
            detours: []
          }
        ]
      },
      {
        id: 'section-2',
        title: 'Section 2: Conclusion',
        pages: [
          {
            id: 'page-2-0',
            title: 'Summary & Next Steps',
            detours: []
          }
        ]
      }
    ]
  };
}

/**
 * Convenience helper returning just the sections array from the standard mock deck.
 * @returns {Array<object>}
 */
export function createMockSections() {
  return createMockDeck().sections;
}

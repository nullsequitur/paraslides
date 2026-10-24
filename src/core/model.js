/**
 * @file model.js
 * @description Deck Topology Model & Validation (Pure Domain Core).
 *
 * Implements the sparse 3D presentation tree (Section -> Page -> Detour Slides)
 * and boundary query methods. Pure JavaScript with zero runtime dependencies.
 */

/**
 * Deeply clones an object or array.
 * @private
 * @param {*} value
 * @returns {*}
 */
function deepClone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const cloned = {};
  for (const key of Object.keys(value)) {
    cloned[key] = deepClone(value[key]);
  }
  return cloned;
}

/**
 * Recursively freezes an object or array.
 * @private
 * @param {*} obj
 * @returns {*}
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return obj;
}

/**
 * Validates and creates an immutable Deck Topology tree.
 * Accepts either an array of sections or a deck object with a `sections` array.
 *
 * @param {Array<object>|{sections: Array<object>}} input - Deck sections or deck object.
 * @returns {Readonly<{sections: ReadonlyArray<object>}>} Immutable topology object.
 * @throws {TypeError} If input is invalid type or sections/pages/detours are malformed.
 * @throws {RangeError} If sections array is empty or any section has zero pages.
 */
export function createDeckTopology(input) {
  if (input === null || typeof input !== 'object') {
    throw new TypeError('Deck topology input must be an array of sections or an object with a sections property.');
  }

  const rawSections = Array.isArray(input) ? input : input.sections;

  if (!Array.isArray(rawSections)) {
    throw new TypeError('Deck topology sections must be an array.');
  }

  if (rawSections.length === 0) {
    throw new RangeError('Deck topology must contain at least one section.');
  }

  // Validate each section and page
  for (let y = 0; y < rawSections.length; y++) {
    const section = rawSections[y];
    if (section === null || typeof section !== 'object' || Array.isArray(section)) {
      throw new TypeError(`Section at index ${y} must be a non-null object.`);
    }

    if (!Array.isArray(section.pages)) {
      throw new TypeError(`Section at index ${y} must have a pages array.`);
    }

    if (section.pages.length === 0) {
      throw new RangeError(`Section at index ${y} must contain at least one page.`);
    }

    for (let x = 0; x < section.pages.length; x++) {
      const page = section.pages[x];
      if (page === null || typeof page !== 'object' || Array.isArray(page)) {
        throw new TypeError(`Page at (${y}, ${x}) must be a non-null object.`);
      }

      if (page.detours !== undefined && !Array.isArray(page.detours)) {
        throw new TypeError(`Detours at (${y}, ${x}) must be an array if provided.`);
      }
    }
  }

  // Normalize sections and pages (ensure detours is always an array)
  const normalizedSections = rawSections.map((section) => ({
    ...deepClone(section),
    pages: section.pages.map((page) => ({
      ...deepClone(page),
      detours: Array.isArray(page.detours) ? deepClone(page.detours) : []
    }))
  }));

  const topology = {
    sections: normalizedSections
  };

  return deepFreeze(topology);
}

/**
 * Returns the highest valid y index (number of sections minus 1).
 * Returns -1 if topology is invalid or has no sections.
 *
 * @param {object} topology - The deck topology.
 * @returns {number} Highest valid y index, or -1 if invalid.
 */
export function getYMax(topology) {
  if (!topology || !Array.isArray(topology.sections) || topology.sections.length === 0) {
    return -1;
  }
  return topology.sections.length - 1;
}

/**
 * Returns the highest valid x index for section y.
 * Returns -1 if section y does not exist or y is not an integer.
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @returns {number} Highest valid x index in section y, or -1 if invalid.
 */
export function getXMax(topology, y) {
  if (!Number.isInteger(y) || y < 0) {
    return -1;
  }
  const yMax = getYMax(topology);
  if (yMax === -1 || y > yMax) {
    return -1;
  }
  const section = topology.sections[y];
  if (!section || !Array.isArray(section.pages) || section.pages.length === 0) {
    return -1;
  }
  return section.pages.length - 1;
}

/**
 * Returns the detour count (Z_max) for page (y, x).
 * Returns 0 if page exists but has no detours.
 * Returns -1 if page or section does not exist or indices are not integers.
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @param {number} x - Page index within section y.
 * @returns {number} Detour count (>= 0), or -1 if coordinate is invalid.
 */
export function getZMax(topology, y, x) {
  if (!Number.isInteger(y) || !Number.isInteger(x) || x < 0) {
    return -1;
  }
  const xMax = getXMax(topology, y);
  if (xMax === -1 || x > xMax) {
    return -1;
  }
  const page = topology.sections[y].pages[x];
  if (!page || !Array.isArray(page.detours)) {
    return 0;
  }
  return page.detours.length;
}

/**
 * Checks whether a given (y, x, z) coordinate exists within the deck topology.
 * - z === 0: Refers to the main track slide at page (y, x).
 * - z > 0: Refers to detour slide z (1-indexed up to Z_max) attached to (y, x).
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @param {number} z - Track/Detour index (0 for main track, 1..Z_max for detours).
 * @returns {boolean} True if coordinate exists, false otherwise.
 */
export function isValidCoordinate(topology, y, x, z) {
  if (!Number.isInteger(y) || !Number.isInteger(x) || !Number.isInteger(z)) {
    return false;
  }
  if (z < 0) {
    return false;
  }
  const zMax = getZMax(topology, y, x);
  if (zMax === -1) {
    return false;
  }
  return z <= zMax;
}

/**
 * Returns the section object at index y, or null if invalid.
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @returns {object|null} Section object or null.
 */
export function getSection(topology, y) {
  if (!Number.isInteger(y) || y < 0 || y > getYMax(topology)) {
    return null;
  }
  return topology.sections[y];
}

/**
 * Returns the page object at coordinate (y, x), or null if invalid.
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @returns {object|null} Page object or null.
 */
export function getPage(topology, y, x) {
  if (!Number.isInteger(y) || !Number.isInteger(x) || x < 0 || x > getXMax(topology, y)) {
    return null;
  }
  return topology.sections[y].pages[x];
}

/**
 * Returns the detour object at coordinate (y, x, z) where z >= 1, or null if invalid.
 * Note: Detours are 1-indexed in coordinate space (z=1 is detours[0]).
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @param {number} z - Detour index (z >= 1).
 * @returns {object|null} Detour object or null.
 */
export function getDetour(topology, y, x, z) {
  if (!Number.isInteger(z) || z < 1) {
    return null;
  }
  const page = getPage(topology, y, x);
  if (!page || !Array.isArray(page.detours) || z > page.detours.length) {
    return null;
  }
  return page.detours[z - 1];
}

/**
 * Returns the total number of sections in the deck.
 *
 * @param {object} topology - The deck topology.
 * @returns {number} Section count (>= 0).
 */
export function getSectionCount(topology) {
  if (!topology || !Array.isArray(topology.sections)) {
    return 0;
  }
  return topology.sections.length;
}

/**
 * Returns the number of pages in section y.
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @returns {number} Page count, or 0 if section does not exist.
 */
export function getPageCount(topology, y) {
  const xMax = getXMax(topology, y);
  return xMax === -1 ? 0 : xMax + 1;
}

/**
 * Checks whether the page at (y, x) has any detour slides attached.
 *
 * @param {object} topology - The deck topology.
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @returns {boolean} True if Z_max > 0.
 */
export function hasDetours(topology, y, x) {
  return getZMax(topology, y, x) > 0;
}

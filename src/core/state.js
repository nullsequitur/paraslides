/**
 * @file state.js
 * @description Coordinate State & Cursor Memory (Pure Domain Core).
 *
 * Implements the presentation active navigation state, operating modes
 * (MAIN vs. DETOUR), and persistent cursor memory arrays (lastX, lastZ).
 * Pure JavaScript with zero runtime dependencies and zero DOM/CSS references.
 */

import { createDeckTopology, getYMax, getXMax, isValidCoordinate } from './model.js';

/**
 * Operating mode indicating navigation along the main presentation grid.
 * @constant {string}
 */
export const MODE_MAIN = 'MAIN';

/**
 * Operating mode indicating navigation within an attached detour slide sequence.
 * @constant {string}
 */
export const MODE_DETOUR = 'DETOUR';

/**
 * Frozen map of supported operating modes.
 * @constant {Readonly<{MAIN: string, DETOUR: string}>}
 */
export const MODES = Object.freeze({
  MAIN: MODE_MAIN,
  DETOUR: MODE_DETOUR
});

/**
 * Deeply freezes a state object and its cursor memory arrays.
 *
 * @private
 * @param {object} state - State object to freeze.
 * @returns {object} The frozen state object.
 */
function freezeState(state) {
  if (Array.isArray(state.lastX)) {
    Object.freeze(state.lastX);
  }
  if (Array.isArray(state.lastZ)) {
    for (let y = 0; y < state.lastZ.length; y++) {
      if (Array.isArray(state.lastZ[y])) {
        Object.freeze(state.lastZ[y]);
      }
    }
    Object.freeze(state.lastZ);
  }
  return Object.freeze(state);
}

/**
 * Derives the active presentation mode strictly from the z coordinate.
 * - z === 0 -> 'MAIN'
 * - z > 0   -> 'DETOUR'
 *
 * @param {number} z - Track/Detour index.
 * @returns {'MAIN'|'DETOUR'} The derived operating mode.
 * @throws {TypeError} If z is not a non-negative integer.
 */
export function deriveMode(z) {
  if (!Number.isInteger(z) || z < 0) {
    throw new TypeError(`z coordinate must be a non-negative integer, got: ${z}`);
  }
  return z === 0 ? MODE_MAIN : MODE_DETOUR;
}

/**
 * Creates the initial presentation navigation state for a given deck topology.
 *
 * Initial coordinates: { y: 0, x: 0, z: 0, mode: 'MAIN' }
 * Cursor memory:
 * - lastX: Array of length (Y_max + 1) filled with 0.
 * - lastZ: 2D Matrix of dimensions [Y_max + 1][X_max(y) + 1] filled with 1.
 *
 * @param {object|Array<object>} input - Deck topology or raw sections array.
 * @returns {Readonly<{y: number, x: number, z: number, mode: string, lastX: ReadonlyArray<number>, lastZ: ReadonlyArray<ReadonlyArray<number>>}>}
 * @throws {TypeError} If topology input is null or invalid type.
 * @throws {RangeError} If topology has zero sections or any section has zero pages.
 */
export function createInitialState(input) {
  if (input === null || typeof input !== 'object') {
    throw new TypeError('Topology input must be a non-null object or array.');
  }

  const topology = (input && Array.isArray(input.sections))
    ? input
    : createDeckTopology(input);

  const yMax = getYMax(topology);
  if (yMax < 0) {
    throw new RangeError('Topology must contain at least one valid section.');
  }

  const lastX = new Array(yMax + 1).fill(0);
  const lastZ = new Array(yMax + 1);

  for (let y = 0; y <= yMax; y++) {
    const xMax = getXMax(topology, y);
    if (xMax < 0) {
      throw new RangeError(`Section at index ${y} must contain at least one valid page.`);
    }
    lastZ[y] = new Array(xMax + 1).fill(1);
  }

  const state = {
    y: 0,
    x: 0,
    z: 0,
    mode: MODE_MAIN,
    desiredX: 0,
    isStickyEol: false,
    lastX,
    lastZ
  };

  return freezeState(state);
}

/**
 * Creates an independent, deeply frozen clone of an existing navigation state.
 *
 * @param {object} state - State to clone.
 * @returns {object} Freshly cloned and frozen state instance.
 * @throws {TypeError} If state is null or missing memory arrays.
 */
export function cloneState(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('State must be a non-null object.');
  }
  if (!Array.isArray(state.lastX) || !Array.isArray(state.lastZ)) {
    throw new TypeError('State must contain lastX and lastZ arrays.');
  }

  return freezeState({
    y: state.y,
    x: state.x,
    z: state.z,
    mode: state.mode,
    desiredX: state.desiredX !== undefined ? state.desiredX : state.x,
    isStickyEol: Boolean(state.isStickyEol),
    lastX: [...state.lastX],
    lastZ: state.lastZ.map((row) => [...row])
  });
}

/**
 * Returns a new immutable state with updated coordinates and synchronized cursor memory.
 *
 * Cursor memory rules applied:
 * 1. If section changes (nextY !== oldY), the departing section's page is recorded: lastX[oldY] = oldX.
 * 2. If within main track (nextZ === 0), the active page is recorded: lastX[nextY] = nextX.
 * 3. If within detour track (nextZ > 0), the detour index is recorded: lastZ[nextY][nextX] = nextZ.
 *
 * Supports two signatures:
 * - updateCoordinates(state, { y?, x?, z? }, topology?)
 * - updateCoordinates(state, y, x, z, topology?)
 *
 * @param {object} currentState - Active presentation state.
 * @param {object|number} coordsOrY - Coordinate object or target y index.
 * @param {object|number} [xOrTopology] - Target x index or optional topology if first param is object.
 * @param {number} [targetZParam] - Target z index if calling with discrete coordinates.
 * @param {object} [maybeTopology] - Optional topology if calling with discrete coordinates.
 * @returns {object} New immutable state instance.
 * @throws {TypeError} If inputs are invalid types.
 * @throws {RangeError} If coordinates are negative or fail topology validation.
 */
export function updateCoordinates(currentState, coordsOrY, xOrTopology, targetZParam, maybeTopology) {
  if (!currentState || typeof currentState !== 'object') {
    throw new TypeError('Current state must be a non-null object.');
  }
  if (!Array.isArray(currentState.lastX) || !Array.isArray(currentState.lastZ)) {
    throw new TypeError('Current state must contain lastX and lastZ arrays.');
  }

  let nextY = currentState.y;
  let nextX = currentState.x;
  let nextZ = currentState.z;
  let topology = null;

  if (typeof coordsOrY === 'number') {
    nextY = coordsOrY;
    if (typeof xOrTopology === 'number') {
      nextX = xOrTopology;
    }
    if (typeof targetZParam === 'number') {
      nextZ = targetZParam;
    }
    if (maybeTopology && typeof maybeTopology === 'object') {
      topology = maybeTopology;
    }
  } else if (coordsOrY && typeof coordsOrY === 'object') {
    if (coordsOrY.y !== undefined) nextY = coordsOrY.y;
    if (coordsOrY.x !== undefined) nextX = coordsOrY.x;
    if (coordsOrY.z !== undefined) nextZ = coordsOrY.z;
    if (xOrTopology && typeof xOrTopology === 'object') {
      topology = xOrTopology;
    }
  } else {
    throw new TypeError('Coordinates must be an object { y?, x?, z? } or numbers.');
  }

  if (!Number.isInteger(nextY) || !Number.isInteger(nextX) || !Number.isInteger(nextZ)) {
    throw new TypeError('Coordinates y, x, and z must be integers.');
  }

  if (nextY < 0 || nextX < 0 || nextZ < 0) {
    throw new RangeError(`Coordinates cannot be negative: (${nextY}, ${nextX}, ${nextZ}).`);
  }

  if (topology) {
    if (!isValidCoordinate(topology, nextY, nextX, nextZ)) {
      throw new RangeError(`Target coordinate (${nextY}, ${nextX}, ${nextZ}) is not valid for the given topology.`);
    }
  }

  const oldY = currentState.y;
  const oldX = currentState.x;

  let desiredX = currentState.desiredX !== undefined ? currentState.desiredX : currentState.x;
  let isStickyEol = Boolean(currentState.isStickyEol);

  if (coordsOrY && typeof coordsOrY === 'object') {
    if (coordsOrY.desiredX !== undefined) {
      desiredX = coordsOrY.desiredX;
    }
    if (coordsOrY.isStickyEol !== undefined) {
      isStickyEol = Boolean(coordsOrY.isStickyEol);
    }
    if (coordsOrY.desiredX === undefined && coordsOrY.isStickyEol === undefined && nextY === oldY && nextX !== oldX) {
      desiredX = nextX;
      isStickyEol = false;
    }
  } else if (typeof coordsOrY === 'number' && nextY === oldY && nextX !== oldX) {
    desiredX = nextX;
    isStickyEol = false;
  }

  const newLastX = [...currentState.lastX];
  const newLastZ = currentState.lastZ.map((row) => [...row]);

  // Rule 1: Section switch records departing section's last visited x
  if (nextY !== oldY) {
    if (oldY >= 0 && oldY < newLastX.length) {
      newLastX[oldY] = oldX;
    }
  }

  // Rule 2: Record active x for section nextY
  if (nextY >= 0 && nextY < newLastX.length) {
    newLastX[nextY] = nextX;
  }

  // Rule 3: In detour track, record last visited z for page (nextY, nextX)
  if (nextZ > 0) {
    if (
      nextY >= 0 &&
      nextY < newLastZ.length &&
      nextX >= 0 &&
      nextX < newLastZ[nextY].length
    ) {
      newLastZ[nextY][nextX] = nextZ;
    }
  }

  const nextMode = deriveMode(nextZ);

  return freezeState({
    y: nextY,
    x: nextX,
    z: nextZ,
    mode: nextMode,
    desiredX,
    isStickyEol,
    lastX: newLastX,
    lastZ: newLastZ
  });
}

/**
 * Alias for updateCoordinates.
 */
export const updateState = updateCoordinates;

/**
 * Reads the desired/target sticky column index for horizontal alignment.
 *
 * @param {object} state - Active presentation state.
 * @returns {number} Desired column index or -1 if invalid.
 */
export function getDesiredX(state) {
  if (!state || typeof state !== 'object') {
    return -1;
  }
  return state.desiredX !== undefined ? state.desiredX : (typeof state.x === 'number' ? state.x : -1);
}

/**
 * Checks whether sticky end-of-line mode ($) is currently active.
 *
 * @param {object} state - Active presentation state.
 * @returns {boolean} True if sticky EOL is active.
 */
export function isStickyEol(state) {
  return Boolean(state?.isStickyEol);
}

/**
 * Resets the detour cursor memory (lastZ) to 1.
 * If (y, x) are provided, resets only that page's detour memory.
 * If omitted, resets all detour cursor memory across the deck.
 *
 * @param {object} state - Active state.
 * @param {number} [y] - Optional section index.
 * @param {number} [x] - Optional page index.
 * @returns {object} New state instance with reset detour memory.
 * @throws {TypeError} If state is invalid.
 * @throws {RangeError} If y or x is out of bounds.
 */
export function resetDetourMemory(state, y, x) {
  if (!state || !Array.isArray(state.lastZ)) {
    throw new TypeError('State must be a valid state object with lastZ array.');
  }

  const newLastZ = state.lastZ.map((row) => [...row]);

  if (y !== undefined && x !== undefined) {
    if (!Number.isInteger(y) || y < 0 || y >= newLastZ.length) {
      throw new RangeError(`Section index y (${y}) is out of bounds.`);
    }
    if (!Number.isInteger(x) || x < 0 || x >= newLastZ[y].length) {
      throw new RangeError(`Page index x (${x}) is out of bounds.`);
    }
    newLastZ[y][x] = 1;
  } else {
    for (let r = 0; r < newLastZ.length; r++) {
      for (let c = 0; c < newLastZ[r].length; c++) {
        newLastZ[r][c] = 1;
      }
    }
  }

  return freezeState({
    y: state.y,
    x: state.x,
    z: state.z,
    mode: state.mode,
    lastX: [...state.lastX],
    lastZ: newLastZ
  });
}

/**
 * Reads the last visited page index (lastX) for section y.
 *
 * @param {object} state - Active state.
 * @param {number} y - Section index.
 * @returns {number} Last visited page index, or -1 if invalid.
 */
export function getLastX(state, y) {
  if (!state || !Array.isArray(state.lastX)) {
    return -1;
  }
  if (!Number.isInteger(y) || y < 0 || y >= state.lastX.length) {
    return -1;
  }
  return state.lastX[y];
}

/**
 * Reads the last visited detour index (lastZ) for page (y, x).
 *
 * @param {object} state - Active state.
 * @param {number} y - Section index.
 * @param {number} x - Page index.
 * @returns {number} Last visited detour index (>= 1), or -1 if invalid.
 */
export function getLastZ(state, y, x) {
  if (!state || !Array.isArray(state.lastZ)) {
    return -1;
  }
  if (!Number.isInteger(y) || y < 0 || y >= state.lastZ.length) {
    return -1;
  }
  const row = state.lastZ[y];
  if (!Array.isArray(row) || !Number.isInteger(x) || x < 0 || x >= row.length) {
    return -1;
  }
  return row[x];
}

/**
 * @file navigator.js
 * @description Transition Matrix & Command Processor (Pure Domain Core).
 *
 * Implements deterministic navigation transitions across the 3D presentation grid
 * (Section y, Page x, Detour z) and mode boundaries (MAIN vs. DETOUR).
 * Pure JavaScript with zero runtime dependencies and zero DOM/CSS/window/document references.
 */

import { getYMax, getXMax, getZMax } from './model.js';
import { MODE_MAIN, MODE_DETOUR, updateCoordinates, getLastX, getLastZ } from './state.js';

/**
 * Command constant: Move left across pages (MAIN) or detours (DETOUR).
 * @constant {string}
 */
export const COMMAND_MOVE_LEFT = 'MOVE_LEFT';

/**
 * Command constant: Move right across pages (MAIN) or detours (DETOUR).
 * @constant {string}
 */
export const COMMAND_MOVE_RIGHT = 'MOVE_RIGHT';

/**
 * Command constant: Move up across sections (MAIN only, locked in DETOUR).
 * @constant {string}
 */
export const COMMAND_MOVE_UP = 'MOVE_UP';

/**
 * Command constant: Move down across sections (MAIN only, locked in DETOUR).
 * @constant {string}
 */
export const COMMAND_MOVE_DOWN = 'MOVE_DOWN';

/**
 * Command constant: Enter detour sequence from main slide (if available).
 * @constant {string}
 */
export const COMMAND_ENTER_DETOUR = 'ENTER_DETOUR';

/**
 * Command constant: Exit detour sequence and return to parent page on main track.
 * @constant {string}
 */
export const COMMAND_EXIT_DETOUR = 'EXIT_DETOUR';

/**
 * Command constant: Jump to the start of the current axis (page 0 or detour 1).
 * @constant {string}
 */
export const COMMAND_JUMP_START = 'JUMP_START';

/**
 * Command constant: Jump to the end of the current axis (xMax or zMax).
 * @constant {string}
 */
export const COMMAND_JUMP_END = 'JUMP_END';

/**
 * Frozen map of all supported navigation commands.
 * @constant {Readonly<{
 *   MOVE_LEFT: string,
 *   MOVE_RIGHT: string,
 *   MOVE_UP: string,
 *   MOVE_DOWN: string,
 *   ENTER_DETOUR: string,
 *   EXIT_DETOUR: string,
 *   JUMP_START: string,
 *   JUMP_END: string
 * }>}
 */
export const COMMANDS = Object.freeze({
  MOVE_LEFT: COMMAND_MOVE_LEFT,
  MOVE_RIGHT: COMMAND_MOVE_RIGHT,
  MOVE_UP: COMMAND_MOVE_UP,
  MOVE_DOWN: COMMAND_MOVE_DOWN,
  ENTER_DETOUR: COMMAND_ENTER_DETOUR,
  EXIT_DETOUR: COMMAND_EXIT_DETOUR,
  JUMP_START: COMMAND_JUMP_START,
  JUMP_END: COMMAND_JUMP_END
});

/**
 * Computes presentation navigation capabilities and boundaries for the given state.
 *
 * Capabilities specified in DOMAIN_SPEC.md section 5:
 * - canMoveLeft: boolean (x > 0 in MAIN, z > 1 in DETOUR)
 * - canMoveRight: boolean (x < X_max(y) in MAIN, z < Z_max(y, x) in DETOUR)
 * - canMoveUp: boolean (y > 0 in MAIN, false in DETOUR)
 * - canMoveDown: boolean (y < Y_max in MAIN, false in DETOUR)
 * - hasDetour: boolean (Z_max(y, x) > 0)
 * - detourCount: integer (Z_max(y, x))
 * - isVerticalLocked: boolean (mode === 'DETOUR')
 *
 * @param {object} topology - Immutable deck topology.
 * @param {object} state - Active navigation state.
 * @returns {Readonly<{
 *   canMoveLeft: boolean,
 *   canMoveRight: boolean,
 *   canMoveUp: boolean,
 *   canMoveDown: boolean,
 *   hasDetour: boolean,
 *   detourCount: number,
 *   isVerticalLocked: boolean
 * }>} Frozen capabilities object.
 * @throws {TypeError} If topology or state is missing.
 */
export function computeCapabilities(topology, state) {
  if (!topology || typeof topology !== 'object') {
    throw new TypeError('Topology must be a non-null object.');
  }
  if (!state || typeof state !== 'object') {
    throw new TypeError('State must be a non-null object.');
  }

  const isDetour = state.mode === MODE_DETOUR;
  const yMax = getYMax(topology);
  const xMax = getXMax(topology, state.y);
  const zMax = getZMax(topology, state.y, state.x);

  const canMoveLeft = isDetour ? state.z > 1 : state.x > 0;
  const canMoveRight = isDetour ? (zMax > 0 && state.z < zMax) : (xMax > 0 && state.x < xMax);
  const canMoveUp = isDetour ? false : state.y > 0;
  const canMoveDown = isDetour ? false : (yMax > 0 && state.y < yMax);
  const hasDetour = zMax > 0;
  const detourCount = Math.max(0, zMax);
  const isVerticalLocked = isDetour;

  return Object.freeze({
    canMoveLeft,
    canMoveRight,
    canMoveUp,
    canMoveDown,
    hasDetour,
    detourCount,
    isVerticalLocked
  });
}

/**
 * Builds an immutable outbound state payload combining coordinates, capabilities,
 * and any transient feedback flags.
 *
 * @param {object} topology - Immutable deck topology.
 * @param {object} state - Active navigation state.
 * @param {object} [feedback={}] - Optional feedback flags (e.g., verticalLockedAttempt).
 * @returns {Readonly<{
 *   y: number,
 *   x: number,
 *   z: number,
 *   mode: string,
 *   canMoveLeft: boolean,
 *   canMoveRight: boolean,
 *   canMoveUp: boolean,
 *   canMoveDown: boolean,
 *   hasDetour: boolean,
 *   detourCount: number,
 *   isVerticalLocked: boolean,
 *   capabilities: object,
 *   feedback: object
 * }>} Frozen state snapshot payload.
 */
export function buildStatePayload(topology, state, feedback = {}) {
  const capabilities = computeCapabilities(topology, state);
  const frozenFeedback = Object.freeze({ ...feedback });

  return Object.freeze({
    y: state.y,
    x: state.x,
    z: state.z,
    mode: state.mode,
    ...capabilities,
    capabilities,
    feedback: frozenFeedback,
    ...frozenFeedback
  });
}

/**
 * Deterministically processes an abstract navigation command against the current state
 * according to the DOMAIN_SPEC.md transition matrix.
 *
 * @param {object} topology - Immutable deck topology.
 * @param {object} currentState - Active navigation state.
 * @param {string|{type: string}} command - Command string or command object with `type`.
 * @returns {Readonly<{
 *   state: object,
 *   payload: object,
 *   feedback: object
 * }>} Result containing the new state, outbound payload, and feedback flags.
 * @throws {TypeError} If topology or currentState is missing, or command is unknown.
 */
export function processCommand(topology, currentState, command) {
  if (!topology || typeof topology !== 'object') {
    throw new TypeError('Topology must be a non-null object.');
  }
  if (!currentState || typeof currentState !== 'object') {
    throw new TypeError('Current state must be a non-null object.');
  }

  const commandType = (typeof command === 'object' && command !== null) ? command.type : command;

  if (typeof commandType !== 'string' || !Object.values(COMMANDS).includes(commandType)) {
    throw new TypeError(`Unknown navigation command: ${JSON.stringify(command)}`);
  }

  let nextState = currentState;
  let feedback = {};

  const isDetour = currentState.mode === MODE_DETOUR;

  switch (commandType) {
    case COMMAND_MOVE_RIGHT: {
      if (!isDetour) {
        const xMax = getXMax(topology, currentState.y);
        if (currentState.x < xMax) {
          nextState = updateCoordinates(currentState, currentState.y, currentState.x + 1, 0, topology);
        }
      } else {
        const zMax = getZMax(topology, currentState.y, currentState.x);
        if (currentState.z < zMax) {
          nextState = updateCoordinates(currentState, currentState.y, currentState.x, currentState.z + 1, topology);
        }
      }
      break;
    }

    case COMMAND_MOVE_LEFT: {
      if (!isDetour) {
        if (currentState.x > 0) {
          nextState = updateCoordinates(currentState, currentState.y, currentState.x - 1, 0, topology);
        }
      } else {
        if (currentState.z > 1) {
          nextState = updateCoordinates(currentState, currentState.y, currentState.x, currentState.z - 1, topology);
        }
      }
      break;
    }

    case COMMAND_MOVE_DOWN: {
      if (!isDetour) {
        const yMax = getYMax(topology);
        if (currentState.y < yMax) {
          const newY = currentState.y + 1;
          const rememberedX = getLastX(currentState, newY);
          const maxXInNewSection = getXMax(topology, newY);
          const targetX = Math.min(rememberedX >= 0 ? rememberedX : 0, maxXInNewSection);
          nextState = updateCoordinates(currentState, newY, targetX, 0, topology);
        }
      } else {
        feedback = { verticalLockedAttempt: true };
      }
      break;
    }

    case COMMAND_MOVE_UP: {
      if (!isDetour) {
        if (currentState.y > 0) {
          const newY = currentState.y - 1;
          const rememberedX = getLastX(currentState, newY);
          const maxXInNewSection = getXMax(topology, newY);
          const targetX = Math.min(rememberedX >= 0 ? rememberedX : 0, maxXInNewSection);
          nextState = updateCoordinates(currentState, newY, targetX, 0, topology);
        }
      } else {
        feedback = { verticalLockedAttempt: true };
      }
      break;
    }

    case COMMAND_ENTER_DETOUR: {
      if (!isDetour) {
        const zMax = getZMax(topology, currentState.y, currentState.x);
        if (zMax > 0) {
          const rememberedZ = getLastZ(currentState, currentState.y, currentState.x);
          const targetZ = Math.max(1, Math.min(rememberedZ > 0 ? rememberedZ : 1, zMax));
          nextState = updateCoordinates(currentState, currentState.y, currentState.x, targetZ, topology);
        }
      }
      break;
    }

    case COMMAND_EXIT_DETOUR: {
      if (isDetour) {
        nextState = updateCoordinates(currentState, currentState.y, currentState.x, 0, topology);
      }
      break;
    }

    case COMMAND_JUMP_START: {
      if (!isDetour) {
        if (currentState.x !== 0) {
          nextState = updateCoordinates(currentState, currentState.y, 0, 0, topology);
        }
      } else {
        if (currentState.z !== 1) {
          nextState = updateCoordinates(currentState, currentState.y, currentState.x, 1, topology);
        }
      }
      break;
    }

    case COMMAND_JUMP_END: {
      if (!isDetour) {
        const xMax = getXMax(topology, currentState.y);
        if (currentState.x !== xMax) {
          nextState = updateCoordinates(currentState, currentState.y, xMax, 0, topology);
        }
      } else {
        const zMax = getZMax(topology, currentState.y, currentState.x);
        if (currentState.z !== zMax) {
          nextState = updateCoordinates(currentState, currentState.y, currentState.x, zMax, topology);
        }
      }
      break;
    }

    default:
      break;
  }

  const payload = buildStatePayload(topology, nextState, feedback);
  const frozenFeedback = Object.freeze({ ...feedback });

  return Object.freeze({
    state: nextState,
    payload,
    feedback: frozenFeedback
  });
}

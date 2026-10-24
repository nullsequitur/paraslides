/**
 * @file output.js
 * @description Outbound State Broadcast Port driven by the Core Domain.
 *
 * Defines the contract, schema validation, and subscriber registration helpers
 * for state updates emitted from the Core Domain across the hexagonal boundary
 * to external renderers (Viewport, HUD, Serializers).
 * Pure JavaScript ES module with zero dependencies on window, document, DOM, or CSS.
 */

import { MODE_MAIN, MODE_DETOUR } from '../core/state.js';

/**
 * @typedef {object} StatePayload
 * @property {number} y - Current section index.
 * @property {number} x - Current page index within section.
 * @property {number} z - Current detour slide index (0 for Main track, >= 1 for Detour).
 * @property {'MAIN'|'DETOUR'} mode - Operating mode.
 * @property {boolean} canMoveLeft - True if leftward navigation is possible.
 * @property {boolean} canMoveRight - True if rightward navigation is possible.
 * @property {boolean} canMoveUp - True if upward section navigation is possible.
 * @property {boolean} canMoveDown - True if downward section navigation is possible.
 * @property {boolean} hasDetour - True if current page has an attached detour sequence.
 * @property {number} detourCount - Number of detour slides available at current page.
 * @property {boolean} isVerticalLocked - True if vertical navigation is locked (DETOUR mode).
 * @property {object} [capabilities] - Capabilities object snapshot.
 * @property {object} [feedback] - Feedback flags (e.g. verticalLockedAttempt).
 */

/**
 * @typedef {object} StateChangeEvent
 * @property {object} state - Immutable Core Domain state object.
 * @property {StatePayload} payload - Immutable outbound state payload.
 * @property {StatePayload|null} previousPayload - Pre-transition state payload (null on initial subscription).
 * @property {object|null} previousState - Pre-transition state (null on initial subscription).
 * @property {string|null} command - The command that triggered this transition (null on initial subscription).
 * @property {object} [feedback] - Transient feedback flags emitted by this command.
 */

/**
 * @typedef {(event: StateChangeEvent) => void} StateSubscriber
 */

/**
 * @typedef {() => void} UnsubscribeFunction
 */

/**
 * Validates that an outbound state payload satisfies all schema and invariant
 * requirements defined in DOMAIN_SPEC.md Section 5.
 *
 * Returns true if valid, false otherwise.
 *
 * @param {*} payload - Object to validate.
 * @returns {boolean} True if payload is a conformant state payload.
 */
export function isValidStatePayload(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  // 1. Coordinates: y, x, z non-negative integers
  if (!Number.isInteger(payload.y) || payload.y < 0) return false;
  if (!Number.isInteger(payload.x) || payload.x < 0) return false;
  if (!Number.isInteger(payload.z) || payload.z < 0) return false;

  // 2. Mode: 'MAIN' when z === 0, 'DETOUR' when z > 0
  if (payload.mode !== MODE_MAIN && payload.mode !== MODE_DETOUR) return false;
  if (payload.z === 0 && payload.mode !== MODE_MAIN) return false;
  if (payload.z > 0 && payload.mode !== MODE_DETOUR) return false;

  // 3. Navigation capability booleans
  if (typeof payload.canMoveLeft !== 'boolean') return false;
  if (typeof payload.canMoveRight !== 'boolean') return false;
  if (typeof payload.canMoveUp !== 'boolean') return false;
  if (typeof payload.canMoveDown !== 'boolean') return false;
  if (typeof payload.hasDetour !== 'boolean') return false;
  if (typeof payload.isVerticalLocked !== 'boolean') return false;

  // 4. Detour count non-negative integer & consistency with hasDetour
  if (!Number.isInteger(payload.detourCount) || payload.detourCount < 0) return false;
  if (payload.hasDetour !== (payload.detourCount > 0)) return false;

  // 5. Vertical axis locked strictly when in DETOUR mode
  if (payload.isVerticalLocked !== (payload.mode === MODE_DETOUR)) return false;

  return true;
}

/**
 * Asserts that an outbound state payload satisfies the DOMAIN_SPEC.md Section 5 schema.
 * Throws a TypeError if validation fails.
 *
 * @param {*} payload - Object to validate.
 * @returns {boolean} Returns true if valid.
 * @throws {TypeError} If payload is invalid or malformed.
 */
export function assertValidStatePayload(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('State payload must be a non-null object.');
  }

  if (!Number.isInteger(payload.y) || payload.y < 0) {
    throw new TypeError(`State payload property 'y' must be a non-negative integer, got: ${payload.y}`);
  }
  if (!Number.isInteger(payload.x) || payload.x < 0) {
    throw new TypeError(`State payload property 'x' must be a non-negative integer, got: ${payload.x}`);
  }
  if (!Number.isInteger(payload.z) || payload.z < 0) {
    throw new TypeError(`State payload property 'z' must be a non-negative integer, got: ${payload.z}`);
  }

  if (payload.mode !== MODE_MAIN && payload.mode !== MODE_DETOUR) {
    throw new TypeError(`State payload property 'mode' must be '${MODE_MAIN}' or '${MODE_DETOUR}', got: ${payload.mode}`);
  }
  if (payload.z === 0 && payload.mode !== MODE_MAIN) {
    throw new TypeError(`State payload mode must be '${MODE_MAIN}' when z is 0.`);
  }
  if (payload.z > 0 && payload.mode !== MODE_DETOUR) {
    throw new TypeError(`State payload mode must be '${MODE_DETOUR}' when z > 0.`);
  }

  if (typeof payload.canMoveLeft !== 'boolean') {
    throw new TypeError(`State payload property 'canMoveLeft' must be a boolean.`);
  }
  if (typeof payload.canMoveRight !== 'boolean') {
    throw new TypeError(`State payload property 'canMoveRight' must be a boolean.`);
  }
  if (typeof payload.canMoveUp !== 'boolean') {
    throw new TypeError(`State payload property 'canMoveUp' must be a boolean.`);
  }
  if (typeof payload.canMoveDown !== 'boolean') {
    throw new TypeError(`State payload property 'canMoveDown' must be a boolean.`);
  }
  if (typeof payload.hasDetour !== 'boolean') {
    throw new TypeError(`State payload property 'hasDetour' must be a boolean.`);
  }
  if (typeof payload.isVerticalLocked !== 'boolean') {
    throw new TypeError(`State payload property 'isVerticalLocked' must be a boolean.`);
  }

  if (!Number.isInteger(payload.detourCount) || payload.detourCount < 0) {
    throw new TypeError(`State payload property 'detourCount' must be a non-negative integer, got: ${payload.detourCount}`);
  }
  if (payload.hasDetour !== (payload.detourCount > 0)) {
    throw new TypeError(`State payload 'hasDetour' (${payload.hasDetour}) conflicts with 'detourCount' (${payload.detourCount}).`);
  }
  if (payload.isVerticalLocked !== (payload.mode === MODE_DETOUR)) {
    throw new TypeError(`State payload 'isVerticalLocked' must match mode === '${MODE_DETOUR}'.`);
  }

  return true;
}

/**
 * Validates state payload conformity with optional throwing behavior.
 * Maintained for backward compatibility with initial port stubs.
 *
 * @param {*} payload - State payload candidate.
 * @param {boolean|{throws?: boolean}} [optionsOrThrows=false] - If true or { throws: true }, throws on failure.
 * @returns {boolean} True if payload is valid.
 */
export function validateStatePayload(payload, optionsOrThrows = false) {
  const shouldThrow = typeof optionsOrThrows === 'boolean'
    ? optionsOrThrows
    : Boolean(optionsOrThrows && optionsOrThrows.throws);

  if (shouldThrow) {
    return assertValidStatePayload(payload);
  }
  return isValidStatePayload(payload);
}

/**
 * Creates an outbound subscriber registry to manage listeners for state changes.
 *
 * @returns {{
 *   subscribe: (listener: StateSubscriber) => UnsubscribeFunction,
 *   notify: (event: StateChangeEvent) => void,
 *   getSubscriberCount: () => number,
 *   has: (listener: Function) => boolean,
 *   clear: () => void
 * }}
 */
export function createSubscriberRegistry() {
  const subscribers = new Set();

  /**
   * Registers a subscriber callback.
   * @param {StateSubscriber} listener
   * @returns {UnsubscribeFunction}
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Subscriber listener must be a function.');
    }
    subscribers.add(listener);

    return function unsubscribe() {
      subscribers.delete(listener);
    };
  }

  /**
   * Dispatches a state change event to all active subscribers.
   * Creates a snapshot of listeners to guard against mutations during notification.
   * @param {StateChangeEvent} event
   */
  function notify(event) {
    const currentListeners = [...subscribers];
    for (const listener of currentListeners) {
      listener(event);
    }
  }

  /**
   * Returns the count of currently registered subscribers.
   * @returns {number}
   */
  function getSubscriberCount() {
    return subscribers.size;
  }

  /**
   * Checks if a listener is currently registered.
   * @param {Function} listener
   * @returns {boolean}
   */
  function has(listener) {
    return subscribers.has(listener);
  }

  /**
   * Unregisters all subscribers.
   */
  function clear() {
    subscribers.clear();
  }

  return Object.freeze({
    subscribe,
    notify,
    getSubscriberCount,
    has,
    clear
  });
}

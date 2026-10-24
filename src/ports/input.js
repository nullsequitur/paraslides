/**
 * @file input.js
 * @description Inbound Navigation Port driving the Core Domain.
 *
 * Exposes the Command Dispatcher which acts as the boundary gateway between
 * Inbound Adapters (Vim keyboard listeners, click events, gamepads, etc.)
 * and the pure Domain Core state machine (navigator, state, model).
 * Pure JavaScript ES module with zero dependencies on window, document, DOM, or CSS.
 */

import { createDeckTopology } from '../core/model.js';
import { createInitialState } from '../core/state.js';
import { processCommand, buildStatePayload } from '../core/navigator.js';
import { createSubscriberRegistry } from './output.js';

/**
 * Creates a navigation command dispatcher bound to a presentation topology.
 * Maintains the presentation's active navigation state internally behind the hexagonal port boundary.
 *
 * @param {object|Array<object>} topologyInput - Deck topology object or raw sections array.
 * @param {object} [initialState=null] - Optional initial presentation state. If omitted, uses default origin (0, 0, 0).
 * @returns {Readonly<{
 *   dispatch: (command: string|{type: string}) => Readonly<{state: object, payload: object, feedback: object}>,
 *   subscribe: (listener: (event: object) => void) => (() => void),
 *   getState: () => Readonly<object>,
 *   getPayload: () => Readonly<object>,
 *   getTopology: () => Readonly<object>
 * }>}
 * @throws {TypeError} If topologyInput is invalid or initialState is malformed.
 */
export function createCommandDispatcher(topologyInput, initialState = null) {
  if (topologyInput === null || typeof topologyInput !== 'object') {
    throw new TypeError('Topology input must be a non-null object or array.');
  }

  const topology = (topologyInput && Array.isArray(topologyInput.sections))
    ? topologyInput
    : createDeckTopology(topologyInput);

  let currentState;
  if (initialState !== null && initialState !== undefined) {
    if (typeof initialState !== 'object' || !Array.isArray(initialState.lastX) || !Array.isArray(initialState.lastZ)) {
      throw new TypeError('Custom initialState must be a valid state object with lastX and lastZ arrays.');
    }
    currentState = initialState;
  } else {
    currentState = createInitialState(topology);
  }

  let currentPayload = buildStatePayload(topology, currentState);
  const registry = createSubscriberRegistry();

  /**
   * Dispatches an abstract navigation command into the Core Domain state machine.
   * Updates internal state, creates an outbound payload snapshot, and notifies all registered subscribers.
   *
   * @param {string|{type: string}} command - Navigation command string or intent object.
   * @returns {Readonly<{state: object, payload: object, feedback: object}>}
   * @throws {TypeError} If command is unrecognized or invalid.
   */
  function dispatch(command) {
    const previousState = currentState;
    const previousPayload = currentPayload;

    const result = processCommand(topology, currentState, command);
    currentState = result.state;
    currentPayload = result.payload;

    const commandName = (typeof command === 'object' && command !== null)
      ? command.type
      : command;

    const event = Object.freeze({
      state: currentState,
      payload: currentPayload,
      previousPayload,
      previousState,
      command: commandName,
      feedback: result.feedback,
      ...currentPayload
    });

    registry.notify(event);
    return result;
  }

  /**
   * Subscribes an outbound listener to receive state transitions.
   * Immediately invokes the listener with the current state payload for instant hydration.
   * Returns an unsubscribe function.
   *
   * @param {(event: object) => void} listener - Subscriber callback function.
   * @returns {() => void} Unsubscribe function.
   * @throws {TypeError} If listener is not a function.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Subscriber listener must be a function.');
    }

    const unsubscribe = registry.subscribe(listener);

    // Immediate hydration upon subscription
    const hydrationEvent = Object.freeze({
      state: currentState,
      payload: currentPayload,
      previousPayload: null,
      previousState: null,
      command: null,
      feedback: Object.freeze({}),
      ...currentPayload
    });

    listener(hydrationEvent);

    return unsubscribe;
  }

  /**
   * Returns the current raw immutable state snapshot.
   * @returns {Readonly<object>}
   */
  function getState() {
    return currentState;
  }

  /**
   * Returns the current outbound state payload snapshot conforming to DOMAIN_SPEC.md Section 5.
   * @returns {Readonly<object>}
   */
  function getPayload() {
    return currentPayload;
  }

  /**
   * Returns a reference to the active Deck Topology.
   * @returns {Readonly<object>}
   */
  function getTopology() {
    return topology;
  }

  return Object.freeze({
    dispatch,
    subscribe,
    getState,
    getPayload,
    getTopology
  });
}

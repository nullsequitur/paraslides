import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeckTopology } from '../../src/core/model.js';
import { createInitialState, updateCoordinates, MODE_MAIN, MODE_DETOUR } from '../../src/core/state.js';
import {
  COMMAND_MOVE_LEFT,
  COMMAND_MOVE_RIGHT,
  COMMAND_MOVE_UP,
  COMMAND_MOVE_DOWN,
  COMMAND_ENTER_DETOUR,
  COMMAND_EXIT_DETOUR,
  COMMAND_JUMP_START,
  COMMAND_JUMP_END
} from '../../src/core/navigator.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import {
  isValidStatePayload,
  assertValidStatePayload,
  validateStatePayload,
  createSubscriberRegistry
} from '../../src/ports/output.js';
import { createMockDeck, createMockSections } from '../fixtures/deck-fixture.js';

describe('Inbound & Outbound Hexagonal Ports', () => {
  const topology = createDeckTopology(createMockSections());

  describe('Outbound Port Validation (src/ports/output.js)', () => {
    it('validates a conformant state payload with isValidStatePayload', () => {
      const dispatcher = createCommandDispatcher(topology);
      const payload = dispatcher.getPayload();

      assert.equal(isValidStatePayload(payload), true);
      assert.equal(assertValidStatePayload(payload), true);
      assert.equal(validateStatePayload(payload), true);
    });

    it('rejects null, non-objects, or arrays', () => {
      assert.equal(isValidStatePayload(null), false);
      assert.equal(isValidStatePayload(undefined), false);
      assert.equal(isValidStatePayload(42), false);
      assert.equal(isValidStatePayload('string'), false);
      assert.equal(isValidStatePayload([]), false);

      assert.throws(() => assertValidStatePayload(null), TypeError);
      assert.throws(() => assertValidStatePayload([]), TypeError);
      assert.throws(() => validateStatePayload(null, { throws: true }), TypeError);
    });

    it('rejects invalid coordinates', () => {
      const valid = createCommandDispatcher(topology).getPayload();

      assert.equal(isValidStatePayload({ ...valid, y: -1 }), false);
      assert.equal(isValidStatePayload({ ...valid, x: '0' }), false);
      assert.equal(isValidStatePayload({ ...valid, z: 1.5 }), false);

      assert.throws(() => assertValidStatePayload({ ...valid, y: -1 }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, x: '0' }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, z: 1.5 }), TypeError);
    });

    it('rejects mode inconsistent with z coordinate', () => {
      const valid = createCommandDispatcher(topology).getPayload();

      // z === 0 but mode is DETOUR
      assert.equal(isValidStatePayload({ ...valid, z: 0, mode: MODE_DETOUR }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, z: 0, mode: MODE_DETOUR }), TypeError);

      // z > 0 but mode is MAIN
      assert.equal(isValidStatePayload({ ...valid, z: 1, mode: MODE_MAIN }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, z: 1, mode: MODE_MAIN }), TypeError);

      // Invalid mode string
      assert.equal(isValidStatePayload({ ...valid, mode: 'INVALID_MODE' }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, mode: 'INVALID_MODE' }), TypeError);
    });

    it('rejects invalid capability booleans', () => {
      const valid = createCommandDispatcher(topology).getPayload();

      assert.equal(isValidStatePayload({ ...valid, canMoveLeft: null }), false);
      assert.equal(isValidStatePayload({ ...valid, canMoveRight: 'yes' }), false);
      assert.equal(isValidStatePayload({ ...valid, canMoveUp: 1 }), false);
      assert.equal(isValidStatePayload({ ...valid, canMoveDown: 0 }), false);
      assert.equal(isValidStatePayload({ ...valid, hasDetour: undefined }), false);
      assert.equal(isValidStatePayload({ ...valid, isVerticalLocked: null }), false);

      assert.throws(() => assertValidStatePayload({ ...valid, canMoveLeft: null }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, canMoveRight: 'yes' }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, canMoveUp: 1 }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, canMoveDown: 0 }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, hasDetour: undefined }), TypeError);
      assert.throws(() => assertValidStatePayload({ ...valid, isVerticalLocked: null }), TypeError);
    });

    it('enforces detourCount and hasDetour consistency', () => {
      const valid = createCommandDispatcher(topology).getPayload();

      // hasDetour true but count is 0
      assert.equal(isValidStatePayload({ ...valid, hasDetour: true, detourCount: 0 }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, hasDetour: true, detourCount: 0 }), TypeError);

      // hasDetour false but count is > 0
      assert.equal(isValidStatePayload({ ...valid, hasDetour: false, detourCount: 2 }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, hasDetour: false, detourCount: 2 }), TypeError);

      // Negative detourCount
      assert.equal(isValidStatePayload({ ...valid, detourCount: -1 }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, detourCount: -1 }), TypeError);
    });

    it('enforces isVerticalLocked strictly matches DETOUR mode', () => {
      const valid = createCommandDispatcher(topology).getPayload();

      // In MAIN mode (z === 0) but isVerticalLocked is true
      assert.equal(isValidStatePayload({ ...valid, mode: MODE_MAIN, isVerticalLocked: true }), false);
      assert.throws(() => assertValidStatePayload({ ...valid, mode: MODE_MAIN, isVerticalLocked: true }), TypeError);
    });

    it('createSubscriberRegistry manages subscribers correctly', () => {
      const registry = createSubscriberRegistry();
      assert.equal(registry.getSubscriberCount(), 0);

      const events = [];
      const listenerA = (e) => events.push(['A', e]);
      const listenerB = (e) => events.push(['B', e]);

      const unsubA = registry.subscribe(listenerA);
      assert.equal(registry.getSubscriberCount(), 1);
      assert.equal(registry.has(listenerA), true);
      assert.equal(registry.has(listenerB), false);

      const unsubB = registry.subscribe(listenerB);
      assert.equal(registry.getSubscriberCount(), 2);

      registry.notify({ test: 1 });
      assert.equal(events.length, 2);
      assert.equal(events[0][0], 'A');
      assert.equal(events[1][0], 'B');

      unsubA();
      assert.equal(registry.getSubscriberCount(), 1);
      assert.equal(registry.has(listenerA), false);
      assert.equal(registry.has(listenerB), true);

      registry.notify({ test: 2 });
      assert.equal(events.length, 3);
      assert.equal(events[2][0], 'B');

      registry.clear();
      assert.equal(registry.getSubscriberCount(), 0);
    });
  });

  describe('Command Dispatcher Initialization (src/ports/input.js)', () => {
    it('throws TypeError if topologyInput is null, undefined, or not an object', () => {
      assert.throws(() => createCommandDispatcher(null), TypeError);
      assert.throws(() => createCommandDispatcher(undefined), TypeError);
      assert.throws(() => createCommandDispatcher('invalid'), TypeError);
    });

    it('initializes with default state at origin (0, 0, 0)', () => {
      const dispatcher = createCommandDispatcher(topology);

      const state = dispatcher.getState();
      assert.equal(state.y, 0);
      assert.equal(state.x, 0);
      assert.equal(state.z, 0);
      assert.equal(state.mode, MODE_MAIN);

      const payload = dispatcher.getPayload();
      assert.equal(payload.y, 0);
      assert.equal(payload.x, 0);
      assert.equal(payload.z, 0);
      assert.equal(payload.mode, MODE_MAIN);
      assert.equal(isValidStatePayload(payload), true);
    });

    it('accepts raw sections array as input to createCommandDispatcher', () => {
      const dispatcher = createCommandDispatcher(createMockSections());
      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);
      assert.equal(dispatcher.getTopology().sections.length, 3);
    });

    it('accepts custom initial state', () => {
      const baseState = createInitialState(topology);
      const customState = updateCoordinates(baseState, { y: 1, x: 1, z: 0 }, topology);

      const dispatcher = createCommandDispatcher(topology, customState);
      assert.equal(dispatcher.getState().y, 1);
      assert.equal(dispatcher.getState().x, 1);
      assert.equal(dispatcher.getState().z, 0);

      const payload = dispatcher.getPayload();
      assert.equal(payload.y, 1);
      assert.equal(payload.x, 1);
      assert.equal(payload.hasDetour, true);
      assert.equal(payload.detourCount, 2);
    });

    it('throws TypeError if custom initialState is malformed', () => {
      assert.throws(() => createCommandDispatcher(topology, { y: 0, x: 0 }), TypeError);
      assert.throws(() => createCommandDispatcher(topology, 'bad-state'), TypeError);
    });

    it('exposes reference to topology via getTopology', () => {
      const dispatcher = createCommandDispatcher(topology);
      assert.equal(dispatcher.getTopology(), topology);
    });
  });

  describe('Command Dispatching & State Progression', () => {
    it('dispatches MOVE_RIGHT and updates state and payload', () => {
      const dispatcher = createCommandDispatcher(topology);
      const result = dispatcher.dispatch(COMMAND_MOVE_RIGHT);

      assert.equal(result.state.x, 1);
      assert.equal(dispatcher.getState().x, 1);
      assert.equal(dispatcher.getPayload().x, 1);
      assert.equal(isValidStatePayload(dispatcher.getPayload()), true);
    });

    it('accepts intent object with type property', () => {
      const dispatcher = createCommandDispatcher(topology);
      const result = dispatcher.dispatch({ type: COMMAND_MOVE_RIGHT });

      assert.equal(result.state.x, 1);
      assert.equal(dispatcher.getState().x, 1);
    });

    it('navigates sections with MOVE_DOWN and restores cursor memory lastX', () => {
      const dispatcher = createCommandDispatcher(topology);

      // Move right in section 0 to page 1
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(dispatcher.getState().x, 1);

      // Move down to section 1: remembered lastX for section 1 is 0
      dispatcher.dispatch(COMMAND_MOVE_DOWN);
      assert.equal(dispatcher.getState().y, 1);
      assert.equal(dispatcher.getState().x, 0);

      // Move right in section 1 to page 2
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(dispatcher.getState().x, 2);

      // Move back up to section 0: should restore lastX[0] === 1
      dispatcher.dispatch(COMMAND_MOVE_UP);
      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 1);
    });

    it('enters and scrubs DETOUR mode, enforcing vertical lock', () => {
      const dispatcher = createCommandDispatcher(topology);

      // Navigate to (1, 1) which has 2 detours
      dispatcher.dispatch(COMMAND_MOVE_DOWN);
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(dispatcher.getState().y, 1);
      assert.equal(dispatcher.getState().x, 1);
      assert.equal(dispatcher.getState().z, 0);
      assert.equal(dispatcher.getPayload().hasDetour, true);

      // Enter detour
      dispatcher.dispatch(COMMAND_ENTER_DETOUR);
      assert.equal(dispatcher.getState().z, 1);
      assert.equal(dispatcher.getState().mode, MODE_DETOUR);
      assert.equal(dispatcher.getPayload().isVerticalLocked, true);

      // Scrub right in detour sequence
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(dispatcher.getState().z, 2);

      // Vertical move attempts emit locked feedback and do not change coordinates
      const lockedDown = dispatcher.dispatch(COMMAND_MOVE_DOWN);
      assert.equal(lockedDown.state.y, 1);
      assert.equal(lockedDown.state.z, 2);
      assert.equal(lockedDown.feedback.verticalLockedAttempt, true);

      const lockedUp = dispatcher.dispatch(COMMAND_MOVE_UP);
      assert.equal(lockedUp.state.y, 1);
      assert.equal(lockedUp.state.z, 2);
      assert.equal(lockedUp.feedback.verticalLockedAttempt, true);

      // Exit detour back to MAIN mode
      dispatcher.dispatch(COMMAND_EXIT_DETOUR);
      assert.equal(dispatcher.getState().z, 0);
      assert.equal(dispatcher.getState().mode, MODE_MAIN);
      assert.equal(dispatcher.getPayload().isVerticalLocked, false);
    });

    it('supports JUMP_START and JUMP_END commands', () => {
      const dispatcher = createCommandDispatcher(topology);
      dispatcher.dispatch(COMMAND_MOVE_DOWN); // y = 1 (xMax = 2)

      dispatcher.dispatch(COMMAND_JUMP_END);
      assert.equal(dispatcher.getState().x, 2);

      dispatcher.dispatch(COMMAND_JUMP_START);
      assert.equal(dispatcher.getState().x, 0);
    });

    it('throws TypeError and leaves state unchanged when dispatching unknown command', () => {
      const dispatcher = createCommandDispatcher(topology);
      const stateBefore = dispatcher.getState();

      assert.throws(() => dispatcher.dispatch('UNKNOWN_COMMAND'), TypeError);
      assert.throws(() => dispatcher.dispatch(null), TypeError);
      assert.throws(() => dispatcher.dispatch({ type: 'BAD_TYPE' }), TypeError);

      assert.equal(dispatcher.getState(), stateBefore);
    });
  });

  describe('Subscriber Lifecycle & Hydration (subscribe)', () => {
    it('throws TypeError if subscriber listener is not a function', () => {
      const dispatcher = createCommandDispatcher(topology);
      assert.throws(() => dispatcher.subscribe(null), TypeError);
      assert.throws(() => dispatcher.subscribe('not-a-func'), TypeError);
      assert.throws(() => dispatcher.subscribe({}), TypeError);
    });

    it('immediately hydrates listener with initial event upon subscription', () => {
      const dispatcher = createCommandDispatcher(topology);
      const received = [];

      dispatcher.subscribe((event) => {
        received.push(event);
      });

      assert.equal(received.length, 1);
      const initial = received[0];

      assert.equal(initial.state.y, 0);
      assert.equal(initial.state.x, 0);
      assert.equal(initial.state.z, 0);
      assert.equal(initial.command, null);
      assert.equal(initial.previousPayload, null);
      assert.equal(initial.previousState, null);
      assert.equal(isValidStatePayload(initial.payload), true);
      assert.equal(isValidStatePayload(initial), true, 'Event snapshot is also valid payload');
    });

    it('notifies subscribers on every dispatched command with full transition context', () => {
      const dispatcher = createCommandDispatcher(topology);
      const received = [];

      dispatcher.subscribe((event) => {
        received.push(event);
      });

      assert.equal(received.length, 1, 'Initial hydration');

      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(received.length, 2);

      const moveEvent = received[1];
      assert.equal(moveEvent.command, COMMAND_MOVE_RIGHT);
      assert.equal(moveEvent.state.x, 1);
      assert.equal(moveEvent.previousState.x, 0);
      assert.equal(moveEvent.previousPayload.x, 0);
      assert.equal(moveEvent.payload.x, 1);
      assert.equal(isValidStatePayload(moveEvent.payload), true);
    });

    it('notifies multiple subscribers independently in order', () => {
      const dispatcher = createCommandDispatcher(topology);
      const order = [];

      dispatcher.subscribe(() => order.push('sub1'));
      dispatcher.subscribe(() => order.push('sub2'));

      assert.deepEqual(order, ['sub1', 'sub2'], 'Hydration order');

      order.length = 0;
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.deepEqual(order, ['sub1', 'sub2'], 'Dispatch order');
    });

    it('unsubscribe function halts notifications for that subscriber', () => {
      const dispatcher = createCommandDispatcher(topology);
      const eventsA = [];
      const eventsB = [];

      const unsubA = dispatcher.subscribe((e) => eventsA.push(e));
      const unsubB = dispatcher.subscribe((e) => eventsB.push(e));

      assert.equal(eventsA.length, 1);
      assert.equal(eventsB.length, 1);

      unsubA();

      dispatcher.dispatch(COMMAND_MOVE_RIGHT);

      assert.equal(eventsA.length, 1, 'Subscriber A received no further events');
      assert.equal(eventsB.length, 2, 'Subscriber B received dispatch event');

      // Unsubscribing again is safe
      assert.doesNotThrow(() => unsubA());

      unsubB();
      dispatcher.dispatch(COMMAND_MOVE_LEFT);

      assert.equal(eventsB.length, 2, 'Subscriber B received no events after unsubscribing');
    });

    it('handles subscriber unsubscribing itself during notification dispatch', () => {
      const dispatcher = createCommandDispatcher(topology);
      let unsubSelf = null;
      let selfCallCount = 0;
      let otherCallCount = 0;

      unsubSelf = dispatcher.subscribe(() => {
        selfCallCount++;
        if (selfCallCount === 2) {
          unsubSelf();
        }
      });

      dispatcher.subscribe(() => {
        otherCallCount++;
      });

      // Hydration: each called once
      assert.equal(selfCallCount, 1);
      assert.equal(otherCallCount, 1);

      // Dispatch 1: selfCallCount becomes 2 and self unsubscribes
      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(selfCallCount, 2);
      assert.equal(otherCallCount, 2);

      // Dispatch 2: self is not called; other is called
      dispatcher.dispatch(COMMAND_MOVE_LEFT);
      assert.equal(selfCallCount, 2);
      assert.equal(otherCallCount, 3);
    });
  });

  describe('Payload Conformity across State Transitions', () => {
    it('emits payloads that pass assertValidStatePayload at every navigation step', () => {
      const dispatcher = createCommandDispatcher(topology);
      const emittedPayloads = [];

      dispatcher.subscribe((event) => {
        emittedPayloads.push(event.payload);
      });

      const script = [
        COMMAND_MOVE_RIGHT,
        COMMAND_MOVE_DOWN,
        COMMAND_MOVE_RIGHT,
        COMMAND_ENTER_DETOUR,
        COMMAND_MOVE_RIGHT,
        COMMAND_MOVE_LEFT,
        COMMAND_EXIT_DETOUR,
        COMMAND_MOVE_DOWN,
        COMMAND_MOVE_UP,
        COMMAND_JUMP_START,
        COMMAND_JUMP_END
      ];

      for (const cmd of script) {
        dispatcher.dispatch(cmd);
      }

      assert.equal(emittedPayloads.length, script.length + 1); // +1 for hydration

      for (const payload of emittedPayloads) {
        assert.equal(isValidStatePayload(payload), true);
        assert.doesNotThrow(() => assertValidStatePayload(payload));
      }
    });
  });
});

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeckTopology } from '../../src/core/model.js';
import {
  MODE_MAIN,
  MODE_DETOUR,
  MODES,
  deriveMode,
  createInitialState,
  cloneState,
  updateCoordinates,
  updateState,
  resetDetourMemory,
  getLastX,
  getLastZ
} from '../../src/core/state.js';
import { createMockDeck, createMockSections, MOCK_DECK_SPEC } from '../fixtures/deck-fixture.js';

describe('Coordinate State & Cursor Memory (src/core/state.js)', () => {
  describe('Constants & Mode Derivation', () => {
    it('exports MODE_MAIN and MODE_DETOUR constants', () => {
      assert.equal(MODE_MAIN, 'MAIN');
      assert.equal(MODE_DETOUR, 'DETOUR');
      assert.equal(MODES.MAIN, 'MAIN');
      assert.equal(MODES.DETOUR, 'DETOUR');
      assert.ok(Object.isFrozen(MODES));
    });

    it('deriveMode derives MAIN for z === 0 and DETOUR for z > 0', () => {
      assert.equal(deriveMode(0), MODE_MAIN);
      assert.equal(deriveMode(1), MODE_DETOUR);
      assert.equal(deriveMode(2), MODE_DETOUR);
      assert.equal(deriveMode(99), MODE_DETOUR);
    });

    it('deriveMode throws TypeError for negative or non-integer z values', () => {
      assert.throws(() => deriveMode(-1), TypeError);
      assert.throws(() => deriveMode(1.5), TypeError);
      assert.throws(() => deriveMode('0'), TypeError);
      assert.throws(() => deriveMode(null), TypeError);
      assert.throws(() => deriveMode(undefined), TypeError);
      assert.throws(() => deriveMode(NaN), TypeError);
    });
  });

  describe('createInitialState - Initialization & Shape', () => {
    it('creates initial state from a topology object', () => {
      const topology = createDeckTopology(createMockSections());
      const state = createInitialState(topology);

      assert.equal(state.y, 0);
      assert.equal(state.x, 0);
      assert.equal(state.z, 0);
      assert.equal(state.mode, MODE_MAIN);

      // lastX length matches Y_max + 1 (3 sections: 0, 1, 2)
      assert.equal(state.lastX.length, 3);
      assert.deepEqual(state.lastX, [0, 0, 0]);

      // lastZ dimensions match [Y_max + 1][X_max(y) + 1]
      // Section 0 has 2 pages -> [1, 1]
      // Section 1 has 3 pages -> [1, 1, 1]
      // Section 2 has 1 page  -> [1]
      assert.equal(state.lastZ.length, 3);
      assert.deepEqual(state.lastZ[0], [1, 1]);
      assert.deepEqual(state.lastZ[1], [1, 1, 1]);
      assert.deepEqual(state.lastZ[2], [1]);
    });

    it('creates initial state from a raw sections array', () => {
      const rawSections = createMockSections();
      const state = createInitialState(rawSections);

      assert.equal(state.y, 0);
      assert.equal(state.x, 0);
      assert.equal(state.z, 0);
      assert.equal(state.mode, MODE_MAIN);
      assert.deepEqual(state.lastX, [0, 0, 0]);
      assert.equal(state.lastZ.length, 3);
    });

    it('creates initial state from a deck object', () => {
      const deck = createMockDeck();
      const state = createInitialState(deck);

      assert.equal(state.y, 0);
      assert.equal(state.x, 0);
      assert.equal(state.z, 0);
      assert.equal(state.mode, MODE_MAIN);
    });

    it('throws TypeError for null, undefined, or non-object topology input', () => {
      assert.throws(() => createInitialState(null), TypeError);
      assert.throws(() => createInitialState(undefined), TypeError);
      assert.throws(() => createInitialState('invalid'), TypeError);
      assert.throws(() => createInitialState(123), TypeError);
    });

    it('throws RangeError for empty sections or invalid topology', () => {
      assert.throws(() => createInitialState([]), RangeError);
      assert.throws(() => createInitialState({ sections: [] }), RangeError);
    });
  });

  describe('Deep Immutability & State Cloning', () => {
    it('freezes the state root and cursor memory arrays', () => {
      const topology = createDeckTopology(createMockSections());
      const state = createInitialState(topology);

      assert.ok(Object.isFrozen(state), 'state root must be frozen');
      assert.ok(Object.isFrozen(state.lastX), 'lastX must be frozen');
      assert.ok(Object.isFrozen(state.lastZ), 'lastZ root must be frozen');
      for (let y = 0; y < state.lastZ.length; y++) {
        assert.ok(Object.isFrozen(state.lastZ[y]), `lastZ[${y}] must be frozen`);
      }

      // In strict mode, direct mutations throw TypeError
      assert.throws(() => {
        state.x = 1;
      }, TypeError);

      assert.throws(() => {
        state.lastX[0] = 9;
      }, TypeError);

      assert.throws(() => {
        state.lastZ[0][0] = 9;
      }, TypeError);
    });

    it('cloneState creates an independent, deeply frozen clone', () => {
      const topology = createDeckTopology(createMockSections());
      const state = createInitialState(topology);
      const cloned = cloneState(state);

      assert.notEqual(cloned, state);
      assert.deepEqual(cloned, state);
      assert.notEqual(cloned.lastX, state.lastX);
      assert.notEqual(cloned.lastZ, state.lastZ);
      assert.notEqual(cloned.lastZ[0], state.lastZ[0]);

      assert.ok(Object.isFrozen(cloned));
      assert.ok(Object.isFrozen(cloned.lastX));
      assert.ok(Object.isFrozen(cloned.lastZ));
      assert.ok(Object.isFrozen(cloned.lastZ[0]));
    });

    it('cloneState throws TypeError for invalid input', () => {
      assert.throws(() => cloneState(null), TypeError);
      assert.throws(() => cloneState({}), TypeError);
    });
  });

  describe('updateCoordinates / updateState - Cursor Memory Tracking', () => {
    it('tracks horizontal page navigation within main track (z === 0)', () => {
      const topology = createDeckTopology(createMockSections());
      const state0 = createInitialState(topology);

      // Move to page 1 in section 0
      const state1 = updateCoordinates(state0, { x: 1 });
      assert.equal(state1.y, 0);
      assert.equal(state1.x, 1);
      assert.equal(state1.z, 0);
      assert.equal(state1.mode, MODE_MAIN);
      assert.deepEqual(state1.lastX, [1, 0, 0]);

      // Move back to page 0
      const state2 = updateCoordinates(state1, { x: 0 });
      assert.equal(state2.x, 0);
      assert.deepEqual(state2.lastX, [0, 0, 0]);

      // Original state0 remains untouched
      assert.deepEqual(state0.lastX, [0, 0, 0]);
    });

    it('tracks section switches and preserves departing section lastX', () => {
      const topology = createDeckTopology(createMockSections());
      const state0 = createInitialState(topology);

      // 1. Move to (0, 1, 0)
      const state1 = updateCoordinates(state0, { x: 1 });
      assert.deepEqual(state1.lastX, [1, 0, 0]);

      // 2. Switch to section 1 at page 0: (1, 0, 0)
      const state2 = updateCoordinates(state1, { y: 1, x: 0 });
      assert.equal(state2.y, 1);
      assert.equal(state2.x, 0);
      assert.deepEqual(state2.lastX, [1, 0, 0], 'departing section 0 retains x=1');

      // 3. Move to page 2 in section 1: (1, 2, 0)
      const state3 = updateCoordinates(state2, { x: 2 });
      assert.equal(state3.y, 1);
      assert.equal(state3.x, 2);
      assert.deepEqual(state3.lastX, [1, 2, 0]);

      // 4. Switch to section 2 at page 0: (2, 0, 0)
      const state4 = updateCoordinates(state3, { y: 2, x: 0 });
      assert.deepEqual(state4.lastX, [1, 2, 0]);

      // 5. Return to section 0 restoring lastX[0] = 1
      const state5 = updateCoordinates(state4, { y: 0, x: state4.lastX[0] });
      assert.equal(state5.y, 0);
      assert.equal(state5.x, 1);
      assert.deepEqual(state5.lastX, [1, 2, 0]);

      // 6. Return to section 1 restoring lastX[1] = 2
      const state6 = updateCoordinates(state5, { y: 1, x: state5.lastX[1] });
      assert.equal(state6.y, 1);
      assert.equal(state6.x, 2);
      assert.deepEqual(state6.lastX, [1, 2, 0]);
    });

    it('tracks detour navigation in lastZ and transitions mode', () => {
      const topology = createDeckTopology(createMockSections());
      const state0 = createInitialState(topology);

      // Move to page (1, 1) where detours exist
      const state1 = updateCoordinates(state0, { y: 1, x: 1, z: 0 });
      assert.equal(state1.mode, MODE_MAIN);
      assert.equal(state1.lastZ[1][1], 1);

      // Enter detour track at z = 1
      const stateDetour1 = updateCoordinates(state1, { z: 1 });
      assert.equal(stateDetour1.y, 1);
      assert.equal(stateDetour1.x, 1);
      assert.equal(stateDetour1.z, 1);
      assert.equal(stateDetour1.mode, MODE_DETOUR);
      assert.equal(stateDetour1.lastZ[1][1], 1);

      // Advance to detour slide z = 2
      const stateDetour2 = updateCoordinates(stateDetour1, { z: 2 });
      assert.equal(stateDetour2.z, 2);
      assert.equal(stateDetour2.mode, MODE_DETOUR);
      assert.equal(stateDetour2.lastZ[1][1], 2);

      // Exit detour back to main track: z = 0
      const stateMain = updateCoordinates(stateDetour2, { z: 0 });
      assert.equal(stateMain.z, 0);
      assert.equal(stateMain.mode, MODE_MAIN);
      // Detour memory persists the last visited z=2 and does NOT reset to 0 or 1
      assert.equal(stateMain.lastZ[1][1], 2);

      // When entering detour again, previous cursor index is remembered
      const stateReentered = updateCoordinates(stateMain, { z: stateMain.lastZ[1][1] });
      assert.equal(stateReentered.z, 2);
      assert.equal(stateReentered.mode, MODE_DETOUR);
    });

    it('supports discrete arguments signature (state, y, x, z, topology)', () => {
      const topology = createDeckTopology(createMockSections());
      const state0 = createInitialState(topology);

      const next = updateCoordinates(state0, 1, 1, 0, topology);
      assert.equal(next.y, 1);
      assert.equal(next.x, 1);
      assert.equal(next.z, 0);
      assert.equal(next.mode, MODE_MAIN);
    });

    it('updateState is an exact alias for updateCoordinates', () => {
      assert.equal(updateState, updateCoordinates);
    });

    it('validates coordinate bounds when topology is provided', () => {
      const topology = createDeckTopology(createMockSections());
      const state0 = createInitialState(topology);

      // Valid move
      assert.doesNotThrow(() => {
        updateCoordinates(state0, { y: 1, x: 1, z: 2 }, topology);
      });

      // Out of bounds section y=3
      assert.throws(() => {
        updateCoordinates(state0, { y: 3, x: 0, z: 0 }, topology);
      }, RangeError);

      // Out of bounds page x=5
      assert.throws(() => {
        updateCoordinates(state0, { y: 0, x: 5, z: 0 }, topology);
      }, RangeError);

      // Out of bounds detour z=3 (page 1, 1 only has 2 detours)
      assert.throws(() => {
        updateCoordinates(state0, { y: 1, x: 1, z: 3 }, topology);
      }, RangeError);
    });

    it('throws TypeError for non-integer or malformed coordinates', () => {
      const topology = createDeckTopology(createMockSections());
      const state0 = createInitialState(topology);

      assert.throws(() => updateCoordinates(null, { x: 1 }), TypeError);
      assert.throws(() => updateCoordinates(state0, 'not an object'), TypeError);
      assert.throws(() => updateCoordinates(state0, { x: '1' }), TypeError);
      assert.throws(() => updateCoordinates(state0, { y: 1.5 }), TypeError);
      assert.throws(() => updateCoordinates(state0, { z: -1 }), RangeError);
    });
  });

  describe('Detour Memory Reset (resetDetourMemory)', () => {
    it('resets a specific (y, x) detour memory back to 1', () => {
      const topology = createDeckTopology(createMockSections());
      let state = createInitialState(topology);

      // Advance detour on (1, 1) to z = 2
      state = updateCoordinates(state, { y: 1, x: 1, z: 2 });
      assert.equal(state.lastZ[1][1], 2);

      // Reset detour on (1, 1)
      const resetState = resetDetourMemory(state, 1, 1);
      assert.equal(resetState.lastZ[1][1], 1);
      assert.ok(Object.isFrozen(resetState));
      assert.ok(Object.isFrozen(resetState.lastZ[1]));
    });

    it('resets all detour memories across the deck if coordinates omitted', () => {
      const topology = createDeckTopology(createMockSections());
      let state = createInitialState(topology);

      state = updateCoordinates(state, { y: 1, x: 1, z: 2 });
      assert.equal(state.lastZ[1][1], 2);

      const resetState = resetDetourMemory(state);
      assert.equal(resetState.lastZ[1][1], 1);
      assert.deepEqual(resetState.lastZ[0], [1, 1]);
      assert.deepEqual(resetState.lastZ[1], [1, 1, 1]);
      assert.deepEqual(resetState.lastZ[2], [1]);
    });

    it('throws RangeError when resetting out-of-bounds coordinates', () => {
      const topology = createDeckTopology(createMockSections());
      const state = createInitialState(topology);

      assert.throws(() => resetDetourMemory(state, 9, 0), RangeError);
      assert.throws(() => resetDetourMemory(state, 0, 9), RangeError);
    });
  });

  describe('Cursor Memory Getters (getLastX, getLastZ)', () => {
    it('retrieves last visited x for a section or -1 if invalid', () => {
      const topology = createDeckTopology(createMockSections());
      let state = createInitialState(topology);
      state = updateCoordinates(state, { y: 0, x: 1, z: 0 });

      assert.equal(getLastX(state, 0), 1);
      assert.equal(getLastX(state, 1), 0);
      assert.equal(getLastX(state, -1), -1);
      assert.equal(getLastX(state, 5), -1);
      assert.equal(getLastX(null, 0), -1);
    });

    it('retrieves last visited z for a page or -1 if invalid', () => {
      const topology = createDeckTopology(createMockSections());
      let state = createInitialState(topology);
      state = updateCoordinates(state, { y: 1, x: 1, z: 2 });

      assert.equal(getLastZ(state, 1, 1), 2);
      assert.equal(getLastZ(state, 0, 0), 1);
      assert.equal(getLastZ(state, 1, 5), -1);
      assert.equal(getLastZ(state, -1, 0), -1);
      assert.equal(getLastZ(null, 0, 0), -1);
    });
  });
});

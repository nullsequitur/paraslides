import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeckTopology } from '../../src/core/model.js';
import { createInitialState, MODE_MAIN, MODE_DETOUR } from '../../src/core/state.js';
import {
  COMMAND_MOVE_LEFT,
  COMMAND_MOVE_RIGHT,
  COMMAND_MOVE_UP,
  COMMAND_MOVE_DOWN,
  COMMAND_ENTER_DETOUR,
  COMMAND_EXIT_DETOUR,
  COMMAND_JUMP_START,
  COMMAND_JUMP_END,
  COMMAND_NAVIGATE_TO,
  COMMAND_TOGGLE_MAP,
  COMMAND_NEXT_SLIDE,
  COMMAND_JUMP_TOP_ROW,
  COMMAND_JUMP_BOTTOM_ROW,
  COMMAND_JUMP_ROW,
  COMMANDS,
  computeCapabilities,
  buildStatePayload,
  processCommand
} from '../../src/core/navigator.js';
import { createMockDeck, createMockSections } from '../fixtures/deck-fixture.js';

describe('Transition Matrix & Command Processor (src/core/navigator.js)', () => {
  const topology = createDeckTopology(createMockSections());

  describe('Command Constants', () => {
    it('exports all expected command string constants', () => {
      assert.equal(COMMAND_MOVE_LEFT, 'MOVE_LEFT');
      assert.equal(COMMAND_MOVE_RIGHT, 'MOVE_RIGHT');
      assert.equal(COMMAND_MOVE_UP, 'MOVE_UP');
      assert.equal(COMMAND_MOVE_DOWN, 'MOVE_DOWN');
      assert.equal(COMMAND_ENTER_DETOUR, 'ENTER_DETOUR');
      assert.equal(COMMAND_EXIT_DETOUR, 'EXIT_DETOUR');
      assert.equal(COMMAND_JUMP_START, 'JUMP_START');
      assert.equal(COMMAND_JUMP_END, 'JUMP_END');
      assert.equal(COMMAND_NAVIGATE_TO, 'NAVIGATE_TO');
      assert.equal(COMMAND_NEXT_SLIDE, 'NEXT_SLIDE');
      assert.equal(COMMAND_JUMP_TOP_ROW, 'JUMP_TOP_ROW');
      assert.equal(COMMAND_JUMP_BOTTOM_ROW, 'JUMP_BOTTOM_ROW');
      assert.equal(COMMAND_JUMP_ROW, 'JUMP_ROW');
    });

    it('exports frozen COMMANDS dictionary', () => {
      assert.ok(Object.isFrozen(COMMANDS));
      assert.equal(COMMANDS.MOVE_LEFT, 'MOVE_LEFT');
      assert.equal(COMMANDS.MOVE_RIGHT, 'MOVE_RIGHT');
      assert.equal(COMMANDS.MOVE_UP, 'MOVE_UP');
      assert.equal(COMMANDS.MOVE_DOWN, 'MOVE_DOWN');
      assert.equal(COMMANDS.ENTER_DETOUR, 'ENTER_DETOUR');
      assert.equal(COMMANDS.EXIT_DETOUR, 'EXIT_DETOUR');
      assert.equal(COMMANDS.JUMP_START, 'JUMP_START');
      assert.equal(COMMANDS.JUMP_END, 'JUMP_END');
      assert.equal(COMMANDS.NAVIGATE_TO, 'NAVIGATE_TO');
      assert.equal(COMMANDS.NEXT_SLIDE, 'NEXT_SLIDE');
      assert.equal(COMMANDS.JUMP_TOP_ROW, 'JUMP_TOP_ROW');
      assert.equal(COMMANDS.JUMP_BOTTOM_ROW, 'JUMP_BOTTOM_ROW');
      assert.equal(COMMANDS.JUMP_ROW, 'JUMP_ROW');
    });
  });

  describe('computeCapabilities', () => {
    it('throws TypeError if topology or state is invalid', () => {
      assert.throws(() => computeCapabilities(null, {}), TypeError);
      assert.throws(() => computeCapabilities(topology, null), TypeError);
    });

    it('computes correct capabilities at origin (0, 0, 0)', () => {
      const state = createInitialState(topology);
      const caps = computeCapabilities(topology, state);

      assert.equal(caps.canMoveLeft, false);
      assert.equal(caps.canMoveRight, true);
      assert.equal(caps.canMoveUp, false);
      assert.equal(caps.canMoveDown, true);
      assert.equal(caps.hasDetour, false);
      assert.equal(caps.detourCount, 0);
      assert.equal(caps.isVerticalLocked, false);
      assert.ok(Object.isFrozen(caps));
    });

    it('computes capabilities on a page with detours (1, 1, 0)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;

      assert.equal(state.y, 1);
      assert.equal(state.x, 1);
      assert.equal(state.z, 0);

      const caps = computeCapabilities(topology, state);
      assert.equal(caps.canMoveLeft, true);
      assert.equal(caps.canMoveRight, true);
      assert.equal(caps.canMoveUp, true);
      assert.equal(caps.canMoveDown, true);
      assert.equal(caps.hasDetour, true);
      assert.equal(caps.detourCount, 2);
      assert.equal(caps.isVerticalLocked, false);
    });

    it('computes capabilities in DETOUR mode at z=1 (start of detour track)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state;

      assert.equal(state.mode, MODE_DETOUR);
      assert.equal(state.z, 1);

      const caps = computeCapabilities(topology, state);
      assert.equal(caps.canMoveLeft, false); // z === 1 cannot move left
      assert.equal(caps.canMoveRight, true); // z=1 < zMax=2
      assert.equal(caps.canMoveUp, false); // Vertical locked in DETOUR
      assert.equal(caps.canMoveDown, false); // Vertical locked in DETOUR
      assert.equal(caps.isVerticalLocked, true);
      assert.equal(caps.hasDetour, true);
      assert.equal(caps.detourCount, 2);
    });

    it('computes look-ahead detour capabilities (hasDetourLeft and hasDetourRight)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state; // (1, 0, 0)
      const caps0 = computeCapabilities(topology, state);
      assert.equal(caps0.hasDetour, false);
      assert.equal(caps0.hasDetourLeft, false);
      assert.equal(caps0.hasDetourRight, true); // (1, 1) has detours

      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state; // (1, 1, 0)
      const caps1 = computeCapabilities(topology, state);
      assert.equal(caps1.hasDetour, true);
      assert.equal(caps1.hasDetourLeft, false);
      assert.equal(caps1.hasDetourRight, false);

      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state; // (1, 2, 0)
      const caps2 = computeCapabilities(topology, state);
      assert.equal(caps2.hasDetour, false);
      assert.equal(caps2.hasDetourLeft, true); // (1, 1) has detours
      assert.equal(caps2.hasDetourRight, false);
    });
  });

  describe('buildStatePayload', () => {
    it('creates an immutable outbound payload with coordinates, capabilities, and feedback', () => {
      const state = createInitialState(topology);
      const payload = buildStatePayload(topology, state, { customFlag: true });

      assert.ok(Object.isFrozen(payload));
      assert.equal(payload.y, 0);
      assert.equal(payload.x, 0);
      assert.equal(payload.z, 0);
      assert.equal(payload.mode, MODE_MAIN);

      // Check merged capabilities
      assert.equal(payload.canMoveLeft, false);
      assert.equal(payload.canMoveRight, true);
      assert.equal(payload.canMoveUp, false);
      assert.equal(payload.canMoveDown, true);
      assert.equal(payload.hasDetour, false);
      assert.equal(payload.detourCount, 0);
      assert.equal(payload.isVerticalLocked, false);

      // Check capabilities sub-object
      assert.ok(payload.capabilities);
      assert.equal(payload.capabilities.canMoveRight, true);

      // Check feedback
      assert.equal(payload.customFlag, true);
      assert.equal(payload.feedback.customFlag, true);
      assert.ok(Object.isFrozen(payload.feedback));
    });
  });

  describe('processCommand - Validation & Input Types', () => {
    it('throws TypeError if topology or state is missing', () => {
      const state = createInitialState(topology);
      assert.throws(() => processCommand(null, state, COMMAND_MOVE_RIGHT), TypeError);
      assert.throws(() => processCommand(topology, null, COMMAND_MOVE_RIGHT), TypeError);
    });

    it('throws TypeError for unknown commands', () => {
      const state = createInitialState(topology);
      assert.throws(() => processCommand(topology, state, 'INVALID_COMMAND'), TypeError);
      assert.throws(() => processCommand(topology, state, { type: 'UNKNOWN' }), TypeError);
      assert.throws(() => processCommand(topology, state, 123), TypeError);
    });

    it('accepts both string command and action object with type', () => {
      const state = createInitialState(topology);
      const resString = processCommand(topology, state, COMMAND_MOVE_RIGHT);
      const resObject = processCommand(topology, state, { type: COMMAND_MOVE_RIGHT });

      assert.equal(resString.state.x, 1);
      assert.equal(resObject.state.x, 1);
    });
  });

  describe('processCommand - MAIN Mode Navigation', () => {
    it('MOVE_RIGHT increments x and updates desiredX', () => {
      const s0 = createInitialState(topology);
      const { state: s1 } = processCommand(topology, s0, COMMAND_MOVE_RIGHT);

      assert.equal(s1.x, 1);
      assert.equal(s1.y, 0);
      assert.equal(s1.z, 0);
      assert.equal(s1.desiredX, 1);
      assert.equal(s1.lastX[0], 1);
    });

    it('MOVE_RIGHT wraps to next section at section end and stops at deck end', () => {
      const s0 = createInitialState(topology);
      const { state: s1 } = processCommand(topology, s0, COMMAND_MOVE_RIGHT); // y = 0, x = 1 (end of sec 0)

      // Next MOVE_RIGHT wraps to section 1, page 0
      const { state: s2 } = processCommand(topology, s1, COMMAND_MOVE_RIGHT);
      assert.equal(s2.y, 1);
      assert.equal(s2.x, 0);

      // Advance to end of section 1 (pages 1, 2)
      const { state: s3 } = processCommand(topology, s2, COMMAND_MOVE_RIGHT);
      const { state: s4 } = processCommand(topology, s3, COMMAND_MOVE_RIGHT);
      assert.equal(s4.y, 1);
      assert.equal(s4.x, 2);

      // Wraps to section 2, page 0 (last section)
      const { state: s5 } = processCommand(topology, s4, COMMAND_MOVE_RIGHT);
      assert.equal(s5.y, 2);
      assert.equal(s5.x, 0);

      // Section 2 only has page 0, and is last section -> boundary stop (no-op)
      const { state: s6 } = processCommand(topology, s5, COMMAND_MOVE_RIGHT);
      assert.equal(s6.y, 2);
      assert.equal(s6.x, 0);
      assert.equal(s6, s5);
    });

    it('MOVE_LEFT decrements x and updates desiredX', () => {
      const s0 = createInitialState(topology);
      const { state: s1 } = processCommand(topology, s0, COMMAND_MOVE_RIGHT);
      const { state: s2 } = processCommand(topology, s1, COMMAND_MOVE_LEFT);

      assert.equal(s2.x, 0);
      assert.equal(s2.desiredX, 0);
      assert.equal(s2.lastX[0], 0);
    });

    it('MOVE_LEFT stops at deck origin (0, 0, 0) and wraps from row start to prev row end', () => {
      const s0 = createInitialState(topology);
      const { state: s1 } = processCommand(topology, s0, COMMAND_MOVE_LEFT);

      // At deck origin (0, 0), MOVE_LEFT is a boundary no-op
      assert.equal(s1.y, 0);
      assert.equal(s1.x, 0);
      assert.equal(s1, s0);

      // Move down to section 1 page 0
      const sDown = processCommand(topology, s0, COMMAND_MOVE_DOWN).state;
      assert.equal(sDown.y, 1);
      assert.equal(sDown.x, 0);

      // MOVE_LEFT at section 1 page 0 wraps back to section 0 page 1 (last page of sec 0)
      const { state: sWrapped } = processCommand(topology, sDown, COMMAND_MOVE_LEFT);
      assert.equal(sWrapped.y, 0);
      assert.equal(sWrapped.x, 1);
    });

    it('MOVE_DOWN and MOVE_UP follow the Vim sticky column model', () => {
      const s0 = createInitialState(topology);
      // In section 0 (length 2), move to page 1
      const { state: s1 } = processCommand(topology, s0, COMMAND_MOVE_RIGHT);
      assert.equal(s1.y, 0);
      assert.equal(s1.x, 1);
      assert.equal(s1.desiredX, 1);

      // MOVE_DOWN to section 1 (length 3): desiredX is 1, so cursor lands on page 1
      const { state: s2 } = processCommand(topology, s1, COMMAND_MOVE_DOWN);
      assert.equal(s2.y, 1);
      assert.equal(s2.x, 1);
      assert.equal(s2.desiredX, 1);

      // In section 1, move to page 2 (end of section 1)
      const { state: s3 } = processCommand(topology, s2, COMMAND_MOVE_RIGHT);
      assert.equal(s3.y, 1);
      assert.equal(s3.x, 2);
      assert.equal(s3.desiredX, 2);

      // MOVE_DOWN to section 2 (length 1, valid index 0): cursor clamps to page 0, but remembers desiredX=2
      const { state: s4 } = processCommand(topology, s3, COMMAND_MOVE_DOWN);
      assert.equal(s4.y, 2);
      assert.equal(s4.x, 0);
      assert.equal(s4.desiredX, 2);

      // MOVE_UP back to section 1: restores cursor back out to desiredX=2!
      const { state: s5 } = processCommand(topology, s4, COMMAND_MOVE_UP);
      assert.equal(s5.y, 1);
      assert.equal(s5.x, 2);
      assert.equal(s5.desiredX, 2);

      // MOVE_UP back to section 0 (length 2): clamps to page 1, desiredX still 2!
      const { state: s6 } = processCommand(topology, s5, COMMAND_MOVE_UP);
      assert.equal(s6.y, 0);
      assert.equal(s6.x, 1);
      assert.equal(s6.desiredX, 2);

      // Explicitly move to page 0 on section 0 via JUMP_START: resets desiredX to 0
      const { state: s7 } = processCommand(topology, s6, COMMAND_JUMP_START);
      assert.equal(s7.x, 0);
      assert.equal(s7.desiredX, 0);

      // Now MOVE_DOWN to section 1 goes to page 0!
      const { state: s8 } = processCommand(topology, s7, COMMAND_MOVE_DOWN);
      assert.equal(s8.y, 1);
      assert.equal(s8.x, 0);
    });

    it('JUMP_END sets sticky EOL ($) across rows of varying length', () => {
      let state = createInitialState(topology); // y=0 (len 2)
      state = processCommand(topology, state, COMMAND_JUMP_END).state;
      assert.equal(state.x, 1);
      assert.equal(state.isStickyEol, true);

      // MOVE_DOWN to section 1 (len 3): sticks to last slide (x = 2)
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      assert.equal(state.y, 1);
      assert.equal(state.x, 2);
      assert.equal(state.isStickyEol, true);

      // MOVE_DOWN to section 2 (len 1): sticks to last slide (x = 0)
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      assert.equal(state.y, 2);
      assert.equal(state.x, 0);
      assert.equal(state.isStickyEol, true);

      // MOVE_UP back to section 1: sticks to last slide (x = 2)
      state = processCommand(topology, state, COMMAND_MOVE_UP).state;
      assert.equal(state.y, 1);
      assert.equal(state.x, 2);
      assert.equal(state.isStickyEol, true);

      // Explicit horizontal move left breaks sticky EOL
      state = processCommand(topology, state, COMMAND_MOVE_LEFT).state;
      assert.equal(state.x, 1);
      assert.equal(state.isStickyEol, false);
      assert.equal(state.desiredX, 1);
    });

    it('NEXT_SLIDE advances linearly across slides and sections', () => {
      let state = createInitialState(topology); // (0, 0)
      assert.equal(state.y, 0);
      assert.equal(state.x, 0);

      // Slide 1 in section 0
      state = processCommand(topology, state, COMMAND_NEXT_SLIDE).state;
      assert.equal(state.y, 0);
      assert.equal(state.x, 1);

      // Wraps to section 1, slide 0
      state = processCommand(topology, state, COMMAND_NEXT_SLIDE).state;
      assert.equal(state.y, 1);
      assert.equal(state.x, 0);

      // Section 1 slides 1, 2
      state = processCommand(topology, state, COMMAND_NEXT_SLIDE).state;
      assert.equal(state.y, 1);
      assert.equal(state.x, 1);
      state = processCommand(topology, state, COMMAND_NEXT_SLIDE).state;
      assert.equal(state.y, 1);
      assert.equal(state.x, 2);

      // Wraps to section 2, slide 0
      state = processCommand(topology, state, COMMAND_NEXT_SLIDE).state;
      assert.equal(state.y, 2);
      assert.equal(state.x, 0);

      // End of deck: no-op
      const endState = processCommand(topology, state, COMMAND_NEXT_SLIDE).state;
      assert.equal(endState, state);
    });

    it('JUMP_TOP_ROW (gg) and JUMP_BOTTOM_ROW (G) jump sections preserving sticky column', () => {
      let state = createInitialState(topology);
      // In section 0, move to x=1
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      assert.equal(state.x, 1);

      // JUMP_BOTTOM_ROW to section 2 (len 1): clamps to x=0
      state = processCommand(topology, state, COMMAND_JUMP_BOTTOM_ROW).state;
      assert.equal(state.y, 2);
      assert.equal(state.x, 0);
      assert.equal(state.desiredX, 1);

      // JUMP_TOP_ROW to section 0: restores x=1
      state = processCommand(topology, state, COMMAND_JUMP_TOP_ROW).state;
      assert.equal(state.y, 0);
      assert.equal(state.x, 1);

      // JUMP_ROW to section 1
      state = processCommand(topology, state, { type: COMMAND_JUMP_ROW, targetY: 1 }).state;
      assert.equal(state.y, 1);
      assert.equal(state.x, 1);
    });

    it('MOVE_DOWN stops at Y_max boundary (no-op)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state; // y = 1
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state; // y = 2 (Y_max = 2)

      const res = processCommand(topology, state, COMMAND_MOVE_DOWN);
      assert.equal(res.state.y, 2);
      assert.equal(res.state, state);
    });

    it('MOVE_UP stops at y = 0 boundary (no-op)', () => {
      const state = createInitialState(topology);
      const res = processCommand(topology, state, COMMAND_MOVE_UP);

      assert.equal(res.state.y, 0);
      assert.equal(res.state, state);
    });

    it('JUMP_START in MAIN mode sets x = 0 and lastX[y] = 0', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state; // x = 1
      assert.equal(state.x, 1);

      const res = processCommand(topology, state, COMMAND_JUMP_START);
      assert.equal(res.state.x, 0);
      assert.equal(res.state.lastX[0], 0);

      // Idempotent when already at start
      const res2 = processCommand(topology, res.state, COMMAND_JUMP_START);
      assert.equal(res2.state, res.state);
    });

    it('JUMP_END in MAIN mode sets x = X_max(y) and lastX[y] = xMax', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state; // section 1 (X_max = 2)
      assert.equal(state.x, 0);

      const res = processCommand(topology, state, COMMAND_JUMP_END);
      assert.equal(res.state.x, 2);
      assert.equal(res.state.lastX[1], 2);

      // Idempotent when already at end
      const res2 = processCommand(topology, res.state, COMMAND_JUMP_END);
      assert.equal(res2.state, res.state);
    });

    it('EXIT_DETOUR in MAIN mode is a no-op', () => {
      const state = createInitialState(topology);
      const res = processCommand(topology, state, COMMAND_EXIT_DETOUR);

      assert.equal(res.state.mode, MODE_MAIN);
      assert.equal(res.state, state);
    });
  });

  describe('processCommand - DETOUR Mode & Transitions', () => {
    it('ENTER_DETOUR on a page with detours transitions to DETOUR mode (z=1)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state; // (1, 1) has 2 detours

      const res = processCommand(topology, state, COMMAND_ENTER_DETOUR);
      assert.equal(res.state.y, 1);
      assert.equal(res.state.x, 1);
      assert.equal(res.state.z, 1);
      assert.equal(res.state.mode, MODE_DETOUR);
      assert.equal(res.payload.isVerticalLocked, true);
    });

    it('ENTER_DETOUR on a page with NO detours is a no-op', () => {
      const state = createInitialState(topology); // (0, 0) has 0 detours
      const res = processCommand(topology, state, COMMAND_ENTER_DETOUR);

      assert.equal(res.state.mode, MODE_MAIN);
      assert.equal(res.state.z, 0);
      assert.equal(res.state, state);
    });

    it('ENTER_DETOUR while already in DETOUR mode is a no-op', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state;

      const res = processCommand(topology, state, COMMAND_ENTER_DETOUR);
      assert.equal(res.state, state);
    });

    it('EXIT_DETOUR returns to parent (y, x, 0) in MAIN mode', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state;

      const res = processCommand(topology, state, COMMAND_EXIT_DETOUR);
      assert.equal(res.state.y, 1);
      assert.equal(res.state.x, 1);
      assert.equal(res.state.z, 0);
      assert.equal(res.state.mode, MODE_MAIN);
      assert.equal(res.payload.isVerticalLocked, false);
    });

    it('DETOUR mode horizontal navigation scrubs through detour sequence (z)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state; // z = 1

      // MOVE_RIGHT scrubs to z = 2 (Z_max = 2)
      const res1 = processCommand(topology, state, COMMAND_MOVE_RIGHT);
      assert.equal(res1.state.z, 2);
      assert.equal(res1.state.lastZ[1][1], 2);

      // MOVE_RIGHT at Z_max boundary is a no-op
      const res2 = processCommand(topology, res1.state, COMMAND_MOVE_RIGHT);
      assert.equal(res2.state.z, 2);
      assert.equal(res2.state, res1.state);

      // MOVE_LEFT scrubs back down to z = 1
      const res3 = processCommand(topology, res2.state, COMMAND_MOVE_LEFT);
      assert.equal(res3.state.z, 1);
      assert.equal(res3.state.lastZ[1][1], 1);

      // MOVE_LEFT at z = 1 boundary is a no-op (use EXIT_DETOUR to leave)
      const res4 = processCommand(topology, res3.state, COMMAND_MOVE_LEFT);
      assert.equal(res4.state.z, 1);
      assert.equal(res4.state, res3.state);
    });

    it('ENTER_DETOUR resumes from last visited detour slide (lastZ[y][x])', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state; // z = 1
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state; // z = 2

      // Exit detour to parent page
      state = processCommand(topology, state, COMMAND_EXIT_DETOUR).state;
      assert.equal(state.z, 0);
      assert.equal(state.mode, MODE_MAIN);

      // Re-enter detour: should resume at z = 2!
      const reEnter = processCommand(topology, state, COMMAND_ENTER_DETOUR);
      assert.equal(reEnter.state.mode, MODE_DETOUR);
      assert.equal(reEnter.state.z, 2);
    });

    it('JUMP_START in DETOUR mode jumps to z = 1', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state; // z = 1
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state; // z = 2

      const res = processCommand(topology, state, COMMAND_JUMP_START);
      assert.equal(res.state.z, 1);
      assert.equal(res.state.lastZ[1][1], 1);

      // Idempotent when already at z=1
      const res2 = processCommand(topology, res.state, COMMAND_JUMP_START);
      assert.equal(res2.state, res.state);
    });

    it('JUMP_END in DETOUR mode jumps to z = Z_max(y, x)', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state; // z = 1

      const res = processCommand(topology, state, COMMAND_JUMP_END);
      assert.equal(res.state.z, 2);
      assert.equal(res.state.lastZ[1][1], 2);

      // Idempotent when already at z=2
      const res2 = processCommand(topology, res.state, COMMAND_JUMP_END);
      assert.equal(res2.state, res.state);
    });

    it('Strict vertical axis lock invariant: MOVE_UP and MOVE_DOWN in DETOUR mode do not move and emit feedback', () => {
      let state = createInitialState(topology);
      state = processCommand(topology, state, COMMAND_MOVE_DOWN).state;
      state = processCommand(topology, state, COMMAND_MOVE_RIGHT).state;
      state = processCommand(topology, state, COMMAND_ENTER_DETOUR).state;

      assert.equal(state.mode, MODE_DETOUR);
      assert.equal(state.y, 1);
      assert.equal(state.x, 1);
      assert.equal(state.z, 1);

      // Attempt MOVE_UP in DETOUR mode
      const upRes = processCommand(topology, state, COMMAND_MOVE_UP);
      assert.equal(upRes.state.y, 1);
      assert.equal(upRes.state.x, 1);
      assert.equal(upRes.state.z, 1);
      assert.equal(upRes.state.mode, MODE_DETOUR);
      assert.equal(upRes.feedback.verticalLockedAttempt, true);
      assert.equal(upRes.payload.verticalLockedAttempt, true);

      // Attempt MOVE_DOWN in DETOUR mode
      const downRes = processCommand(topology, state, COMMAND_MOVE_DOWN);
      assert.equal(downRes.state.y, 1);
      assert.equal(downRes.state.x, 1);
      assert.equal(downRes.state.z, 1);
      assert.equal(downRes.state.mode, MODE_DETOUR);
      assert.equal(downRes.feedback.verticalLockedAttempt, true);
      assert.equal(downRes.payload.verticalLockedAttempt, true);
    });
  });

  describe('processCommand - NAVIGATE_TO Direct Transitions', () => {
    it('navigates directly to valid (y, x, z) coordinates and updates cursor memory', () => {
      const state = createInitialState(topology);
      const res = processCommand(topology, state, { type: COMMAND_NAVIGATE_TO, y: 1, x: 1, z: 2 });

      assert.equal(res.state.y, 1);
      assert.equal(res.state.x, 1);
      assert.equal(res.state.z, 2);
      assert.equal(res.state.mode, MODE_DETOUR);
      assert.equal(res.state.lastX[1], 1);
      assert.equal(res.state.lastZ[1][1], 2);
    });

    it('defaults z to 0 when z is not provided', () => {
      const state = createInitialState(topology);
      const res = processCommand(topology, state, { type: COMMAND_NAVIGATE_TO, y: 1, x: 2 });

      assert.equal(res.state.y, 1);
      assert.equal(res.state.x, 2);
      assert.equal(res.state.z, 0);
      assert.equal(res.state.mode, MODE_MAIN);
    });

    it('ignores invalid or out-of-bounds coordinates (safe no-op)', () => {
      const state = createInitialState(topology);
      const resOutOfBounds = processCommand(topology, state, { type: COMMAND_NAVIGATE_TO, y: 99, x: 0, z: 0 });
      assert.equal(resOutOfBounds.state, state);

      const resInvalidDetour = processCommand(topology, state, { type: COMMAND_NAVIGATE_TO, y: 0, x: 0, z: 5 });
      assert.equal(resInvalidDetour.state, state);
    });

    it('returns same state reference when target matches current coordinates', () => {
      const state = createInitialState(topology);
      const res = processCommand(topology, state, { type: COMMAND_NAVIGATE_TO, y: 0, x: 0, z: 0 });
      assert.equal(res.state, state);
    });
  });

  describe('Outbound State Payload Invariants', () => {
    it('payload contains exact DOMAIN_SPEC.md Section 5 schema and values', () => {
      const state = createInitialState(topology);
      const res = processCommand(topology, state, COMMAND_MOVE_RIGHT);

      assert.equal(res.payload.y, 0);
      assert.equal(res.payload.x, 1);
      assert.equal(res.payload.z, 0);
      assert.equal(res.payload.mode, MODE_MAIN);

      assert.equal(typeof res.payload.canMoveLeft, 'boolean');
      assert.equal(typeof res.payload.canMoveRight, 'boolean');
      assert.equal(typeof res.payload.canMoveUp, 'boolean');
      assert.equal(typeof res.payload.canMoveDown, 'boolean');
      assert.equal(typeof res.payload.hasDetour, 'boolean');
      assert.equal(typeof res.payload.detourCount, 'number');
      assert.equal(typeof res.payload.isVerticalLocked, 'boolean');
    });
  });
});

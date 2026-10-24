import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, formatHash, attachHashRouter } from '../../src/adapters/input/hash-router.js';
import { createDeckTopology } from '../../src/core/model.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import { COMMAND_NAVIGATE_TO, COMMAND_MOVE_RIGHT } from '../../src/core/navigator.js';
import { createMockDeck } from '../fixtures/deck-fixture.js';

/**
 * Creates a mock window object with event listener and location capabilities.
 */
function createMockWindow(initialHash = '') {
  const listeners = new Map();
  let currentHash = initialHash;
  let replaceStateCalls = [];

  const mockWindow = {
    location: {
      get hash() {
        return currentHash;
      },
      set hash(val) {
        currentHash = val;
      },
      pathname: '/deck.html',
      search: ''
    },
    history: {
      replaceState(state, title, url) {
        replaceStateCalls.push({ state, title, url });
        const hashIdx = url.indexOf('#');
        if (hashIdx !== -1) {
          currentHash = url.slice(hashIdx);
        }
      }
    },
    addEventListener(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
    },
    removeEventListener(event, handler) {
      if (listeners.has(event)) {
        listeners.get(event).delete(handler);
      }
    },
    // Test helper to simulate browser event
    simulateEvent(eventName) {
      if (listeners.has(eventName)) {
        for (const handler of listeners.get(eventName)) {
          handler({ type: eventName });
        }
      }
    },
    getReplaceStateCalls() {
      return replaceStateCalls;
    }
  };

  return mockWindow;
}

describe('URL Hash Routing Adapter (src/adapters/input/hash-router.js)', () => {
  describe('parseHash', () => {
    it('parses two-part hash as { y, x, z: 0 }', () => {
      assert.deepEqual(parseHash('#1/2'), { y: 1, x: 2, z: 0 });
      assert.deepEqual(parseHash('0/0'), { y: 0, x: 0, z: 0 });
      assert.deepEqual(parseHash('#/2/1'), { y: 2, x: 1, z: 0 });
    });

    it('parses three-part hash as { y, x, z }', () => {
      assert.deepEqual(parseHash('#1/1/2'), { y: 1, x: 1, z: 2 });
      assert.deepEqual(parseHash('#/0/1/1'), { y: 0, x: 1, z: 1 });
    });

    it('supports 1-indexed option', () => {
      assert.deepEqual(parseHash('#1/1', { oneIndexed: true }), { y: 0, x: 0, z: 0 });
      assert.deepEqual(parseHash('#2/3/2', { oneIndexed: true }), { y: 1, x: 2, z: 1 });
    });

    it('returns null for empty or invalid hash strings', () => {
      assert.equal(parseHash(''), null);
      assert.equal(parseHash('#'), null);
      assert.equal(parseHash('#/'), null);
      assert.equal(parseHash('#1'), null);
      assert.equal(parseHash('#1/2/3/4'), null);
      assert.equal(parseHash('#foo/bar'), null);
      assert.equal(parseHash('#-1/0'), null);
      assert.equal(parseHash(null), null);
      assert.equal(parseHash(undefined), null);
      assert.equal(parseHash(123), null);
    });
  });

  describe('formatHash', () => {
    it('formats main track coordinates without z when z is 0', () => {
      assert.equal(formatHash(0, 0, 0), '#0/0');
      assert.equal(formatHash(1, 3, 0), '#1/3');
    });

    it('formats detour coordinates with z when z > 0', () => {
      assert.equal(formatHash(1, 1, 2), '#1/1/2');
    });

    it('always includes z when alwaysIncludeZ option is true', () => {
      assert.equal(formatHash(0, 0, 0, { alwaysIncludeZ: true }), '#0/0/0');
    });

    it('formats with 1-indexed offset when oneIndexed is true', () => {
      assert.equal(formatHash(0, 0, 0, { oneIndexed: true }), '#1/1');
      assert.equal(formatHash(1, 1, 2, { oneIndexed: true }), '#2/2/3');
    });
  });

  describe('attachHashRouter - Hydration & Sync', () => {
    const topology = createDeckTopology(createMockDeck());

    it('hydrates initial presentation state from existing window hash', () => {
      const mockWin = createMockWindow('#1/1/2');
      const dispatcher = createCommandDispatcher(topology);

      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);

      const router = attachHashRouter(dispatcher, mockWin);

      const state = dispatcher.getState();
      assert.equal(state.y, 1);
      assert.equal(state.x, 1);
      assert.equal(state.z, 2);
      assert.equal(state.mode, 'DETOUR');

      router.destroy();
    });

    it('updates window hash when state transitions occur', () => {
      const mockWin = createMockWindow('');
      const dispatcher = createCommandDispatcher(topology);
      const router = attachHashRouter(dispatcher, mockWin);

      assert.equal(mockWin.location.hash, '#0/0');

      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      assert.equal(mockWin.location.hash, '#0/1');

      dispatcher.dispatch({ type: COMMAND_NAVIGATE_TO, y: 1, x: 1, z: 2 });
      assert.equal(mockWin.location.hash, '#1/1/2');

      router.destroy();
    });

    it('uses history.replaceState when useReplaceState is enabled', () => {
      const mockWin = createMockWindow('');
      const dispatcher = createCommandDispatcher(topology);
      const router = attachHashRouter(dispatcher, mockWin, { useReplaceState: true });

      dispatcher.dispatch(COMMAND_MOVE_RIGHT);
      const calls = mockWin.getReplaceStateCalls();
      assert.ok(calls.length > 0);
      assert.equal(calls[calls.length - 1].url, '/deck.html#0/1');

      router.destroy();
    });

    it('responds to browser hashchange event by dispatching NAVIGATE_TO', () => {
      const mockWin = createMockWindow('#0/0');
      const dispatcher = createCommandDispatcher(topology);
      const router = attachHashRouter(dispatcher, mockWin);

      assert.equal(dispatcher.getState().y, 0);
      assert.equal(dispatcher.getState().x, 0);

      // User navigates back/forward or modifies URL
      mockWin.location.hash = '#1/1';
      mockWin.simulateEvent('hashchange');

      const state = dispatcher.getState();
      assert.equal(state.y, 1);
      assert.equal(state.x, 1);
      assert.equal(state.z, 0);

      router.destroy();
    });

    it('detaches cleanly on destroy() and stops reacting to hashchange', () => {
      const mockWin = createMockWindow('#0/0');
      const dispatcher = createCommandDispatcher(topology);
      const router = attachHashRouter(dispatcher, mockWin);

      router.destroy();

      mockWin.location.hash = '#1/1';
      mockWin.simulateEvent('hashchange');

      // State did not change because router was destroyed
      assert.equal(dispatcher.getState().y, 0);
    });

    it('throws TypeError for invalid dispatcher or window target', () => {
      const dispatcher = createCommandDispatcher(topology);
      assert.throws(() => attachHashRouter(null, createMockWindow()), TypeError);
      assert.throws(() => attachHashRouter(dispatcher, null), TypeError);
    });
  });
});

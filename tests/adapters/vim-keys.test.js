/**
 * @file vim-keys.test.js
 * @description Unit tests for Inbound Keyboard Input Adapter (src/adapters/input/vim-keys.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachKeyboardAdapter,
  KEY_BINDINGS
} from '../../src/adapters/input/vim-keys.js';

import {
  COMMAND_MOVE_LEFT,
  COMMAND_MOVE_RIGHT,
  COMMAND_MOVE_UP,
  COMMAND_MOVE_DOWN,
  COMMAND_ENTER_DETOUR,
  COMMAND_EXIT_DETOUR,
  COMMAND_JUMP_START,
  COMMAND_JUMP_END,
  COMMAND_TOGGLE_MAP,
  COMMAND_NEXT_SLIDE,
  COMMAND_JUMP_TOP_ROW,
  COMMAND_JUMP_BOTTOM_ROW,
  COMMAND_JUMP_ROW,
  COMMAND_TOGGLE_FULLSCREEN,
  COMMAND_TOGGLE_HUD,
  COMMAND_TOGGLE_ORB,
  COMMAND_TOGGLE_LASER,
  COMMAND_TOGGLE_TELESTRATOR,
  COMMAND_CLEAR_TELESTRATOR
} from '../../src/core/navigator.js';

import { createCommandDispatcher } from '../../src/ports/input.js';
import { createMockElement } from '../fixtures/mock-dom.js';

/**
 * Creates a mock Window/EventTarget for testing keydown events.
 *
 * @param {object} [options={}]
 * @returns {object} Mock window/event target.
 */
function createMockEventTarget(options = {}) {
  const listeners = new Map();

  return {
    document: options.document || { activeElement: null },
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      if (listeners.has(type)) {
        listeners.get(type).delete(handler);
      }
    },
    dispatchEvent(event) {
      const type = event.type || 'keydown';
      const set = listeners.get(type);
      if (set) {
        for (const handler of Array.from(set)) {
          handler(event);
        }
      }
    },
    getListenerCount(type = 'keydown') {
      return listeners.has(type) ? listeners.get(type).size : 0;
    }
  };
}

/**
 * Helper to create a mock KeyboardEvent.
 *
 * @param {string} key - Event key string.
 * @param {object} [overrides={}] - Additional event properties.
 * @returns {object} Mock keyboard event.
 */
function createKeyEvent(key, overrides = {}) {
  let defaultPrevented = false;

  return {
    type: 'keydown',
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: null,
    preventDefault() {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
    ...overrides
  };
}

describe('Keyboard Input Adapter (src/adapters/input/vim-keys.js)', () => {
  describe('KEY_BINDINGS Specification', () => {
    it('is a frozen dictionary', () => {
      assert.ok(Object.isFrozen(KEY_BINDINGS));
    });

    it('maps all keys matching DOMAIN_SPEC.md section 4', () => {
      assert.strictEqual(KEY_BINDINGS.h, COMMAND_MOVE_LEFT);
      assert.strictEqual(KEY_BINDINGS.ArrowLeft, COMMAND_MOVE_LEFT);
      assert.strictEqual(KEY_BINDINGS.l, COMMAND_MOVE_RIGHT);
      assert.strictEqual(KEY_BINDINGS.ArrowRight, COMMAND_MOVE_RIGHT);
      assert.strictEqual(KEY_BINDINGS.j, COMMAND_MOVE_DOWN);
      assert.strictEqual(KEY_BINDINGS.ArrowDown, COMMAND_MOVE_DOWN);
      assert.strictEqual(KEY_BINDINGS.k, COMMAND_MOVE_UP);
      assert.strictEqual(KEY_BINDINGS.ArrowUp, COMMAND_MOVE_UP);
      assert.strictEqual(KEY_BINDINGS.i, COMMAND_ENTER_DETOUR);
      assert.strictEqual(KEY_BINDINGS.o, COMMAND_EXIT_DETOUR);
      assert.strictEqual(KEY_BINDINGS.Escape, COMMAND_EXIT_DETOUR);
      assert.strictEqual(KEY_BINDINGS['0'], COMMAND_JUMP_START);
      assert.strictEqual(KEY_BINDINGS.$, COMMAND_JUMP_END);
      assert.strictEqual(KEY_BINDINGS.m, COMMAND_TOGGLE_MAP);
      assert.strictEqual(KEY_BINDINGS[' '], COMMAND_NEXT_SLIDE);
      assert.strictEqual(KEY_BINDINGS.Enter, COMMAND_NEXT_SLIDE);
      assert.strictEqual(KEY_BINDINGS.G, COMMAND_JUMP_BOTTOM_ROW);
      assert.strictEqual(KEY_BINDINGS.f, COMMAND_TOGGLE_FULLSCREEN);
      assert.strictEqual(KEY_BINDINGS.b, COMMAND_TOGGLE_HUD);
      assert.strictEqual(KEY_BINDINGS.B, COMMAND_TOGGLE_ORB);
      assert.strictEqual(KEY_BINDINGS.p, COMMAND_TOGGLE_LASER);
      assert.strictEqual(KEY_BINDINGS.t, COMMAND_TOGGLE_TELESTRATOR);
      assert.strictEqual(KEY_BINDINGS.c, COMMAND_CLEAR_TELESTRATOR);
    });
  });

  describe('Validation & Initialization', () => {
    it('throws TypeError if dispatcher is missing or invalid', () => {
      const mockTarget = createMockEventTarget();
      assert.throws(() => attachKeyboardAdapter(null, mockTarget), {
        name: 'TypeError',
        message: /Dispatcher must be provided with a dispatch\(\) function/
      });
      assert.throws(() => attachKeyboardAdapter({}, mockTarget), {
        name: 'TypeError',
        message: /Dispatcher must be provided with a dispatch\(\) function/
      });
    });

    it('throws TypeError if target is invalid', () => {
      const mockDispatcher = { dispatch: () => {} };
      assert.throws(() => attachKeyboardAdapter(mockDispatcher, null), {
        name: 'TypeError',
        message: /Target must implement addEventListener and removeEventListener/
      });
      assert.throws(() => attachKeyboardAdapter(mockDispatcher, {}), {
        name: 'TypeError',
        message: /Target must implement addEventListener and removeEventListener/
      });
    });

    it('attaches listener to target and increases listener count', () => {
      const mockTarget = createMockEventTarget();
      const mockDispatcher = { dispatch: () => {} };

      assert.strictEqual(mockTarget.getListenerCount('keydown'), 0);
      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);
      assert.strictEqual(mockTarget.getListenerCount('keydown'), 1);

      handle.detach();
      assert.strictEqual(mockTarget.getListenerCount('keydown'), 0);
    });
  });

  describe('Key Mapping & Dispatching', () => {
    const testCases = [
      { key: 'h', expectedCommand: COMMAND_MOVE_LEFT },
      { key: 'ArrowLeft', expectedCommand: COMMAND_MOVE_LEFT },
      { key: 'l', expectedCommand: COMMAND_MOVE_RIGHT },
      { key: 'ArrowRight', expectedCommand: COMMAND_MOVE_RIGHT },
      { key: 'j', expectedCommand: COMMAND_MOVE_DOWN },
      { key: 'ArrowDown', expectedCommand: COMMAND_MOVE_DOWN },
      { key: 'k', expectedCommand: COMMAND_MOVE_UP },
      { key: 'ArrowUp', expectedCommand: COMMAND_MOVE_UP },
      { key: 'i', expectedCommand: COMMAND_ENTER_DETOUR },
      { key: 'o', expectedCommand: COMMAND_EXIT_DETOUR },
      { key: 'Escape', expectedCommand: COMMAND_EXIT_DETOUR },
      { key: '0', expectedCommand: COMMAND_JUMP_START },
      { key: '$', expectedCommand: COMMAND_JUMP_END },
      { key: 'p', expectedCommand: COMMAND_TOGGLE_LASER },
      { key: 't', expectedCommand: COMMAND_TOGGLE_TELESTRATOR },
      { key: 'c', expectedCommand: COMMAND_CLEAR_TELESTRATOR }
    ];

    for (const { key, expectedCommand } of testCases) {
      it(`dispatches ${expectedCommand} and calls preventDefault for key '${key}'`, () => {
        const mockTarget = createMockEventTarget();
        const dispatched = [];
        const mockDispatcher = {
          dispatch: (cmd) => {
            dispatched.push(cmd);
            return { handled: true };
          }
        };

        const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

        const event = createKeyEvent(key);
        mockTarget.dispatchEvent(event);

        assert.strictEqual(dispatched.length, 1);
        assert.strictEqual(dispatched[0], expectedCommand);
        assert.strictEqual(event.defaultPrevented, true);

        handle.detach();
      });
    }

    it('does not dispatch or preventDefault for unmapped keys', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      for (const unmappedKey of ['a', 'q', 'x', 'Tab', 'Backspace', 'F5']) {
        const event = createKeyEvent(unmappedKey);
        mockTarget.dispatchEvent(event);
        assert.strictEqual(event.defaultPrevented, false);
      }

      assert.strictEqual(dispatched.length, 0);
      handle.detach();
    });

    it('calls optional onKeyHandled callback', () => {
      const mockTarget = createMockEventTarget();
      const callbackEvents = [];
      const mockDispatcher = {
        dispatch: (cmd) => ({ simulatedState: cmd })
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget, {
        onKeyHandled: (key, command, result) => {
          callbackEvents.push({ key, command, result });
        }
      });

      mockTarget.dispatchEvent(createKeyEvent('l'));
      mockTarget.dispatchEvent(createKeyEvent('ArrowDown'));

      assert.strictEqual(callbackEvents.length, 2);
      assert.deepStrictEqual(callbackEvents[0], {
        key: 'l',
        command: COMMAND_MOVE_RIGHT,
        result: { simulatedState: COMMAND_MOVE_RIGHT }
      });
      assert.deepStrictEqual(callbackEvents[1], {
        key: 'ArrowDown',
        command: COMMAND_MOVE_DOWN,
        result: { simulatedState: COMMAND_MOVE_DOWN }
      });

      handle.detach();
    });
  });

  describe('Modifier Key Combinations', () => {
    it('ignores navigation keys when ctrlKey is pressed (e.g. Ctrl+R, Ctrl+j)', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      const event = createKeyEvent('j', { ctrlKey: true });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores navigation keys when altKey is pressed (e.g. Alt+F, Alt+ArrowLeft)', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      const event = createKeyEvent('ArrowLeft', { altKey: true });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores navigation keys when metaKey is pressed (e.g. Meta+K, Cmd+h)', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      const event = createKeyEvent('k', { metaKey: true });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('allows Shift+$ to trigger JUMP_END', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      const event = createKeyEvent('$', { shiftKey: true });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_JUMP_END);
      assert.strictEqual(event.defaultPrevented, true);

      handle.detach();
    });

    it('blocks other Shift chords (e.g. Shift+ArrowLeft, Shift+h)', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      const eventArrow = createKeyEvent('ArrowLeft', { shiftKey: true });
      mockTarget.dispatchEvent(eventArrow);

      const eventH = createKeyEvent('h', { shiftKey: true });
      mockTarget.dispatchEvent(eventH);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(eventArrow.defaultPrevented, false);
      assert.strictEqual(eventH.defaultPrevented, false);

      handle.detach();
    });
  });

  describe('Editable Form & ContentEditable Protection', () => {
    it('ignores keys when event.target is an <input>', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);
      const inputEl = createMockElement('input');

      const event = createKeyEvent('h', { target: inputEl });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores keys when event.target is a <textarea>', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);
      const textareaEl = createMockElement('textarea');

      const event = createKeyEvent('j', { target: textareaEl });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores keys when event.target is a <select>', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);
      const selectEl = createMockElement('select');

      const event = createKeyEvent('k', { target: selectEl });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores keys when event.target has isContentEditable = true', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);
      const divEl = createMockElement('div');
      divEl.isContentEditable = true;

      const event = createKeyEvent('l', { target: divEl });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores keys when event.target has contenteditable attribute', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);
      const divEl = createMockElement('div', {
        attributes: { contenteditable: 'true' }
      });

      const event = createKeyEvent('i', { target: divEl });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores keys when event target is inside a contenteditable parent container', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      const container = createMockElement('div', {
        attributes: { contenteditable: 'true' }
      });
      const spanChild = createMockElement('span');
      container.appendChild(spanChild);

      const event = createKeyEvent('o', {
        target: spanChild,
        composedPath: () => [spanChild, container]
      });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });

    it('ignores keys when document.activeElement is an editable input', () => {
      const inputEl = createMockElement('input');
      const mockTarget = createMockEventTarget({
        document: { activeElement: inputEl }
      });
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      // Event target is container or body, but activeElement is input
      const event = createKeyEvent('h', { target: null });
      mockTarget.dispatchEvent(event);

      assert.strictEqual(dispatched.length, 0);
      assert.strictEqual(event.defaultPrevented, false);

      handle.detach();
    });
  });

  describe('Cleanup & Detach Lifecycle', () => {
    it('calling detach() removes listener so subsequent events are ignored', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      mockTarget.dispatchEvent(createKeyEvent('l'));
      assert.strictEqual(dispatched.length, 1);

      // Call handle.detach()
      handle.detach();

      // Subsequent key events must be ignored
      mockTarget.dispatchEvent(createKeyEvent('l'));
      mockTarget.dispatchEvent(createKeyEvent('j'));
      assert.strictEqual(dispatched.length, 1);
    });

    it('handle is also callable as a cleanup function', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = { dispatch: (cmd) => dispatched.push(cmd) };

      const detach = attachKeyboardAdapter(mockDispatcher, mockTarget);
      assert.strictEqual(typeof detach, 'function');
      assert.strictEqual(typeof detach.detach, 'function');

      mockTarget.dispatchEvent(createKeyEvent('k'));
      assert.strictEqual(dispatched.length, 1);

      detach(); // Call as function

      mockTarget.dispatchEvent(createKeyEvent('k'));
      assert.strictEqual(dispatched.length, 1);
    });
  });

  describe('End-to-End Integration with createCommandDispatcher', () => {
    it('drives presentation state transitions via keyboard inputs', () => {
      const deckStructure = [
        {
          pages: [
            { id: 'p0-0' },
            { id: 'p0-1' }
          ]
        },
        {
          pages: [
            {
              id: 'p1-0',
              detours: [{ id: 'd1-0-1' }, { id: 'd1-0-2' }]
            }
          ]
        }
      ];

      const dispatcher = createCommandDispatcher(deckStructure);
      const mockWindow = createMockEventTarget();

      const handle = attachKeyboardAdapter(dispatcher, mockWindow);

      // Initial state: (0, 0, 0) in MAIN
      assert.strictEqual(dispatcher.getState().x, 0);
      assert.strictEqual(dispatcher.getState().y, 0);

      // Press 'l' -> Move Right to page 1
      mockWindow.dispatchEvent(createKeyEvent('l'));
      assert.strictEqual(dispatcher.getState().x, 1);
      assert.strictEqual(dispatcher.getState().y, 0);

      // Press 'j' -> Move Down to section 1
      mockWindow.dispatchEvent(createKeyEvent('j'));
      assert.strictEqual(dispatcher.getState().y, 1);
      assert.strictEqual(dispatcher.getState().x, 0);

      // Press 'i' -> Enter Detour
      mockWindow.dispatchEvent(createKeyEvent('i'));
      assert.strictEqual(dispatcher.getState().mode, 'DETOUR');
      assert.strictEqual(dispatcher.getState().z, 1);

      // Press 'l' -> Scrub Detour to z = 2
      mockWindow.dispatchEvent(createKeyEvent('l'));
      assert.strictEqual(dispatcher.getState().z, 2);

      // Press 'Escape' -> Exit Detour back to MAIN
      mockWindow.dispatchEvent(createKeyEvent('Escape'));
      assert.strictEqual(dispatcher.getState().mode, 'MAIN');
      assert.strictEqual(dispatcher.getState().z, 0);

      handle.detach();
    });
  });

  describe('Vim Multipliers, gg/G Row Jumps & Linear Flow', () => {
    it('supports numeric count multipliers (e.g. 3l, 2j)', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => {
          dispatched.push(cmd);
          return { ok: true };
        }
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      // Press '3' then 'l' -> dispatches COMMAND_MOVE_RIGHT 3 times
      mockTarget.dispatchEvent(createKeyEvent('3'));
      mockTarget.dispatchEvent(createKeyEvent('l'));

      assert.strictEqual(dispatched.length, 3);
      assert.deepStrictEqual(dispatched, [COMMAND_MOVE_RIGHT, COMMAND_MOVE_RIGHT, COMMAND_MOVE_RIGHT]);

      dispatched.length = 0;

      // Press '2' then 'j' -> dispatches COMMAND_MOVE_DOWN 2 times
      mockTarget.dispatchEvent(createKeyEvent('2'));
      mockTarget.dispatchEvent(createKeyEvent('j'));

      assert.strictEqual(dispatched.length, 2);
      assert.deepStrictEqual(dispatched, [COMMAND_MOVE_DOWN, COMMAND_MOVE_DOWN]);

      handle.detach();
    });

    it('distinguishes standalone 0 from 0 in count buffer (e.g. 10l)', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => {
          dispatched.push(cmd);
          return { ok: true };
        }
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      // Standalone '0' -> COMMAND_JUMP_START
      mockTarget.dispatchEvent(createKeyEvent('0'));
      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_JUMP_START);

      dispatched.length = 0;

      // '1' then '0' then 'h' -> 10 times COMMAND_MOVE_LEFT
      mockTarget.dispatchEvent(createKeyEvent('1'));
      mockTarget.dispatchEvent(createKeyEvent('0'));
      mockTarget.dispatchEvent(createKeyEvent('h'));

      assert.strictEqual(dispatched.length, 10);
      assert.strictEqual(dispatched.every((c) => c === COMMAND_MOVE_LEFT), true);

      handle.detach();
    });

    it('Escape cancels active count buffer without dispatching EXIT_DETOUR', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      // Type '5' into count buffer
      const event5 = createKeyEvent('5');
      mockTarget.dispatchEvent(event5);
      assert.strictEqual(dispatched.length, 0);

      // Press 'Escape' -> cancels buffer
      const eventEsc = createKeyEvent('Escape');
      mockTarget.dispatchEvent(eventEsc);
      assert.strictEqual(eventEsc.defaultPrevented, true);
      assert.strictEqual(dispatched.length, 0); // Did not dispatch EXIT_DETOUR!

      // Next keypress 'l' executes with count = 1
      mockTarget.dispatchEvent(createKeyEvent('l'));
      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_MOVE_RIGHT);

      handle.detach();
    });

    it('handles gg for JUMP_TOP_ROW and [count]gg for JUMP_ROW', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => {
          dispatched.push(cmd);
          return { ok: true };
        }
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      // 'g' then 'g' -> COMMAND_JUMP_TOP_ROW
      mockTarget.dispatchEvent(createKeyEvent('g'));
      assert.strictEqual(dispatched.length, 0);
      mockTarget.dispatchEvent(createKeyEvent('g'));
      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_JUMP_TOP_ROW);

      dispatched.length = 0;

      // '5' then 'g' then 'g' -> JUMP_ROW to targetY: 4
      mockTarget.dispatchEvent(createKeyEvent('5'));
      mockTarget.dispatchEvent(createKeyEvent('g'));
      mockTarget.dispatchEvent(createKeyEvent('g'));
      assert.strictEqual(dispatched.length, 1);
      assert.deepStrictEqual(dispatched[0], { type: COMMAND_JUMP_ROW, targetY: 4 });

      handle.detach();
    });

    it('handles G for JUMP_BOTTOM_ROW and [count]G for JUMP_ROW', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => {
          dispatched.push(cmd);
          return { ok: true };
        }
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      // 'G' (with shiftKey: true) -> COMMAND_JUMP_BOTTOM_ROW
      mockTarget.dispatchEvent(createKeyEvent('G', { shiftKey: true }));
      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_JUMP_BOTTOM_ROW);

      dispatched.length = 0;

      // '3' then 'G' -> JUMP_ROW to targetY: 2
      mockTarget.dispatchEvent(createKeyEvent('3'));
      mockTarget.dispatchEvent(createKeyEvent('G', { shiftKey: true }));
      assert.strictEqual(dispatched.length, 1);
      assert.deepStrictEqual(dispatched[0], { type: COMMAND_JUMP_ROW, targetY: 2 });

      handle.detach();
    });

    it('maps Space and Enter to COMMAND_NEXT_SLIDE', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      mockTarget.dispatchEvent(createKeyEvent(' '));
      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_NEXT_SLIDE);

      mockTarget.dispatchEvent(createKeyEvent('Enter'));
      assert.strictEqual(dispatched.length, 2);
      assert.strictEqual(dispatched[1], COMMAND_NEXT_SLIDE);

      handle.detach();
    });

    it('maps m to COMMAND_TOGGLE_MAP', () => {
      const mockTarget = createMockEventTarget();
      const dispatched = [];
      const mockDispatcher = {
        dispatch: (cmd) => dispatched.push(cmd)
      };

      const handle = attachKeyboardAdapter(mockDispatcher, mockTarget);

      mockTarget.dispatchEvent(createKeyEvent('m'));
      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0], COMMAND_TOGGLE_MAP);

      handle.detach();
    });
  });
});

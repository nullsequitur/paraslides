/**
 * @file vim-keys.js
 * @description Inbound Keyboard Input Adapter (Vim & Arrow Key Navigation).
 *
 * Listens for keyboard events on a target (e.g. window or container) and maps
 * standard Vim keys and arrow keys to abstract navigation commands accepted
 * by the NavigationCommandPort dispatcher.
 * Pure ES module with zero external runtime dependencies.
 */

import {
  COMMAND_MOVE_LEFT,
  COMMAND_MOVE_RIGHT,
  COMMAND_MOVE_UP,
  COMMAND_MOVE_DOWN,
  COMMAND_ENTER_DETOUR,
  COMMAND_EXIT_DETOUR,
  COMMAND_JUMP_START,
  COMMAND_JUMP_END,
  COMMAND_TOGGLE_MAP
} from '../../core/navigator.js';

/**
 * Standard key-to-command mappings specified in DOMAIN_SPEC.md and ROADMAP.md.
 *
 * Mappings:
 * - 'h', 'ArrowLeft'  -> COMMAND_MOVE_LEFT
 * - 'l', 'ArrowRight' -> COMMAND_MOVE_RIGHT
 * - 'j', 'ArrowDown'  -> COMMAND_MOVE_DOWN
 * - 'k', 'ArrowUp'    -> COMMAND_MOVE_UP
 * - 'i'               -> COMMAND_ENTER_DETOUR
 * - 'o', 'Escape'     -> COMMAND_EXIT_DETOUR
 * - '0'               -> COMMAND_JUMP_START
 * - '$'               -> COMMAND_JUMP_END
 * - 'm', ' '          -> COMMAND_TOGGLE_MAP
 *
 * @constant {Readonly<Record<string, string>>}
 */
export const KEY_BINDINGS = Object.freeze({
  h: COMMAND_MOVE_LEFT,
  ArrowLeft: COMMAND_MOVE_LEFT,
  l: COMMAND_MOVE_RIGHT,
  ArrowRight: COMMAND_MOVE_RIGHT,
  j: COMMAND_MOVE_DOWN,
  ArrowDown: COMMAND_MOVE_DOWN,
  k: COMMAND_MOVE_UP,
  ArrowUp: COMMAND_MOVE_UP,
  i: COMMAND_ENTER_DETOUR,
  o: COMMAND_EXIT_DETOUR,
  Escape: COMMAND_EXIT_DETOUR,
  '0': COMMAND_JUMP_START,
  $: COMMAND_JUMP_END,
  m: COMMAND_TOGGLE_MAP,
  ' ': COMMAND_TOGGLE_MAP
});

/**
 * Checks if a DOM node or mock element is an interactive text input/form control.
 *
 * @param {object|null} element - DOM element to inspect.
 * @returns {boolean} True if the element accepts text input.
 */
function isEditableElement(element) {
  if (!element || typeof element !== 'object') {
    return false;
  }

  const tagName = element.tagName ? String(element.tagName).toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (element.isContentEditable === true) {
    return true;
  }

  if (typeof element.getAttribute === 'function') {
    const ce = element.getAttribute('contenteditable');
    if (ce === '' || ce === 'true' || ce === 'plaintext-only') {
      return true;
    }
  }

  if (typeof element.closest === 'function') {
    if (element.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether a keyboard event originated inside an editable element
 * or when the active focused document element is editable.
 *
 * @param {KeyboardEvent|object} event - Keyboard event.
 * @param {object} [target] - Event listener target (e.g. window or document).
 * @returns {boolean}
 */
function shouldIgnoreDueToFocus(event, target) {
  if (isEditableElement(event.target)) {
    return true;
  }

  if (typeof event.composedPath === 'function') {
    const path = event.composedPath();
    if (Array.isArray(path)) {
      for (const node of path) {
        if (isEditableElement(node)) {
          return true;
        }
      }
    }
  }

  const activeElement = (target && target.document && target.document.activeElement)
    || (typeof document !== 'undefined' && document.activeElement)
    || null;

  if (isEditableElement(activeElement)) {
    return true;
  }

  return false;
}

/**
 * Attaches keyboard navigation listeners to an EventTarget and dispatches commands.
 *
 * @param {object} dispatcher - Navigation command dispatcher with `dispatch(command)` method.
 * @param {EventTarget|object} [target] - Target receiving key events (defaults to window in browser).
 * @param {object} [options={}] - Optional configuration.
 * @param {Record<string, string>} [options.bindings] - Custom key bindings overriding or extending KEY_BINDINGS.
 * @param {(key: string, command: string, result: object) => void} [options.onKeyHandled] - Callback invoked when a command is dispatched.
 * @returns {{ detach: () => void } & (() => void)} Detach cleanup handle.
 * @throws {TypeError} If dispatcher or target is invalid.
 */
export function attachKeyboardAdapter(
  dispatcher,
  target = (typeof window !== 'undefined' ? window : null),
  options = {}
) {
  if (!dispatcher || typeof dispatcher.dispatch !== 'function') {
    throw new TypeError('Dispatcher must be provided with a dispatch() function.');
  }

  if (!target || typeof target.addEventListener !== 'function' || typeof target.removeEventListener !== 'function') {
    throw new TypeError('Target must implement addEventListener and removeEventListener.');
  }

  const bindings = options.bindings
    ? Object.freeze({ ...KEY_BINDINGS, ...options.bindings })
    : KEY_BINDINGS;

  const onKeyHandled = typeof options.onKeyHandled === 'function' ? options.onKeyHandled : null;

  function handleKeyDown(event) {
    if (!event || typeof event !== 'object') {
      return;
    }

    // Ignore events inside editable inputs or contenteditable regions
    if (shouldIgnoreDueToFocus(event, target)) {
      return;
    }

    // Ignore chord combinations with Ctrl, Meta, or Alt
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Shift is permitted only for '$' (Shift+4 on US keyboards); block other Shift chords
    if (event.shiftKey && event.key !== '$') {
      return;
    }

    const command = bindings[event.key];
    if (!command) {
      return;
    }

    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const result = dispatcher.dispatch(command);

    if (onKeyHandled) {
      onKeyHandled(event.key, command, result);
    }
  }

  target.addEventListener('keydown', handleKeyDown);

  const detach = () => {
    target.removeEventListener('keydown', handleKeyDown);
  };

  detach.detach = detach;

  return detach;
}

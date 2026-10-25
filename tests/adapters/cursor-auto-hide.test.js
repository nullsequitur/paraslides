/**
 * @file cursor-auto-hide.test.js
 * @description Unit tests for Outbound Cursor Auto-Hide Adapter (src/adapters/render/cursor-auto-hide.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachCursorAutoHide,
  injectCursorAutoHideStyles,
  CURSOR_AUTO_HIDE_STYLES
} from '../../src/adapters/render/cursor-auto-hide.js';
import { createMockElement } from '../fixtures/mock-dom.js';

describe('Cursor Auto-Hide Adapter (src/adapters/render/cursor-auto-hide.js)', () => {
  function createMockEnvironment(options = {}) {
    const listeners = new Map();
    let currentFullscreenElement = options.isFullscreen ? {} : null;

    const mockDoc = {
      get fullscreenElement() {
        return currentFullscreenElement;
      },
      set fullscreenElement(val) {
        currentFullscreenElement = val;
      },
      head: createMockElement('head'),
      body: createMockElement('body'),
      getElementById: (id) => null,
      createElement: (tag) => createMockElement(tag),
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(handler);
      },
      removeEventListener(type, handler) {
        if (listeners.has(type)) listeners.get(type).delete(handler);
      },
      dispatchEvent(event) {
        const type = typeof event === 'string' ? event : event?.type;
        const set = listeners.get(type);
        if (set) {
          for (const handler of Array.from(set)) {
            handler(event);
          }
        }
      }
    };

    return { mockDoc, listeners };
  }

  it('provides base stylesheet containing cursor: none', () => {
    assert.ok(typeof CURSOR_AUTO_HIDE_STYLES === 'string');
    assert.ok(CURSOR_AUTO_HIDE_STYLES.includes('cursor: none !important'));
  });

  it('injects style element into document head once', () => {
    const { mockDoc } = createMockEnvironment();
    let injectedId = null;
    mockDoc.getElementById = (id) => (id === injectedId ? { id } : null);

    const style = injectCursorAutoHideStyles(mockDoc);
    assert.ok(style);
    assert.strictEqual(style.id, 'paraslides-cursor-auto-hide-styles');
    injectedId = 'paraslides-cursor-auto-hide-styles';

    const second = injectCursorAutoHideStyles(mockDoc);
    assert.strictEqual(second.id, 'paraslides-cursor-auto-hide-styles');
  });

  it('hides cursor after configured delayMs of inactivity', (t, done) => {
    const { mockDoc } = createMockEnvironment();
    const container = createMockElement('body');

    let visibilityChanges = [];
    const autoHide = attachCursorAutoHide(container, {
      document: mockDoc,
      delayMs: 30,
      onVisibilityChange: (hidden) => visibilityChanges.push(hidden)
    });

    assert.strictEqual(autoHide.isHidden(), false);
    assert.strictEqual(container.classList.contains('is-cursor-hidden'), false);

    setTimeout(() => {
      try {
        assert.strictEqual(autoHide.isHidden(), true);
        assert.strictEqual(container.classList.contains('is-cursor-hidden'), true);
        assert.strictEqual(container.getAttribute('data-cursor-hidden'), 'true');
        assert.deepStrictEqual(visibilityChanges, [true]);
        autoHide.destroy();
        done();
      } catch (err) {
        autoHide.destroy();
        done(err);
      }
    }, 60);
  });

  it('unhides cursor immediately upon pointer movement and resets timer', (t, done) => {
    const { mockDoc } = createMockEnvironment();
    const container = createMockElement('body');

    const autoHide = attachCursorAutoHide(container, {
      document: mockDoc,
      delayMs: 25
    });

    setTimeout(() => {
      try {
        assert.strictEqual(autoHide.isHidden(), true);

        // Simulate pointer movement
        container.dispatchEvent({ type: 'pointermove' });

        assert.strictEqual(autoHide.isHidden(), false);
        assert.strictEqual(container.classList.contains('is-cursor-hidden'), false);
        assert.strictEqual(container.getAttribute('data-cursor-hidden'), null);

        autoHide.destroy();
        done();
      } catch (err) {
        autoHide.destroy();
        done(err);
      }
    }, 45);
  });

  it('respects fullscreenOnly setting', (t, done) => {
    const { mockDoc } = createMockEnvironment({ isFullscreen: false });
    const container = createMockElement('body');

    const autoHide = attachCursorAutoHide(container, {
      document: mockDoc,
      delayMs: 25,
      fullscreenOnly: true
    });

    setTimeout(() => {
      try {
        // Since document is not fullscreen, cursor should NOT be hidden
        assert.strictEqual(autoHide.isHidden(), false);
        assert.strictEqual(container.classList.contains('is-cursor-hidden'), false);

        // Enter fullscreen
        mockDoc.fullscreenElement = container;
        mockDoc.dispatchEvent({ type: 'fullscreenchange' });

        // Wait for inactivity in fullscreen
        setTimeout(() => {
          try {
            assert.strictEqual(autoHide.isHidden(), true);
            assert.strictEqual(container.classList.contains('is-cursor-hidden'), true);

            // Exit fullscreen
            mockDoc.fullscreenElement = null;
            mockDoc.dispatchEvent({ type: 'fullscreenchange' });

            // Should immediately unhide
            assert.strictEqual(autoHide.isHidden(), false);
            assert.strictEqual(container.classList.contains('is-cursor-hidden'), false);

            autoHide.destroy();
            done();
          } catch (err) {
            autoHide.destroy();
            done(err);
          }
        }, 45);
      } catch (err) {
        autoHide.destroy();
        done(err);
      }
    }, 45);
  });

  it('cleans up all timers and listeners upon destroy', () => {
    const { mockDoc, listeners } = createMockEnvironment();
    const container = createMockElement('body');

    const autoHide = attachCursorAutoHide(container, {
      document: mockDoc,
      delayMs: 100
    });

    autoHide.hide();
    assert.strictEqual(autoHide.isHidden(), true);

    autoHide.destroy();
    assert.strictEqual(autoHide.isHidden(), false);
    assert.strictEqual(container.classList.contains('is-cursor-hidden'), false);
  });
});

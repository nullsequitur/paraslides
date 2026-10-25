/**
 * @file laser-pointer.test.js
 * @description Unit tests for Outbound Glowing Laser Spotlight Adapter (src/adapters/render/laser-pointer.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachLaserPointer,
  injectLaserPointerStyles,
  LASER_POINTER_BASE_STYLES
} from '../../src/adapters/render/laser-pointer.js';
import { COMMAND_TOGGLE_LASER } from '../../src/core/navigator.js';
import { MODE_MAIN, MODE_DETOUR } from '../../src/core/state.js';
import { createMockElement } from '../fixtures/mock-dom.js';

describe('Glowing Laser Spotlight Adapter (src/adapters/render/laser-pointer.js)', () => {
  function createMockEnvironment() {
    const listeners = new Map();
    const headEl = createMockElement('head');
    const bodyEl = createMockElement('body');

    let laserEl = null;

    const mockDoc = {
      head: headEl,
      body: bodyEl,
      getElementById: (id) => (id === 'laser-spotlight' ? laserEl : null),
      createElement: (tag) => {
        const el = createMockElement(tag);
        if (tag === 'aside' || tag === 'div') {
          laserEl = el;
        }
        return el;
      },
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

    return { mockDoc, headEl, bodyEl, listeners };
  }

  it('provides base stylesheet containing spotlight styling and custom properties', () => {
    assert.ok(typeof LASER_POINTER_BASE_STYLES === 'string');
    assert.ok(LASER_POINTER_BASE_STYLES.includes('--laser-color'));
    assert.ok(LASER_POINTER_BASE_STYLES.includes('paraslides-laser-spotlight'));
  });

  it('injects style element into document head once', () => {
    const { mockDoc } = createMockEnvironment();
    let injected = null;
    mockDoc.getElementById = (id) => (id === 'paraslides-laser-spotlight-styles' ? injected : null);

    const style = injectLaserPointerStyles(mockDoc);
    assert.ok(style);
    assert.strictEqual(style.id, 'paraslides-laser-spotlight-styles');
    injected = style;

    const second = injectLaserPointerStyles(mockDoc);
    assert.strictEqual(second, style);
  });

  it('initializes inactive and mounts laser spotlight element into container', () => {
    const { mockDoc, bodyEl } = createMockEnvironment();
    const subscribers = [];
    const mockDispatcher = {
      subscribe: (fn) => {
        subscribers.push(fn);
        return () => {};
      }
    };

    const laser = attachLaserPointer(mockDispatcher, bodyEl, { document: mockDoc });

    assert.strictEqual(laser.isEnabled(), false);
    const laserEl = bodyEl.querySelector('#laser-spotlight');
    assert.ok(laserEl);
    assert.strictEqual(laserEl.classList.contains('is-active'), false);
    assert.strictEqual(bodyEl.classList.contains('has-laser-active'), false);

    laser.destroy();
  });

  it('toggles laser active state on COMMAND_TOGGLE_LASER feedback event', () => {
    const { mockDoc, bodyEl } = createMockEnvironment();
    let subscriber = null;
    const mockDispatcher = {
      subscribe: (fn) => {
        subscriber = fn;
        return () => {};
      }
    };

    let toggledState = null;
    const laser = attachLaserPointer(mockDispatcher, bodyEl, {
      document: mockDoc,
      onToggle: (enabled) => {
        toggledState = enabled;
      }
    });

    const laserEl = bodyEl.querySelector('#laser-spotlight');

    // Trigger toggle via feedback
    subscriber({ feedback: { toggleLaser: true }, mode: MODE_MAIN, z: 0 });
    assert.strictEqual(laser.isEnabled(), true);
    assert.strictEqual(laserEl.classList.contains('is-active'), true);
    assert.strictEqual(bodyEl.classList.contains('has-laser-active'), true);
    assert.strictEqual(toggledState, true);

    // Toggle off
    subscriber({ feedback: { toggleLaser: true }, mode: MODE_MAIN, z: 0 });
    assert.strictEqual(laser.isEnabled(), false);
    assert.strictEqual(laserEl.classList.contains('is-active'), false);
    assert.strictEqual(bodyEl.classList.contains('has-laser-active'), false);
    assert.strictEqual(toggledState, false);

    laser.destroy();
  });

  it('updates position accurately on pointermove', () => {
    const { mockDoc, bodyEl } = createMockEnvironment();
    const mockDispatcher = {
      subscribe: () => () => {}
    };

    const laser = attachLaserPointer(mockDispatcher, bodyEl, {
      document: mockDoc,
      size: 20
    });

    const laserEl = bodyEl.querySelector('#laser-spotlight');
    laser.enable();

    // Dispatch pointermove on doc
    mockDoc.dispatchEvent({ type: 'pointermove', clientX: 300, clientY: 200 });

    assert.ok(laserEl.getAttribute('style')?.includes('translate3d(290px, 190px, 0)'));

    laser.destroy();
  });

  it('switches accent color between MAIN and DETOUR mode when no explicit color is set', () => {
    const { mockDoc, bodyEl } = createMockEnvironment();
    let subscriber = null;
    const mockDispatcher = {
      subscribe: (fn) => {
        subscriber = fn;
        return () => {};
      }
    };

    const laser = attachLaserPointer(mockDispatcher, bodyEl, { document: mockDoc });
    const laserEl = bodyEl.querySelector('#laser-spotlight');

    subscriber({ mode: MODE_DETOUR, z: 1 });
    assert.strictEqual(laserEl.getAttribute('data-mode'), 'DETOUR');

    subscriber({ mode: MODE_MAIN, z: 0 });
    assert.strictEqual(laserEl.getAttribute('data-mode'), 'MAIN');

    laser.destroy();
  });

  it('cleans up elements and event listeners on destroy', () => {
    const { mockDoc, bodyEl, listeners } = createMockEnvironment();
    let unsubscribed = false;
    const mockDispatcher = {
      subscribe: () => () => {
        unsubscribed = true;
      }
    };

    const laser = attachLaserPointer(mockDispatcher, bodyEl, { document: mockDoc });
    laser.enable();

    assert.ok(bodyEl.querySelector('#laser-spotlight'));

    laser.destroy();

    assert.strictEqual(unsubscribed, true);
    assert.strictEqual(bodyEl.querySelector('#laser-spotlight'), null);
    assert.strictEqual(bodyEl.classList.contains('has-laser-active'), false);
  });
});

/**
 * @file telestrator.test.js
 * @description Unit tests for Outbound Ephemeral Fading Telestrator Adapter (src/adapters/render/telestrator.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachTelestrator,
  injectTelestratorStyles,
  TELESTRATOR_BASE_STYLES
} from '../../src/adapters/render/telestrator.js';
import { COMMAND_TOGGLE_TELESTRATOR, COMMAND_CLEAR_TELESTRATOR } from '../../src/core/navigator.js';
import { MODE_MAIN, MODE_DETOUR } from '../../src/core/state.js';
import { createMockElement } from '../fixtures/mock-dom.js';

describe('Ephemeral Fading Telestrator Adapter (src/adapters/render/telestrator.js)', () => {
  function createMockCanvasContext() {
    const operations = [];
    return {
      operations,
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      clearRect(x, y, w, h) {
        operations.push({ op: 'clearRect', x, y, w, h });
      },
      beginPath() {
        operations.push({ op: 'beginPath' });
      },
      moveTo(x, y) {
        operations.push({ op: 'moveTo', x, y });
      },
      lineTo(x, y) {
        operations.push({ op: 'lineTo', x, y });
      },
      quadraticCurveTo(cpx, cpy, x, y) {
        operations.push({ op: 'quadraticCurveTo', cpx, cpy, x, y });
      },
      stroke() {
        operations.push({ op: 'stroke', strokeStyle: this.strokeStyle, globalAlpha: this.globalAlpha });
      },
      save() {
        operations.push({ op: 'save' });
      },
      restore() {
        operations.push({ op: 'restore' });
      },
      scale(sx, sy) {
        operations.push({ op: 'scale', sx, sy });
      }
    };
  }

  function createMockEnvironment() {
    const listeners = new Map();
    const headEl = createMockElement('head');
    const bodyEl = createMockElement('body');
    const mockCtx = createMockCanvasContext();

    let canvasEl = null;

    const mockWindow = {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 2,
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(handler);
      },
      removeEventListener(type, handler) {
        if (listeners.has(type)) listeners.get(type).delete(handler);
      },
      requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
      cancelAnimationFrame: (id) => clearTimeout(id)
    };

    const mockDoc = {
      head: headEl,
      body: bodyEl,
      defaultView: mockWindow,
      getElementById: (id) => (id === 'telestrator-canvas' ? canvasEl : null),
      createElement: (tag) => {
        const el = createMockElement(tag);
        if (tag === 'canvas') {
          el.width = 1920;
          el.height = 1080;
          el.getContext = (type) => (type === '2d' ? mockCtx : null);
          canvasEl = el;
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

    return { mockDoc, mockWindow, mockCtx, headEl, bodyEl, listeners };
  }

  it('provides base stylesheet containing telestrator canvas styling', () => {
    assert.ok(typeof TELESTRATOR_BASE_STYLES === 'string');
    assert.ok(TELESTRATOR_BASE_STYLES.includes('paraslides-telestrator-canvas'));
    assert.ok(TELESTRATOR_BASE_STYLES.includes('--telestrator-color'));
  });

  it('injects style element into document head once', () => {
    const { mockDoc } = createMockEnvironment();
    let injected = null;
    mockDoc.getElementById = (id) => (id === 'paraslides-telestrator-styles' ? injected : null);

    const style = injectTelestratorStyles(mockDoc);
    assert.ok(style);
    assert.strictEqual(style.id, 'paraslides-telestrator-styles');
    injected = style;

    const second = injectTelestratorStyles(mockDoc);
    assert.strictEqual(second, style);
  });

  it('initializes inactive and mounts full-screen canvas element into container', () => {
    const { mockDoc, mockWindow, bodyEl } = createMockEnvironment();
    const mockDispatcher = {
      subscribe: () => () => {}
    };

    const telestrator = attachTelestrator(mockDispatcher, bodyEl, {
      document: mockDoc,
      window: mockWindow
    });

    assert.strictEqual(telestrator.isActive(), false);
    const canvas = bodyEl.querySelector('#telestrator-canvas');
    assert.ok(canvas);
    assert.strictEqual(canvas.classList.contains('is-active'), false);

    telestrator.destroy();
  });

  it('toggles drawing mode on COMMAND_TOGGLE_TELESTRATOR feedback event', () => {
    const { mockDoc, mockWindow, bodyEl } = createMockEnvironment();
    let subscriber = null;
    const mockDispatcher = {
      subscribe: (fn) => {
        subscriber = fn;
        return () => {};
      }
    };

    let toggledState = null;
    const telestrator = attachTelestrator(mockDispatcher, bodyEl, {
      document: mockDoc,
      window: mockWindow,
      onToggle: (active) => {
        toggledState = active;
      }
    });

    const canvas = bodyEl.querySelector('#telestrator-canvas');

    // Toggle on
    subscriber({ feedback: { toggleTelestrator: true }, mode: MODE_MAIN, z: 0 });
    assert.strictEqual(telestrator.isActive(), true);
    assert.strictEqual(canvas.classList.contains('is-active'), true);
    assert.strictEqual(toggledState, true);

    // Toggle off
    subscriber({ feedback: { toggleTelestrator: true }, mode: MODE_MAIN, z: 0 });
    assert.strictEqual(telestrator.isActive(), false);
    assert.strictEqual(canvas.classList.contains('is-active'), false);
    assert.strictEqual(toggledState, false);

    telestrator.destroy();
  });

  it('captures drawing strokes and executes quadratic bezier smoothing', (t, done) => {
    const { mockDoc, mockWindow, mockCtx, bodyEl } = createMockEnvironment();
    const mockDispatcher = {
      subscribe: () => () => {}
    };

    const telestrator = attachTelestrator(mockDispatcher, bodyEl, {
      document: mockDoc,
      window: mockWindow,
      fadeDurationMs: 500,
      strokeWidth: 4
    });

    const canvas = bodyEl.querySelector('#telestrator-canvas');
    telestrator.enable();

    // Simulate drawing gesture
    canvas.dispatchEvent({ type: 'pointerdown', clientX: 100, clientY: 100 });
    canvas.dispatchEvent({ type: 'pointermove', clientX: 150, clientY: 120 });
    canvas.dispatchEvent({ type: 'pointermove', clientX: 200, clientY: 180 });
    canvas.dispatchEvent({ type: 'pointerup', clientX: 200, clientY: 180 });

    setTimeout(() => {
      try {
        const hasBezier = mockCtx.operations.some((op) => op.op === 'quadraticCurveTo');
        const hasStroke = mockCtx.operations.some((op) => op.op === 'stroke');
        assert.ok(hasBezier, 'Should render with quadratic bezier curve');
        assert.ok(hasStroke, 'Should call stroke');
        telestrator.destroy();
        done();
      } catch (err) {
        telestrator.destroy();
        done(err);
      }
    }, 40);
  });

  it('clears drawings immediately on COMMAND_CLEAR_TELESTRATOR feedback event or clear() call', () => {
    const { mockDoc, mockWindow, mockCtx, bodyEl } = createMockEnvironment();
    let subscriber = null;
    const mockDispatcher = {
      subscribe: (fn) => {
        subscriber = fn;
        return () => {};
      }
    };

    const telestrator = attachTelestrator(mockDispatcher, bodyEl, {
      document: mockDoc,
      window: mockWindow
    });

    const canvas = bodyEl.querySelector('#telestrator-canvas');
    telestrator.enable();

    // Draw something
    canvas.dispatchEvent({ type: 'pointerdown', clientX: 50, clientY: 50 });
    canvas.dispatchEvent({ type: 'pointermove', clientX: 80, clientY: 80 });
    canvas.dispatchEvent({ type: 'pointerup' });

    assert.strictEqual(telestrator.getStrokeCount(), 1);

    // Clear via feedback
    subscriber({ feedback: { clearTelestrator: true } });
    assert.strictEqual(telestrator.getStrokeCount(), 0);

    const hasClear = mockCtx.operations.some((op) => op.op === 'clearRect');
    assert.ok(hasClear);

    telestrator.destroy();
  });

  it('switches accent attribute between MAIN and DETOUR mode', () => {
    const { mockDoc, mockWindow, bodyEl } = createMockEnvironment();
    let subscriber = null;
    const mockDispatcher = {
      subscribe: (fn) => {
        subscriber = fn;
        return () => {};
      }
    };

    const telestrator = attachTelestrator(mockDispatcher, bodyEl, {
      document: mockDoc,
      window: mockWindow
    });

    const canvas = bodyEl.querySelector('#telestrator-canvas');

    subscriber({ mode: MODE_DETOUR, z: 2 });
    assert.strictEqual(canvas.getAttribute('data-mode'), 'DETOUR');

    subscriber({ mode: MODE_MAIN, z: 0 });
    assert.strictEqual(canvas.getAttribute('data-mode'), 'MAIN');

    telestrator.destroy();
  });

  it('cleans up elements, timers, and event listeners on destroy', () => {
    const { mockDoc, mockWindow, bodyEl } = createMockEnvironment();
    let unsubscribed = false;
    const mockDispatcher = {
      subscribe: () => () => {
        unsubscribed = true;
      }
    };

    const telestrator = attachTelestrator(mockDispatcher, bodyEl, {
      document: mockDoc,
      window: mockWindow
    });

    assert.ok(bodyEl.querySelector('#telestrator-canvas'));

    telestrator.destroy();

    assert.strictEqual(unsubscribed, true);
    assert.strictEqual(bodyEl.querySelector('#telestrator-canvas'), null);
  });
});

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  attachPrintAdapter,
  injectPrintStyles,
  PRINT_BASE_STYLES,
  PRINT_MODE_MAIN_ONLY,
  PRINT_MODE_INTERLEAVED,
  PRINT_MODE_APPENDIX,
  PRINT_MODES
} from '../../src/adapters/render/print.js';
import { createMockElement } from '../fixtures/mock-dom.js';

/**
 * Creates a mock window object with print and event listener support.
 */
function createMockPrintWindow() {
  const listeners = new Map();
  let printCalled = false;

  return {
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
    dispatchEvent(eventName) {
      if (listeners.has(eventName)) {
        for (const handler of listeners.get(eventName)) {
          handler({ type: eventName });
        }
      }
    },
    print() {
      printCalled = true;
    },
    wasPrintCalled() {
      return printCalled;
    }
  };
}

describe('Print-to-PDF Adapter (src/adapters/render/print.js)', () => {
  describe('Constants & Stylesheet', () => {
    it('exports all expected print mode constants', () => {
      assert.equal(PRINT_MODE_MAIN_ONLY, 'main-only');
      assert.equal(PRINT_MODE_INTERLEAVED, 'interleaved');
      assert.equal(PRINT_MODE_APPENDIX, 'appendix');
      assert.deepEqual(PRINT_MODES, ['main-only', 'interleaved', 'appendix']);
      assert.ok(Object.isFrozen(PRINT_MODES));
    });

    it('exports PRINT_BASE_STYLES with essential print flattening rules', () => {
      assert.ok(PRINT_BASE_STYLES.includes('@media print'));
      assert.ok(PRINT_BASE_STYLES.includes('page-break-after: always'));
      assert.ok(PRINT_BASE_STYLES.includes('break-after: page'));
      assert.ok(PRINT_BASE_STYLES.includes('#deck[data-print-mode="main-only"]'));
      assert.ok(PRINT_BASE_STYLES.includes('#hud'));
    });

    it('injectPrintStyles appends stylesheet to document head', () => {
      const appended = [];
      const mockDoc = {
        createElement: (tag) => ({ tagName: tag, id: '', textContent: '' }),
        head: { appendChild: (el) => appended.push(el) }
      };
      const styleEl = injectPrintStyles(mockDoc);
      assert.ok(styleEl);
      assert.equal(appended.length, 1);
    });
  });

  describe('Initialization & Print Mode Configuration', () => {
    it('initializes with default interleaved mode and applies data-print-mode attribute', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      const adapter = attachPrintAdapter(root, mockWin);

      assert.equal(adapter.getPrintMode(), 'interleaved');
      assert.equal(root.getAttribute('data-print-mode'), 'interleaved');

      adapter.destroy();
    });

    it('accepts custom initial mode in options', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      const adapter = attachPrintAdapter(root, mockWin, { mode: PRINT_MODE_MAIN_ONLY });

      assert.equal(adapter.getPrintMode(), 'main-only');
      assert.equal(root.getAttribute('data-print-mode'), 'main-only');

      adapter.destroy();
    });

    it('switches print modes via setPrintMode', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      const adapter = attachPrintAdapter(root, mockWin);

      adapter.setPrintMode('main-only');
      assert.equal(adapter.getPrintMode(), 'main-only');
      assert.equal(root.getAttribute('data-print-mode'), 'main-only');

      adapter.setPrintMode('appendix');
      assert.equal(adapter.getPrintMode(), 'appendix');
      assert.equal(root.getAttribute('data-print-mode'), 'appendix');

      adapter.destroy();
    });

    it('throws TypeError when setting invalid print mode', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      const adapter = attachPrintAdapter(root, mockWin);

      assert.throws(() => adapter.setPrintMode('invalid-mode'), TypeError);

      adapter.destroy();
    });
  });

  describe('Print Events & Actions', () => {
    it('handles beforeprint and afterprint events', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      let beforeFired = false;
      let afterFired = false;

      const adapter = attachPrintAdapter(root, mockWin, {
        onBeforePrint: () => {
          beforeFired = true;
        },
        onAfterPrint: () => {
          afterFired = true;
        }
      });

      mockWin.dispatchEvent('beforeprint');
      assert.equal(root.getAttribute('data-is-printing'), 'true');
      assert.equal(beforeFired, true);

      mockWin.dispatchEvent('afterprint');
      assert.equal(root.getAttribute('data-is-printing'), null);
      assert.equal(afterFired, true);

      adapter.destroy();
    });

    it('triggers window.print() via print() method', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      const adapter = attachPrintAdapter(root, mockWin);

      assert.equal(mockWin.wasPrintCalled(), false);
      adapter.print();
      assert.equal(mockWin.wasPrintCalled(), true);

      adapter.destroy();
    });

    it('cleans up listeners and attributes upon destroy()', () => {
      const root = createMockElement('div', { id: 'deck' });
      const mockWin = createMockPrintWindow();
      const adapter = attachPrintAdapter(root, mockWin);

      assert.equal(root.getAttribute('data-print-mode'), 'interleaved');

      adapter.destroy();
      assert.equal(root.getAttribute('data-print-mode'), null);
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws TypeError if root element is invalid', () => {
      assert.throws(() => attachPrintAdapter(null), TypeError);
    });
  });
});

/**
 * @file config-loader.test.js
 * @description Unit tests for Inbound Declarative Config Loader Adapter (src/adapters/parsers/config-loader.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadConfigFromDOM } from '../../src/adapters/parsers/config-loader.js';
import { createMockElement } from '../fixtures/mock-dom.js';

describe('Inbound Declarative Config Loader (src/adapters/parsers/config-loader.js)', () => {
  it('returns default config when no config script or attribute is present', () => {
    const deck = createMockElement('main', { id: 'deck' });
    const mockDoc = {
      getElementById: (id) => (id === 'deck' ? deck : null),
      querySelector: () => null
    };

    const config = loadConfigFromDOM(deck, { document: mockDoc });

    assert.strictEqual(config.cursorAutoHide.delayMs, 2500);
    assert.strictEqual(config.laserPointer.size, 16);
    assert.strictEqual(config.telestrator.fadeDurationMs, 3000);
  });

  it('parses declarative JSON from <script id="paraslides-config">', () => {
    const scriptEl = createMockElement('script', {
      id: 'paraslides-config',
      type: 'application/json'
    });
    scriptEl.textContent = JSON.stringify({
      cursorAutoHide: { delayMs: 4000 },
      laserPointer: { color: '#ff0055', size: 24 },
      telestrator: { strokeWidth: 5 }
    });

    const deck = createMockElement('main', { id: 'deck' });
    const mockDoc = {
      getElementById: (id) => {
        if (id === 'paraslides-config') return scriptEl;
        if (id === 'deck') return deck;
        return null;
      },
      querySelector: (sel) => (sel === '#paraslides-config' ? scriptEl : null)
    };

    const config = loadConfigFromDOM(deck, { document: mockDoc });

    assert.strictEqual(config.cursorAutoHide.delayMs, 4000);
    assert.strictEqual(config.laserPointer.color, '#ff0055');
    assert.strictEqual(config.laserPointer.size, 24);
    assert.strictEqual(config.telestrator.strokeWidth, 5);
    // Preserved default
    assert.strictEqual(config.telestrator.fadeDurationMs, 3000);
  });

  it('parses config from data-paraslides-config attribute on target element', () => {
    const deck = createMockElement('main', {
      id: 'deck',
      attributes: {
        'data-paraslides-config': JSON.stringify({
          laserPointer: { enabled: false },
          telestrator: { fadeDurationMs: 6000 }
        })
      }
    });
    const mockDoc = {
      getElementById: () => null,
      querySelector: () => null
    };

    const config = loadConfigFromDOM(deck, { document: mockDoc });

    assert.strictEqual(config.laserPointer.enabled, false);
    assert.strictEqual(config.telestrator.fadeDurationMs, 6000);
    assert.strictEqual(config.cursorAutoHide.delayMs, 2500);
  });

  it('falls back safely to defaults when script JSON is malformed without crashing', () => {
    const scriptEl = createMockElement('script', {
      id: 'paraslides-config',
      type: 'application/json'
    });
    scriptEl.textContent = 'MALFORMED { json: not valid';

    const deck = createMockElement('main', { id: 'deck' });
    const mockDoc = {
      getElementById: (id) => (id === 'paraslides-config' ? scriptEl : null),
      querySelector: () => null
    };

    const config = loadConfigFromDOM(deck, { document: mockDoc });

    assert.strictEqual(config.cursorAutoHide.delayMs, 2500);
    assert.strictEqual(config.laserPointer.size, 16);
  });

  it('allows programmatic overrides to take highest precedence', () => {
    const scriptEl = createMockElement('script', {
      id: 'paraslides-config',
      type: 'application/json'
    });
    scriptEl.textContent = JSON.stringify({
      cursorAutoHide: { delayMs: 4000 }
    });

    const deck = createMockElement('main', { id: 'deck' });
    const mockDoc = {
      getElementById: (id) => (id === 'paraslides-config' ? scriptEl : null),
      querySelector: () => null
    };

    const config = loadConfigFromDOM(deck, {
      document: mockDoc,
      overrides: {
        cursorAutoHide: { delayMs: 1200 }
      }
    });

    assert.strictEqual(config.cursorAutoHide.delayMs, 1200);
  });
});

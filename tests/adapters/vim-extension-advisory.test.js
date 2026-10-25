/**
 * @file vim-extension-advisory.test.js
 * @description Unit tests for Vim Browser Extension Detector & Advisory Adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectVimExtension,
  attachVimExtensionAdvisory,
  injectAdvisoryStyles,
  ADVISORY_BASE_STYLES
} from '../../src/adapters/input/vim-extension-advisory.js';
import { createMockElement } from '../fixtures/mock-dom.js';

describe('Vim Extension Advisory Adapter (src/adapters/input/vim-extension-advisory.js)', () => {
  it('detects clean browser environment when no extension signatures are present', () => {
    const mockDoc = createMockElement('div');
    const mockWin = {};

    const status = detectVimExtension(mockDoc, mockWin);
    assert.strictEqual(status.detected, false);
    assert.strictEqual(status.name, null);
  });

  it('detects Vimium when vimium window property or DOM marker is present', () => {
    const mockDoc = createMockElement('div');
    const mockWin = { vimium: {} };

    const status = detectVimExtension(mockDoc, mockWin);
    assert.strictEqual(status.detected, true);
    assert.strictEqual(status.name, 'Vimium / Vimium C');
  });

  it('detects Surfingkeys when surfingkeys window property is present', () => {
    const mockDoc = createMockElement('div');
    const mockWin = { surfingkeys: {} };

    const status = detectVimExtension(mockDoc, mockWin);
    assert.strictEqual(status.detected, true);
    assert.strictEqual(status.name, 'Surfingkeys');
  });

  it('attaches advisory banner when extension is detected and supports dismissal', () => {
    const bodyEl = createMockElement('body');
    const mockDoc = {
      body: bodyEl,
      createElement: (tag) => createMockElement(tag),
      getElementById: () => null
    };
    const mockWin = {
      vimium: true,
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    const advisory = attachVimExtensionAdvisory(bodyEl, {
      document: mockDoc,
      window: mockWin,
      autoDismissMs: 0
    });

    const banner = bodyEl.querySelector('.paraslides-extension-advisory');
    assert.ok(banner);
    assert.strictEqual(banner.getAttribute('role'), 'alert');

    // Dismiss banner
    advisory.dismiss();
    assert.strictEqual(bodyEl.querySelector('.paraslides-extension-advisory'), null);

    advisory.destroy();
  });

  it('exports valid CSS styles using modular variables', () => {
    assert.ok(ADVISORY_BASE_STYLES);
    assert.ok(ADVISORY_BASE_STYLES.includes('.paraslides-extension-advisory'));
    assert.ok(ADVISORY_BASE_STYLES.includes('var(--hud-bg'));
    assert.ok(ADVISORY_BASE_STYLES.includes('var(--hud-fg'));
    assert.ok(ADVISORY_BASE_STYLES.includes('var(--hud-border'));
  });
});

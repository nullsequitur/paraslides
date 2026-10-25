/**
 * @file config.test.js
 * @description Unit tests for pure Core Configuration Schema & Merger (src/core/config.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CONFIG,
  createDefaultConfig,
  validateConfig,
  mergeConfig
} from '../../src/core/config.js';

describe('Pure Core Presentation Configuration (src/core/config.js)', () => {
  describe('DEFAULT_CONFIG & createDefaultConfig', () => {
    it('provides immutable or deep cloned default configuration schema', () => {
      const defaults = createDefaultConfig();

      assert.strictEqual(typeof defaults, 'object');
      assert.strictEqual(defaults.cursorAutoHide.enabled, true);
      assert.strictEqual(defaults.cursorAutoHide.delayMs, 2500);
      assert.strictEqual(defaults.cursorAutoHide.fullscreenOnly, true);

      assert.strictEqual(defaults.laserPointer.enabled, true);
      assert.strictEqual(defaults.laserPointer.size, 16);
      assert.strictEqual(defaults.laserPointer.glowSpread, 14);
      assert.strictEqual(defaults.laserPointer.color, null);

      assert.strictEqual(defaults.telestrator.enabled, true);
      assert.strictEqual(defaults.telestrator.fadeDurationMs, 3000);
      assert.strictEqual(defaults.telestrator.strokeWidth, 3);
      assert.strictEqual(defaults.telestrator.color, null);

      assert.strictEqual(defaults.navigation.continuousWrap, true);
      assert.strictEqual(defaults.navigation.countTimeoutMs, 1500);
    });

    it('returns a fresh object clone so mutations do not poison defaults', () => {
      const config1 = createDefaultConfig();
      config1.cursorAutoHide.delayMs = 9999;

      const config2 = createDefaultConfig();
      assert.strictEqual(config2.cursorAutoHide.delayMs, 2500);
    });
  });

  describe('validateConfig', () => {
    it('validates a valid configuration object', () => {
      const config = createDefaultConfig();
      const result = validateConfig(config);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('rejects non-object or null input', () => {
      assert.strictEqual(validateConfig(null).isValid, false);
      assert.strictEqual(validateConfig(undefined).isValid, false);
      assert.strictEqual(validateConfig('string').isValid, false);
      assert.strictEqual(validateConfig(123).isValid, false);
    });

    it('flags invalid numeric bounds', () => {
      const config = createDefaultConfig();
      config.cursorAutoHide.delayMs = -100;
      config.laserPointer.size = -5;
      config.telestrator.fadeDurationMs = -500;
      config.telestrator.strokeWidth = 0;

      const result = validateConfig(config);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.length >= 4);
    });
  });

  describe('mergeConfig', () => {
    it('returns default config when user overrides are null or undefined', () => {
      const merged = mergeConfig(createDefaultConfig(), null);
      assert.strictEqual(merged.cursorAutoHide.delayMs, 2500);
      assert.strictEqual(merged.laserPointer.size, 16);
    });

    it('cleanly overrides specified properties while preserving defaults for omitted ones', () => {
      const userConfig = {
        cursorAutoHide: {
          delayMs: 4000,
          fullscreenOnly: true
        },
        laserPointer: {
          color: '#00ffcc'
        },
        telestrator: {
          fadeDurationMs: 5000,
          strokeWidth: 6
        }
      };

      const merged = mergeConfig(createDefaultConfig(), userConfig);

      // Overridden
      assert.strictEqual(merged.cursorAutoHide.delayMs, 4000);
      assert.strictEqual(merged.cursorAutoHide.fullscreenOnly, true);
      assert.strictEqual(merged.laserPointer.color, '#00ffcc');
      assert.strictEqual(merged.telestrator.fadeDurationMs, 5000);
      assert.strictEqual(merged.telestrator.strokeWidth, 6);

      // Preserved defaults
      assert.strictEqual(merged.cursorAutoHide.enabled, true);
      assert.strictEqual(merged.laserPointer.enabled, true);
      assert.strictEqual(merged.laserPointer.size, 16);
      assert.strictEqual(merged.laserPointer.glowSpread, 14);
      assert.strictEqual(merged.telestrator.enabled, true);
      assert.strictEqual(merged.telestrator.color, null);
      assert.strictEqual(merged.navigation.continuousWrap, true);
    });

    it('clamps negative values to minimum valid thresholds', () => {
      const userConfig = {
        cursorAutoHide: { delayMs: -500 },
        laserPointer: { size: -20, glowSpread: -10 },
        telestrator: { fadeDurationMs: -1000, strokeWidth: -3 }
      };

      const merged = mergeConfig(createDefaultConfig(), userConfig);

      assert.strictEqual(merged.cursorAutoHide.delayMs, 0);
      assert.strictEqual(merged.laserPointer.size, 1);
      assert.strictEqual(merged.laserPointer.glowSpread, 0);
      assert.strictEqual(merged.telestrator.fadeDurationMs, 0);
      assert.strictEqual(merged.telestrator.strokeWidth, 1);
    });
  });
});

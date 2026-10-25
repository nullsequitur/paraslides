/**
 * @file config.js
 * @description Pure Core Configuration Schema, Defaults and Merger.
 *
 * Provides pure domain configuration schema and utilities for paraslides presentation settings.
 * Pure JavaScript ES module with zero dependencies on window, document, DOM, or CSS.
 */

/**
 * Default presentation configuration schema.
 *
 * @constant {Readonly<object>}
 */
export const DEFAULT_CONFIG = Object.freeze({
  cursorAutoHide: Object.freeze({
    enabled: true,
    delayMs: 2500,
    fullscreenOnly: true
  }),
  laserPointer: Object.freeze({
    enabled: true,
    size: 16,
    glowSpread: 14,
    color: null
  }),
  telestrator: Object.freeze({
    enabled: true,
    fadeDurationMs: 3000,
    strokeWidth: 3,
    color: null
  }),
  navigation: Object.freeze({
    continuousWrap: true,
    countTimeoutMs: 1500
  })
});

/**
 * Creates a fresh, deep copy of the default configuration schema.
 *
 * @returns {object} Mutable clone of default configuration.
 */
export function createDefaultConfig() {
  return {
    cursorAutoHide: { ...DEFAULT_CONFIG.cursorAutoHide },
    laserPointer: { ...DEFAULT_CONFIG.laserPointer },
    telestrator: { ...DEFAULT_CONFIG.telestrator },
    navigation: { ...DEFAULT_CONFIG.navigation }
  };
}

/**
 * Validates a configuration object against schema and value boundary constraints.
 *
 * @param {*} config - Candidate configuration object.
 * @returns {{ isValid: boolean, errors: string[] }} Validation result.
 */
export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {
      isValid: false,
      errors: ['Configuration must be a non-null object.']
    };
  }

  if (config.cursorAutoHide && typeof config.cursorAutoHide === 'object') {
    if (typeof config.cursorAutoHide.delayMs === 'number' && config.cursorAutoHide.delayMs < 0) {
      errors.push('cursorAutoHide.delayMs must be non-negative.');
    }
  }

  if (config.laserPointer && typeof config.laserPointer === 'object') {
    if (typeof config.laserPointer.size === 'number' && config.laserPointer.size <= 0) {
      errors.push('laserPointer.size must be greater than 0.');
    }
    if (typeof config.laserPointer.glowSpread === 'number' && config.laserPointer.glowSpread < 0) {
      errors.push('laserPointer.glowSpread must be non-negative.');
    }
  }

  if (config.telestrator && typeof config.telestrator === 'object') {
    if (typeof config.telestrator.fadeDurationMs === 'number' && config.telestrator.fadeDurationMs < 0) {
      errors.push('telestrator.fadeDurationMs must be non-negative.');
    }
    if (typeof config.telestrator.strokeWidth === 'number' && config.telestrator.strokeWidth <= 0) {
      errors.push('telestrator.strokeWidth must be greater than 0.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Deep-merges user configuration overrides into a base configuration object.
 * Clamps numeric values to their minimum valid thresholds.
 *
 * @param {object} base - Base configuration (typically from createDefaultConfig()).
 * @param {object|null|undefined} overrides - User configuration overrides.
 * @returns {object} Merged configuration object.
 */
export function mergeConfig(base = createDefaultConfig(), overrides = null) {
  const result = {
    cursorAutoHide: { ...base.cursorAutoHide },
    laserPointer: { ...base.laserPointer },
    telestrator: { ...base.telestrator },
    navigation: { ...base.navigation }
  };

  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return result;
  }

  if (overrides.cursorAutoHide && typeof overrides.cursorAutoHide === 'object') {
    if (typeof overrides.cursorAutoHide.enabled === 'boolean') {
      result.cursorAutoHide.enabled = overrides.cursorAutoHide.enabled;
    }
    if (typeof overrides.cursorAutoHide.delayMs === 'number') {
      result.cursorAutoHide.delayMs = Math.max(0, overrides.cursorAutoHide.delayMs);
    }
    if (typeof overrides.cursorAutoHide.fullscreenOnly === 'boolean') {
      result.cursorAutoHide.fullscreenOnly = overrides.cursorAutoHide.fullscreenOnly;
    }
  }

  if (overrides.laserPointer && typeof overrides.laserPointer === 'object') {
    if (typeof overrides.laserPointer.enabled === 'boolean') {
      result.laserPointer.enabled = overrides.laserPointer.enabled;
    }
    if (typeof overrides.laserPointer.size === 'number') {
      result.laserPointer.size = Math.max(1, overrides.laserPointer.size);
    }
    if (typeof overrides.laserPointer.glowSpread === 'number') {
      result.laserPointer.glowSpread = Math.max(0, overrides.laserPointer.glowSpread);
    }
    if (typeof overrides.laserPointer.color === 'string' || overrides.laserPointer.color === null) {
      result.laserPointer.color = overrides.laserPointer.color;
    }
  }

  if (overrides.telestrator && typeof overrides.telestrator === 'object') {
    if (typeof overrides.telestrator.enabled === 'boolean') {
      result.telestrator.enabled = overrides.telestrator.enabled;
    }
    if (typeof overrides.telestrator.fadeDurationMs === 'number') {
      result.telestrator.fadeDurationMs = Math.max(0, overrides.telestrator.fadeDurationMs);
    }
    if (typeof overrides.telestrator.strokeWidth === 'number') {
      result.telestrator.strokeWidth = Math.max(1, overrides.telestrator.strokeWidth);
    }
    if (typeof overrides.telestrator.color === 'string' || overrides.telestrator.color === null) {
      result.telestrator.color = overrides.telestrator.color;
    }
  }

  if (overrides.navigation && typeof overrides.navigation === 'object') {
    if (typeof overrides.navigation.continuousWrap === 'boolean') {
      result.navigation.continuousWrap = overrides.navigation.continuousWrap;
    }
    if (typeof overrides.navigation.countTimeoutMs === 'number') {
      result.navigation.countTimeoutMs = Math.max(0, overrides.navigation.countTimeoutMs);
    }
  }

  return result;
}

export default {
  DEFAULT_CONFIG,
  createDefaultConfig,
  validateConfig,
  mergeConfig
};

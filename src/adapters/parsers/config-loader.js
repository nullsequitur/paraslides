/**
 * @file config-loader.js
 * @description Inbound Declarative Configuration Loader Adapter.
 *
 * Reads and parses presentation configuration from declarative HTML script elements
 * (<script type="application/json" id="paraslides-config">) or element data attributes
 * (data-paraslides-config / data-config) and merges them with default Core configuration.
 * Pure ES module with zero external runtime dependencies.
 */

import { createDefaultConfig, mergeConfig } from '../../core/config.js';

/**
 * Loads and merges presentation configuration from the DOM and optional programmatic overrides.
 *
 * Precedence order (highest to lowest):
 * 1. options.overrides (explicit programmatic overrides)
 * 2. <script type="application/json" id="paraslides-config"> element content
 * 3. data-paraslides-config or data-config attribute on targetElement
 * 4. Core default configuration (createDefaultConfig())
 *
 * @param {Element|object} [targetElement] - Deck or presentation container element.
 * @param {object} [options={}] - Options.
 * @param {Document|object} [options.document] - Target document override.
 * @param {object} [options.overrides] - Programmatic configuration overrides.
 * @returns {object} Normalized, validated presentation configuration.
 */
export function loadConfigFromDOM(targetElement = null, options = {}) {
  const doc = options.document
    || (targetElement && targetElement.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);

  let merged = createDefaultConfig();

  // 1. Check data attributes on targetElement
  if (targetElement) {
    const rawAttr = (typeof targetElement.getAttribute === 'function')
      ? (targetElement.getAttribute('data-paraslides-config') || targetElement.getAttribute('data-config'))
      : (targetElement.dataset?.paraslidesConfig || targetElement.dataset?.config);

    if (rawAttr && typeof rawAttr === 'string') {
      try {
        const parsedAttr = JSON.parse(rawAttr);
        merged = mergeConfig(merged, parsedAttr);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[paraslides] Failed to parse declarative config from data attribute:', err);
        }
      }
    }
  }

  // 2. Check <script type="application/json" id="paraslides-config">
  if (doc) {
    const scriptEl = (typeof doc.getElementById === 'function' && doc.getElementById('paraslides-config'))
      || (typeof doc.querySelector === 'function' && doc.querySelector('script#paraslides-config, script[data-paraslides-config]'));

    if (scriptEl && scriptEl.textContent) {
      try {
        const parsedScript = JSON.parse(scriptEl.textContent.trim());
        merged = mergeConfig(merged, parsedScript);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[paraslides] Failed to parse declarative config from <script> element:', err);
        }
      }
    }
  }

  // 3. Apply programmatic overrides (highest priority)
  if (options.overrides && typeof options.overrides === 'object') {
    merged = mergeConfig(merged, options.overrides);
  }

  return merged;
}

export default loadConfigFromDOM;

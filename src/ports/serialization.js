/**
 * @file serialization.js
 * @description Outbound Serialization Port driven by the Core Domain.
 *
 * Defines the contract, validation, and registry for exporting the internal
 * Deck Topology into external document formats (LaTeX Beamer, Markdown, JSON, HTML).
 * Pure JavaScript ES module with zero dependencies on window, document, DOM, or CSS.
 */

import { getYMax, getXMax, getZMax } from '../core/model.js';

/**
 * Validates that an input object is a valid, conformant Deck Topology.
 *
 * @param {*} topology - Candidate topology object.
 * @returns {boolean} True if valid topology.
 */
export function isValidTopology(topology) {
  if (topology === null || typeof topology !== 'object' || Array.isArray(topology)) {
    return false;
  }
  if (!Array.isArray(topology.sections) || topology.sections.length === 0) {
    return false;
  }
  for (let y = 0; y < topology.sections.length; y++) {
    const sec = topology.sections[y];
    if (!sec || typeof sec !== 'object' || !Array.isArray(sec.pages) || sec.pages.length === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Asserts that an input object is a valid Deck Topology.
 * Throws TypeError or RangeError on violation.
 *
 * @param {*} topology
 * @throws {TypeError|RangeError}
 */
export function assertValidTopology(topology) {
  if (topology === null || typeof topology !== 'object' || Array.isArray(topology)) {
    throw new TypeError('Topology must be a non-null object.');
  }
  if (!Array.isArray(topology.sections)) {
    throw new TypeError('Topology must contain a sections array.');
  }
  if (topology.sections.length === 0) {
    throw new RangeError('Topology must contain at least one section.');
  }
  for (let y = 0; y < topology.sections.length; y++) {
    const sec = topology.sections[y];
    if (!sec || typeof sec !== 'object') {
      throw new TypeError(`Section at index ${y} must be a non-null object.`);
    }
    if (!Array.isArray(sec.pages) || sec.pages.length === 0) {
      throw new RangeError(`Section at index ${y} must contain at least one page.`);
    }
  }
}

/**
 * Validates a serializer object or function.
 *
 * A serializer may be:
 * 1. An object: `{ format: string, serialize: (topology, options) => string }`
 * 2. A standalone function `(topology, options) => string` (when format is supplied separately)
 *
 * @param {*} serializer - Candidate serializer.
 * @returns {boolean} True if conformant.
 */
export function isValidSerializer(serializer) {
  if (typeof serializer === 'function') {
    return true;
  }
  if (serializer === null || typeof serializer !== 'object') {
    return false;
  }
  if (typeof serializer.format !== 'string' || serializer.format.trim().length === 0) {
    return false;
  }
  if (typeof serializer.serialize !== 'function') {
    return false;
  }
  return true;
}

/**
 * Creates an outbound serializer registry.
 *
 * @returns {{
 *   register: (formatOrObj: string|object, serializeFn?: Function) => void,
 *   unregister: (format: string) => boolean,
 *   has: (format: string) => boolean,
 *   get: (format: string) => Function|null,
 *   getFormats: () => string[],
 *   serialize: (topology: object, format: string, options?: object) => string,
 *   clear: () => void
 * }}
 */
export function createSerializerRegistry() {
  const serializers = new Map();

  /**
   * Registers a serializer for a specific format.
   *
   * @param {string|object} formatOrObj - Format name (e.g., 'latex', 'markdown') or serializer object.
   * @param {Function} [serializeFn] - Serialize function if format string provided.
   */
  function register(formatOrObj, serializeFn) {
    let format;
    let fn;

    if (typeof formatOrObj === 'object' && formatOrObj !== null) {
      if (!isValidSerializer(formatOrObj)) {
        throw new TypeError('Serializer object must provide non-empty string "format" and function "serialize".');
      }
      format = formatOrObj.format.toLowerCase().trim();
      fn = formatOrObj.serialize;
    } else if (typeof formatOrObj === 'string') {
      if (formatOrObj.trim().length === 0) {
        throw new TypeError('Format name must be a non-empty string.');
      }
      if (typeof serializeFn !== 'function') {
        throw new TypeError(`Serializer for format "${formatOrObj}" must be a function.`);
      }
      format = formatOrObj.toLowerCase().trim();
      fn = serializeFn;
    } else {
      throw new TypeError('Invalid arguments to register serializer.');
    }

    serializers.set(format, fn);
  }

  /**
   * Unregisters a serializer format.
   *
   * @param {string} format - Format identifier.
   * @returns {boolean} True if unregistered, false if not found.
   */
  function unregister(format) {
    if (typeof format !== 'string') return false;
    return serializers.delete(format.toLowerCase().trim());
  }

  /**
   * Checks if a format serializer is registered.
   *
   * @param {string} format
   * @returns {boolean}
   */
  function has(format) {
    if (typeof format !== 'string') return false;
    return serializers.has(format.toLowerCase().trim());
  }

  /**
   * Retrieves the serialize function for a format.
   *
   * @param {string} format
   * @returns {Function|null}
   */
  function get(format) {
    if (typeof format !== 'string') return null;
    return serializers.get(format.toLowerCase().trim()) || null;
  }

  /**
   * Returns list of registered format names.
   *
   * @returns {string[]}
   */
  function getFormats() {
    return Array.from(serializers.keys());
  }

  /**
   * Serializes a deck topology into the requested format.
   *
   * @param {object} topology - Valid deck topology.
   * @param {string} format - Registered format name.
   * @param {object} [options={}] - Format-specific options.
   * @returns {string} Serialized document text.
   * @throws {TypeError} If topology is invalid or format is unregistered.
   */
  function serialize(topology, format, options = {}) {
    assertValidTopology(topology);

    if (typeof format !== 'string' || format.trim().length === 0) {
      throw new TypeError('Format must be a non-empty string.');
    }

    const normalizedFormat = format.toLowerCase().trim();
    const serializerFn = serializers.get(normalizedFormat);

    if (!serializerFn) {
      throw new TypeError(`No serializer registered for format: "${format}". Available formats: [${getFormats().join(', ')}]`);
    }

    return serializerFn(topology, options);
  }

  /**
   * Clears all registered serializers.
   */
  function clear() {
    serializers.clear();
  }

  return Object.freeze({
    register,
    unregister,
    has,
    get,
    getFormats,
    serialize,
    clear
  });
}

// Built-in JSON Serializer
export function serializeToJSON(topology, options = {}) {
  assertValidTopology(topology);
  const indent = options.indent ?? 2;
  return JSON.stringify(topology, null, indent);
}

// Global default registry
const defaultRegistry = createSerializerRegistry();
defaultRegistry.register('json', serializeToJSON);

/**
 * Returns the default global serializer registry.
 *
 * @returns {ReturnType<createSerializerRegistry>}
 */
export function getDefaultSerializerRegistry() {
  return defaultRegistry;
}

/**
 * Serializes a deck topology using the default global registry.
 *
 * @param {object} topology - Valid deck topology.
 * @param {string} format - Target format ('json', 'latex', 'markdown', etc.).
 * @param {object} [options={}] - Options forwarded to serializer.
 * @returns {string} Serialized document string.
 */
export function serializeDeck(topology, format, options = {}) {
  return defaultRegistry.serialize(topology, format, options);
}

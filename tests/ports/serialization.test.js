/**
 * @file serialization.test.js
 * @description Unit tests for Outbound Serialization Port (src/ports/serialization.js).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidTopology,
  assertValidTopology,
  isValidSerializer,
  createSerializerRegistry,
  getDefaultSerializerRegistry,
  serializeDeck,
  serializeToJSON
} from '../../src/ports/serialization.js';

import { createMockDeck } from '../fixtures/deck-fixture.js';
import { createDeckTopology } from '../../src/core/model.js';

describe('Serialization Port (src/ports/serialization.js)', () => {
  let topology;

  beforeEach(() => {
    topology = createDeckTopology(createMockDeck().sections);
  });

  describe('Topology Validation', () => {
    it('validates a conformant deck topology', () => {
      assert.strictEqual(isValidTopology(topology), true);
      assert.doesNotThrow(() => assertValidTopology(topology));
    });

    it('rejects invalid or malformed topologies', () => {
      assert.strictEqual(isValidTopology(null), false);
      assert.strictEqual(isValidTopology({}), false);
      assert.strictEqual(isValidTopology({ sections: [] }), false);
      assert.strictEqual(isValidTopology({ sections: [{ pages: [] }] }), false);

      assert.throws(() => assertValidTopology(null), TypeError);
      assert.throws(() => assertValidTopology({}), TypeError);
      assert.throws(() => assertValidTopology({ sections: [] }), RangeError);
      assert.throws(() => assertValidTopology({ sections: [{ pages: [] }] }), RangeError);
    });
  });

  describe('Serializer Validation', () => {
    it('accepts valid serializer objects and functions', () => {
      assert.strictEqual(isValidSerializer((top) => 'out'), true);
      assert.strictEqual(isValidSerializer({ format: 'test', serialize: (top) => 'out' }), true);
    });

    it('rejects invalid serializers', () => {
      assert.strictEqual(isValidSerializer(null), false);
      assert.strictEqual(isValidSerializer({}), false);
      assert.strictEqual(isValidSerializer({ format: '' }), false);
      assert.strictEqual(isValidSerializer({ format: 'test' }), false);
      assert.strictEqual(isValidSerializer({ serialize: () => {} }), false);
    });
  });

  describe('Serializer Registry', () => {
    it('registers and retrieves format serializers', () => {
      const registry = createSerializerRegistry();
      assert.strictEqual(registry.has('custom'), false);

      registry.register('custom', (top) => `custom-output:${top.sections.length}`);
      assert.strictEqual(registry.has('custom'), true);
      assert.strictEqual(registry.has('CUSTOM'), true); // case-insensitive

      const output = registry.serialize(topology, 'custom');
      assert.strictEqual(output, 'custom-output:3');
    });

    it('registers serializer objects directly', () => {
      const registry = createSerializerRegistry();
      registry.register({
        format: 'xml',
        serialize: (top) => `<deck sections="${top.sections.length}"/>`
      });

      assert.strictEqual(registry.has('xml'), true);
      const output = registry.serialize(topology, 'xml');
      assert.strictEqual(output, '<deck sections="3"/>');
    });

    it('supports unregister and clear', () => {
      const registry = createSerializerRegistry();
      registry.register('fmt1', () => '1');
      registry.register('fmt2', () => '2');

      assert.deepStrictEqual(registry.getFormats().sort(), ['fmt1', 'fmt2']);
      assert.strictEqual(registry.unregister('fmt1'), true);
      assert.strictEqual(registry.has('fmt1'), false);
      assert.strictEqual(registry.unregister('fmt1'), false);

      registry.clear();
      assert.strictEqual(registry.getFormats().length, 0);
    });

    it('throws error when serializing with unregistered format', () => {
      const registry = createSerializerRegistry();
      assert.throws(
        () => registry.serialize(topology, 'unknown'),
        (err) => err instanceof TypeError && err.message.includes('No serializer registered')
      );
    });
  });

  describe('Built-in JSON Serializer & Default Registry', () => {
    it('serializes topology to JSON string', () => {
      const jsonStr = serializeToJSON(topology);
      assert.strictEqual(typeof jsonStr, 'string');
      const parsed = JSON.parse(jsonStr);
      assert.strictEqual(parsed.sections.length, 3);
    });

    it('dispatches serialization via serializeDeck and default registry', () => {
      const defaultReg = getDefaultSerializerRegistry();
      assert.strictEqual(defaultReg.has('json'), true);

      const json = serializeDeck(topology, 'json');
      assert.ok(json.includes('sections'));
    });
  });
});

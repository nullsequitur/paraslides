/**
 * @file fullscreen.test.js
 * @description Unit tests for Outbound Fullscreen Adapter (src/adapters/render/fullscreen.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachFullscreenAdapter,
  isFullscreen,
  requestFullscreen,
  exitFullscreen,
  toggleFullscreen
} from '../../src/adapters/render/fullscreen.js';
import { COMMAND_TOGGLE_FULLSCREEN } from '../../src/core/navigator.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import { createDeckTopology } from '../../src/core/model.js';
import { createMockDeck } from '../fixtures/deck-fixture.js';

describe('Fullscreen Adapter (src/adapters/render/fullscreen.js)', () => {
  const topology = createDeckTopology(createMockDeck());

  function createMockFullscreenEnvironment() {
    let currentFullscreenElement = null;
    const listeners = new Map();

    const mockDoc = {
      get fullscreenElement() {
        return currentFullscreenElement;
      },
      exitFullscreen() {
        currentFullscreenElement = null;
        this.dispatchEvent({ type: 'fullscreenchange' });
        return Promise.resolve();
      },
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(handler);
      },
      removeEventListener(type, handler) {
        if (listeners.has(type)) listeners.get(type).delete(handler);
      },
      dispatchEvent(event) {
        const set = listeners.get(event.type);
        if (set) {
          for (const handler of Array.from(set)) {
            handler(event);
          }
        }
      }
    };

    const mockElement = {
      ownerDocument: mockDoc,
      requestFullscreen() {
        currentFullscreenElement = mockElement;
        mockDoc.dispatchEvent({ type: 'fullscreenchange' });
        return Promise.resolve();
      }
    };

    mockDoc.documentElement = mockElement;

    return { mockDoc, mockElement };
  }

  it('detects fullscreen state via isFullscreen', () => {
    const { mockDoc, mockElement } = createMockFullscreenEnvironment();

    assert.equal(isFullscreen(mockDoc), false);
    mockElement.requestFullscreen();
    assert.equal(isFullscreen(mockDoc), true);
    mockDoc.exitFullscreen();
    assert.equal(isFullscreen(mockDoc), false);
  });

  it('toggles fullscreen via toggleFullscreen', () => {
    const { mockDoc, mockElement } = createMockFullscreenEnvironment();

    toggleFullscreen(mockElement, mockDoc);
    assert.equal(isFullscreen(mockDoc), true);

    toggleFullscreen(mockElement, mockDoc);
    assert.equal(isFullscreen(mockDoc), false);
  });

  it('attaches adapter to dispatcher and responds to COMMAND_TOGGLE_FULLSCREEN', () => {
    const { mockDoc, mockElement } = createMockFullscreenEnvironment();
    const dispatcher = createCommandDispatcher(topology);

    let changedState = null;
    const adapter = attachFullscreenAdapter(dispatcher, mockElement, {
      document: mockDoc,
      onChange: (fs) => {
        changedState = fs;
      }
    });

    assert.equal(adapter.isFullscreen(), false);

    dispatcher.dispatch(COMMAND_TOGGLE_FULLSCREEN);
    assert.equal(adapter.isFullscreen(), true);
    assert.equal(changedState, true);

    dispatcher.dispatch(COMMAND_TOGGLE_FULLSCREEN);
    assert.equal(adapter.isFullscreen(), false);
    assert.equal(changedState, false);

    adapter.destroy();
  });

  it('throws TypeError if dispatcher is invalid', () => {
    assert.throws(() => attachFullscreenAdapter(null), TypeError);
    assert.throws(() => attachFullscreenAdapter({}), TypeError);
  });
});

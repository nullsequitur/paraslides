/**
 * @file presenter-orb.test.js
 * @description Unit tests for Outbound Presenter Status Orb Adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  attachPresenterOrb,
  injectPresenterOrbStyles,
  ORB_BASE_STYLES
} from '../../src/adapters/render/presenter-orb.js';
import { loadDeckFromDOM } from '../../src/adapters/parsers/dom-loader.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import {
  createMockElement,
  createStandardMockDeckDOM
} from '../fixtures/mock-dom.js';

describe('Presenter Status Orb Adapter (src/adapters/render/presenter-orb.js)', () => {
  it('initializes in normal status at origin', () => {
    const deck = createStandardMockDeckDOM();
    const { topology } = loadDeckFromDOM(deck);
    const dispatcher = createCommandDispatcher(topology);

    const bodyEl = createMockElement('body');
    const mockDoc = {
      body: bodyEl,
      getElementById: (id) => (id === 'presenter-orb' ? null : null),
      createElement: (tag) => createMockElement(tag),
      querySelector: () => null
    };

    const orb = attachPresenterOrb(dispatcher, bodyEl, { document: mockDoc });

    const orbEl = bodyEl.querySelector('#presenter-orb');
    assert.ok(orbEl);
    assert.strictEqual(orb.getStatus(), 'normal');
    assert.strictEqual(orbEl.getAttribute('data-status'), 'normal');

    orb.destroy();
  });

  it('changes status to detour-available when navigating to a slide with detours', () => {
    const deck = createStandardMockDeckDOM();
    const { topology } = loadDeckFromDOM(deck);
    const dispatcher = createCommandDispatcher(topology);

    const bodyEl = createMockElement('body');
    const mockDoc = {
      body: bodyEl,
      getElementById: () => null,
      createElement: (tag) => createMockElement(tag),
      querySelector: () => null
    };

    const orb = attachPresenterOrb(dispatcher, bodyEl, { document: mockDoc });

    // Navigate to (1, 1, 0) which has detours
    dispatcher.dispatch('MOVE_DOWN');
    dispatcher.dispatch('MOVE_RIGHT');

    assert.strictEqual(orb.getStatus(), 'detour-available');
    const orbEl = bodyEl.querySelector('#presenter-orb');
    assert.strictEqual(orbEl.getAttribute('data-status'), 'detour-available');

    // Enter detour
    dispatcher.dispatch('ENTER_DETOUR');
    assert.strictEqual(orb.getStatus(), 'in-detour');
    assert.strictEqual(orbEl.getAttribute('data-status'), 'in-detour');

    // Exit detour
    dispatcher.dispatch('EXIT_DETOUR');
    assert.strictEqual(orb.getStatus(), 'detour-available');

    orb.destroy();
  });

  it('changes status to section-end at the final slide of a section', () => {
    const deck = createStandardMockDeckDOM();
    const { topology } = loadDeckFromDOM(deck);
    const dispatcher = createCommandDispatcher(topology);

    const bodyEl = createMockElement('body');
    const mockDoc = {
      body: bodyEl,
      getElementById: () => null,
      createElement: (tag) => createMockElement(tag),
      querySelector: () => null
    };

    const orb = attachPresenterOrb(dispatcher, bodyEl, { document: mockDoc });

    // Move to (0, 1, 0) which is end of Section 0 (total 2 pages: 0, 1)
    dispatcher.dispatch('MOVE_RIGHT');

    assert.strictEqual(orb.getStatus(), 'section-end');
    const orbEl = bodyEl.querySelector('#presenter-orb');
    assert.strictEqual(orbEl.getAttribute('data-status'), 'section-end');

    orb.destroy();
  });

  it('toggles visibility on COMMAND_TOGGLE_ORB (B key)', () => {
    const deck = createStandardMockDeckDOM();
    const { topology } = loadDeckFromDOM(deck);
    const dispatcher = createCommandDispatcher(topology);

    const bodyEl = createMockElement('body');
    const mockDoc = {
      body: bodyEl,
      getElementById: () => null,
      createElement: (tag) => createMockElement(tag),
      querySelector: () => null
    };

    const orb = attachPresenterOrb(dispatcher, bodyEl, { document: mockDoc });
    const orbEl = bodyEl.querySelector('#presenter-orb');

    assert.strictEqual(orb.isVisible(), true);
    assert.strictEqual(orbEl.classList.contains('is-hidden'), false);

    // Dispatch TOGGLE_ORB
    dispatcher.dispatch('TOGGLE_ORB');
    assert.strictEqual(orb.isVisible(), false);
    assert.strictEqual(orbEl.classList.contains('is-hidden'), true);
    assert.strictEqual(orbEl.getAttribute('data-hidden'), 'true');

    // Dispatch TOGGLE_ORB again
    dispatcher.dispatch('TOGGLE_ORB');
    assert.strictEqual(orb.isVisible(), true);
    assert.strictEqual(orbEl.classList.contains('is-hidden'), false);

    orb.destroy();
  });

  it('changes status to detour-and-section-end when slide has detours and will wrap next section', () => {
    const deck = createStandardMockDeckDOM([
      {
        title: 'Section 0',
        pages: [
          {
            title: 'Final Slide With Detours',
            detours: [{ title: 'Deep Dive Detour' }]
          }
        ]
      },
      {
        title: 'Section 1',
        pages: [{ title: 'Next Section', detours: [] }]
      }
    ]);
    const { topology } = loadDeckFromDOM(deck);
    const dispatcher = createCommandDispatcher(topology);

    const bodyEl = createMockElement('body');
    const mockDoc = {
      body: bodyEl,
      getElementById: () => null,
      createElement: (tag) => createMockElement(tag),
      querySelector: () => null
    };

    const orb = attachPresenterOrb(dispatcher, bodyEl, { document: mockDoc });
    const orbEl = bodyEl.querySelector('#presenter-orb');

    assert.strictEqual(orb.getStatus(), 'detour-and-section-end');
    assert.strictEqual(orbEl.getAttribute('data-status'), 'detour-and-section-end');
    assert.ok(orbEl.getAttribute('title').includes('Detour available'));

    // Clicking when detour-and-section-end enters detour
    orbEl.click();
    assert.strictEqual(orb.getStatus(), 'in-detour');

    // Clicking inside detour exits detour
    orbEl.click();
    assert.strictEqual(orb.getStatus(), 'detour-and-section-end');

    orb.destroy();
  });

  it('adjusts position and adds has-orb-adjacent class on HUD to avoid overlapping', () => {
    const deck = createStandardMockDeckDOM();
    const { topology } = loadDeckFromDOM(deck);
    const dispatcher = createCommandDispatcher(topology);

    const bodyEl = createMockElement('body');
    const hudEl = createMockElement('aside', { id: 'hud' });
    bodyEl.appendChild(hudEl);

    const mockDoc = {
      body: bodyEl,
      getElementById: (id) => (id === 'hud' ? hudEl : null),
      createElement: (tag) => createMockElement(tag),
      querySelector: (sel) => (sel === '#hud' || sel === '.paraslides-hud' ? hudEl : null)
    };

    const orb = attachPresenterOrb(dispatcher, bodyEl, { document: mockDoc });

    // When orb is visible, HUD has has-orb-adjacent class
    assert.strictEqual(hudEl.classList.contains('has-orb-adjacent'), true);

    // When orb is hidden with B, HUD loses has-orb-adjacent class
    dispatcher.dispatch('TOGGLE_ORB');
    assert.strictEqual(hudEl.classList.contains('has-orb-adjacent'), false);

    // When orb is toggled back, HUD regains has-orb-adjacent class
    dispatcher.dispatch('TOGGLE_ORB');
    assert.strictEqual(hudEl.classList.contains('has-orb-adjacent'), true);

    orb.destroy();
    assert.strictEqual(hudEl.classList.contains('has-orb-adjacent'), false);
  });

  it('exports valid CSS styles using modular variables', () => {
    assert.ok(ORB_BASE_STYLES);
    assert.ok(ORB_BASE_STYLES.includes('.paraslides-presenter-orb'));
    assert.ok(ORB_BASE_STYLES.includes('--orb-size'));
    assert.ok(ORB_BASE_STYLES.includes('--orb-color-normal'));
    assert.ok(ORB_BASE_STYLES.includes('--orb-color-detour'));
    assert.ok(ORB_BASE_STYLES.includes('--orb-color-section-end'));
  });
});

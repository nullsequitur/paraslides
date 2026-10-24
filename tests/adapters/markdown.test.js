/**
 * @file markdown.test.js
 * @description Unit tests for Markdown Inbound & Outbound Adapter (src/adapters/parsers/markdown.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMarkdownToTopology,
  parseMarkdownToHTML,
  serializeTopologyToMarkdown,
  renderInlineMarkdown,
  renderSlideBodyHTML
} from '../../src/adapters/parsers/markdown.js';

import { getYMax, getXMax, getZMax } from '../../src/core/model.js';
import { createMockDeck } from '../fixtures/deck-fixture.js';
import { createDeckTopology } from '../../src/core/model.js';

describe('Markdown Adapter (src/adapters/parsers/markdown.js)', () => {
  const sampleMarkdown = `
# Section 1: Intro
## Welcome Slide
Welcome to paraslides presentation.

---

## Architecture Overview
Main track slide 2.

+++

## Detour: Hexagonal In-Depth
Supplementary detour content at z=1.

+++

## Detour: State Machine
Supplementary detour content at z=2.

# Section 2: Deep Dive
## Core Domain
Section 2 page 1.

---

## Outbound Ports
Section 2 page 2.
`;

  describe('parseMarkdownToTopology', () => {
    it('parses multi-section, multi-page, multi-detour Markdown into a valid Deck Topology', () => {
      const topology = parseMarkdownToTopology(sampleMarkdown);

      // Section count: 2
      assert.strictEqual(getYMax(topology), 1);
      assert.strictEqual(topology.sections[0].title, 'Section 1: Intro');
      assert.strictEqual(topology.sections[1].title, 'Section 2: Deep Dive');

      // Section 0: 2 pages
      assert.strictEqual(getXMax(topology, 0), 1);
      assert.strictEqual(topology.sections[0].pages[0].title, 'Welcome Slide');
      assert.strictEqual(getZMax(topology, 0, 0), 0);

      // Section 0, Page 1: 2 detours
      assert.strictEqual(topology.sections[0].pages[1].title, 'Architecture Overview');
      assert.strictEqual(getZMax(topology, 0, 1), 2);
      assert.strictEqual(topology.sections[0].pages[1].detours[0].title, 'Detour: Hexagonal In-Depth');
      assert.strictEqual(topology.sections[0].pages[1].detours[1].title, 'Detour: State Machine');

      // Section 1: 2 pages, 0 detours
      assert.strictEqual(getXMax(topology, 1), 1);
      assert.strictEqual(getZMax(topology, 1, 0), 0);
      assert.strictEqual(getZMax(topology, 1, 1), 0);
    });

    it('handles markdown without an explicit section heading by providing a default section', () => {
      const singleSectionMd = `
## Slide 1
Content 1
---
## Slide 2
Content 2
`;
      const topology = parseMarkdownToTopology(singleSectionMd);
      assert.strictEqual(getYMax(topology), 0);
      assert.strictEqual(getXMax(topology, 0), 1);
    });

    it('throws errors on empty or invalid markdown input', () => {
      assert.throws(() => parseMarkdownToTopology(''), RangeError);
      assert.throws(() => parseMarkdownToTopology('   '), RangeError);
      assert.throws(() => parseMarkdownToTopology(null), TypeError);
      assert.throws(() => parseMarkdownToTopology(123), TypeError);
    });
  });

  describe('parseMarkdownToHTML', () => {
    it('generates HTML conforming to docs/HTML_SCHEMA.md', () => {
      const html = parseMarkdownToHTML(sampleMarkdown);

      assert.ok(html.includes('<main id="deck">'));
      assert.ok(html.includes('<section class="deck-section" data-section-title="Section 1: Intro">'));
      assert.ok(html.includes('<div class="deck-page" data-page-title="Welcome Slide">'));
      assert.ok(html.includes('<article class="slide slide-main'));
      assert.ok(html.includes('<article class="slide slide-detour"'));
      assert.ok(html.includes('data-has-detour="true"'));
      assert.ok(html.includes('has-detour'));
      assert.ok(html.includes('</main>'));
    });
  });

  describe('Inline and Block Rendering Helpers', () => {
    it('renders inline markdown styles', () => {
      const text = 'This is **bold**, *italic*, `code`, and [link](https://paraslides.org)';
      const rendered = renderInlineMarkdown(text);
      assert.ok(rendered.includes('<strong>bold</strong>'));
      assert.ok(rendered.includes('<em>italic</em>'));
      assert.ok(rendered.includes('<code>code</code>'));
      assert.ok(rendered.includes('<a href="https://paraslides.org">link</a>'));
    });

    it('renders slide body lists, blockquotes, and paragraphs', () => {
      const body = `
## Heading
> Note this quote
- Item 1
- Item 2

A normal paragraph.
`;
      const html = renderSlideBodyHTML(body);
      assert.ok(html.includes('<h2>Heading</h2>'));
      assert.ok(html.includes('<blockquote><p>Note this quote</p></blockquote>'));
      assert.ok(html.includes('<ul>'));
      assert.ok(html.includes('<li>Item 1</li>'));
      assert.ok(html.includes('<li>Item 2</li>'));
      assert.ok(html.includes('<p>A normal paragraph.</p>'));
    });
  });

  describe('serializeTopologyToMarkdown', () => {
    it('serializes a standard deck topology into Markdown string with sections, pages, and detours', () => {
      const standardDeck = createMockDeck();
      const topology = createDeckTopology(standardDeck.sections);

      const markdown = serializeTopologyToMarkdown(topology);
      assert.ok(markdown.includes('# Section 0: Introduction'));
      assert.ok(markdown.includes('# Section 1: Architecture Deep Dive'));
      assert.ok(markdown.includes('---'));
      assert.ok(markdown.includes('+++'));

      // Re-parse serialized markdown and verify structure preserved
      const roundTripTopology = parseMarkdownToTopology(markdown);
      assert.strictEqual(getYMax(roundTripTopology), getYMax(topology));
      assert.strictEqual(getXMax(roundTripTopology, 1), getXMax(topology, 1));
      assert.strictEqual(getZMax(roundTripTopology, 1, 1), getZMax(topology, 1, 1));
    });
  });
});

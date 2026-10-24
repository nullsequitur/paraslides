/**
 * @file phase3-translators.test.js
 * @description Integration tests for Phase 3 modular format translators:
 * Markdown <-> Core Topology <-> LaTeX Beamer <-> Command Dispatcher <-> Math.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseMarkdownToTopology, parseMarkdownToHTML, serializeTopologyToMarkdown } from '../../src/adapters/parsers/markdown.js';
import { parseLatexToTopology, parseLatexToHTML, serializeTopologyToLatex } from '../../src/adapters/parsers/latex.js';
import { renderMathInText, extractMath } from '../../src/adapters/parsers/math.js';
import { serializeDeck, getDefaultSerializerRegistry } from '../../src/ports/serialization.js';
import { createCommandDispatcher } from '../../src/ports/input.js';
import { getYMax, getXMax, getZMax } from '../../src/core/model.js';

describe('Phase 3 Format Translators Integration', () => {
  const sampleMarkdownDeck = `
# Section 1: Foundation
## Page 1: Introduction
Welcome to 3-axis slide presentations. Formula: $E = mc^2$.

---

## Page 2: Core Hexagonal Boundary
Pure domain decoupled from rendering.
Equation: $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$

+++

## Detour: Mathematical Formulation
Supplementary depth slide attached at z=1.

+++

## Detour: Discrete Coordinates
Supplementary depth slide attached at z=2.

# Section 2: Format Translators
## Page 1: Markdown & LaTeX
Bidirectional compilation between formats.
`;

  it('parses Markdown into Topology and drives Command Dispatcher through full navigation cycle', () => {
    const topology = parseMarkdownToTopology(sampleMarkdownDeck);
    assert.strictEqual(getYMax(topology), 1);
    assert.strictEqual(getXMax(topology, 0), 1);
    assert.strictEqual(getZMax(topology, 0, 1), 2);

    const dispatcher = createCommandDispatcher(topology);

    // Initial origin
    assert.strictEqual(dispatcher.getState().y, 0);
    assert.strictEqual(dispatcher.getState().x, 0);
    assert.strictEqual(dispatcher.getState().z, 0);

    // Move to page 1
    dispatcher.dispatch('MOVE_RIGHT');
    assert.strictEqual(dispatcher.getState().x, 1);
    assert.strictEqual(dispatcher.getPayload().hasDetour, true);
    assert.strictEqual(dispatcher.getPayload().detourCount, 2);

    // Enter detour
    dispatcher.dispatch('ENTER_DETOUR');
    assert.strictEqual(dispatcher.getState().mode, 'DETOUR');
    assert.strictEqual(dispatcher.getState().z, 1);
    assert.strictEqual(dispatcher.getPayload().isVerticalLocked, true);

    // Scrub detour
    dispatcher.dispatch('MOVE_RIGHT');
    assert.strictEqual(dispatcher.getState().z, 2);

    // Exit detour
    dispatcher.dispatch('EXIT_DETOUR');
    assert.strictEqual(dispatcher.getState().mode, 'MAIN');
    assert.strictEqual(dispatcher.getState().z, 0);
  });

  it('translates Markdown Deck into LaTeX Beamer and back with zero structural loss', () => {
    // 1. Markdown -> Topology
    const initialTopology = parseMarkdownToTopology(sampleMarkdownDeck);

    // 2. Topology -> LaTeX Beamer .tex
    const beamerTex = serializeDeck(initialTopology, 'latex', {
      title: 'Paraslides Integration Test',
      author: 'Antigravity'
    });
    assert.ok(beamerTex.includes('\\documentclass{beamer}'));
    assert.ok(beamerTex.includes('\\section{Section 1: Foundation}'));
    assert.ok(beamerTex.includes('\\begin{depthframe}{Detour: Mathematical Formulation}'));

    // 3. LaTeX Beamer .tex -> Topology
    const roundtripTopology = parseLatexToTopology(beamerTex);
    assert.strictEqual(getYMax(roundtripTopology), getYMax(initialTopology));
    assert.strictEqual(getXMax(roundtripTopology, 0), getXMax(initialTopology, 0));
    assert.strictEqual(getZMax(roundtripTopology, 0, 1), getZMax(initialTopology, 0, 1));
    assert.strictEqual(getXMax(roundtripTopology, 1), getXMax(initialTopology, 1));

    // 4. Topology -> Markdown
    const regeneratedMarkdown = serializeDeck(roundtripTopology, 'markdown');
    assert.ok(regeneratedMarkdown.includes('# Section 1: Foundation'));
    assert.ok(regeneratedMarkdown.includes('---'));
    assert.ok(regeneratedMarkdown.includes('+++'));

    // 5. Re-parse Markdown
    const finalTopology = parseMarkdownToTopology(regeneratedMarkdown);
    assert.strictEqual(getYMax(finalTopology), getYMax(initialTopology));
    assert.strictEqual(getZMax(finalTopology, 0, 1), 2);
  });

  it('renders LaTeX math equations within parsed Markdown HTML', () => {
    const rawSlide = 'Physics: $E = mc^2$ and $$\\int x dx$$';
    const mathExtracted = extractMath(rawSlide);
    assert.strictEqual(mathExtracted.length, 2);

    const rendered = renderMathInText(rawSlide);
    assert.ok(rendered.includes('<span class="math-inline" data-latex="E = mc^2">'));
    assert.ok(rendered.includes('<div class="math-display" data-latex="\\int x dx">'));
  });

  it('verifies all registered format serializers in the global registry', () => {
    const registry = getDefaultSerializerRegistry();
    const formats = registry.getFormats();

    assert.ok(formats.includes('json'));
    assert.ok(formats.includes('latex'));
    assert.ok(formats.includes('beamer'));
    assert.ok(formats.includes('markdown'));
    assert.ok(formats.includes('md'));
  });
});

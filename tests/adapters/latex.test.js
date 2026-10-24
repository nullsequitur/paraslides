/**
 * @file latex.test.js
 * @description Unit tests for Bidirectional LaTeX Beamer Adapter (src/adapters/parsers/latex.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLatexToTopology,
  parseLatexToHTML,
  serializeTopologyToLatex,
  stripLatexComments,
  renderLatexBodyHTML
} from '../../src/adapters/parsers/latex.js';

import { getYMax, getXMax, getZMax } from '../../src/core/model.js';
import { createMockDeck } from '../fixtures/deck-fixture.js';
import { createDeckTopology } from '../../src/core/model.js';
import { serializeDeck } from '../../src/ports/serialization.js';

describe('LaTeX Beamer Adapter (src/adapters/parsers/latex.js)', () => {
  const sampleLatex = `
\\documentclass{beamer}
\\begin{document}

% Preamble comment
\\section{Architecture}

\\begin{frame}{Spatial Geometry}
Introduction to 3-axis coordinates.
\\end{frame}

\\begin{frame}{Hexagonal Isolation}
Core domain has zero dependencies.
\\end{frame}

\\begin{depthframe}{Coordinate Proofs}
Mathematical proof of cursor memory determinism.
\\end{depthframe}

\\begin{depthframe}{Transform Matrices}
Detailed 3D matrix operations.
\\end{depthframe}

\\section{Extensibility}

\\begin{frame}{Format Compilers}
Supports Markdown and LaTeX Beamer.
\\end{frame}

\\end{document}
`;

  describe('stripLatexComments', () => {
    it('removes comments while preserving escaped percent signs', () => {
      const tex = 'Value is 100\\% % this is comment\nNext line';
      const clean = stripLatexComments(tex);
      assert.strictEqual(clean, 'Value is 100\\% \nNext line');
    });
  });

  describe('renderLatexBodyHTML', () => {
    it('converts basic LaTeX styling macros to HTML', () => {
      const body = '\\textbf{Bold text} and \\textit{italic text} and \\texttt{code}';
      const html = renderLatexBodyHTML(body);
      assert.ok(html.includes('<strong>Bold text</strong>'));
      assert.ok(html.includes('<em>italic text</em>'));
      assert.ok(html.includes('<code>code</code>'));
    });

    it('converts itemize and block environments to HTML', () => {
      const body = `
\\begin{block}{Note}
Important information
\\end{block}

\\begin{itemize}
\\item Point A
\\item Point B
\\end{itemize}
`;
      const html = renderLatexBodyHTML(body);
      assert.ok(html.includes('<div class="card"><h3>Note</h3><p>Important information</p></div>'));
      assert.ok(html.includes('<ul>\n<li>Point A</li>\n<li>Point B</li>\n</ul>'));
    });
  });

  describe('parseLatexToTopology', () => {
    it('parses Beamer document into correct 3-axis Deck Topology', () => {
      const topology = parseLatexToTopology(sampleLatex);

      // 2 sections
      assert.strictEqual(getYMax(topology), 1);
      assert.strictEqual(topology.sections[0].title, 'Architecture');
      assert.strictEqual(topology.sections[1].title, 'Extensibility');

      // Section 0: 2 pages
      assert.strictEqual(getXMax(topology, 0), 1);
      assert.strictEqual(topology.sections[0].pages[0].title, 'Spatial Geometry');
      assert.strictEqual(getZMax(topology, 0, 0), 0);

      // Section 0, Page 1: 2 detours from \begin{depthframe}
      assert.strictEqual(topology.sections[0].pages[1].title, 'Hexagonal Isolation');
      assert.strictEqual(getZMax(topology, 0, 1), 2);
      assert.strictEqual(topology.sections[0].pages[1].detours[0].title, 'Coordinate Proofs');
      assert.strictEqual(topology.sections[0].pages[1].detours[1].title, 'Transform Matrices');

      // Section 1: 1 page, 0 detours
      assert.strictEqual(getXMax(topology, 1), 0);
      assert.strictEqual(getZMax(topology, 1, 0), 0);
    });

    it('throws errors on invalid or empty LaTeX documents', () => {
      assert.throws(() => parseLatexToTopology(''), RangeError);
      assert.throws(() => parseLatexToTopology('% Only comments'), RangeError);
      assert.throws(() => parseLatexToTopology(null), TypeError);
    });
  });

  describe('parseLatexToHTML', () => {
    it('generates HTML conforming to docs/HTML_SCHEMA.md', () => {
      const html = parseLatexToHTML(sampleLatex);
      assert.ok(html.includes('<main id="deck">'));
      assert.ok(html.includes('<section class="deck-section" data-section-title="Architecture">'));
      assert.ok(html.includes('<div class="deck-page" data-page-title="Hexagonal Isolation">'));
      assert.ok(html.includes('data-has-detour="true"'));
      assert.ok(html.includes('has-detour'));
      assert.ok(html.includes('<article class="slide slide-detour"'));
      assert.ok(html.includes('Coordinate Proofs'));
    });
  });

  describe('serializeTopologyToLatex & Serialization Port Integration', () => {
    it('serializes a Deck Topology to compilable LaTeX Beamer code with depthframe macro', () => {
      const standardDeck = createMockDeck();
      const topology = createDeckTopology(standardDeck.sections);

      const latex = serializeTopologyToLatex(topology, {
        title: 'Paraslides Presentation',
        author: 'Architect'
      });

      assert.ok(latex.includes('\\documentclass{beamer}'));
      assert.ok(latex.includes('\\newenvironment{depthframe}'));
      assert.ok(latex.includes('\\section{Section 0: Introduction}'));
      assert.ok(latex.includes('\\section{Section 1: Architecture Deep Dive}'));
      assert.ok(latex.includes('\\begin{frame}{Spatial Coordinates & Detours}'));
      assert.ok(latex.includes('\\begin{depthframe}{Detour: Mathematical Coordinate Formulations}'));
      assert.ok(latex.includes('\\end{document}'));
    });

    it('works seamlessly through serializeDeck via SerializationPort', () => {
      const standardDeck = createMockDeck();
      const topology = createDeckTopology(standardDeck.sections);

      const latexFromPort = serializeDeck(topology, 'latex');
      assert.ok(latexFromPort.includes('\\documentclass{beamer}'));
      assert.ok(latexFromPort.includes('\\begin{depthframe}'));
    });

    it('completes bidirectional round-trip: LaTeX -> Topology -> LaTeX -> Topology', () => {
      const topology1 = parseLatexToTopology(sampleLatex);
      const generatedTex = serializeTopologyToLatex(topology1);
      const topology2 = parseLatexToTopology(generatedTex);

      assert.strictEqual(getYMax(topology2), getYMax(topology1));
      assert.strictEqual(getXMax(topology2, 0), getXMax(topology1, 0));
      assert.strictEqual(getZMax(topology2, 0, 1), getZMax(topology1, 0, 1));
      assert.strictEqual(topology2.sections[0].title, topology1.sections[0].title);
    });
  });
});

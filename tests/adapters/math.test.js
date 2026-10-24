/**
 * @file math.test.js
 * @description Unit tests for Math Rendering Adapter (src/adapters/parsers/math.js).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractMath,
  renderMathInText,
  defaultMathRenderer
} from '../../src/adapters/parsers/math.js';

describe('Math Rendering Adapter (src/adapters/parsers/math.js)', () => {
  describe('extractMath', () => {
    it('extracts inline math formulas', () => {
      const text = 'Einstein said $E = mc^2$ in 1905.';
      const matches = extractMath(text);

      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'inline');
      assert.strictEqual(matches[0].latex, 'E = mc^2');
      assert.strictEqual(matches[0].raw, '$E = mc^2$');
    });

    it('extracts display math formulas', () => {
      const text = 'Maxwell equation:\n$$\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}$$\nEnd.';
      const matches = extractMath(text);

      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].type, 'display');
      assert.strictEqual(matches[0].latex, '\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}');
      assert.strictEqual(matches[0].raw, '$$\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}$$');
    });

    it('extracts both inline and display math in the same document', () => {
      const text = 'Formula $a^2 + b^2 = c^2$ followed by display: $$\\int_0^1 x dx = \\frac{1}{2}$$ and $x > 0$.';
      const matches = extractMath(text);

      assert.strictEqual(matches.length, 3);
      assert.strictEqual(matches[0].type, 'inline');
      assert.strictEqual(matches[0].latex, 'a^2 + b^2 = c^2');
      assert.strictEqual(matches[1].type, 'display');
      assert.strictEqual(matches[1].latex, '\\int_0^1 x dx = \\frac{1}{2}');
      assert.strictEqual(matches[2].type, 'inline');
      assert.strictEqual(matches[2].latex, 'x > 0');
    });

    it('ignores escaped dollar signs and returns empty on non-string inputs', () => {
      const text = 'Item price is \\$50 and tax is \\$5.';
      const matches = extractMath(text);
      assert.strictEqual(matches.length, 0);

      assert.deepStrictEqual(extractMath(null), []);
      assert.deepStrictEqual(extractMath(123), []);
    });
  });

  describe('defaultMathRenderer & renderMathInText', () => {
    it('renders fallback HTML tags with data-latex attributes', () => {
      const inline = defaultMathRenderer('E = mc^2', { displayMode: false });
      assert.ok(inline.includes('<span class="math-inline" data-latex="E = mc^2">'));
      assert.ok(inline.includes('\\( E = mc^2 \\)'));

      const display = defaultMathRenderer('x = y', { displayMode: true });
      assert.ok(display.includes('<div class="math-display" data-latex="x = y">'));
      assert.ok(display.includes('\\[ x = y \\]'));
    });

    it('replaces math blocks in text using default renderer', () => {
      const text = 'Given $f(x) = x^2$, then $$f\'(x) = 2x$$.';
      const result = renderMathInText(text);

      assert.ok(result.includes('<span class="math-inline" data-latex="f(x) = x^2">'));
      assert.ok(result.includes('<div class="math-display" data-latex="f\'(x) = 2x">'));
    });

    it('supports custom pluggable renderer functions (e.g. KaTeX simulation)', () => {
      const customRenderer = (latex, { displayMode }) => {
        return `<katex mode="${displayMode ? 'block' : 'inline'}">${latex}</katex>`;
      };

      const text = 'Pythagoras: $a^2 + b^2 = c^2$';
      const result = renderMathInText(text, { renderer: customRenderer });

      assert.strictEqual(result, 'Pythagoras: <katex mode="inline">a^2 + b^2 = c^2</katex>');
    });

    it('returns original text unchanged when no math is present', () => {
      const text = 'Plain text without any dollar signs.';
      assert.strictEqual(renderMathInText(text), text);
      assert.strictEqual(renderMathInText(''), '');
    });
  });
});

/**
 * @file math.js
 * @description LaTeX Math Rendering Adapter for paraslides.
 *
 * Scans slide content for inline ($...$) and display ($$...$$) LaTeX math equations.
 * Supports pluggable rendering via KaTeX or MathJax when available, with clean semantic
 * HTML fallback markup when no external math engine is loaded.
 *
 * Pure JavaScript ES module with zero mandatory runtime dependencies.
 */

/**
 * Escapes HTML attributes for safe data-latex embedding.
 * @private
 * @param {string} str
 * @returns {string}
 */
function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Default fallback renderer when KaTeX/MathJax are not present.
 * Wraps math in semantic spans/divs with data attributes and raw code tags.
 *
 * @param {string} latex - Raw LaTeX formula.
 * @param {{ displayMode: boolean }} context - Context options.
 * @returns {string} HTML markup.
 */
export function defaultMathRenderer(latex, { displayMode = false } = {}) {
  const safeLatex = escapeAttr(latex.trim());
  if (displayMode) {
    return `<div class="math-display" data-latex="${safeLatex}"><code class="latex-raw">\\[ ${safeLatex} \\]</code></div>`;
  }
  return `<span class="math-inline" data-latex="${safeLatex}"><code class="latex-raw">\\( ${safeLatex} \\)</code></span>`;
}

/**
 * Resolves active math rendering function based on options or browser globals.
 *
 * @private
 * @param {object} [options={}] - Options.
 * @returns {(latex: string, context: { displayMode: boolean }) => string}
 */
function resolveRenderer(options = {}) {
  if (typeof options.renderer === 'function') {
    return options.renderer;
  }

  // Check KaTeX global
  if (typeof globalThis !== 'undefined' && globalThis.katex && typeof globalThis.katex.renderToString === 'function') {
    return (latex, { displayMode }) => {
      try {
        return globalThis.katex.renderToString(latex, {
          displayMode,
          throwOnError: false
        });
      } catch (err) {
        return defaultMathRenderer(latex, { displayMode });
      }
    };
  }

  return defaultMathRenderer;
}

/**
 * Extracts all math expressions from a text string.
 *
 * @param {string} text - Input text.
 * @returns {Array<{ type: 'display'|'inline', latex: string, raw: string, start: number, end: number }>}
 */
export function extractMath(text) {
  if (typeof text !== 'string') return [];

  const results = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    // Check escaped dollar sign \$
    if (text[i] === '\\' && i + 1 < len && text[i + 1] === '$') {
      i += 2;
      continue;
    }

    // Check display math $$...$$
    if (text[i] === '$' && i + 1 < len && text[i + 1] === '$') {
      const start = i;
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        const latex = text.substring(i + 2, end);
        const raw = text.substring(start, end + 2);
        results.push({
          type: 'display',
          latex,
          raw,
          start,
          end: end + 2
        });
        i = end + 2;
        continue;
      }
    }

    // Check inline math $...$
    if (text[i] === '$') {
      const start = i;
      // Find closing $ (not preceded by \)
      let closing = -1;
      for (let j = i + 1; j < len; j++) {
        if (text[j] === '\\') {
          j++; // skip escaped char
          continue;
        }
        if (text[j] === '$') {
          // Avoid matching empty $$
          if (j === start + 1) break;
          // Avoid newline inside single-line inline math
          closing = j;
          break;
        }
        if (text[j] === '\n') {
          // Inline math must not cross multiple lines
          break;
        }
      }

      if (closing !== -1) {
        const latex = text.substring(i + 1, closing);
        // Avoid currency matches like "$50 to $100" (if starts with digit or space)
        if (!/^\s/.test(latex) && !/\s$/.test(latex)) {
          const raw = text.substring(start, closing + 1);
          results.push({
            type: 'inline',
            latex,
            raw,
            start,
            end: closing + 1
          });
          i = closing + 1;
          continue;
        }
      }
    }

    i++;
  }

  return results;
}

/**
 * Replaces inline and display LaTeX math equations with rendered HTML.
 *
 * @param {string} text - Input text or HTML snippet.
 * @param {object} [options={}] - Options (e.g. renderer).
 * @returns {string} Text with math replaced by rendered HTML.
 */
export function renderMathInText(text, options = {}) {
  if (typeof text !== 'string') return '';

  const mathBlocks = extractMath(text);
  if (mathBlocks.length === 0) return text;

  const renderer = resolveRenderer(options);
  let result = '';
  let lastIndex = 0;

  for (const block of mathBlocks) {
    result += text.substring(lastIndex, block.start);
    const rendered = renderer(block.latex, { displayMode: block.type === 'display' });
    result += rendered;
    lastIndex = block.end;
  }

  result += text.substring(lastIndex);
  return result;
}

/**
 * In-place DOM Math Adapter.
 * Scans slide elements inside a root deck element and renders LaTeX formulas in text nodes.
 *
 * @param {Element} rootElement - Root DOM element (e.g. #deck).
 * @param {object} [options={}] - Options forwarded to renderMathInText.
 */
export function attachMathToDOM(rootElement, options = {}) {
  if (!rootElement || typeof rootElement.querySelectorAll !== 'function') {
    return;
  }

  const slideElements = rootElement.querySelectorAll('.slide, article');
  for (const slide of slideElements) {
    // Traverse text nodes to replace math
    const walker = (typeof document !== 'undefined' && typeof document.createTreeWalker === 'function')
      ? document.createTreeWalker(slide, 4 /* NodeFilter.SHOW_TEXT */, null)
      : null;

    if (!walker) {
      // Fallback: replace innerHTML if simple
      if (slide.innerHTML && slide.innerHTML.includes('$')) {
        slide.innerHTML = renderMathInText(slide.innerHTML, options);
      }
      continue;
    }

    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      // Skip script/style/code/pre tags
      const parentTag = (currentNode.parentNode?.tagName || '').toUpperCase();
      if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'PRE' && parentTag !== 'CODE') {
        if (currentNode.nodeValue && currentNode.nodeValue.includes('$')) {
          textNodes.push(currentNode);
        }
      }
      currentNode = walker.nextNode();
    }

    for (const node of textNodes) {
      const renderedHtml = renderMathInText(node.nodeValue, options);
      if (renderedHtml !== node.nodeValue && node.parentNode) {
        const tempSpan = document.createElement('span');
        tempSpan.innerHTML = renderedHtml;
        while (tempSpan.firstChild) {
          node.parentNode.insertBefore(tempSpan.firstChild, node);
        }
        node.parentNode.removeChild(node);
      }
    }
  }
}

export default {
  extractMath,
  renderMathInText,
  defaultMathRenderer,
  attachMathToDOM
};

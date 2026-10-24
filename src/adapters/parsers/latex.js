/**
 * @file latex.js
 * @description Bidirectional LaTeX Beamer Adapter for paraslides.
 *
 * Implements:
 * 1. LaTeX Beamer -> Deck Topology parser (parsing \section, \begin{frame}, \begin{depthframe})
 * 2. LaTeX Beamer -> Semantic HTML DOM tree (conforming to docs/HTML_SCHEMA.md)
 * 3. Deck Topology -> LaTeX Beamer .tex serializer (including \newenvironment{depthframe} macro)
 *
 * Pure JavaScript ES module with zero runtime dependencies.
 */

import { createDeckTopology } from '../../core/model.js';
import { assertValidTopology, getDefaultSerializerRegistry } from '../../ports/serialization.js';

/**
 * Escapes HTML characters for safe text insertion.
 * @private
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips comments from LaTeX code (% ...), preserving escaped \%.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripLatexComments(text) {
  if (typeof text !== 'string') return '';
  const lines = text.split(/\r?\n/);
  const cleanLines = lines.map((line) => {
    let result = '';
    let inEscape = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '\\') {
        inEscape = !inEscape;
        result += char;
        continue;
      }
      if (char === '%' && !inEscape) {
        // Comment begins
        break;
      }
      inEscape = false;
      result += char;
    }
    return result;
  });
  return cleanLines.join('\n');
}

/**
 * Extracts balanced curly braces content starting at a given index.
 * Returns { content, endIndex } or null if unbalanced.
 *
 * @private
 * @param {string} text
 * @param {number} startIndex - Index of opening brace '{'
 * @returns {{ content: string, endIndex: number }|null}
 */
function extractBraceContent(text, startIndex) {
  if (text[startIndex] !== '{') return null;
  let depth = 0;
  let contentStart = startIndex + 1;
  let inEscape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (char === '\\') {
      inEscape = !inEscape;
      continue;
    }
    if (!inEscape) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return {
            content: text.substring(contentStart, i),
            endIndex: i
          };
        }
      }
    }
    inEscape = false;
  }
  return null;
}

/**
 * Parses basic LaTeX slide body commands into readable HTML.
 * Converts:
 * - \textbf{...} -> <strong>...</strong>
 * - \textit{...} -> <em>...</em>
 * - \texttt{...} -> <code>...</code>
 * - \begin{itemize} ... \item ... \end{itemize} -> <ul><li>...</li></ul>
 * - \begin{enumerate} ... \item ... \end{enumerate} -> <ol><li>...</li></ol>
 * - \begin{block}{Title} ... \end{block} -> <div class="card"><h3>Title</h3>...</div>
 * - Preserves math environments: \begin{equation} ... \end{equation}, \begin{align} ... \end{align}
 *
 * @param {string} latexBody
 * @returns {string} HTML snippet
 */
export function renderLatexBodyHTML(latexBody) {
  if (!latexBody) return '';

  let out = latexBody.trim();

  // 1. Text styling macros
  out = out.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  out = out.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
  out = out.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
  out = out.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');

  // 2. Beamer blocks
  out = out.replace(/\\begin\{block\}\{([^}]+)\}([\s\S]*?)\\end\{block\}/g, (_, title, content) => {
    return `<div class="card"><h3>${escapeHTML(title)}</h3><p>${content.trim()}</p></div>`;
  });

  // 3. Itemize environments
  out = out.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
    const liList = items
      .split(/\\item\s+/)
      .map((it) => it.trim())
      .filter((it) => it.length > 0)
      .map((it) => `<li>${it}</li>`)
      .join('\n');
    return `<ul>\n${liList}\n</ul>`;
  });

  // 4. Enumerate environments
  out = out.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
    const liList = items
      .split(/\\item\s+/)
      .map((it) => it.trim())
      .filter((it) => it.length > 0)
      .map((it) => `<li>${it}</li>`)
      .join('\n');
    return `<ol>\n${liList}\n</ol>`;
  });

  // 5. Wrap standalone text lines in paragraphs
  const paragraphs = out
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => {
      if (p.startsWith('<') || p.startsWith('\\begin{')) {
        return p;
      }
      return `<p>${p}</p>`;
    });

  return paragraphs.join('\n');
}

/**
 * Parses LaTeX Beamer source into an array of sections, pages, and detours.
 *
 * @private
 * @param {string} latexText
 * @returns {Array<object>}
 */
function parseLatexStructure(latexText) {
  if (typeof latexText !== 'string') {
    throw new TypeError('LaTeX input must be a string.');
  }

  let clean = stripLatexComments(latexText).trim();
  if (clean.length === 0) {
    throw new RangeError('LaTeX document is empty.');
  }

  // Only parse inside \begin{document} ... \end{document} if present
  const docStart = clean.indexOf('\\begin{document}');
  if (docStart !== -1) {
    clean = clean.substring(docStart + '\\begin{document}'.length);
  }
  const docEnd = clean.indexOf('\\end{document}');
  if (docEnd !== -1) {
    clean = clean.substring(0, docEnd);
  }

  clean = clean.trim();
  if (clean.length === 0) {
    throw new RangeError('No document content found in LaTeX input.');
  }

  // Regex matching \section, \begin{frame}, \begin{depthframe}
  const tokenRegex = /(\\section\*?\{)|(\\begin\{(frame|depthframe)\})/g;


  let currentSection = {
    title: 'Presentation',
    pages: []
  };
  const sections = [];
  let currentPage = null;
  let match;
  let lastIndex = 0;

  // Track if we ever saw an explicit \section
  let hasExplicitSection = false;

  while ((match = tokenRegex.exec(clean)) !== null) {
    const tokenStart = match.index;
    const token = match[0];

    // Case 1: \section{...}
    if (token.startsWith('\\section')) {
      const braceIndex = clean.indexOf('{', tokenStart);
      const braceResult = extractBraceContent(clean, braceIndex);
      if (braceResult) {
        if (currentSection.pages.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: braceResult.content.trim() || `Section ${sections.length + 1}`,
          pages: []
        };
        currentPage = null;
        hasExplicitSection = true;
        tokenRegex.lastIndex = braceResult.endIndex + 1;
      }
      continue;
    }

    // Case 2: \begin{frame} or \begin{depthframe}
    const envType = match[3]; // 'frame' or 'depthframe'
    const envEndToken = `\\end{${envType}}`;
    const envEndIndex = clean.indexOf(envEndToken, tokenRegex.lastIndex);

    if (envEndIndex === -1) {
      continue;
    }

    // Extract optional frame title: \begin{frame}{Title}
    let frameTitle = '';
    let bodyStartIndex = tokenRegex.lastIndex;

    // Check if next non-whitespace char is '{'
    const nextText = clean.substring(bodyStartIndex).trimStart();
    if (nextText.startsWith('{')) {
      const braceIndex = clean.indexOf('{', bodyStartIndex);
      const braceResult = extractBraceContent(clean, braceIndex);
      if (braceResult) {
        frameTitle = braceResult.content.trim();
        bodyStartIndex = braceResult.endIndex + 1;
      }
    }

    const rawBody = clean.substring(bodyStartIndex, envEndIndex).trim();

    // Check for \frametitle{...} inside body if title was not in \begin{frame}{Title}
    if (!frameTitle) {
      const frameTitleMatch = rawBody.match(/\\frametitle\{([^}]+)\}/);
      if (frameTitleMatch) {
        frameTitle = frameTitleMatch[1].trim();
      }
    }

    if (envType === 'frame') {
      // Primary slide (z = 0)
      const pageIndex = currentSection.pages.length;
      const effectiveTitle = frameTitle || `Slide ${pageIndex + 1}`;
      currentPage = {
        title: effectiveTitle,
        slide: {
          title: effectiveTitle,
          content: rawBody,
          html: renderLatexBodyHTML(rawBody)
        },
        detours: []
      };
      currentSection.pages.push(currentPage);
    } else if (envType === 'depthframe') {
      // Detour slide (z > 0) attached to currentPage
      if (!currentPage) {
        // If no preceding primary frame, initialize one
        currentPage = {
          title: frameTitle || 'Slide 1',
          slide: {
            title: frameTitle || 'Slide 1',
            content: '',
            html: ''
          },
          detours: []
        };
        currentSection.pages.push(currentPage);
      }
      const detourIndex = currentPage.detours.length + 1;
      const effectiveDetourTitle = frameTitle || `Detour ${detourIndex}`;
      currentPage.detours.push({
        title: effectiveDetourTitle,
        content: rawBody,
        html: renderLatexBodyHTML(rawBody)
      });
    }

    tokenRegex.lastIndex = envEndIndex + envEndToken.length;
  }

  if (currentSection.pages.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    throw new RangeError('No Beamer frames found in LaTeX input.');
  }

  return sections;
}

/**
 * Parses a LaTeX Beamer source string into an immutable Deck Topology.
 *
 * @param {string} latexText - Beamer .tex document text.
 * @param {object} [options={}] - Parser options.
 * @returns {Readonly<object>} Immutable Deck Topology.
 */
export function parseLatexToTopology(latexText, options = {}) {
  const sections = parseLatexStructure(latexText);
  return createDeckTopology(sections);
}

/**
 * Parses a LaTeX Beamer source string into semantic paraslides HTML.
 *
 * @param {string} latexText - Beamer .tex document text.
 * @param {object} [options={}] - Options.
 * @returns {string} Semantic HTML markup.
 */
export function parseLatexToHTML(latexText, options = {}) {
  const sections = parseLatexStructure(latexText);
  const deckId = options.deckId || 'deck';

  const sectionHtmls = sections.map((sec, y) => {
    const pageHtmls = sec.pages.map((page, x) => {
      const hasDetours = page.detours && page.detours.length > 0;
      const detourAttr = hasDetours ? ' data-has-detour="true"' : '';
      const detourClass = hasDetours ? ' has-detour' : '';

      const mainSlideHtml = `          <article class="slide slide-main${detourClass}" data-slide-title="${escapeHTML(page.slide.title)}"${detourAttr}>
            <div class="slide-content">
              <h2>${escapeHTML(page.slide.title)}</h2>
${page.slide.html.split('\n').map((l) => '              ' + l).join('\n')}
            </div>
          </article>`;

      const detourHtmls = (page.detours || []).map((detour, dIdx) => {
        const z = dIdx + 1;
        return `          <article class="slide slide-detour" data-slide-title="${escapeHTML(detour.title)}" data-z="${z}">
            <div class="slide-content">
              <h2>${escapeHTML(detour.title)}</h2>
${detour.html.split('\n').map((l) => '              ' + l).join('\n')}
            </div>
          </article>`;
      });

      return `        <div class="deck-page" data-page-title="${escapeHTML(page.title)}">
${[mainSlideHtml, ...detourHtmls].join('\n\n')}
        </div>`;
    });

    return `      <section class="deck-section" data-section-title="${escapeHTML(sec.title)}">
${pageHtmls.join('\n\n')}
      </section>`;
  });

  return `<main id="${deckId}">
${sectionHtmls.join('\n\n')}
</main>`;
}

/**
 * Serializes an immutable Deck Topology into a valid, standalone
 * LaTeX Beamer (.tex) document with depthframe compatibility macro.
 *
 * @param {object} topology - Valid Deck Topology.
 * @param {object} [options={}] - Serialization options (theme, title, author).
 * @returns {string} Compilable Beamer .tex string.
 */
export function serializeTopologyToLatex(topology, options = {}) {
  assertValidTopology(topology);

  const theme = options.theme || 'Madrid';
  const title = options.title || 'paraslides Presentation';
  const author = options.author || 'Author';
  const date = options.date || '\\today';

  const texParts = [];

  // Preamble
  texParts.push(`\\documentclass{beamer}`);
  texParts.push(`\\usetheme{${theme}}`);
  texParts.push(`\\usepackage[utf8]{inputenc}`);
  texParts.push(`\\usepackage{amsmath,amssymb}`);
  texParts.push(``);
  texParts.push(`% paraslides compatibility macro for Z-axis detour/backup frames`);
  texParts.push(`\\newenvironment{depthframe}[1]{%`);
  texParts.push(`  \\begin{frame}{#1 [Detour]}%`);
  texParts.push(`}{%`);
  texParts.push(`  \\end{frame}%`);
  texParts.push(`}`);
  texParts.push(``);
  texParts.push(`\\title{${title}}`);
  texParts.push(`\\author{${author}}`);
  texParts.push(`\\date{${date}}`);
  texParts.push(``);
  texParts.push(`\\begin{document}`);
  texParts.push(``);
  if (options.includeTitlePage) {
    texParts.push(`\\frame{\\titlepage}`);
    texParts.push(``);
  }


  for (let y = 0; y < topology.sections.length; y++) {
    const sec = topology.sections[y];
    const secTitle = sec.title || `Section ${y + 1}`;
    texParts.push(`\\section{${secTitle}}`);
    texParts.push(``);

    for (let x = 0; x < sec.pages.length; x++) {
      const page = sec.pages[x];
      const pageTitle = page.title || (page.slide && page.slide.title) || `Page ${x + 1}`;
      const pageContent = (page.slide && page.slide.content) || (page.content) || '';

      texParts.push(`\\begin{frame}{${pageTitle}}`);
      if (pageContent.trim().length > 0) {
        texParts.push(pageContent.trim());
      } else {
        texParts.push(`\\framesubtitle{${pageTitle}}`);
      }
      texParts.push(`\\end{frame}`);
      texParts.push(``);

      // Detours
      if (Array.isArray(page.detours)) {
        for (let d = 0; d < page.detours.length; d++) {
          const detour = page.detours[d];
          const detourTitle = detour.title || `Detour ${d + 1}`;
          const detourContent = detour.content || '';

          texParts.push(`\\begin{depthframe}{${detourTitle}}`);
          if (detourContent.trim().length > 0) {
            texParts.push(detourContent.trim());
          } else {
            texParts.push(`\\framesubtitle{Detour Sequence}`);
          }
          texParts.push(`\\end{depthframe}`);
          texParts.push(``);
        }
      }
    }
  }

  texParts.push(`\\end{document}`);

  return texParts.join('\n');
}

// Automatically register LaTeX and Beamer serializers with the global registry
const globalRegistry = getDefaultSerializerRegistry();
globalRegistry.register('latex', serializeTopologyToLatex);
globalRegistry.register('beamer', serializeTopologyToLatex);

export default {
  parseLatexToTopology,
  parseLatexToHTML,
  serializeTopologyToLatex,
  stripLatexComments,
  renderLatexBodyHTML
};

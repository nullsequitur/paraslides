/**
 * @file markdown.js
 * @description Markdown Inbound & Outbound Adapter for paraslides.
 *
 * Implements lightweight, dependency-free Markdown parsing into the Core Deck Topology
 * and semantic HTML schema conforming to docs/HTML_SCHEMA.md.
 *
 * Delimiters:
 * - `# Section Title`: Splits thematic sections (Y-axis)
 * - `---`: Splits pages within a section (X-axis)
 * - `+++`: Splits attached detour slides (Z-axis, z >= 1)
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
 * Lightweight inline markdown to HTML converter.
 * Converts:
 * - `code` -> <code>code</code>
 * - **bold** -> <strong>bold</strong>
 * - *italic* -> <em>italic</em>
 * - [text](url) -> <a href="url">text</a>
 * - <kbd>key</kbd> preservation
 *
 * @private
 * @param {string} text
 * @returns {string}
 */
export function renderInlineMarkdown(text) {
  if (!text) return '';

  let out = text;
  // Code spans
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return out;
}

/**
 * Lightweight block markdown to HTML converter for slide body.
 *
 * @private
 * @param {string} content
 * @returns {string}
 */
export function renderSlideBodyHTML(content) {
  const lines = content.trim().split(/\r?\n/);
  const htmlParts = [];
  let inList = false;
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const pText = paragraphBuffer.join(' ').trim();
      if (pText) {
        htmlParts.push(`<p>${renderInlineMarkdown(pText)}</p>`);
      }
      paragraphBuffer = [];
    }
  }

  function flushList() {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Heading 1 (# is section level, but if inside slide, render as h1)
    if (/^#\s+(.+)$/.test(line)) {
      flushParagraph();
      flushList();
      const text = line.replace(/^#\s+/, '');
      htmlParts.push(`<h1>${renderInlineMarkdown(text)}</h1>`);
      continue;
    }

    // Heading 2
    if (/^##\s+(.+)$/.test(line)) {
      flushParagraph();
      flushList();
      const text = line.replace(/^##\s+/, '');
      htmlParts.push(`<h2>${renderInlineMarkdown(text)}</h2>`);
      continue;
    }

    // Heading 3
    if (/^###\s+(.+)$/.test(line)) {
      flushParagraph();
      flushList();
      const text = line.replace(/^###\s+/, '');
      htmlParts.push(`<h3>${renderInlineMarkdown(text)}</h3>`);
      continue;
    }

    // Blockquote
    if (/^>\s+(.+)$/.test(line)) {
      flushParagraph();
      flushList();
      const text = line.replace(/^>\s+/, '');
      htmlParts.push(`<blockquote><p>${renderInlineMarkdown(text)}</p></blockquote>`);
      continue;
    }

    // Unordered List item
    if (/^[-*]\s+(.+)$/.test(line)) {
      flushParagraph();
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      const itemText = line.replace(/^[-*]\s+/, '');
      htmlParts.push(`<li>${renderInlineMarkdown(itemText)}</li>`);
      continue;
    }

    // Raw HTML line pass-through (e.g. <div>, <aside>, <kbd>)
    if (/^<[a-z]+[^>]*>.*<\/[a-z]+>$/i.test(line) || /^<[a-z]+[^>]*\/?>$/i.test(line)) {
      flushParagraph();
      flushList();
      htmlParts.push(line);
      continue;
    }

    // Regular text line (accumulate in paragraph)
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return htmlParts.join('\n');
}

/**
 * Extracts the first heading text from raw slide markdown.
 *
 * @private
 * @param {string} slideText
 * @returns {string} Heading or empty string
 */
function extractSlideHeading(slideText) {
  const match = slideText.match(/^#{1,3}\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Parses raw paraslides markdown text into an intermediate structural representation:
 * Array of sections -> Array of pages -> Main slide + Array of detour slides.
 *
 * @private
 * @param {string} markdownText
 * @returns {Array<object>} Normalized sections array
 */
function parseMarkdownStructure(markdownText) {
  if (typeof markdownText !== 'string') {
    throw new TypeError('Markdown input must be a string.');
  }

  const cleaned = markdownText.trim();
  if (cleaned.length === 0) {
    throw new RangeError('Markdown input cannot be empty.');
  }

  // Split into raw section blocks by `# Section Title`
  // We use a regex that matches `# ` at the beginning of line
  const lines = cleaned.split(/\r?\n/);
  const rawSections = [];
  let currentSectionTitle = null;
  let currentSectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(/^#\s+(.+)$/);

    if (sectionMatch && !line.startsWith('##')) {
      if (currentSectionTitle !== null || currentSectionLines.length > 0) {
        rawSections.push({
          title: currentSectionTitle || 'Section 1',
          content: currentSectionLines.join('\n')
        });
        currentSectionLines = [];
      }
      currentSectionTitle = sectionMatch[1].trim();
    } else {
      currentSectionLines.push(line);
    }
  }

  // Push last section
  if (currentSectionTitle !== null || currentSectionLines.length > 0) {
    rawSections.push({
      title: currentSectionTitle || `Section ${rawSections.length + 1}`,
      content: currentSectionLines.join('\n')
    });
  }

  if (rawSections.length === 0) {
    throw new RangeError('Markdown deck must contain at least one section.');
  }

  // Process pages and detours for each section
  const parsedSections = rawSections.map((sec, y) => {
    // Split section content into pages using `---` delimiter
    const rawPages = sec.content
      .split(/(?:^|\n)---\s*(?:\n|$)/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // If section had no slides, create a fallback page with the section title
    const effectivePages = rawPages.length > 0 ? rawPages : [`## ${sec.title}`];

    const pages = effectivePages.map((pageText, x) => {
      // Split page into main slide (z=0) and detours (z>=1) using `+++` delimiter
      const rawSlides = pageText
        .split(/(?:^|\n)\+\+\+\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const mainSlideText = rawSlides[0] || '';
      const detourSlideTexts = rawSlides.slice(1);

      const mainTitle = extractSlideHeading(mainSlideText) || `Page ${x + 1}`;
      const pageId = `page-${y}-${x}`;
      const mainSlideId = `${pageId}-main`;

      const detours = detourSlideTexts.map((detourText, dIdx) => {
        const z = dIdx + 1;
        const detourTitle = extractSlideHeading(detourText) || `Detour ${z}`;
        return {
          id: `detour-${y}-${x}-${z}`,
          title: detourTitle,
          content: detourText,
          html: renderSlideBodyHTML(detourText)
        };
      });

      return {
        id: pageId,
        title: mainTitle,
        content: mainSlideText,
        slide: {
          id: mainSlideId,
          title: mainTitle,
          content: mainSlideText,
          html: renderSlideBodyHTML(mainSlideText)
        },
        detours
      };
    });

    return {
      id: `section-${y}`,
      title: sec.title,
      pages
    };
  });

  return parsedSections;
}

/**
 * Parses paraslides Markdown text into a validated immutable Deck Topology.
 *
 * @param {string} markdownText - Raw markdown text.
 * @param {object} [options={}] - Parser options.
 * @returns {Readonly<object>} Immutable Deck Topology.
 */
export function parseMarkdownToTopology(markdownText, options = {}) {
  const sections = parseMarkdownStructure(markdownText);
  return createDeckTopology(sections);
}

/**
 * Parses paraslides Markdown text into a semantic HTML string
 * conforming to docs/HTML_SCHEMA.md (<main id="deck">...).
 *
 * @param {string} markdownText - Raw markdown text.
 * @param {object} [options={}] - Options.
 * @returns {string} HTML markup string.
 */
export function parseMarkdownToHTML(markdownText, options = {}) {
  const sections = parseMarkdownStructure(markdownText);
  const deckId = options.deckId || 'deck';

  const sectionHtmls = sections.map((sec, y) => {
    const pageHtmls = sec.pages.map((page, x) => {
      const hasDetours = page.detours && page.detours.length > 0;
      const detourAttr = hasDetours ? ' data-has-detour="true"' : '';
      const detourClass = hasDetours ? ' has-detour' : '';

      const mainSlideHtml = `          <article class="slide slide-main${detourClass}" data-slide-title="${escapeHTML(page.slide.title)}"${detourAttr}>
            <div class="slide-content">
${page.slide.html.split('\n').map((l) => '              ' + l).join('\n')}
            </div>
          </article>`;

      const detourHtmls = (page.detours || []).map((detour, dIdx) => {
        const z = dIdx + 1;
        return `          <article class="slide slide-detour" data-slide-title="${escapeHTML(detour.title)}" data-z="${z}">
            <div class="slide-content">
${detour.html.split('\n').map((l) => '              ' + l).join('\n')}
            </div>
          </article>`;
      });

      const allSlidesHtml = [mainSlideHtml, ...detourHtmls].join('\n\n');

      return `        <div class="deck-page" data-page-title="${escapeHTML(page.title)}">
${allSlidesHtml}
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
 * Serializes an internal Deck Topology into paraslides Markdown format.
 *
 * @param {object} topology - Valid deck topology.
 * @param {object} [options={}] - Serialization options.
 * @returns {string} Formatted Markdown string.
 */
export function serializeTopologyToMarkdown(topology, options = {}) {
  assertValidTopology(topology);

  const markdownParts = [];

  for (let y = 0; y < topology.sections.length; y++) {
    const sec = topology.sections[y];
    markdownParts.push(`# ${sec.title || `Section ${y + 1}`}`);
    markdownParts.push('');

    const pageBlocks = [];

    for (let x = 0; x < sec.pages.length; x++) {
      const page = sec.pages[x];
      const slideParts = [];

      // Main Slide (z = 0)
      const mainTitle = page.title || (page.slide && page.slide.title) || `Page ${x + 1}`;
      const mainContent = (page.slide && page.slide.content) || (page.content) || '';
      if (mainContent.trim().length > 0) {
        slideParts.push(mainContent.trim());
      } else {
        slideParts.push(`## ${mainTitle}`);
      }

      // Detour Slides (z >= 1)
      if (Array.isArray(page.detours) && page.detours.length > 0) {
        for (let d = 0; d < page.detours.length; d++) {
          const detour = page.detours[d];
          const detourTitle = detour.title || `Detour ${d + 1}`;
          const detourContent = detour.content || `## ${detourTitle}`;
          slideParts.push(`+++\n${detourContent.trim()}`);
        }
      }

      pageBlocks.push(slideParts.join('\n\n'));
    }

    markdownParts.push(pageBlocks.join('\n\n---\n\n'));
    markdownParts.push('');
  }

  return markdownParts.join('\n').trim();
}

// Automatically register Markdown serializer with the global serialization registry
const globalRegistry = getDefaultSerializerRegistry();
globalRegistry.register('markdown', serializeTopologyToMarkdown);
globalRegistry.register('md', serializeTopologyToMarkdown);

export default {
  parseMarkdownToTopology,
  parseMarkdownToHTML,
  serializeTopologyToMarkdown
};


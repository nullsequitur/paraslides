/**
 * @file print.js
 * @description Print-to-PDF Outbound Adapter & Layout Flattening for paraslides.
 *
 * Provides static export fallbacks ensuring presentations can be printed
 * or exported to PDF via browser print (window.print() / Ctrl+P).
 *
 * Supports configurable flattening modes:
 * - 'main-only': Prints only primary slides (z = 0), omitting detour tracks.
 * - 'interleaved': Prints primary slides immediately followed by their attached detour slides.
 * - 'appendix': Prints all primary slides on the main track, followed by all detour slides in an appendix.
 *
 * Pure ES module with zero external runtime dependencies.
 */

/**
 * Print mode: Primary slides only (z = 0), hiding all detour slides.
 * @constant {string}
 */
export const PRINT_MODE_MAIN_ONLY = 'main-only';

/**
 * Print mode: Interleave each main slide immediately with its attached detour sequence.
 * @constant {string}
 */
export const PRINT_MODE_INTERLEAVED = 'interleaved';

/**
 * Print mode: Print all main track slides first, followed by detour appendix.
 * @constant {string}
 */
export const PRINT_MODE_APPENDIX = 'appendix';

/**
 * Frozen array of supported print mode identifiers.
 * @constant {ReadonlyArray<string>}
 */
export const PRINT_MODES = Object.freeze([
  PRINT_MODE_MAIN_ONLY,
  PRINT_MODE_INTERLEAVED,
  PRINT_MODE_APPENDIX
]);

/**
 * Base print stylesheet conforming to HTML_SCHEMA.md.
 * Flattens absolute 3D viewport coordinates into sequential print pages.
 *
 * @constant {string}
 */
export const PRINT_BASE_STYLES = `
@media print {
  @page {
    size: landscape;
    margin: 0;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #111111 !important;
    font-size: 14pt !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Flatten presentation viewport */
  #deck {
    position: static !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    perspective: none !important;
    transform: none !important;
    background: #ffffff !important;
    color: #111111 !important;
  }

  /* Flatten sections and pages into regular block flow */
  .deck-section,
  .deck-page {
    position: static !important;
    width: 100% !important;
    height: auto !important;
    transform: none !important;
    visibility: visible !important;
    overflow: visible !important;
    display: block !important;
    page-break-inside: auto !important;
  }

  /* Every slide occupies one full printed page */
  .slide {
    position: relative !important;
    width: 100vw !important;
    min-height: 100vh !important;
    height: 100vh !important;
    box-sizing: border-box !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transform: none !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 3.5rem 5rem !important;
    background: #ffffff !important;
    color: #111111 !important;
    page-break-after: always !important;
    page-break-inside: avoid !important;
    break-after: page !important;
    break-inside: avoid !important;
  }

  /* Clean contrast overrides for headers and text */
  .slide h1, .slide h2, .slide h3 {
    color: #0b0c10 !important;
  }

  .slide p, .slide li {
    color: #2b2d42 !important;
  }

  /* Mode: main-only hides all detour slides */
  #deck[data-print-mode="main-only"] .slide.slide-detour,
  #deck[data-print-mode="main-only"] [data-z]:not([data-z="0"]) {
    display: none !important;
    visibility: hidden !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  /* Mode: interleaved shows both main and detour slides in DOM order */
  #deck[data-print-mode="interleaved"] .slide.slide-detour {
    display: flex !important;
    visibility: visible !important;
    border-left: 4px solid #ff8c5c !important;
  }

  /* Detour indicator badge on print */
  .slide.slide-detour::before {
    content: "[Detour Slide]";
    position: absolute;
    top: 2rem;
    right: 2rem;
    font-family: monospace;
    font-size: 0.8rem;
    color: #ff8c5c;
    border: 1px solid #ff8c5c;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  /* Hide interactive HUD, radar, map overlay, and controls during print */
  #hud,
  .paraslides-hud,
  #paraslides-map,
  .paraslides-map-overlay,
  .slide.slide-main.has-detour::after {
    display: none !important;
    visibility: hidden !important;
  }
}
`.trim();

/**
 * Injects the Print-to-PDF stylesheet into a target document head.
 *
 * @param {Document|object|null} [target] - Target document.
 * @returns {Element|null} The created or existing style element.
 */
export function injectPrintStyles(target = (typeof document !== 'undefined' ? document : null)) {
  if (!target || typeof target.createElement !== 'function') {
    return null;
  }
  const existing = target.getElementById ? target.getElementById('paraslides-print-styles') : null;
  if (existing) {
    return existing;
  }
  const styleEl = target.createElement('style');
  styleEl.id = 'paraslides-print-styles';
  styleEl.textContent = PRINT_BASE_STYLES;
  const head = target.head || (target.querySelector ? target.querySelector('head') : null) || target.body || target;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(styleEl);
  }
  return styleEl;
}

/**
 * Resolves a root container element from an Element, selector, or document.
 *
 * @private
 * @param {Element|string|null|undefined} input
 * @returns {Element|object}
 */
function resolveRoot(input) {
  let target = input;
  if (typeof target === 'string') {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      const found = document.querySelector(target);
      if (!found) {
        throw new TypeError(`No DOM element found matching selector "${target}".`);
      }
      target = found;
    } else {
      throw new TypeError(`Cannot resolve selector "${target}" without a global document.`);
    }
  }

  if (target === null || target === undefined) {
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      target = document.querySelector('#deck') || document.body;
    }
  }

  if (!target || typeof target !== 'object') {
    throw new TypeError('Root element must be a valid DOM element or selector.');
  }

  return target;
}

/**
 * Attaches the Print-to-PDF Layout Adapter to a presentation root element.
 *
 * @param {Element|string|object} [rootElement] - Presentation container (#deck).
 * @param {Window|object} [windowTarget] - Window object for listening to beforeprint/afterprint.
 * @param {object} [options={}] - Options.
 * @param {'main-only'|'interleaved'|'appendix'} [options.mode='interleaved'] - Initial flattening mode.
 * @param {boolean} [options.injectStyles=false] - Whether to automatically inject PRINT_BASE_STYLES.
 * @param {() => void} [options.onBeforePrint] - Optional callback triggered before printing.
 * @param {() => void} [options.onAfterPrint] - Optional callback triggered after printing.
 * @returns {{
 *   setPrintMode: (mode: string) => void,
 *   getPrintMode: () => string,
 *   print: () => void,
 *   destroy: () => void
 * }}
 */
export function attachPrintAdapter(
  rootElement,
  windowTarget = (typeof window !== 'undefined' ? window : null),
  options = {}
) {
  const root = resolveRoot(rootElement);

  if (options.injectStyles) {
    injectPrintStyles();
  }

  let currentMode = PRINT_MODES.includes(options.mode)
    ? options.mode
    : PRINT_MODE_INTERLEAVED;

  /**
   * Sets the active flattening print mode.
   *
   * @param {string} mode - 'main-only' | 'interleaved' | 'appendix'.
   * @throws {TypeError} If mode is not recognized.
   */
  function setPrintMode(mode) {
    if (!PRINT_MODES.includes(mode)) {
      throw new TypeError(`Unknown print mode: "${mode}". Valid modes: ${PRINT_MODES.join(', ')}`);
    }
    currentMode = mode;
    root.setAttribute?.('data-print-mode', currentMode);
  }

  /**
   * Returns the currently configured print flattening mode.
   * @returns {string}
   */
  function getPrintMode() {
    return currentMode;
  }

  // Initialize attribute
  setPrintMode(currentMode);

  function handleBeforePrint() {
    root.setAttribute?.('data-is-printing', 'true');
    if (typeof options.onBeforePrint === 'function') {
      options.onBeforePrint();
    }
  }

  function handleAfterPrint() {
    root.removeAttribute?.('data-is-printing');
    if (typeof options.onAfterPrint === 'function') {
      options.onAfterPrint();
    }
  }

  if (windowTarget && typeof windowTarget.addEventListener === 'function') {
    windowTarget.addEventListener('beforeprint', handleBeforePrint);
    windowTarget.addEventListener('afterprint', handleAfterPrint);
  }

  /**
   * Triggers the browser print dialog.
   */
  function print() {
    if (windowTarget && typeof windowTarget.print === 'function') {
      windowTarget.print();
    }
  }

  /**
   * Cleans up event listeners and attributes.
   */
  function destroy() {
    if (windowTarget && typeof windowTarget.removeEventListener === 'function') {
      windowTarget.removeEventListener('beforeprint', handleBeforePrint);
      windowTarget.removeEventListener('afterprint', handleAfterPrint);
    }
    root.removeAttribute?.('data-print-mode');
    root.removeAttribute?.('data-is-printing');
  }

  return {
    setPrintMode,
    getPrintMode,
    print,
    destroy
  };
}

export default attachPrintAdapter;

/**
 * @file telestrator.js
 * @description Outbound Ephemeral Fading Telestrator Adapter for paraslides.
 *
 * Provides a zero-dependency, hardware-accelerated HTML5 Canvas overlay for live drawing and annotations.
 * Drawn strokes feature natural quadratic bezier smoothing and smoothly fade away over time
 * (ephemeral fading decay), or can be cleared immediately on command.
 * Toggled via COMMAND_TOGGLE_TELESTRATOR (<kbd>t</kbd>) and cleared via COMMAND_CLEAR_TELESTRATOR (<kbd>c</kbd>).
 */

import { MODE_MAIN, MODE_DETOUR } from '../../core/state.js';

/**
 * Base stylesheet for the Ephemeral Telestrator Canvas overlay.
 *
 * @constant {string}
 */
export const TELESTRATOR_BASE_STYLES = `
:root {
  --telestrator-color: var(--accent-main, #5c9eff);
  --telestrator-stroke-width: 3.5px;
  --telestrator-pointer-size: 14px;
}

#telestrator-canvas,
.paraslides-telestrator-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 999;
  display: block;
  user-select: none;
  touch-action: none;
}

#telestrator-canvas.is-active,
.paraslides-telestrator-canvas.is-active {
  pointer-events: auto !important;
  cursor: none !important;
}

#telestrator-canvas[data-mode="DETOUR"],
.paraslides-telestrator-canvas[data-mode="DETOUR"] {
  --telestrator-color: var(--accent-detour, #ff8c5c);
}

#telestrator-pointer,
.paraslides-telestrator-pointer {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--telestrator-pointer-size, 14px);
  height: var(--telestrator-pointer-size, 14px);
  border-radius: 50%;
  background-color: var(--telestrator-current-color, var(--telestrator-color));
  box-shadow: 0 0 8px var(--telestrator-current-color, var(--telestrator-color)),
              0 0 18px var(--telestrator-current-color, var(--telestrator-color));
  pointer-events: none;
  z-index: 10001;
  transform: translate3d(-100px, -100px, 0);
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.03s ease-out;
  will-change: transform, opacity;
}

#telestrator-pointer.is-active,
.paraslides-telestrator-pointer.is-active {
  opacity: 1;
}

#telestrator-pointer[data-mode="DETOUR"],
.paraslides-telestrator-pointer[data-mode="DETOUR"] {
  --telestrator-current-color: var(--accent-detour, #ff8c5c);
}

body.is-cursor-hidden #telestrator-pointer,
body[data-cursor-hidden="true"] #telestrator-pointer {
  opacity: 0 !important;
}
`.trim();

/**
 * Injects telestrator CSS styles into the document head if not already present.
 *
 * @param {Document|object} [doc=document] - Target document.
 * @returns {Element|null} Injected or existing style element.
 */
export function injectTelestratorStyles(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  if (doc.getElementById && doc.getElementById('paraslides-telestrator-styles')) {
    return doc.getElementById('paraslides-telestrator-styles');
  }
  const style = doc.createElement('style');
  style.id = 'paraslides-telestrator-styles';
  style.textContent = TELESTRATOR_BASE_STYLES;
  const head = doc.head || doc.body;
  if (head && typeof head.appendChild === 'function') {
    head.appendChild(style);
  }
  return style;
}

/**
 * Attaches the Ephemeral Fading Telestrator Adapter to a presentation.
 *
 * @param {object} dispatcher - Navigation command dispatcher.
 * @param {Element|object} [container] - Container element to mount canvas (defaults to doc.body).
 * @param {object} [options={}] - Options.
 * @param {number} [options.fadeDurationMs=3000] - Duration in ms before strokes fully fade away (0 disables auto-fade).
 * @param {number} [options.strokeWidth=3.5] - Pen stroke thickness in px.
 * @param {number} [options.pointerSize=14] - Cursor tip glowing dot diameter in px.
 * @param {string|null} [options.color=null] - Fixed stroke color override. If null, adopts active presentation accent.
 * @param {Document|object} [options.document] - Target document override.
 * @param {Window|object} [options.window] - Target window override.
 * @param {boolean} [options.injectStyles=false] - Whether to inject stylesheet into head.
 * @param {(active: boolean) => void} [options.onToggle] - Callback on telestrator mode toggle.
 * @returns {{
 *   toggle: (force?: boolean) => boolean,
 *   enable: () => void,
 *   disable: () => void,
 *   clear: () => void,
 *   isActive: () => boolean,
 *   getStrokeCount: () => number,
 *   destroy: () => void
 * } & (() => void)}
 */
export function attachTelestrator(dispatcher, container = null, options = {}) {
  if (!dispatcher || typeof dispatcher.subscribe !== 'function') {
    throw new TypeError('Dispatcher must provide a subscribe() function.');
  }

  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  const win = options.window || (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null);
  const parent = container || (doc && doc.body) || null;

  const fadeDurationMs = typeof options.fadeDurationMs === 'number' ? Math.max(0, options.fadeDurationMs) : 3000;
  const strokeWidth = typeof options.strokeWidth === 'number' ? Math.max(1, options.strokeWidth) : 3.5;
  const pointerSize = typeof options.pointerSize === 'number' ? Math.max(4, options.pointerSize) : 14;
  const explicitColor = options.color || null;

  if (options.injectStyles) {
    injectTelestratorStyles(doc);
  }

  // Create or locate canvas element
  let canvas = (doc && typeof doc.getElementById === 'function') ? doc.getElementById('telestrator-canvas') : null;
  let created = false;

  if (!canvas && doc && typeof doc.createElement === 'function' && parent) {
    canvas = doc.createElement('canvas');
    canvas.id = 'telestrator-canvas';
    canvas.classList?.add?.('paraslides-telestrator-canvas');
    canvas.setAttribute?.('aria-hidden', 'true');
    canvas.setAttribute?.('data-mode', 'MAIN');
    parent.appendChild(canvas);
    created = true;
  }

  // Create or locate pointer element (glowing pen tip dot)
  let pointerEl = (doc && typeof doc.getElementById === 'function') ? doc.getElementById('telestrator-pointer') : null;
  let pointerCreated = false;

  if (!pointerEl && doc && typeof doc.createElement === 'function' && parent) {
    pointerEl = doc.createElement('div');
    pointerEl.id = 'telestrator-pointer';
    pointerEl.classList?.add?.('paraslides-telestrator-pointer');
    pointerEl.setAttribute?.('aria-hidden', 'true');
    pointerEl.setAttribute?.('data-mode', 'MAIN');
    if (explicitColor) {
      pointerEl.setAttribute?.('style', `--telestrator-current-color: ${explicitColor}`);
    }
    parent.appendChild(pointerEl);
    pointerCreated = true;
  }

  const ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

  let currentMode = MODE_MAIN;
  let isActive = false;
  let isDrawing = false;
  let currentStroke = null;
  const strokes = [];
  let animFrameId = null;

  function updatePointerPosition(e) {
    if (!pointerEl || !e) return;
    const clientX = e.clientX ?? 0;
    const clientY = e.clientY ?? 0;
    const half = pointerSize / 2;
    const transformStyle = `transform: translate3d(${clientX - half}px, ${clientY - half}px, 0);`;

    const existingStyle = pointerEl.getAttribute?.('style') || '';
    const cleanedStyle = existingStyle.replace(/transform:[^;]+;?/gi, '').trim();
    const newStyle = cleanedStyle ? `${cleanedStyle} ${transformStyle}` : transformStyle;
    pointerEl.setAttribute?.('style', newStyle);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const width = (win && win.innerWidth) || 1920;
    const height = (win && win.innerHeight) || 1080;
    const dpr = (win && win.devicePixelRatio) || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    if (ctx && typeof ctx.scale === 'function') {
      ctx.scale(dpr, dpr);
    }
  }

  resizeCanvas();

  function getStrokeColor() {
    if (explicitColor) return explicitColor;
    if (doc && typeof doc.defaultView?.getComputedStyle === 'function' && canvas) {
      try {
        const computed = doc.defaultView.getComputedStyle(canvas).getPropertyValue('--telestrator-color').trim();
        if (computed) return computed;
      } catch {
        // Fallback
      }
    }
    return currentMode === MODE_DETOUR ? '#ff8c5c' : '#5c9eff';
  }

  function renderStrokes(now = Date.now()) {
    if (!canvas || !ctx) return;
    const width = (win && win.innerWidth) || 1920;
    const height = (win && win.innerHeight) || 1080;

    if (typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, width, height);
    }

    let hasActiveStrokes = false;

    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      if (!stroke.points || stroke.points.length === 0) {
        strokes.splice(i, 1);
        continue;
      }

      // Calculate stroke alpha decay with animated easing
      let alpha = 1;
      if (fadeDurationMs > 0 && stroke.endTime !== null) {
        const age = now - stroke.endTime;
        const progress = Math.min(1, Math.max(0, age / fadeDurationMs));
        // Ease-out curve for smooth, organic phosphor dissolve (not a hard delete)
        alpha = Math.max(0, Math.pow(1 - progress, 1.4));
      }

      if (alpha <= 0.005) {
        // Stroke has completely faded away; prune it to free memory
        strokes.splice(i, 1);
        continue;
      }

      hasActiveStrokes = true;

      const points = stroke.points;
      const buildPath = () => {
        ctx.beginPath?.();
        if (points.length === 1) {
          ctx.moveTo?.(points[0].x, points[0].y);
          ctx.lineTo?.(points[0].x + 0.1, points[0].y + 0.1);
        } else if (points.length === 2) {
          ctx.moveTo?.(points[0].x, points[0].y);
          ctx.lineTo?.(points[1].x, points[1].y);
        } else {
          ctx.moveTo?.(points[0].x, points[0].y);
          for (let j = 1; j < points.length - 1; j++) {
            const xc = (points[j].x + points[j + 1].x) / 2;
            const yc = (points[j].y + points[j + 1].y) / 2;
            ctx.quadraticCurveTo?.(points[j].x, points[j].y, xc, yc);
          }
          const last = points[points.length - 1];
          const prev = points[points.length - 2];
          ctx.quadraticCurveTo?.(prev.x, prev.y, last.x, last.y);
        }
      };

      ctx.save?.();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Pass 1: Glowing outer halo / aura
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      if (ctx.shadowBlur !== undefined) {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = Math.round(14 * alpha);
      }
      buildPath();
      ctx.stroke?.();

      // Pass 2: Intense radiant core beam
      if (ctx.shadowBlur !== undefined) {
        ctx.shadowBlur = 0;
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, stroke.width * 0.35);
      ctx.globalAlpha = alpha * 0.85;
      buildPath();
      ctx.stroke?.();

      ctx.restore?.();
    }

    // Continue loop if active fading strokes remain
    if (hasActiveStrokes && fadeDurationMs > 0) {
      if (win && typeof win.requestAnimationFrame === 'function') {
        animFrameId = win.requestAnimationFrame(renderStrokes);
      }
    } else {
      animFrameId = null;
    }
  }

  function startAnimationLoop() {
    if (animFrameId === null && win && typeof win.requestAnimationFrame === 'function') {
      animFrameId = win.requestAnimationFrame(renderStrokes);
    }
  }

  function handlePointerDown(e) {
    if (!isActive) return;
    updatePointerPosition(e);
    isDrawing = true;
    const clientX = e.clientX ?? 0;
    const clientY = e.clientY ?? 0;
    const now = Date.now();

    currentStroke = {
      startTime: now,
      endTime: null,
      color: getStrokeColor(),
      width: strokeWidth,
      points: [{ x: clientX, y: clientY, time: now }]
    };
    strokes.push(currentStroke);
    renderStrokes();
  }

  function handlePointerMove(e) {
    updatePointerPosition(e);
    if (!isActive || !isDrawing || !currentStroke) return;
    const clientX = e.clientX ?? 0;
    const clientY = e.clientY ?? 0;

    currentStroke.points.push({ x: clientX, y: clientY, time: Date.now() });
    renderStrokes();
    startAnimationLoop();
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke) {
      currentStroke.endTime = Date.now();
      currentStroke = null;
    }
    startAnimationLoop();
  }

  function clearAllStrokes() {
    strokes.length = 0;
    currentStroke = null;
    isDrawing = false;
    if (animFrameId !== null && win && typeof win.cancelAnimationFrame === 'function') {
      win.cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    const width = (win && win.innerWidth) || 1920;
    const height = (win && win.innerHeight) || 1080;
    if (ctx && typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, width, height);
    }
  }

  function setTelestratorActive(active) {
    const next = Boolean(active);
    if (isActive === next) return;
    isActive = next;

    if (canvas) {
      if (isActive) {
        canvas.classList?.add?.('is-active');
        canvas.setAttribute?.('data-active', 'true');
      } else {
        canvas.classList?.remove?.('is-active');
        canvas.removeAttribute?.('data-active');
        isDrawing = false;
      }
    }

    if (pointerEl) {
      if (isActive) {
        pointerEl.classList?.add?.('is-active');
        pointerEl.setAttribute?.('data-active', 'true');
      } else {
        pointerEl.classList?.remove?.('is-active');
        pointerEl.removeAttribute?.('data-active');
      }
    }

    if (typeof options.onToggle === 'function') {
      options.onToggle(isActive);
    }
  }

  function toggleTelestrator(force) {
    const next = force !== undefined ? Boolean(force) : !isActive;
    setTelestratorActive(next);
    return isActive;
  }

  // Pointer drawing event listeners
  if (canvas && typeof canvas.addEventListener === 'function') {
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
  }

  // Pointer move tracking across window and document
  const moveTargets = [doc, parent].filter(Boolean);
  for (const target of moveTargets) {
    if (typeof target.addEventListener === 'function') {
      target.addEventListener('pointermove', updatePointerPosition, { passive: true });
      target.addEventListener('mousemove', updatePointerPosition, { passive: true });
    }
  }

  // Window resize listener
  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('resize', resizeCanvas);
  }

  // Subscribe to command dispatcher
  let unsubscribe = dispatcher.subscribe((event) => {
    if (!event || typeof event !== 'object') return;

    if (event.feedback?.toggleTelestrator || event.toggleTelestrator) {
      toggleTelestrator();
    }

    if (event.feedback?.clearTelestrator || event.clearTelestrator) {
      clearAllStrokes();
    }

    const z = typeof event.z === 'number' ? event.z : 0;
    currentMode = event.mode || (z === 0 ? MODE_MAIN : MODE_DETOUR);

    if (canvas) {
      canvas.setAttribute?.('data-mode', currentMode);
    }
    if (pointerEl) {
      pointerEl.setAttribute?.('data-mode', currentMode);
    }
  });

  const destroy = function destroy() {
    setTelestratorActive(false);
    clearAllStrokes();

    if (canvas && typeof canvas.removeEventListener === 'function') {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    }

    for (const target of moveTargets) {
      if (typeof target.removeEventListener === 'function') {
        target.removeEventListener('pointermove', updatePointerPosition);
        target.removeEventListener('mousemove', updatePointerPosition);
      }
    }

    if (win && typeof win.removeEventListener === 'function') {
      win.removeEventListener('resize', resizeCanvas);
    }

    if (created && canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }

    if (pointerCreated && pointerEl && pointerEl.parentNode) {
      pointerEl.parentNode.removeChild(pointerEl);
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  destroy.toggle = (force) => toggleTelestrator(force);
  destroy.enable = () => setTelestratorActive(true);
  destroy.disable = () => setTelestratorActive(false);
  destroy.clear = clearAllStrokes;
  destroy.isActive = () => isActive;
  destroy.getStrokeCount = () => strokes.length;
  destroy.destroy = destroy;

  return destroy;
}

export default attachTelestrator;

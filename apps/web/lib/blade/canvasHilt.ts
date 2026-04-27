// ─── canvasHilt — workbench-rendered hilt, ported as a shared module ───
//
// The workbench (`apps/web/components/editor/BladeCanvas.tsx`) has TWO
// hilt-render paths:
//   1. **Canvas primitives** — drawn directly into the same canvas as the
//      blade using ctx.fillRect / ctx.arc / linear gradients. Used by
//      default for the 9 built-in styles (`minimal` / `classic` / `graflex`
//      / `thin-neck` / `maul` / `dooku` / `kylo` / `ahsoka` / `cal`).
//   2. **HiltRenderer SVG overlay** — for the modular assemblies
//      (`graflex-svg` / `mpp-svg` / etc.). These render as a separate SVG
//      DOM element overlaid on the canvas.
//
// This module is the canonical extraction of path #1. Both BladeCanvas
// (workbench preview) and `lib/sharePack/card/drawHilt.ts` (saber card
// static PNG + animated GIF) consume it, so the hilt that ships in any
// share artifact is byte-identical to the one the user designed in the
// editor.
//
// Pre-2026-04-27 the saber-card path used HiltRenderer for default
// configs, producing a chunky, scaled-up SVG hilt that didn't match the
// workbench's slim canvas-primitive hilt. Custom-hilt support (where a
// user picks one of the SVG-modular assemblies for their saber) ships
// later — for now the card always uses the canvas-primitive hilt for
// share-artifact consistency.

export interface HiltStyle {
  id: string;
  label: string;
  pommelW: number;
  gripW: number;
  shroudW: number;
  emitterW: number;
  hiltH: number;
  shroudInset: number;
  /** Extra height on the emitter (the "flare" past the body's vertical span). */
  emitterFlare: number;
  ribSpacing: number;
  hasButton: boolean;
  hasWindowPort: boolean;
  /** Optional metal tint overlay color — empty string = no tint. */
  metalTint: string;
}

// ─── Color constants (workbench parity) ───
//
// Mirror BladeCanvas.tsx lines 59-65. Inline-duplicated rather than
// re-exported because the workbench file imports a large React module
// graph that the headless saber-card path doesn't want to pull.

export const METAL_DARK = '#2a2a32';
export const METAL_SPEC = '#6a6a78';
export const METAL_RIB = '#1a1a22';
export const EMITTER_DARK = '#555560';
export const EMITTER_LIGHT = '#6a6a74';
export const BUTTON_RED = '#cc0000';
export const BUTTON_SPEC = '#ff6666';

// ─── Style catalog (canvas-primitive paths only) ───
//
// Mirror BladeCanvas.tsx lines 132-153 (the non-`*-svg` entries). The
// SVG-modular entries from the workbench live in `apps/web/lib/hilts/`
// and route through HiltRenderer; they are NOT included here.

export const CANVAS_HILT_STYLES: readonly HiltStyle[] = [
  { id: 'minimal',  label: 'Minimal',         pommelW: 10, gripW:  80, shroudW: 10, emitterW: 16, hiltH: 20, shroudInset: 1, emitterFlare: 1, ribSpacing: 10, hasButton: false, hasWindowPort: false, metalTint: '' },
  { id: 'classic',  label: 'Classic (ANH)',   pommelW: 22, gripW: 110, shroudW: 24, emitterW: 38, hiltH: 28, shroudInset: 4, emitterFlare: 4, ribSpacing:  6, hasButton: true,  hasWindowPort: false, metalTint: '' },
  { id: 'graflex',  label: 'Graflex (ESB)',   pommelW: 18, gripW: 120, shroudW: 16, emitterW: 30, hiltH: 26, shroudInset: 2, emitterFlare: 2, ribSpacing:  4, hasButton: true,  hasWindowPort: true,  metalTint: '#c8b060' },
  { id: 'thin-neck',label: 'Thin Neck (ROTJ)',pommelW: 20, gripW: 100, shroudW: 30, emitterW: 34, hiltH: 26, shroudInset: 7, emitterFlare: 6, ribSpacing:  5, hasButton: true,  hasWindowPort: false, metalTint: '' },
  { id: 'maul',     label: 'Maul (Staff)',    pommelW: 12, gripW: 140, shroudW: 10, emitterW: 22, hiltH: 22, shroudInset: 2, emitterFlare: 1, ribSpacing:  8, hasButton: false, hasWindowPort: false, metalTint: '#a03030' },
  { id: 'dooku',    label: 'Dooku (Curved)',  pommelW: 28, gripW: 105, shroudW: 20, emitterW: 30, hiltH: 30, shroudInset: 3, emitterFlare: 3, ribSpacing:  7, hasButton: true,  hasWindowPort: false, metalTint: '#806040' },
  { id: 'kylo',     label: 'Kylo (Crossguard)',pommelW: 16, gripW: 100, shroudW: 20, emitterW: 48, hiltH: 24, shroudInset: 3, emitterFlare: 8, ribSpacing:  5, hasButton: false, hasWindowPort: false, metalTint: '#404040' },
  { id: 'ahsoka',   label: 'Ahsoka (Fulcrum)',pommelW: 24, gripW:  90, shroudW: 28, emitterW: 42, hiltH: 24, shroudInset: 5, emitterFlare: 5, ribSpacing:  4, hasButton: true,  hasWindowPort: false, metalTint: '#e0e0f0' },
  { id: 'cal',      label: 'Cal Kestis',      pommelW: 20, gripW: 115, shroudW: 18, emitterW: 32, hiltH: 26, shroudInset: 3, emitterFlare: 3, ribSpacing:  6, hasButton: true,  hasWindowPort: true,  metalTint: '#c0a070' },
] as const;

/** Default canvas-hilt style id — matches the workbench's default
 *  (the editor opens with `hiltStyle = 'minimal'` per uiStore). */
export const DEFAULT_CANVAS_HILT_STYLE_ID = 'minimal';

function findHiltStyle(id: string | undefined): HiltStyle {
  if (!id) return CANVAS_HILT_STYLES[0]; // 'minimal' default — matches the workbench
  return (
    CANVAS_HILT_STYLES.find((h) => h.id === id) ?? CANVAS_HILT_STYLES[0]
  );
}

function rgbStr(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ─── Public API ───

export interface DrawCanvasHiltOptions {
  /** Style id (e.g. `'classic'`, `'graflex'`). Falls back to `'classic'`. */
  styleId?: string;
  /** Where the LED strip starts (canvas px). The hilt renders to the LEFT,
   *  ending exactly at `bladeStartX`. */
  bladeStartX: number;
  /** Vertical centerline of the blade (canvas px). */
  centerY: number;
  /** Multiplier on every dimension. 1.0 = workbench's natural size. */
  scale: number;
  /** Lit blade color — drives the window-port glow + emitter color wash.
   *  `null` when the blade is off. */
  bladeColor?: { r: number; g: number; b: number } | null;
}

/**
 * Workbench-parity hilt rendered as canvas primitives. Pure function;
 * no React, no DOM globals beyond the `ctx` argument.
 *
 * Returns the hilt's leftmost X coordinate so callers can frame the
 * surrounding layout (e.g. status chips that anchor to the hilt's pommel).
 */
export function drawCanvasHilt(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  options: DrawCanvasHiltOptions,
): { hiltStartX: number; hiltEndX: number } {
  const {
    styleId,
    bladeStartX,
    centerY,
    scale,
    bladeColor = null,
  } = options;

  const hs = findHiltStyle(styleId);

  const totalHiltW = hs.pommelW + hs.gripW + hs.shroudW + hs.emitterW;
  const hiltStartX = bladeStartX - totalHiltW * scale;
  const hiltH = hs.hiltH * scale;
  const hiltTop = centerY - hiltH / 2;
  const hiltBot = centerY + hiltH / 2;

  let curX = hiltStartX;

  // ── Pommel (rounded left end) ──
  const pommelW = hs.pommelW * scale;
  const pommelGrad = ctx.createLinearGradient(curX, hiltTop, curX, hiltBot);
  pommelGrad.addColorStop(0, '#222228');
  pommelGrad.addColorStop(0.35, '#4a4a54');
  pommelGrad.addColorStop(0.5, METAL_SPEC);
  pommelGrad.addColorStop(0.65, '#4a4a54');
  pommelGrad.addColorStop(1, '#222228');
  ctx.fillStyle = pommelGrad;
  ctx.beginPath();
  // OffscreenCanvasRenderingContext2D supports roundRect in modern engines
  // but fall back gracefully when it doesn't.
  if (typeof (ctx as CanvasRenderingContext2D).roundRect === 'function') {
    (ctx as CanvasRenderingContext2D).roundRect(curX, hiltTop, pommelW, hiltH, [
      4 * scale,
      0,
      0,
      4 * scale,
    ]);
  } else {
    ctx.rect(curX, hiltTop, pommelW, hiltH);
  }
  ctx.fill();
  curX += pommelW;

  // ── Grip section ──
  const gripW = hs.gripW * scale;
  const gripGrad = ctx.createLinearGradient(curX, hiltTop, curX, hiltBot);
  gripGrad.addColorStop(0, METAL_DARK);
  gripGrad.addColorStop(0.3, '#454550');
  gripGrad.addColorStop(0.5, METAL_SPEC);
  gripGrad.addColorStop(0.7, '#454550');
  gripGrad.addColorStop(1, METAL_DARK);
  ctx.fillStyle = gripGrad;
  ctx.fillRect(curX, hiltTop, gripW, hiltH);

  // Grip ribbing
  ctx.strokeStyle = METAL_RIB;
  ctx.lineWidth = 1;
  const ribSp = hs.ribSpacing * scale;
  for (let x = curX + ribSp; x < curX + gripW - 4 * scale; x += ribSp) {
    ctx.beginPath();
    ctx.moveTo(x, hiltTop + 3 * scale);
    ctx.lineTo(x, hiltBot - 3 * scale);
    ctx.stroke();
  }

  // Window port (Graflex-style)
  if (hs.hasWindowPort) {
    const wpX = curX + gripW * 0.6;
    const wpW = 12 * scale;
    const wpH = hiltH * 0.5;
    const wpY = hiltTop + (hiltH - wpH) / 2;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(wpX, wpY, wpW, wpH);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(wpX, wpY, wpW, wpH);
    if (bladeColor) {
      ctx.fillStyle = rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0.15);
      ctx.fillRect(wpX + 1, wpY + 1, wpW - 2, wpH - 2);
    }
  }

  // Button
  if (hs.hasButton) {
    const buttonX = curX + gripW / 2;
    const buttonY = hiltTop - 3 * scale;
    ctx.fillStyle = BUTTON_RED;
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BUTTON_SPEC;
    ctx.beginPath();
    ctx.arc(buttonX - 1 * scale, buttonY - 1 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  curX += gripW;

  // ── Shroud / neck ──
  const shroudW = hs.shroudW * scale;
  const shroudInset = hs.shroudInset * scale;
  const shroudGrad = ctx.createLinearGradient(curX, hiltTop + shroudInset, curX, hiltBot - shroudInset);
  shroudGrad.addColorStop(0, '#333340');
  shroudGrad.addColorStop(0.5, '#5a5a64');
  shroudGrad.addColorStop(1, '#333340');
  ctx.fillStyle = shroudGrad;
  ctx.fillRect(curX, hiltTop + shroudInset, shroudW, hiltH - shroudInset * 2);
  curX += shroudW;

  // ── Emitter section ──
  const emW = hs.emitterW * scale;
  const flare = hs.emitterFlare * scale;
  const emitterGrad = ctx.createLinearGradient(curX, hiltTop - flare, curX, hiltBot + flare);
  emitterGrad.addColorStop(0, EMITTER_DARK);
  emitterGrad.addColorStop(0.3, EMITTER_LIGHT);
  emitterGrad.addColorStop(0.5, '#7a7a84');
  emitterGrad.addColorStop(0.7, EMITTER_LIGHT);
  emitterGrad.addColorStop(1, EMITTER_DARK);
  ctx.fillStyle = emitterGrad;
  ctx.fillRect(curX, hiltTop - flare, emW, hiltH + flare * 2);

  // Metal tint overlay
  if (hs.metalTint) {
    ctx.fillStyle = hs.metalTint;
    ctx.globalAlpha = 0.06;
    ctx.fillRect(hiltStartX, hiltTop, curX + emW - hiltStartX, hiltH);
    ctx.globalAlpha = 1;
  }

  // Emitter bore glow when blade is on
  if (bladeColor) {
    const boreX = curX + emW;
    const boreR = 14 * scale;
    const boreGrad = ctx.createRadialGradient(boreX, centerY, 0, boreX, centerY, boreR);
    boreGrad.addColorStop(0, rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0.5));
    boreGrad.addColorStop(1, rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0));
    ctx.fillStyle = boreGrad;
    ctx.beginPath();
    ctx.arc(boreX, centerY, boreR, 0, Math.PI * 2);
    ctx.fill();

    // Subtle color wash on emitter body
    ctx.fillStyle = rgbStr(bladeColor.r, bladeColor.g, bladeColor.b, 0.06);
    ctx.fillRect(curX, hiltTop - flare, emW, hiltH + flare * 2);
  }

  return { hiltStartX, hiltEndX: bladeStartX };
}

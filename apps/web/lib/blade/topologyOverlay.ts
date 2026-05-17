// ─── Topology side-blade overlays ────────────────────────────────────
//
// Schematic overlays that render the secondary blades / quillons for
// non-linear blade topologies (crossguard, triple-fan). The main blade
// is drawn via the full per-LED capsule rasterizer + bloom pipeline;
// these overlays paint the secondary geometry on top using simpler
// halo + saturated-core + white-hot-center stacks driven by the
// average head-LED color.
//
// Originally inlined in `apps/web/components/editor/BladeCanvas.tsx`
// (`drawBladeView`, the crossguard + triple branches). Extracted as
// part of the renderer-level golden-hash full-coverage push (post-
// launch backlog "Renderer-level golden-hash full coverage", v0.22.x).
//
// === Topologies covered here ===
//   • Crossguard — two short perpendicular quillon blades at the
//     emitter. Vertical bars + halo + bright core + white-hot center.
//   • Triple-fan — two angled secondary blades fanning forward at ±30°
//     from the emitter, forming a trident silhouette. Same halo +
//     core + center stack as crossguard, applied in a rotated frame.
//
// === Topologies NOT covered here ===
//   • Staff — implemented as two mirrored `drawBlade` calls with
//     canvas translates. No schematic overlay, just transform stack.
//   • Inquisitor — spinning ring overlay; lives in the original
//     `drawBladeView` since the spin animation needs per-frame
//     `performance.now()`. Could be extracted in a follow-up.
//   • Single — just calls `drawBlade(ctx, engine)`.
//
// === Renderer-level golden-hash coverage ===
// `apps/web/tests/rendererGoldenHash/inlineRenderPaths.test.ts` pins
// the rasterized output of `drawCrossguardOverlay` +
// `drawTripleFanOverlay` for canonical configs. Any drift in the halo
// blur / core multiplier / white-hot stripe geometry will fail the
// snapshot.

/**
 * Random-access LED color reader shape. Matches the engine's
 * `BladeEngine.leds` (and the shared `LedBufferLike` in `types.ts`).
 */
export interface LedReader {
  getR(i: number): number;
  getG(i: number): number;
  getB(i: number): number;
  count: number;
}

/**
 * Compute the average color of the first `n` LEDs (or fewer if the
 * buffer is shorter). Matches the inline behavior in BladeCanvas —
 * used to drive overlay halo + core colors.
 *
 * Returns RGB scaled by the brightness multiplier; channels stay in
 * 0-255-ish range (caller's brightness can theoretically overshoot,
 * matching the inline `* bri` math without clamping).
 */
export function averageHeadLedColor(
  leds: LedReader,
  bri: number,
  headCount: number,
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, count = 0;
  const limit = Math.min(headCount, leds.count);
  for (let i = 0; i < limit; i++) {
    r += leds.getR(i);
    g += leds.getG(i);
    b += leds.getB(i);
    count++;
  }
  if (count > 0) {
    r = (r / count) * bri;
    g = (g / count) * bri;
    b = (b / count) * bri;
  }
  return { r, g, b };
}

/** Parameters for `drawCrossguardOverlay`. */
export interface CrossguardOverlayParams {
  /** Workbench scale factor (design-space → canvas-px). */
  scale: number;
  /** Emitter X coordinate (canvas px). */
  emitterX: number;
  /** Blade vertical centerline (canvas px). */
  bladeY: number;
  /**
   * 0–1 progress for ignition. Crossguard quillons start extending
   * at `extendProgress ≥ 0.1` and complete by `extendProgress ≥ 0.4`.
   * No-op when the gated `qProgress ≤ 0`.
   */
  extendProgress: number;
  /** Average color of the first 6 LEDs × brightness multiplier. */
  avgColor: { r: number; g: number; b: number };
}

/**
 * Paint two short perpendicular quillon blades (above + below the
 * emitter) for the crossguard topology.
 *
 * Stack per-quillon:
 *   1. Outer halo — `lighter` blend, blurred 12 × scale px, α = 0.3 × qProgress.
 *   2. Saturated core — RGB × 1.4 boost, α = 0.9 × qProgress (normal blend).
 *   3. White-hot center stripe — α = 0.6 × qProgress.
 *
 * The quillon length is 60 × scale; thickness 6 × scale. Both quillons
 * grow with `qProgress`, with the upper quillon extending up from
 * `bladeY` and the lower quillon extending down from `bladeY`.
 *
 * Uses ctx.save/restore around the halo pass for filter + composite
 * isolation; everything else paints in the default normal blend.
 */
export function drawCrossguardOverlay(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  params: CrossguardOverlayParams,
): void {
  const { scale, emitterX, bladeY, extendProgress, avgColor } = params;
  if (extendProgress <= 0) return;
  const qProgress = Math.min(1, Math.max(0, (extendProgress - 0.1) / 0.3));
  if (qProgress <= 0) return;

  const quillonLen = 60 * scale;
  const quillonH = 6 * scale;
  const r = Math.round(avgColor.r);
  const g = Math.round(avgColor.g);
  const b = Math.round(avgColor.b);
  const len = quillonLen * qProgress;

  // Outer halo — additive blurred fill (both quillons).
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${12 * scale}px)`;
  ctx.globalAlpha = 0.3 * qProgress;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(emitterX - quillonH / 2, bladeY - len, quillonH, len);
  ctx.fillRect(emitterX - quillonH / 2, bladeY, quillonH, len);
  ctx.restore();

  // Saturated core — RGB × 1.5 boost (matches inline; brighter than
  // triple-fan's × 1.4 because the quillons are skinnier).
  const coreR = Math.round(Math.min(255, avgColor.r * 1.5));
  const coreG = Math.round(Math.min(255, avgColor.g * 1.5));
  const coreB = Math.round(Math.min(255, avgColor.b * 1.5));
  ctx.fillStyle = `rgba(${coreR},${coreG},${coreB},${0.9 * qProgress})`;
  ctx.fillRect(emitterX - quillonH / 4, bladeY - len, quillonH / 2, len);
  ctx.fillRect(emitterX - quillonH / 4, bladeY, quillonH / 2, len);

  // White-hot center stripe.
  ctx.fillStyle = `rgba(255,255,255,${0.6 * qProgress})`;
  ctx.fillRect(emitterX - 1 * scale, bladeY - len, 2 * scale, len);
  ctx.fillRect(emitterX - 1 * scale, bladeY, 2 * scale, len);
}

/** Parameters for `drawTripleFanOverlay`. */
export interface TripleFanOverlayParams {
  /** Workbench scale factor (design-space → canvas-px). */
  scale: number;
  /** Emitter X coordinate (canvas px). */
  emitterX: number;
  /** Blade vertical centerline (canvas px). */
  bladeY: number;
  /**
   * 0–1 progress for ignition. Triple-fan secondaries start extending
   * at `extendProgress ≥ 0.1` and complete by `extendProgress ≥ 0.5`.
   * No-op when the gated `sProgress ≤ 0`.
   */
  extendProgress: number;
  /** Average color of the first 8 LEDs × brightness multiplier. */
  avgColor: { r: number; g: number; b: number };
  /**
   * Visible main-blade length in canvas px. Secondary length is 70 %
   * of this (engine spec: 0.35 vs main 0.5).
   */
  mainLenPx: number;
  /**
   * Canvas height in device-pixel coordinates. Used to cap the
   * secondary length so the tip never clips off the bottom of the
   * canvas. Pass `canvasCssH * dpr`.
   */
  canvasPxH: number;
}

/**
 * Paint two angled secondary blades fanning forward at ±30° from the
 * emitter, forming a trident silhouette for the triple topology.
 *
 * Per-secondary stack (drawn in a rotated frame):
 *   1. Outer halo — `lighter` blend, blurred 10 × scale px, α = 0.32.
 *   2. Saturated core — RGB × 1.4 boost, α = 0.9 (normal blend).
 *   3. White-hot center stripe — α = 0.55.
 *
 * The fan length is `min(mainLenPx × 0.7, canvasPxH × 0.45 / sin(30°))`
 * — capped to the diagonal that fits vertically.
 *
 * Wraps each secondary in ctx.save/restore so the rotation + filter
 * state stays scoped.
 */
export function drawTripleFanOverlay(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  params: TripleFanOverlayParams,
): void {
  const { scale, emitterX, bladeY, extendProgress, avgColor, mainLenPx, canvasPxH } = params;
  if (extendProgress <= 0) return;
  const sProgress = Math.min(1, Math.max(0, (extendProgress - 0.1) / 0.4));
  if (sProgress <= 0) return;

  const desiredSecondaryLen = mainLenPx * 0.7;
  const fanAngleRad = (30 * Math.PI) / 180;
  const verticalFitLen = (canvasPxH * 0.45) / Math.sin(fanAngleRad);
  const secondaryLenPx = Math.min(desiredSecondaryLen, verticalFitLen);
  const secondaryH = 7 * scale;
  const angles = [-fanAngleRad, fanAngleRad];
  const r = Math.round(avgColor.r);
  const g = Math.round(avgColor.g);
  const b = Math.round(avgColor.b);
  const coreR = Math.round(Math.min(255, avgColor.r * 1.4));
  const coreG = Math.round(Math.min(255, avgColor.g * 1.4));
  const coreB = Math.round(Math.min(255, avgColor.b * 1.4));

  for (const a of angles) {
    const len = secondaryLenPx * sProgress;
    ctx.save();
    ctx.translate(emitterX, bladeY);
    ctx.rotate(a);

    // Outer halo — additive blurred fill.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${10 * scale}px)`;
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, -secondaryH / 2, len, secondaryH);
    ctx.restore();

    // Saturated core.
    ctx.fillStyle = `rgba(${coreR},${coreG},${coreB},0.9)`;
    ctx.fillRect(0, -secondaryH / 3, len, (secondaryH * 2) / 3);

    // White-hot center stripe.
    ctx.fillStyle = `rgba(255,255,255,0.55)`;
    ctx.fillRect(0, -1 * scale, len, 2 * scale);

    ctx.restore();
  }
}

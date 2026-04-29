// ─── bladeRenderHeadless — headless port of the v0.14 workbench blade pipeline ───
//
// Mirrors the per-LED capsule rasterizer + 3-mip bloom chain that lives
// inline in `apps/web/components/editor/BladeCanvas.tsx`'s
// `drawBladePhotorealistic`. Used by `renderCardGif` so animated GIFs
// show the SAME blade visual the user sees in the workbench preview,
// not the static stylised gradient that `card/drawBlade.ts` paints for
// the still PNG card.
//
// Design constraint:
//   The workbench owns the canonical pipeline. This module is a pure
//   port — same rasterizer math, same bloom mip layout, same plateau /
//   feather curve. BladeCanvas.tsx is NOT modified by this sprint;
//   keeping the workbench untouched keeps blast radius zero for the
//   live editor. The deferred Phase 4 module-extraction (per CLAUDE.md
//   "Still open") will eventually collapse the two into one shared
//   module and migrate BladeCanvas + this file + drawBlade.ts +
//   MiniSaber to call it.
//
// What this port covers:
//   • per-LED capsule rasterizer with Gaussian-α + plateau + tip
//     extension + axial linear interpolation between adjacent LEDs
//   • 3-mip downsampled bright-pass bloom chain (1/2 + 1/4 + 1/8 of
//     canvas dims), each with `contrast(1.15) brightness(1.05) blur(N)`
//   • additive `lighter` body composite over the bloom
//   • per-color `getGlowProfile` tuning (red / blue / green / amber /
//     amethyst / cyan / orange / pink / fallback)
//
// What this port DOES NOT cover (intentional, sprint-1 scope):
//   • diffusion soft-blur — the capsule is sharp; the bloom mips are
//     the only smoothing. Heavy diffusion tubes are not modelled.
//   • motion blur (`swing` ghost buffer) — there's no motion data per
//     captureSequence frame.
//   • ignition flash radial burst — would need transient per-frame
//     flash state we don't track.
//   • ambient mip-2 luma wash + vignette coupling — cosmetic, not
//     load-bearing for blade identity.
//   • rim glow — the v0.14 thin saturated-stroke top/bottom rim.
//
// Reference invariants (kept in sync with BladeCanvas.tsx):
//   • PLATEAU_END = 0.16, COLOR_END = 0.40 — same plateau-then-lerp
//   • α profile: (0.0,1.0) → (0.25,0.95) → (0.5,0.7) → (0.7,0.35) →
//     (0.85,0.10) → (1.0,0.0)
//   • tipExtension = radius * 0.15 — α reaches 0 at the geometric tip,
//     visible-bright reaches the LED endpoint exactly.
//   • mip alphas: 0.65 / 0.52 / 0.45 (mip 0 / 1 / 2)
//   • mip blur radii: 6/10/14 px × bloomRadius
//
// Test seam: `defaultBladeRenderHeadless` is exported as a named
// callback so the test fake can stand in for it without touching the
// canvas pipeline.

// ─── Public types ─────────────────────────────────────────────────────

export interface LedBufferLike {
  getR(i: number): number;
  getG(i: number): number;
  getB(i: number): number;
  count: number;
}

export interface BladeRenderOptions {
  /** Visible-canvas X coordinate where the LED strip starts. */
  bladeStartPx: number;
  /** Length of the LED strip along the X axis, in canvas px. */
  bladeLenPx: number;
  /** Vertical centerline of the blade in canvas px. */
  bladeYPx: number;
  /** Capsule height (= 2 × radius). */
  coreH: number;
  /** Total canvas width (clamps the rasterizer bounding box). */
  cw: number;
  /** Total canvas height (clamps the rasterizer bounding box). */
  ch: number;
  /**
   * Multiplier applied to each LED's RGB before rasterization. Defaults
   * to 1.0 — the engine has already applied its own ignition / mask
   * scaling when the buffer was captured.
   */
  effectiveBri?: number;
  /**
   * Per-frame ±3 % shimmer multiplier — caller can pass a tiny random
   * jitter for the "alive" feel. Defaults to 1.0 (no shimmer).
   */
  shimmer?: number;
  /**
   * Hilt-tuck distance — capsule's left cap extends this far behind
   * `bladeStartPx`. Bloom mips still sample the extended region so the
   * halo bleeds onto the hilt naturally. Defaults to `coreH`.
   */
  hiltTuck?: number;
  /**
   * Disables the bloom + body-composite passes when set — used by
   * the a11y `reduceBloom` flag in the workbench. Defaults to false.
   */
  reduceBloom?: boolean;
  /**
   * When true, the bloom + body composite passes use `'screen'` blend
   * mode instead of `'lighter'`. `'lighter'` is additive (a + b) which
   * saturates to pure white when the backdrop is already bright —
   * looks great on dark themes but blows out on Saber Card's
   * `LIGHT_THEME` (paper-white backdrop). `'screen'` (1 − (1−a)(1−b))
   * is the natural light-backdrop sibling: same "additively brighten"
   * intent, soft-clipped at 1.0, no white-out. Defaults to false (dark
   * theme — keep additive behavior). Source:
   * `docs/POST_LAUNCH_BACKLOG.md` v0.15.x "Light-theme blade bloom
   * theme-gating".
   */
  lightBackdrop?: boolean;
}

// ─── Per-color glow profile ───────────────────────────────────────────

export interface GlowProfile {
  /** White-shift amount for the inner core plateau. 0.95 = mostly
   *  white, 0.80 = small white pop. */
  coreWhiteout: number;
  /** Multiplier on the per-mip blur radii. */
  bloomRadius: number;
  /** Multiplier on the bloom composite alpha. */
  bloomIntensity: number;
  /** Saturation boost applied before bloom-pass to prevent washout. */
  colorSaturation: number;
}

/**
 * Pick a glow profile from the average lit-LED RGB. Matches the
 * `getGlowProfile` table in BladeCanvas.tsx 1:1.
 */
export function getGlowProfile(r: number, g: number, b: number): GlowProfile {
  const max = Math.max(r, g, b);
  if (max < 1) return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0 };
  // Pure white / unlit-fallback
  if (r > 200 && g > 200 && b > 200) {
    return { coreWhiteout: 0.95, bloomRadius: 1.4, bloomIntensity: 1.3, colorSaturation: 0.3 };
  }
  // Red — saturated
  if (r > g * 1.5 && r > b * 1.5) {
    return { coreWhiteout: 0.80, bloomRadius: 1.1, bloomIntensity: 1.4, colorSaturation: 1.3 };
  }
  // Blue
  if (b > r * 1.5 && b > g * 1.2) {
    return { coreWhiteout: 0.88, bloomRadius: 1.5, bloomIntensity: 1.4, colorSaturation: 0.95 };
  }
  // Green
  if (g > r * 1.3 && g > b * 1.3) {
    return { coreWhiteout: 0.90, bloomRadius: 1.5, bloomIntensity: 1.45, colorSaturation: 0.9 };
  }
  // Amber / orange (warm yellow)
  if (r > 180 && g > 100 && b < 100) {
    return { coreWhiteout: 0.85, bloomRadius: 1.3, bloomIntensity: 1.3, colorSaturation: 1.0 };
  }
  // Amethyst (red + blue)
  if (r > 100 && b > 100 && g < r && g < b) {
    return { coreWhiteout: 0.85, bloomRadius: 1.4, bloomIntensity: 1.35, colorSaturation: 0.8 };
  }
  // Cyan (green + blue)
  if (g > 100 && b > 100 && r < g && r < b) {
    return { coreWhiteout: 0.92, bloomRadius: 1.3, bloomIntensity: 1.35, colorSaturation: 0.9 };
  }
  // Pink (red + green)
  if (r > 150 && g > 80 && b > 80 && r > b) {
    return { coreWhiteout: 0.86, bloomRadius: 1.2, bloomIntensity: 1.25, colorSaturation: 1.1 };
  }
  return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0 };
}

// ─── Internal helpers ─────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerpToWhite(channel: number, t: number): number {
  return channel + (255 - channel) * t;
}

/**
 * Per-LED whiteout amount used by the inner-core plateau lerp. Bright
 * lit LEDs push toward white; dim LEDs barely shift. Mirrors the
 * helper in BladeCanvas.tsx.
 */
function ledCoreWhiteAmount(r: number, g: number, b: number, coreWhiteout: number): number {
  const max = Math.max(r, g, b);
  if (max < 1) return 0;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  // Brighter LEDs reach the configured whiteout; dimmer ones lerp
  // proportionally so dark LED columns stay tinted.
  const t = clamp(luma / 220, 0, 1);
  return coreWhiteout * t;
}

function saturateRGB(r: number, g: number, b: number, amount: number): [number, number, number] {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    clamp(gray + (r - gray) * (1 + amount), 0, 255),
    clamp(gray + (g - gray) * (1 + amount), 0, 255),
    clamp(gray + (b - gray) * (1 + amount), 0, 255),
  ];
}

// ─── Capsule rasterizer ───────────────────────────────────────────────
//
// Direct port of `rasterizeCapsuleToOffscreen` from BladeCanvas.tsx.
// Pure function — writes RGBA directly via `getImageData` /
// `putImageData`. No DOM beyond the passed-in 2D context.

function rasterizeCapsule(
  offCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  leds: LedBufferLike,
  bladeStartPx: number,
  bladeLenPx: number,
  bladeYPx: number,
  coreH: number,
  effectiveBri: number,
  shimmer: number,
  coreWhiteout: number,
  cw: number,
  ch: number,
  hiltTuck: number,
): void {
  const radius = coreH * 0.5;
  if (radius < 1 || bladeLenPx < 1) return;
  const ledCount = leds.count;
  if (ledCount < 1) return;

  // Tip extension removed — true semicircular end cap. See BladeCanvas.tsx
  // for the full rationale. Matches the workbench renderer 1:1.
  const tipExtension = 0;
  const emitterX = bladeStartPx - hiltTuck;
  const tipX = bladeStartPx + bladeLenPx + tipExtension;
  const leftCapAxisX = emitterX + radius;
  const rightCapAxisX = tipX - radius;

  const minX = Math.max(0, Math.floor(emitterX));
  const maxX = Math.min(cw, Math.ceil(tipX));
  const minY = Math.max(0, Math.floor(bladeYPx - radius));
  const maxY = Math.min(ch, Math.ceil(bladeYPx + radius));
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 1 || height < 1) return;

  // Per-LED color cache (mirrors BladeCanvas.tsx — collapses
  // 4×ledCount × pixelCount calls down to 4×ledCount).
  const ledR = new Float32Array(ledCount);
  const ledG = new Float32Array(ledCount);
  const ledB = new Float32Array(ledCount);
  const ledWhite = new Float32Array(ledCount);
  for (let i = 0; i < ledCount; i++) {
    const r = leds.getR(i) * effectiveBri * shimmer;
    const g = leds.getG(i) * effectiveBri * shimmer;
    const b = leds.getB(i) * effectiveBri * shimmer;
    ledR[i] = r;
    ledG[i] = g;
    ledB[i] = b;
    ledWhite[i] = ledCoreWhiteAmount(r, g, b, coreWhiteout);
  }

  const imgData = offCtx.getImageData(minX, minY, width, height);
  const data = imgData.data;

  const PLATEAU_END = 0.16;
  const COLOR_END = 0.40;
  const COLOR_LERP_DENOM = COLOR_END - PLATEAU_END;
  const radiusInv = 1 / radius;
  const bladeLenInv = 1 / bladeLenPx;
  const ledSpan = ledCount - 1;

  for (let px = minX; px < maxX; px++) {
    let t = (px - bladeStartPx) * bladeLenInv;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const f = t * ledSpan;
    let i0 = f | 0;
    if (i0 >= ledSpan) i0 = ledSpan;
    const i1 = i0 < ledSpan ? i0 + 1 : ledSpan;
    const wHi = f - i0;
    const wLo = 1 - wHi;

    const r = ledR[i0] * wLo + ledR[i1] * wHi;
    const g = ledG[i0] * wLo + ledG[i1] * wHi;
    const b = ledB[i0] * wLo + ledB[i1] * wHi;
    if (r + g + b < 0.5) continue;

    const wWhite = ledWhite[i0] * wLo + ledWhite[i1] * wHi;
    const cR = lerpToWhite(r, wWhite);
    const cG = lerpToWhite(g, wWhite);
    const cB = lerpToWhite(b, wWhite);

    let dxAxis: number;
    if (px < leftCapAxisX) dxAxis = px - leftCapAxisX;
    else if (px > rightCapAxisX) dxAxis = px - rightCapAxisX;
    else dxAxis = 0;
    const dxSq = dxAxis * dxAxis;

    for (let py = minY; py < maxY; py++) {
      const dy = py - bladeYPx;
      const distSq = dxSq + dy * dy;
      if (distSq > radius * radius) continue;

      const dist = Math.sqrt(distSq);
      const nr = dist * radiusInv;

      // α profile: (0.0,1.0) → (0.25,0.95) → (0.5,0.7) →
      // (0.7,0.35) → (0.85,0.1) → (1.0,0.0).
      let alpha: number;
      if (nr <= 0.25) alpha = 1.00 - nr * 0.20;
      else if (nr <= 0.50) alpha = 0.95 - (nr - 0.25) * 1.00;
      else if (nr <= 0.70) alpha = 0.70 - (nr - 0.50) * 1.75;
      else if (nr <= 0.85) alpha = 0.35 - (nr - 0.70) * (5 / 3);
      else alpha = 0.10 - (nr - 0.85) * (2 / 3);

      let outR: number, outG: number, outB: number;
      if (nr <= PLATEAU_END) {
        outR = cR; outG = cG; outB = cB;
      } else if (nr >= COLOR_END) {
        outR = r; outG = g; outB = b;
      } else {
        const lt = (nr - PLATEAU_END) / COLOR_LERP_DENOM;
        outR = cR + (r - cR) * lt;
        outG = cG + (g - cG) * lt;
        outB = cB + (b - cB) * lt;
      }

      const idx = ((py - minY) * width + (px - minX)) * 4;
      data[idx] = outR;
      data[idx + 1] = outG;
      data[idx + 2] = outB;
      data[idx + 3] = (alpha * 255) | 0;
    }
  }

  offCtx.putImageData(imgData, minX, minY);
}

// ─── Average lit LED color — drives glow-profile lookup ───────────────

function averageLitColor(
  leds: LedBufferLike,
  effectiveBri: number,
): { r: number; g: number; b: number; count: number } {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < leds.count; i++) {
    const lr = leds.getR(i) * effectiveBri;
    const lg = leds.getG(i) * effectiveBri;
    const lb = leds.getB(i) * effectiveBri;
    if (lr + lg + lb > 1) {
      r += lr;
      g += lg;
      b += lb;
      n++;
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0, count: 0 };
  return { r: r / n, g: g / n, b: b / n, count: n };
}

// ─── Public — convert a Uint8Array LED buffer to the rasterizer's interface ───

export function ledBufferFrom(rgbBuffer: Uint8Array): LedBufferLike {
  const count = (rgbBuffer.length / 3) | 0;
  return {
    count,
    getR: (i) => rgbBuffer[i * 3],
    getG: (i) => rgbBuffer[i * 3 + 1],
    getB: (i) => rgbBuffer[i * 3 + 2],
  };
}

// ─── Public — main render entry point ─────────────────────────────────

/**
 * Render a workbench-style blade onto the given 2D context using the
 * given LED buffer. Allocates short-lived offscreen canvases for the
 * bloom mip chain; nothing is retained between calls.
 *
 * Pre-conditions:
 *   • `ctx` belongs to a real `<canvas>` (gif.js's addFrame can't read
 *     OffscreenCanvas pixels).
 *   • The 2D context has `getImageData` available (no `willReadFrequently`
 *     annotation needed for sprint 1's frame-rate budget).
 */
export function drawWorkbenchBlade(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  leds: LedBufferLike,
  options: BladeRenderOptions,
): void {
  const {
    bladeStartPx,
    bladeLenPx,
    bladeYPx,
    coreH,
    cw,
    ch,
  } = options;
  const effectiveBri = options.effectiveBri ?? 1.0;
  const shimmer = options.shimmer ?? 1.0;
  const hiltTuck = options.hiltTuck ?? coreH;
  const reduceBloom = options.reduceBloom ?? false;
  const lightBackdrop = options.lightBackdrop ?? false;
  const additiveComposite: GlobalCompositeOperation = lightBackdrop
    ? 'screen'
    : 'lighter';

  if (bladeLenPx < 1 || coreH < 1) return;

  // Pick a glow profile from the average lit-LED color.
  const avg = averageLitColor(leds, effectiveBri);
  if (avg.count === 0) {
    // Fully unlit blade — no rasterization, no bloom. Caller's chrome
    // (hilt etc.) is unaffected.
    return;
  }
  const glow = getGlowProfile(avg.r, avg.g, avg.b);

  // Pre-saturate the per-color profile (used downstream for ignition
  // flash etc. in BladeCanvas; here it's reserved for future passes).
  void saturateRGB;

  // ── Allocate the sharp offscreen + 3 bloom mips ──
  const offscreen = createOffscreenCanvas(cw, ch);
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;
  offCtx.clearRect(0, 0, cw, ch);

  // ── Pass 01: capsule rasterizer ──
  rasterizeCapsule(
    offCtx,
    leds,
    bladeStartPx,
    bladeLenPx,
    bladeYPx,
    coreH,
    effectiveBri,
    shimmer,
    glow.coreWhiteout,
    cw,
    ch,
    hiltTuck,
  );

  // ── Bloom mip chain (skipped under reduceBloom) ──
  if (!reduceBloom) {
    const br = glow.bloomRadius;
    const bi = glow.bloomIntensity;
    const mipDefs = [
      { w: Math.max(1, Math.ceil(cw / 2)), h: Math.max(1, Math.ceil(ch / 2)), blurPx: 6 * br, alpha: 0.65 },
      { w: Math.max(1, Math.ceil(cw / 4)), h: Math.max(1, Math.ceil(ch / 4)), blurPx: 10 * br, alpha: 0.52 },
      { w: Math.max(1, Math.ceil(cw / 8)), h: Math.max(1, Math.ceil(ch / 8)), blurPx: 14 * br, alpha: 0.45 },
    ];
    const mipCanvases: Array<HTMLCanvasElement | OffscreenCanvas> = [];

    // Populate each mip with a downsampled bright-pass + blur pass.
    for (const def of mipDefs) {
      const mip = createOffscreenCanvas(def.w, def.h);
      const mCtx = mip.getContext('2d');
      if (!mCtx) continue;
      mCtx.clearRect(0, 0, def.w, def.h);
      mCtx.save();
      mCtx.filter = `contrast(1.15) brightness(1.05) blur(${def.blurPx}px)`;
      mCtx.drawImage(
        offscreen as unknown as CanvasImageSource,
        0,
        0,
        cw,
        ch,
        0,
        0,
        def.w,
        def.h,
      );
      mCtx.restore();
      mipCanvases.push(mip);
    }

    // Composite mips additively onto the main canvas. `lighter` is the
    // dark-backdrop default; `screen` is the light-backdrop sibling per
    // the lightBackdrop option.
    ctx.save();
    ctx.globalCompositeOperation = additiveComposite;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (let i = 0; i < mipCanvases.length; i++) {
      const def = mipDefs[i];
      ctx.globalAlpha = def.alpha * bi * shimmer;
      ctx.drawImage(
        mipCanvases[i] as unknown as CanvasImageSource,
        0,
        0,
        def.w,
        def.h,
        0,
        0,
        cw,
        ch,
      );
    }
    ctx.restore();
  }

  // ── Pass 12: capsule body composited additively, clipped to x ≥ bladeStartPx ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(bladeStartPx, 0, cw - bladeStartPx, ch);
  ctx.clip();
  ctx.globalCompositeOperation = additiveComposite;
  ctx.drawImage(offscreen as unknown as CanvasImageSource, 0, 0);
  ctx.restore();
}

// ─── Offscreen canvas helper (test-friendly) ──────────────────────────

function createOffscreenCanvas(
  w: number,
  h: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  throw new Error('bladeRenderHeadless: no canvas implementation available');
}

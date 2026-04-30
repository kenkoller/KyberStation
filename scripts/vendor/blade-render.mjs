// ─── blade-render.mjs — pure-JS port of bladeRenderHeadless.ts ───
//
// 1:1 port of the headless capsule + 3-mip bloom blade renderer that
// lives in `apps/web/lib/sharePack/bladeRenderHeadless.ts`. This module
// is a Node-friendly ESM equivalent so the marketing-GIF build script
// can run without `tsx` (Sprint 2's dep) or any new TypeScript loader.
//
// The TS source is the canonical implementation; this is a hand-port
// kept structurally identical so cross-checking is mechanical. Any
// future changes to the TS rasterizer / bloom math should be applied
// here too — the GIF visual quality in `apps/web/public/marketing/*`
// would otherwise drift away from the live editor.
//
// API:
//   ledBufferFrom(rgbBuffer)             → LedBufferLike
//   drawWorkbenchBlade(ctx, leds, opts)  → void
//
// All work is synchronous + DOM-free. The `ctx` argument is whatever
// 2D context node-canvas hands back; the shape of `getImageData /
// putImageData / drawImage` it presents is API-compatible with the
// browser CanvasRenderingContext2D the TS source consumes.

import { createCanvas } from 'canvas';

// ─── Manual blur + contrast helpers ───────────────────────────────────
//
// node-canvas (Cairo) does NOT support the `filter` CSS string — setting
// `ctx.filter = 'blur(5px)'` is a silent no-op. The TS source's bloom
// chain relies on it, so for the Node-side build script we apply blur +
// contrast manually via getImageData / putImageData.
//
// The blur is a 3-pass box blur — a well-known cheap approximation of
// a true gaussian (variance scales as the sum of variances). For our
// mip chain at 1/2, 1/4, 1/8 of the canvas, the radii in mip-space are
// small enough (~3-15 px) that this stays fast.

function boxBlur1D(src, dst, w, h, r, horizontal) {
  // Simple separable box blur. `src` and `dst` are Uint8ClampedArray (RGBA).
  const span = 2 * r + 1;
  const inv = 1 / span;
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      let sR = 0, sG = 0, sB = 0, sA = 0;
      const rowOff = y * w * 4;
      // Prime window — clamp at left edge.
      for (let dx = -r; dx <= r; dx++) {
        const xc = Math.min(Math.max(dx, 0), w - 1);
        const i = rowOff + xc * 4;
        sR += src[i]; sG += src[i + 1]; sB += src[i + 2]; sA += src[i + 3];
      }
      for (let x = 0; x < w; x++) {
        const di = rowOff + x * 4;
        dst[di]     = sR * inv;
        dst[di + 1] = sG * inv;
        dst[di + 2] = sB * inv;
        dst[di + 3] = sA * inv;
        // Slide window: subtract leftmost, add new right
        const xL = Math.min(Math.max(x - r, 0), w - 1);
        const xR = Math.min(Math.max(x + r + 1, 0), w - 1);
        const iL = rowOff + xL * 4;
        const iR = rowOff + xR * 4;
        sR += src[iR] - src[iL];
        sG += src[iR + 1] - src[iL + 1];
        sB += src[iR + 2] - src[iL + 2];
        sA += src[iR + 3] - src[iL + 3];
      }
    }
  } else {
    // Vertical
    for (let x = 0; x < w; x++) {
      let sR = 0, sG = 0, sB = 0, sA = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yc = Math.min(Math.max(dy, 0), h - 1);
        const i = (yc * w + x) * 4;
        sR += src[i]; sG += src[i + 1]; sB += src[i + 2]; sA += src[i + 3];
      }
      for (let y = 0; y < h; y++) {
        const di = (y * w + x) * 4;
        dst[di]     = sR * inv;
        dst[di + 1] = sG * inv;
        dst[di + 2] = sB * inv;
        dst[di + 3] = sA * inv;
        const yL = Math.min(Math.max(y - r, 0), h - 1);
        const yR = Math.min(Math.max(y + r + 1, 0), h - 1);
        const iL = (yL * w + x) * 4;
        const iR = (yR * w + x) * 4;
        sR += src[iR] - src[iL];
        sG += src[iR + 1] - src[iL + 1];
        sB += src[iR + 2] - src[iL + 2];
        sA += src[iR + 3] - src[iL + 3];
      }
    }
  }
}

function boxBlur3Pass(ctx, w, h, radius) {
  if (radius < 1) return;
  const img = ctx.getImageData(0, 0, w, h);
  const a = img.data;
  const b = new Uint8ClampedArray(a.length);
  // 3 alternating passes per axis approximate a gaussian.
  boxBlur1D(a, b, w, h, radius, true);
  boxBlur1D(b, a, w, h, radius, false);
  boxBlur1D(a, b, w, h, radius, true);
  boxBlur1D(b, a, w, h, radius, false);
  boxBlur1D(a, b, w, h, radius, true);
  boxBlur1D(b, a, w, h, radius, false);
  // After 6 passes (3 horiz + 3 vert), result is in `a`. Wait — we
  // did 6 passes alternating, ending in `b`. Recheck: pass1 a→b,
  // pass2 b→a, pass3 a→b, pass4 b→a, pass5 a→b, pass6 b→a. So result
  // is in `a`. Put back via the original ImageData.
  ctx.putImageData(img, 0, 0);
}

function applyContrastBrightness(ctx, w, h, contrast, brightness) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // c=1.15: stretch around 128. b=1.05: scale.
  const cFac = contrast;
  const bFac = brightness;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * cFac + 128;
    let g = (d[i + 1] - 128) * cFac + 128;
    let b = (d[i + 2] - 128) * cFac + 128;
    r *= bFac; g *= bFac; b *= bFac;
    d[i]     = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    // Alpha unchanged
  }
  ctx.putImageData(img, 0, 0);
}

// ─── Public — convert a Uint8Array LED buffer to the renderer's interface ───

export function ledBufferFrom(rgbBuffer) {
  const count = (rgbBuffer.length / 3) | 0;
  return {
    count,
    getR: (i) => rgbBuffer[i * 3],
    getG: (i) => rgbBuffer[i * 3 + 1],
    getB: (i) => rgbBuffer[i * 3 + 2],
  };
}

// ─── Glow profile (mirrors getGlowProfile in TS) ───

function getGlowProfile(r, g, b) {
  const max = Math.max(r, g, b);
  if (max < 1) return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0 };
  if (r > 200 && g > 200 && b > 200) return { coreWhiteout: 0.95, bloomRadius: 1.4, bloomIntensity: 1.3, colorSaturation: 0.3 };
  if (r > g * 1.5 && r > b * 1.5)    return { coreWhiteout: 0.80, bloomRadius: 1.1, bloomIntensity: 1.4, colorSaturation: 1.3 };
  if (b > r * 1.5 && b > g * 1.2)    return { coreWhiteout: 0.88, bloomRadius: 1.5, bloomIntensity: 1.4, colorSaturation: 0.95 };
  if (g > r * 1.3 && g > b * 1.3)    return { coreWhiteout: 0.90, bloomRadius: 1.5, bloomIntensity: 1.45, colorSaturation: 0.9 };
  if (r > 180 && g > 100 && b < 100) return { coreWhiteout: 0.85, bloomRadius: 1.3, bloomIntensity: 1.3, colorSaturation: 1.0 };
  if (r > 100 && b > 100 && g < r && g < b) return { coreWhiteout: 0.85, bloomRadius: 1.4, bloomIntensity: 1.35, colorSaturation: 0.8 };
  if (g > 100 && b > 100 && r < g && r < b) return { coreWhiteout: 0.92, bloomRadius: 1.3, bloomIntensity: 1.35, colorSaturation: 0.9 };
  if (r > 150 && g > 80 && b > 80 && r > b)  return { coreWhiteout: 0.86, bloomRadius: 1.2, bloomIntensity: 1.25, colorSaturation: 1.1 };
  return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0 };
}

// ─── Internal helpers ───

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerpToWhite(c, t) { return c + (255 - c) * t; }
function ledCoreWhiteAmount(r, g, b, coreWhiteout) {
  const max = Math.max(r, g, b);
  if (max < 1) return 0;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = clamp(luma / 220, 0, 1);
  return coreWhiteout * t;
}

// ─── Capsule rasterizer ───

function rasterizeCapsule(offCtx, leds, bladeStartPx, bladeLenPx, bladeYPx, coreH, effectiveBri, shimmer, coreWhiteout, cw, ch, hiltTuck) {
  const radius = coreH * 0.5;
  if (radius < 1 || bladeLenPx < 1) return;
  const ledCount = leds.count;
  if (ledCount < 1) return;

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

  const ledR = new Float32Array(ledCount);
  const ledG = new Float32Array(ledCount);
  const ledB = new Float32Array(ledCount);
  const ledWhite = new Float32Array(ledCount);
  for (let i = 0; i < ledCount; i++) {
    const r = leds.getR(i) * effectiveBri * shimmer;
    const g = leds.getG(i) * effectiveBri * shimmer;
    const b = leds.getB(i) * effectiveBri * shimmer;
    ledR[i] = r; ledG[i] = g; ledB[i] = b;
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

    let dxAxis;
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

      let alpha;
      if (nr <= 0.25) alpha = 1.00 - nr * 0.20;
      else if (nr <= 0.50) alpha = 0.95 - (nr - 0.25) * 1.00;
      else if (nr <= 0.70) alpha = 0.70 - (nr - 0.50) * 1.75;
      else if (nr <= 0.85) alpha = 0.35 - (nr - 0.70) * (5 / 3);
      else alpha = 0.10 - (nr - 0.85) * (2 / 3);

      let outR, outG, outB;
      if (nr <= PLATEAU_END) { outR = cR; outG = cG; outB = cB; }
      else if (nr >= COLOR_END) { outR = r; outG = g; outB = b; }
      else {
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

function averageLitColor(leds, effectiveBri) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < leds.count; i++) {
    const lr = leds.getR(i) * effectiveBri;
    const lg = leds.getG(i) * effectiveBri;
    const lb = leds.getB(i) * effectiveBri;
    if (lr + lg + lb > 1) { r += lr; g += lg; b += lb; n++; }
  }
  if (n === 0) return { r: 0, g: 0, b: 0, count: 0 };
  return { r: r / n, g: g / n, b: b / n, count: n };
}

// ─── Public — main render entry point ───

export function drawWorkbenchBlade(ctx, leds, options) {
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
  const additiveComposite = options.bladeComposite ?? 'lighter';

  if (bladeLenPx < 1 || coreH < 1) return;

  const avg = averageLitColor(leds, effectiveBri);
  if (avg.count === 0) return;
  const glow = getGlowProfile(avg.r, avg.g, avg.b);

  const offscreen = createCanvas(cw, ch);
  const offCtx = offscreen.getContext('2d');
  offCtx.clearRect(0, 0, cw, ch);

  // Pass 01: capsule rasterizer
  rasterizeCapsule(
    offCtx, leds,
    bladeStartPx, bladeLenPx, bladeYPx, coreH,
    effectiveBri, shimmer, glow.coreWhiteout,
    cw, ch, hiltTuck,
  );

  // Bloom mip chain
  if (!reduceBloom) {
    const br = glow.bloomRadius;
    const bi = glow.bloomIntensity;
    const mipDefs = [
      { w: Math.max(1, Math.ceil(cw / 2)), h: Math.max(1, Math.ceil(ch / 2)), blurPx: 6 * br, alpha: 0.65 },
      { w: Math.max(1, Math.ceil(cw / 4)), h: Math.max(1, Math.ceil(ch / 4)), blurPx: 10 * br, alpha: 0.52 },
      { w: Math.max(1, Math.ceil(cw / 8)), h: Math.max(1, Math.ceil(ch / 8)), blurPx: 14 * br, alpha: 0.45 },
    ];
    const mipCanvases = [];
    for (const def of mipDefs) {
      const mip = createCanvas(def.w, def.h);
      const mCtx = mip.getContext('2d');
      mCtx.clearRect(0, 0, def.w, def.h);
      // Downsample-blit (we apply contrast + blur manually below since
      // node-canvas's `filter` property is a no-op — Cairo doesn't
      // expose CSS filters. The browser TS path uses the equivalent
      // `filter: contrast(1.15) brightness(1.05) blur(Npx)`).
      mCtx.drawImage(offscreen, 0, 0, cw, ch, 0, 0, def.w, def.h);
      // Apply a separable box-blur N times to approximate a gaussian
      // of radius `blurPx * (downsample factor)`. The mip has been
      // downsampled by 2/4/8x, so `blurPx` in mip-space is the same
      // visual distance.
      // Mip radii: 6/10/14 → after the 2/4/8x downsample, in original
      // pixel space the visual blur is 12/40/112 px. We approximate
      // each with a 3-pass box blur (≈ √3 * radius in mip-space).
      const radiusMipPx = Math.max(1, Math.round(def.blurPx / Math.max(1, cw / def.w)));
      boxBlur3Pass(mCtx, def.w, def.h, radiusMipPx);
      // Bake-in contrast/brightness via per-pixel scale.
      applyContrastBrightness(mCtx, def.w, def.h, 1.15, 1.05);
      mipCanvases.push(mip);
    }

    ctx.save();
    ctx.globalCompositeOperation = additiveComposite;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (let i = 0; i < mipCanvases.length; i++) {
      const def = mipDefs[i];
      ctx.globalAlpha = def.alpha * bi * shimmer;
      ctx.drawImage(mipCanvases[i], 0, 0, def.w, def.h, 0, 0, cw, ch);
    }
    ctx.restore();
  }

  // Pass 12: capsule body composited additively, clipped to x ≥ bladeStartPx
  ctx.save();
  ctx.beginPath();
  ctx.rect(bladeStartPx, 0, cw - bladeStartPx, ch);
  ctx.clip();
  ctx.globalCompositeOperation = additiveComposite;
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();
}

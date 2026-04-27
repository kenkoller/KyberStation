// ─── drawBlade — saber blade with workbench-parity bloom pipeline ───
//
// Horizontal path (the only surfaced orientation today) renders the
// blade as close to the workbench's photoreal visualization as a
// static snapshot can: real per-LED colour from a headless
// `BladeEngine.captureStateFrame(BladeState.ON, config)`, offscreen
// LED-strip composite, 14-pass additive-blur bloom, blade body with
// vertical gradient, core whiteout, and a final tip corona. Per-hue
// bloom tuning ported from `BladeCanvas.tsx::getGlowProfile`.
//
// The vertical orientation branch is dormant — hidden from the UI
// in CrystalPanel.tsx but the layout + drawer code stay for future
// re-enable. It still uses the Wave 1 synthetic halo stack.

import type { CardContext, Ctx } from './cardTypes';
import type { BladeConfig, RGB } from '@kyberstation/engine';
import { BladeEngine, BladeState } from '@kyberstation/engine';

export function drawBlade(card: CardContext): void {
  const { ctx, options, layout } = card;

  if (layout.saberOrientation === 'vertical') {
    const bladeY1 = layout.bladeY1 ?? layout.heroY;
    const bladeY2 = layout.bladeY2 ?? layout.heroY + layout.heroH;
    const cx = layout.hiltX + layout.hiltW / 2;
    drawBladeBodyVertical(
      ctx,
      cx,
      bladeY1,
      bladeY2,
      layout.bladeThickness,
      options.config.baseColor,
    );
    return;
  }

  // Default: horizontal.
  const length = layout.bladeEndX - layout.bladeStartX;
  const cy = layout.heroY + layout.heroH / 2;

  drawBladeHorizontalWorkbench(
    ctx,
    layout.width,
    layout.height,
    layout.bladeStartX,
    cy,
    length,
    layout.bladeThickness,
    options.config,
  );
}

// ─── Horizontal blade — workbench-parity pipeline ─────────────────

function drawBladeHorizontalWorkbench(
  ctx: Ctx,
  canvasW: number,
  canvasH: number,
  bladeStartX: number,
  cy: number,
  length: number,
  thickness: number,
  config: BladeConfig,
): void {
  const { r, g, b } = config.baseColor;
  const glow = getGlowProfile(r, g, b);

  // 1. Capture a real engine-rendered LED frame.  BladeEngine is
  //    framework-agnostic; captureStateFrame instantiates its own
  //    scratch engine, forces BladeState.ON, settles for 120ms, and
  //    returns a Uint8Array of RGB triplets of length 3 * ledCount.
  //    Per-LED colour comes from the actual style (stable / unstable /
  //    fire / plasma / etc.) — not a synthetic shimmer.
  const engine = new BladeEngine();
  const ledBuffer = engine.captureStateFrame(BladeState.ON, config);
  const ledCount = ledBuffer.length / 3;

  // 2. Offscreen canvas — same dimensions as the main card so the 14
  //    bloom passes align exactly on drawImage.  Safari OffscreenCanvas
  //    still lacks `ctx.filter` support in some versions; fall back to
  //    a plain DOM canvas when OffscreenCanvas is unavailable.
  const offscreen = createOffscreen(canvasW, canvasH);
  const octxRaw = offscreen.getContext('2d');
  if (!octxRaw) return;
  const octx = octxRaw as Ctx;

  // 3. Paint per-LED rectangles onto the offscreen.  coreH (the lit
  //    strip thickness) is ~80% of layout.bladeThickness — leaves
  //    headroom for the body gradient below to feather the edges.
  const coreH = thickness * 0.8;
  const bladeY = cy - coreH / 2;
  const perLedW = length / ledCount;

  for (let i = 0; i < ledCount; i++) {
    const lr = ledBuffer[i * 3];
    const lg = ledBuffer[i * 3 + 1];
    const lb = ledBuffer[i * 3 + 2];
    if (lr + lg + lb === 0) continue; // dark LED — skip
    octx.fillStyle = `rgba(${lr}, ${lg}, ${lb}, 1)`;
    // +1 on width so adjacent rects overlap by a sub-pixel — avoids
    // seam lines under the bloom.
    octx.fillRect(bladeStartX + i * perLedW, bladeY, perLedW + 1, coreH);
  }

  // 4. Glow seeds at the tip + emitter.  Feeding radial falloffs into
  //    the offscreen BEFORE bloom makes the bloom wrap organically
  //    around the blade ends — this is what kills the "hard edge at
  //    the tip" issue at its source.  `coreH * 2` radius at the tip
  //    matches BladeCanvas.tsx:932–946.
  octx.save();
  octx.globalCompositeOperation = 'lighter';
  const tipX = bladeStartX + length;
  const emitterX = bladeStartX;
  // Tip seed — larger
  const tipSeedR = coreH * 2;
  const tipGrad = octx.createRadialGradient(tipX, cy, 0, tipX, cy, tipSeedR);
  tipGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`);
  tipGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  octx.fillStyle = tipGrad;
  octx.fillRect(tipX - tipSeedR, cy - tipSeedR, tipSeedR * 2, tipSeedR * 2);
  // Emitter seed — tighter so the hilt doesn't over-glow
  const emSeedR = coreH * 1.4;
  const emGrad = octx.createRadialGradient(emitterX, cy, 0, emitterX, cy, emSeedR);
  emGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
  emGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  octx.fillStyle = emGrad;
  octx.fillRect(emitterX - emSeedR, cy - emSeedR, emSeedR * 2, emSeedR * 2);
  octx.restore();

  // 5. 14-pass additive-blur bloom onto the main ctx.  Ported from
  //    BladeCanvas.tsx:1025–1047.  Radii scale exponentially 2 → 100
  //    then are multiplied by the per-hue bloomRadius + a global
  //    `CARD_BLOOM_SCALE` because the card's coordinate space is
  //    smaller than the workbench's canvas height (675 vs ~900) —
  //    full-strength bloom drowns the metadata strip.
  const CARD_BLOOM_SCALE = 0.65;
  const passCount = 14;
  const supportsFilter = 'filter' in octx;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (supportsFilter) {
    for (let i = 0; i < passCount; i++) {
      const t = i / (passCount - 1);
      const radius = 2 + 98 * Math.pow(t, 1.4);
      const alpha = (0.02 + 0.36 * Math.pow(1 - t, 1.8)) * glow.bloomIntensity;
      ctx.save();
      ctx.filter = `blur(${radius * glow.bloomRadius * CARD_BLOOM_SCALE}px)`;
      ctx.globalAlpha = alpha;
      ctx.drawImage(offscreen as unknown as CanvasImageSource, 0, 0);
      ctx.restore();
    }
    // Bridge glow — one tighter pass to knit the body to the bloom halo
    ctx.save();
    ctx.filter = 'blur(2.5px)';
    ctx.globalAlpha = 0.35 * glow.bloomIntensity;
    ctx.drawImage(offscreen as unknown as CanvasImageSource, 0, 0);
    ctx.restore();
  } else {
    // Safari / older OffscreenCanvas fallback — no blur filter.
    // Draw the offscreen once with a moderate alpha; the body
    // gradient below still produces a recognisable halo.
    ctx.globalAlpha = 0.8 * glow.bloomIntensity;
    ctx.drawImage(offscreen as unknown as CanvasImageSource, 0, 0);
  }
  ctx.restore();

  // 6. Blade body — flat-emitter / rounded-tip capsule with a vertical
  //    gradient.  Edge-dim / middle-bright creates the cylindrical
  //    illusion; the white inset in step 7 adds the hot core.
  //    Ported from BladeCanvas.tsx:1049–1100.
  const bodyH = coreH * 1.05;
  const brightR = Math.min(255, r + 60);
  const brightG = Math.min(255, g + 60);
  const brightB = Math.min(255, b + 60);
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(0, cy - bodyH / 2, 0, cy + bodyH / 2);
  bodyGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`);
  bodyGrad.addColorStop(0.5, `rgba(${brightR}, ${brightG}, ${brightB}, 0.95)`);
  bodyGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.45)`);
  ctx.fillStyle = bodyGrad;
  flatEmitterRoundTipH(ctx, bladeStartX, cy - bodyH / 2, length, bodyH);
  ctx.fill();
  ctx.restore();

  // 7. Core whiteout — thin white capsule inset, amplitude modulated
  //    by the per-hue `coreWhiteout` (red is tighter, cyan is wider).
  //    Ported from BladeCanvas.tsx:1102–1126.
  const coreT = coreH * 0.35 * glow.coreWhiteout;
  if (coreT > 1) {
    ctx.save();
    const coreGrad = ctx.createLinearGradient(0, cy - coreT / 2, 0, cy + coreT / 2);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
    ctx.fillStyle = coreGrad;
    flatEmitterRoundTipH(ctx, bladeStartX, cy - coreT / 2, length, coreT);
    ctx.fill();
    ctx.restore();
  }

  // 8. Tip corona — one final radial gradient at the tip so the blade
  //    point reads as a soft light source rather than a cut-off
  //    capsule.  Radius scaled by bloomRadius — wider halos get a
  //    correspondingly wider corona.
  //    Ported from BladeCanvas.tsx:1143–1182.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const coronaR = 40 * glow.bloomRadius * CARD_BLOOM_SCALE;
  const coronaGrad = ctx.createRadialGradient(tipX, cy, 0, tipX, cy, coronaR);
  coronaGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  coronaGrad.addColorStop(
    0.3,
    `rgba(${brightR}, ${brightG}, ${brightB}, 0.4)`,
  );
  coronaGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = coronaGrad;
  ctx.fillRect(tipX - coronaR, cy - coronaR, coronaR * 2, coronaR * 2);
  ctx.restore();
}

// ─── Per-hue glow tuning ──────────────────────────────────────────
//
// Inlined from `BladeCanvas.tsx::getGlowProfile` (lines 204-265).
// Pure function — no React / DOM dependencies. Keeping it co-located
// with drawBlade rather than importing from BladeCanvas (which pulls
// a large React module graph) or creating a new shared file for now;
// the shape is ~60 lines so the duplication cost is low.

interface GlowProfile {
  coreWhiteout: number;
  bloomRadius: number;
  bloomIntensity: number;
  colorSaturation: number;
  outerHue: number;
}

function getGlowProfile(r: number, g: number, b: number): GlowProfile {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;

  if (chroma < 30 && lightness > 180) {
    return { coreWhiteout: 0.95, bloomRadius: 1.4, bloomIntensity: 1.3, colorSaturation: 0.3, outerHue: 0 };
  }

  const isRed = r > g * 1.5 && r > b * 1.5;
  const isBlue = b > r * 1.2 && b > g * 1.2;
  const isCyan = g > r * 1.2 && b > r * 1.2 && Math.abs(g - b) < 60;
  const isGreen = g > r * 1.3 && g > b * 1.3;
  const isPurple = r > g * 1.3 && b > g * 1.3;
  const isYellow = r > b * 1.5 && g > b * 1.5 && Math.abs(r - g) < 80;
  const isOrange = r > g * 1.3 && g > b * 1.5 && r > 180;

  if (isRed) return { coreWhiteout: 0.80, bloomRadius: 1.1, bloomIntensity: 1.4, colorSaturation: 1.3, outerHue: 0 };
  if (isBlue) return { coreWhiteout: 0.88, bloomRadius: 1.5, bloomIntensity: 1.4, colorSaturation: 0.95, outerHue: 0 };
  if (isCyan) return { coreWhiteout: 0.90, bloomRadius: 1.5, bloomIntensity: 1.45, colorSaturation: 0.9, outerHue: 0 };
  if (isGreen) return { coreWhiteout: 0.85, bloomRadius: 1.3, bloomIntensity: 1.3, colorSaturation: 1.0, outerHue: 5 };
  if (isPurple) return { coreWhiteout: 0.85, bloomRadius: 1.4, bloomIntensity: 1.35, colorSaturation: 0.8, outerHue: 0 };
  if (isYellow) return { coreWhiteout: 0.92, bloomRadius: 1.3, bloomIntensity: 1.35, colorSaturation: 0.9, outerHue: -5 };
  if (isOrange) return { coreWhiteout: 0.86, bloomRadius: 1.2, bloomIntensity: 1.25, colorSaturation: 1.1, outerHue: 0 };

  return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0, outerHue: 0 };
}

// ─── Offscreen canvas factory ─────────────────────────────────────

function createOffscreen(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

// ─── Vertical blade body (dormant — layout dropdown hidden) ─────

function drawBladeBodyVertical(
  ctx: Ctx,
  cx: number,
  y1: number,
  y2: number,
  thickness: number,
  color: RGB,
): void {
  ctx.save();

  const { r, g, b } = color;
  const length = y2 - y1;
  const halo = thickness * 2.2;

  ctx.globalCompositeOperation = 'lighter';
  const haloGrad = ctx.createLinearGradient(cx - halo, 0, cx + halo, 0);
  haloGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  haloGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
  haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = haloGrad;
  ctx.fillRect(cx - halo, y1 - 10, halo * 2, length + 20);

  const innerHalo = thickness * 0.9;
  const innerGrad = ctx.createLinearGradient(cx - innerHalo, 0, cx + innerHalo, 0);
  innerGrad.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
  innerGrad.addColorStop(
    0.5,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.95)`,
  );
  innerGrad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
  ctx.fillStyle = innerGrad;
  flatEmitterRoundTipV(ctx, cx - innerHalo, y1, innerHalo * 2, length);
  ctx.fill();

  const coreThickness = thickness * 0.38;
  const coreGrad = ctx.createLinearGradient(cx - coreThickness / 2, 0, cx + coreThickness / 2, 0);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = coreGrad;
  flatEmitterRoundTipV(ctx, cx - coreThickness / 2, y1, coreThickness, length);
  ctx.fill();

  const tipCy = y1 + thickness / 2;
  const tipRadius = thickness * 1.25;
  const tipGrad = ctx.createRadialGradient(cx, tipCy, 0, cx, tipCy, tipRadius);
  tipGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  tipGrad.addColorStop(
    0.35,
    `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},0.55)`,
  );
  tipGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = tipGrad;
  ctx.fillRect(cx - tipRadius, tipCy - tipRadius, tipRadius * 2, tipRadius * 2);

  ctx.restore();
}

// ─── Capsule path helpers ─────────────────────────────────────────

/** Horizontal blade shape: FLAT left edge (emitter), semicircular
 *  right edge (tip). Matches a real Neopixel diffuser cap profile. */
function flatEmitterRoundTipH(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = h / 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

/** Vertical blade shape: FLAT bottom edge (emitter), semicircular
 *  top edge (tip). */
function flatEmitterRoundTipV(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  const r = w / 2;
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

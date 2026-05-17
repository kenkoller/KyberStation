// ─── Renderer golden-hash — inline render paths (4 modules) ──────────
//
// Pins the rasterized output of the four modules extracted from
// `BladeCanvas.tsx` in the v0.22.x renderer-golden-hash full-coverage
// push:
//
//   • lib/blade/ignitionFlash.ts      — Layer 17 radial burst.
//   • lib/blade/motionGhost.ts        — Layer 11a/b swing-trail ghost.
//   • lib/blade/topologyOverlay.ts    — Crossguard + triple-fan side
//                                       blades.
//   • lib/blade/ambientLumaCoupling.ts — Layer 19 background tint.
//
// Companion to `bladeRenderer.test.ts` (the workbench-blade pipeline
// golden-hash). Together they cover the full BladeCanvas 2D
// rasterization surface, so any future Phase 2D / Phase 3D post-
// processing refactor lands behind a complete pixel-level safety net.
//
// === When a hash mismatch fires ===
// 1. Inspect visually: open the editor + reproduce the case by hand —
//    does the change look intentional?
// 2. Intentional: regenerate via `pnpm vitest run -u
//    tests/rendererGoldenHash/inlineRenderPaths`. Vitest writes the
//    new hash into `__snapshots__/inlineRenderPaths.test.ts.snap`.
// 3. Unintentional: bisect to find the module commit that changed
//    output. The engine-level hash is untouched here — only module
//    pixel output is locked.
//
// === Linux CI escape hatch ===
// node-canvas's anti-aliasing differs slightly between Mac
// (CoreGraphics) and Linux (Cairo). If CI flakes on full-fidelity
// hashes, switch the per-test calls below from `hashCanvas` to
// `hashCanvasCoarse` (4×4 tile + 16-level quantization). Ship full-
// fidelity first; fall back only if CI complains.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drawIgnitionFlash } from '@/lib/blade/ignitionFlash';
import { applyMotionGhost } from '@/lib/blade/motionGhost';
import {
  drawCrossguardOverlay,
  drawTripleFanOverlay,
  type LedReader,
  averageHeadLedColor,
} from '@/lib/blade/topologyOverlay';
import {
  paintAmbientTint,
  sampleMip2Luma,
  ambientTintAlpha,
} from '@/lib/blade/ambientLumaCoupling';
import { createTestCanvas, installCanvasGlobals } from './setup';
import { hashCanvas } from './hash';

// ─── Canvas globals: install once for the whole suite ───────────────

let restoreGlobals: () => void;
beforeAll(() => {
  restoreGlobals = installCanvasGlobals();
});
afterAll(() => {
  restoreGlobals?.();
});

// ─── Canonical test canvas dims ─────────────────────────────────────
//
// Matches the workbench-blade test file so visual comparisons (when
// hashes drift) can sit side-by-side. The blade-canvas sizing math is
// scaled at draw time, so the absolute dims here aren't load-bearing —
// only the geometry passed to each module is.

const CANVAS_W = 800;
const CANVAS_H = 200;
const BLADE_START_PX = 80;
const BLADE_Y_PX = 100;
// Used by the topology overlays; matches the workbench's mid-range
// main-blade length.
const MAIN_LEN_PX = 600;

// Canonical scale + bloomRadius used by the ignition-flash tests.
// Both were chosen to keep the flash radius (60 × scale × bloomRadius)
// within the canvas bounds.
const SCALE = 1.5;
const BLOOM_RADIUS = 1.2;

// Canonical blade color used by every module that needs one. A
// pre-saturated Obi-Wan blue.
const BLADE_COLOR = { r: 80, g: 180, b: 255 };

function fillBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Same dark-grey backdrop as `bladeRenderer.test.ts` — the workbench
  // composites onto deep-space chrome, not pure black.
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, w, h);
}

// ─── Ignition flash ─────────────────────────────────────────────────

describe('renderer golden hash — drawIgnitionFlash', () => {
  // 5 progress sample points covering the visible envelope. Below 0.01
  // the function early-returns (no paint); we deliberately skip the
  // boundary to keep all 5 cases pixel-distinct.
  const flashIntensities = [0.05, 0.25, 0.5, 0.75, 1.0];

  for (const intensity of flashIntensities) {
    it(`flash intensity = ${intensity}`, () => {
      const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
      const ctx = canvas.getContext('2d');
      fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
      drawIgnitionFlash(ctx as unknown as CanvasRenderingContext2D, {
        flashIntensity: intensity,
        bladeStartPx: BLADE_START_PX,
        bladeYPx: BLADE_Y_PX,
        scale: SCALE,
        bloomRadius: BLOOM_RADIUS,
        bladeColor: BLADE_COLOR,
      });
      expect(hashCanvas(canvas)).toMatchSnapshot();
    });
  }

  it('early-returns at intensity ≤ 0.01 (no paint)', () => {
    const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
    const ctx = canvas.getContext('2d');
    fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
    drawIgnitionFlash(ctx as unknown as CanvasRenderingContext2D, {
      flashIntensity: 0.005,
      bladeStartPx: BLADE_START_PX,
      bladeYPx: BLADE_Y_PX,
      scale: SCALE,
      bloomRadius: BLOOM_RADIUS,
      bladeColor: BLADE_COLOR,
    });
    // Hash equals the bare-backdrop hash — early-return left the
    // canvas untouched. Pinned so a future "always paint" regression
    // catches.
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });
});

// ─── Motion-ghost swing trail ───────────────────────────────────────
//
// `applyMotionGhost` reads a mip-0 buffer and integrates it into a
// persistent ghost canvas, then composites the trail onto main. To
// build a deterministic mip-0 buffer, we paint a single bright capsule
// onto a small offscreen canvas — same shape the live workbench's
// mip-0 holds after the bloom pass.

function buildMockMip0(w: number, h: number): HTMLCanvasElement {
  const c = createTestCanvas(w, h) as unknown as HTMLCanvasElement;
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // Center horizontal capsule — emulates the post-bloom shape.
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(120,200,255,0.85)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, Math.floor(h * 0.4), w, Math.ceil(h * 0.2));
  return c;
}

describe('renderer golden hash — applyMotionGhost', () => {
  // 4 swing speeds. 0.01 is below threshold → early-return; 0.3 / 0.7
  // / 1.0 walk up the composite α formula. Pin them all so the trail
  // envelope is locked.
  const swingSpeeds = [0.3, 0.7, 1.0];

  // Mip-0 dimensions = canvas dims ÷ 2, matching `buildBloomMipDefs`.
  const MIP0_W = CANVAS_W >> 1;
  const MIP0_H = CANVAS_H >> 1;

  for (const swing of swingSpeeds) {
    it(`swing = ${swing}`, () => {
      const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
      const ctx = canvas.getContext('2d');
      fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);

      const mip0 = buildMockMip0(MIP0_W, MIP0_H);
      const ghost = createTestCanvas(MIP0_W, MIP0_H) as unknown as HTMLCanvasElement;

      // Pre-warm the ghost with a single mip-0 paint so the
      // destination-in fade has something to fade — emulates the
      // workbench's persistent-frame state.
      const gCtx = ghost.getContext('2d') as unknown as CanvasRenderingContext2D;
      gCtx.drawImage(mip0 as unknown as CanvasImageSource, 0, 0);

      applyMotionGhost(ctx as unknown as CanvasRenderingContext2D, {
        swing,
        mip0Canvas: mip0,
        mip0Def: { w: MIP0_W, h: MIP0_H },
        cw: CANVAS_W,
        ch: CANVAS_H,
        ghost,
      });
      expect(hashCanvas(canvas)).toMatchSnapshot();
    });
  }

  it('early-returns at swing ≤ threshold (no paint)', () => {
    const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
    const ctx = canvas.getContext('2d');
    fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);

    const mip0 = buildMockMip0(MIP0_W, MIP0_H);
    const ghost = createTestCanvas(MIP0_W, MIP0_H) as unknown as HTMLCanvasElement;
    const gCtx = ghost.getContext('2d') as unknown as CanvasRenderingContext2D;
    gCtx.drawImage(mip0 as unknown as CanvasImageSource, 0, 0);

    applyMotionGhost(ctx as unknown as CanvasRenderingContext2D, {
      swing: 0.01,
      mip0Canvas: mip0,
      mip0Def: { w: MIP0_W, h: MIP0_H },
      cw: CANVAS_W,
      ch: CANVAS_H,
      ghost,
    });
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });
});

// ─── Topology overlays ──────────────────────────────────────────────
//
// LED reader stub — fixed Obi-Wan blue at head LEDs. The overlay code
// only reads the first 6–8 LEDs to compute the average head color, so
// the stub just returns the same RGB for any index in that range.

function makeLedReader(count: number, r: number, g: number, b: number): LedReader {
  return {
    count,
    getR: () => r,
    getG: () => g,
    getB: () => b,
  };
}

describe('renderer golden hash — drawCrossguardOverlay', () => {
  // Three extendProgress samples — pre-gate (off), mid-extend (gated
  // at qProgress > 0), and fully-extended (qProgress = 1).
  const extendCases = [
    { label: 'pre-gate :: extendProgress 0.05', extendProgress: 0.05 },
    { label: 'mid-extend :: extendProgress 0.25', extendProgress: 0.25 },
    { label: 'fully-extended :: extendProgress 1.0', extendProgress: 1.0 },
  ];

  for (const c of extendCases) {
    it(c.label, () => {
      const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
      const ctx = canvas.getContext('2d');
      fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
      const leds = makeLedReader(144, 80, 180, 255);
      const avgColor = averageHeadLedColor(leds, 1, 6);
      drawCrossguardOverlay(ctx as unknown as CanvasRenderingContext2D, {
        scale: SCALE,
        emitterX: BLADE_START_PX,
        bladeY: BLADE_Y_PX,
        extendProgress: c.extendProgress,
        avgColor,
      });
      expect(hashCanvas(canvas)).toMatchSnapshot();
    });
  }
});

describe('renderer golden hash — drawTripleFanOverlay', () => {
  const extendCases = [
    { label: 'pre-gate :: extendProgress 0.05', extendProgress: 0.05 },
    { label: 'mid-extend :: extendProgress 0.3', extendProgress: 0.3 },
    { label: 'fully-extended :: extendProgress 1.0', extendProgress: 1.0 },
  ];

  for (const c of extendCases) {
    it(c.label, () => {
      const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
      const ctx = canvas.getContext('2d');
      fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
      const leds = makeLedReader(144, 220, 30, 10); // vader red
      const avgColor = averageHeadLedColor(leds, 1, 8);
      drawTripleFanOverlay(ctx as unknown as CanvasRenderingContext2D, {
        scale: SCALE,
        emitterX: BLADE_START_PX,
        bladeY: BLADE_Y_PX,
        extendProgress: c.extendProgress,
        avgColor,
        mainLenPx: MAIN_LEN_PX,
        canvasPxH: CANVAS_H,
      });
      expect(hashCanvas(canvas)).toMatchSnapshot();
    });
  }
});

// ─── Ambient mip-2 luma coupling ────────────────────────────────────
//
// `paintAmbientTint` paints a full-canvas color tint at α driven by
// the mip-2 luma. Sample 3 luma levels (low / mid / high) plus the
// no-active-LED no-paint case.

describe('renderer golden hash — paintAmbientTint', () => {
  const lumaCases = [
    { label: 'low luma 0.1', avgBloomLum: 0.1 },
    { label: 'mid luma 0.5', avgBloomLum: 0.5 },
    { label: 'high luma 1.0', avgBloomLum: 1.0 },
  ];

  for (const c of lumaCases) {
    it(c.label, () => {
      const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
      const ctx = canvas.getContext('2d');
      fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
      paintAmbientTint(ctx as unknown as CanvasRenderingContext2D, {
        avgBloomLum: c.avgBloomLum,
        activeCount: 50,
        bladeColor: BLADE_COLOR,
        cw: CANVAS_W,
        ch: CANVAS_H,
        reduceBloom: false,
      });
      expect(hashCanvas(canvas)).toMatchSnapshot();
    });
  }

  it('no-active-LED → no paint', () => {
    const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
    const ctx = canvas.getContext('2d');
    fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
    paintAmbientTint(ctx as unknown as CanvasRenderingContext2D, {
      avgBloomLum: 0.5,
      activeCount: 0,
      bladeColor: BLADE_COLOR,
      cw: CANVAS_W,
      ch: CANVAS_H,
      reduceBloom: false,
    });
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });

  it('reduceBloom = true scales α by 0.4', () => {
    const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
    const ctx = canvas.getContext('2d');
    fillBackdrop(ctx as unknown as CanvasRenderingContext2D, CANVAS_W, CANVAS_H);
    paintAmbientTint(ctx as unknown as CanvasRenderingContext2D, {
      avgBloomLum: 1.0,
      activeCount: 50,
      bladeColor: BLADE_COLOR,
      cw: CANVAS_W,
      ch: CANVAS_H,
      reduceBloom: true,
    });
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });
});

// ─── Mip-2 luma sample function (utility — pure math) ────────────────
//
// Not a paint function, but pin the formula so a future regression in
// the sample math (green-channel index, division by count, error
// swallow) flips the snapshot.

describe('sampleMip2Luma — utility math invariants', () => {
  it('uniform green field → predictable luma', () => {
    const w = 16;
    const h = 16;
    const c = createTestCanvas(w, h) as unknown as HTMLCanvasElement;
    const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
    // Fill with pure green; α-multiplied luma = 1.0 in theory but
    // node-canvas's fillRect doesn't always saturate to exactly 255.
    // Snapshot the actual computed value so we lock the formula.
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, w, h);
    const luma = sampleMip2Luma(c);
    // Pin to within tolerance of 1.0 — the snapshot would lock exact
    // float bytes, which drift on CoreGraphics vs Cairo.
    expect(luma).toBeGreaterThan(0.95);
    expect(luma).toBeLessThanOrEqual(1.0);
  });

  it('null buffer → 0', () => {
    expect(sampleMip2Luma(null)).toBe(0);
  });

  it('zero-size buffer → 0', () => {
    const c = createTestCanvas(0, 0) as unknown as HTMLCanvasElement;
    expect(sampleMip2Luma(c)).toBe(0);
  });

  it('ambientTintAlpha walks the formula at canonical luma levels', () => {
    // 0.0 → AMBIENT_TINT_ALPHA_FLOOR = 0.003
    expect(ambientTintAlpha(0)).toBeCloseTo(0.003, 5);
    // 0.5 → max(0.003, 0.5 × 0.04) = 0.02
    expect(ambientTintAlpha(0.5)).toBeCloseTo(0.02, 5);
    // 1.0 → max(0.003, 1.0 × 0.04) = 0.04
    expect(ambientTintAlpha(1.0)).toBeCloseTo(0.04, 5);
    // reduceBloom = true scales by 0.4
    expect(ambientTintAlpha(1.0, true)).toBeCloseTo(0.016, 5);
  });
});

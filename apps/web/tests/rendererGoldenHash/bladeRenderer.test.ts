// ─── Renderer golden-hash — workbench blade pipeline ────────────────
//
// Pins the rendered-canvas output of `drawWorkbenchBlade` (the v0.14
// workbench blade pipeline ported into a headless module) for a small
// set of canonical configs. Catches drift in:
//
//   • The capsule rasterizer's per-pixel Gaussian-α + plateau curve.
//   • Per-color glow profile selection (`getGlowProfile`).
//   • The 3-mip downsampled bright-pass bloom chain.
//   • Composite blend mode handling (`'lighter'` for dark themes).
//   • Edge cases around hilt-tuck + tip end caps.
//
// What this DOES NOT cover (engine layer — see `bladeEngineGoldenHash`):
//
//   • The 29 blade-style implementations.
//   • The state machine in BladeEngine.ts.
//   • Capsule LED routing across topologies.
//
// The two layers are complementary: engine golden-hash protects WHAT
// the engine emits per LED; this file protects HOW that buffer
// rasterizes onto a canvas. Both should pass for full safety.
//
// === When a hash mismatch fires ===
// 1. Inspect visually: open the editor + apply the named config —
//    does the change look intentional?
// 2. Intentional: regenerate via `pnpm vitest run -u tests/rendererGoldenHash/bladeRenderer`.
//    Vitest writes the new hash into the file-based snapshot at
//    `apps/web/tests/rendererGoldenHash/__snapshots__/bladeRenderer.test.ts.snap`.
// 3. Unintentional: bisect to find the renderer commit that changed
//    output. The engine-level hash should still pass (engine state is
//    untouched); only the renderer pipeline changed.
//
// === Linux CI escape hatch ===
// node-canvas's anti-aliasing differs slightly between Mac (CoreGraphics)
// and Linux (Cairo). If CI flakes on full-fidelity hashes, switch the
// per-test calls below from `hashCanvas` to `hashCanvasCoarse` (4×4
// tile + 16-level quantization). Ship full-fidelity first; fall back
// only if CI complains.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  drawWorkbenchBlade,
  ledBufferFrom,
} from '@/lib/sharePack/bladeRenderHeadless';
import {
  BladeEngine,
  BladeState,
  type BladeConfig,
} from '@kyberstation/engine';
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

// ─── Canonical configs ──────────────────────────────────────────────
//
// Cover-the-space slice — the same 5 hero colors as the engine golden-
// hash file plus a Darksaber sample. Each renders to the same canvas
// dimensions so hash comparisons stay apples-to-apples.

const BASE_CONFIG: BladeConfig = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 100 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 300,
  shimmer: 0.05,
  ledCount: 144,
};

interface RendererCase {
  id: string;
  config: BladeConfig;
  state: BladeState;
  progress: number;
}

const CASES: RendererCase[] = [
  // Obi-Wan blue across all four canonical states. This is the load-
  // bearing matrix — if the workbench blade pipeline changes how it
  // visualizes any state transition, one of these four will flip.
  { id: 'obi-wan-blue :: off',           config: { ...BASE_CONFIG },                                                   state: BladeState.OFF,         progress: 0 },
  { id: 'obi-wan-blue :: igniting-50',   config: { ...BASE_CONFIG },                                                   state: BladeState.IGNITING,    progress: 0.5 },
  { id: 'obi-wan-blue :: on',            config: { ...BASE_CONFIG },                                                   state: BladeState.ON,          progress: 1 },
  { id: 'obi-wan-blue :: retracting-50', config: { ...BASE_CONFIG },                                                   state: BladeState.RETRACTING,  progress: 0.5 },
  // Cross-color: red unstable / yellow stable / green stable. Each
  // exercises a different `getGlowProfile` branch (red / amber-warm /
  // green). Runs ON state only — different states aren't load-bearing
  // for the per-color tests.
  { id: 'vader-red-unstable :: on',      config: { ...BASE_CONFIG, baseColor: { r: 220, g: 30,  b: 10  }, style: 'unstable' }, state: BladeState.ON, progress: 1 },
  { id: 'rey-yellow-stable :: on',       config: { ...BASE_CONFIG, baseColor: { r: 255, g: 210, b: 40  } },                   state: BladeState.ON, progress: 1 },
  { id: 'yoda-green-stable :: on',       config: { ...BASE_CONFIG, baseColor: { r: 30,  g: 255, b: 30  } },                   state: BladeState.ON, progress: 1 },
  // Darksaber — the Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>
  // engine class produces a fundamentally different LED pattern. Hash
  // protects the renderer's response to the dim-body + bright-cap
  // distribution.
  { id: 'darksaber :: on',               config: { ...BASE_CONFIG, baseColor: { r: 80,  g: 80,  b: 80  }, style: 'darksaber' }, state: BladeState.ON, progress: 1 },
];

// ─── Render harness ────────────────────────────────────────────────
//
// Each case captures the LED buffer at the requested state via
// `BladeEngine.captureStateFrame` (the engine layer's snapshot API),
// then rasterizes it through `drawWorkbenchBlade` onto a real
// node-canvas surface. The canvas is hashed via FNV-1a over its full
// RGBA buffer.

const CANVAS_W = 800;
const CANVAS_H = 200;
const BLADE_START_PX = 80;
const BLADE_LEN_PX = 680;
const BLADE_Y_PX = 100;
const CORE_H = 60;

// `settleMs` / `progress` mirror the engine golden-hash file.
const SETTLE_MS = 200;

describe('renderer golden hash — drawWorkbenchBlade', () => {
  // Single shared engine for the suite. captureStateFrame allocates a
  // scratch engine internally so this outer instance is just an entry
  // point.
  const engine = new BladeEngine();

  for (const c of CASES) {
    it(c.id, () => {
      const canvas = createTestCanvas(CANVAS_W, CANVAS_H);
      const ctx = canvas.getContext('2d');
      // Fill with a deterministic dark backdrop — black would
      // misrepresent the workbench (which sits on the deep-space
      // chrome). This dark-grey gives the bloom additive composite
      // something to add into.
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const buffer = engine.captureStateFrame(
        c.state,
        c.config,
        undefined,
        { progress: c.progress, settleMs: SETTLE_MS },
      );

      drawWorkbenchBlade(
        ctx as unknown as CanvasRenderingContext2D,
        ledBufferFrom(buffer),
        {
          bladeStartPx: BLADE_START_PX,
          bladeLenPx: BLADE_LEN_PX,
          bladeYPx: BLADE_Y_PX,
          coreH: CORE_H,
          cw: CANVAS_W,
          ch: CANVAS_H,
        },
      );

      // Sanity: the canvas should have non-zero pixel data (even OFF
      // gets the backdrop fill).
      expect(canvas.width).toBe(CANVAS_W);
      expect(canvas.height).toBe(CANVAS_H);
      // File-based snapshot — see __snapshots__/bladeRenderer.test.ts.snap
      // First run records; subsequent runs compare.
      expect(hashCanvas(canvas)).toMatchSnapshot();
    });
  }

  // Drift sentinel — same shape as the engine golden-hash file. Locks
  // the FNV-1a output for a known input so a future toolchain bump
  // doesn't silently invalidate this whole suite.
  it('FNV-1a hash function is stable for a known input', () => {
    const canvas = createTestCanvas(2, 1);
    const ctx = canvas.getContext('2d');
    // Deterministic 2-pixel image: red, green.
    const imgData = ctx.createImageData(2, 1);
    imgData.data[0] = 255; imgData.data[1] = 0;   imgData.data[2] = 0;   imgData.data[3] = 255;
    imgData.data[4] = 0;   imgData.data[5] = 255; imgData.data[6] = 0;   imgData.data[7] = 255;
    ctx.putImageData(imgData, 0, 0);
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });
});

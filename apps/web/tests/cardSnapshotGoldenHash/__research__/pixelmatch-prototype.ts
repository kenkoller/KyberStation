// ─── Card Snapshot v2 — Perceptual-Diff Prototype ──────────────────
//
// Research artifact for `docs/research/CARD_SNAPSHOT_V2_PERCEPTUAL_DIFF.md`.
//
// THIS IS NOT A TEST. It does not run as part of `pnpm test`. It's a
// one-off threshold-tuning script that exercises pixelmatch against
// representative card-snapshot pairs on the local machine, prints a
// diff-count table, and serves as the empirical basis for the
// recommendation in the doc.
//
// === HOW TO RUN ===
//
//   From the repo root:
//     pnpm --filter @kyberstation/web exec vite-node \
//       tests/cardSnapshotGoldenHash/__research__/pixelmatch-prototype.ts
//
//   Or directly via vite-node (already installed as a vitest peer):
//     cd apps/web
//     pnpm exec vite-node tests/cardSnapshotGoldenHash/__research__/pixelmatch-prototype.ts
//
//   (`tsx` would also work but isn't a workspace dep — `vite-node`
//    ships transitively with vitest and runs TS directly with the
//    same module resolution as the test suite.)
//
// === WHAT IT DOES ===
//
// 1. Renders the same Obi-Wan ANH card twice, byte-identical, to
//    produce a baseline diff (should be 0 mismatched pixels at any
//    sane threshold — confirms the harness is deterministic on this
//    platform).
// 2. Renders the card a third time with a 1-px translation in
//    `metadataTopY` — a realistic "intentional UI tweak" perturbation
//    — to characterize what a real change looks like.
// 3. Renders the card with a theme value mutated (deeper backdrop)
//    to characterize a larger but still-bounded change.
// 4. Sweeps `pixelmatch` thresholds (0.05, 0.1, 0.2, 0.3, 0.5) for
//    each pair and prints a table.
//
// The output table answers the doc's central question: is there a
// threshold valley where Cairo-vs-CoreGraphics text drift produces
// "not many" mismatched pixels but a real layout shift produces
// "many"? On this single machine we can only see one half of that
// curve (text drift is zero against itself locally) — but the
// "intentional change" half tells us what the upper-bound delta looks
// like, which is the load-bearing input to the threshold decision.
//
// To confirm the cross-platform half of the curve, the same script
// would need to run on Linux CI (Cairo) with a baseline rendered on
// macOS (Core Graphics). Cross-platform confirmation is documented as
// future work in the recommendation doc — this prototype captures the
// local half only.

import pixelmatch from 'pixelmatch';
import { createCanvas, type Canvas } from 'canvas';
import {
  BladeEngine,
  BladeState,
  type BladeConfig,
} from '@kyberstation/engine';
import {
  DEFAULT_LAYOUT,
} from '@/lib/sharePack/card/cardLayout';
import { DEFAULT_THEME } from '@/lib/sharePack/card/cardTheme';
import { drawBackdrop } from '@/lib/sharePack/card/drawBackdrop';
import { drawHeader } from '@/lib/sharePack/card/drawHeader';
import { drawHilt } from '@/lib/sharePack/card/drawHilt';
import { drawBlade } from '@/lib/sharePack/card/drawBlade';
import { drawMetadata } from '@/lib/sharePack/card/drawMetadata';
import { drawQr } from '@/lib/sharePack/card/drawQr';
import { drawFooter } from '@/lib/sharePack/card/drawFooter';
import { createQrSurface } from '@/lib/crystal/qrSurface';
import type {
  CardContext,
  CardLayout,
  CardTheme,
  Ctx,
} from '@/lib/sharePack/card/cardTypes';
import { installCanvasGlobals } from '../setup';

// ─── Setup ──────────────────────────────────────────────────────────

const restoreGlobals = installCanvasGlobals();

const OBI_WAN_ANH: BladeConfig = {
  name: 'Obi-Wan ANH',
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0.1,
  ledCount: 144,
};

const TEST_GLYPH = 'JED:test-card-snapshot-2026-04-30';

interface RenderArgs {
  layout: CardLayout;
  theme: CardTheme;
  config: BladeConfig;
  glyph: string;
}

async function renderCard(args: RenderArgs): Promise<Canvas> {
  const { layout, theme, config, glyph } = args;

  const qr = await createQrSurface(glyph, {
    canvasSize: 512,
    errorCorrectionLevel: 'Q',
    margin: 2,
  });

  const canvas = createCanvas(layout.width, layout.height);
  const ctx = canvas.getContext('2d') as unknown as Ctx;

  // Engine warm-up — drawBlade reads config; engine state isn't on
  // the canvas in static-card mode, but the captureStateFrame call
  // mirrors the test harness for forward-compat.
  const engine = new BladeEngine();
  void engine.captureStateFrame(BladeState.ON, config, undefined, {
    progress: 1,
    settleMs: 200,
  });

  const card: CardContext = {
    ctx,
    options: {
      config,
      glyph,
      presetName: config.name,
      layout,
      theme,
    },
    layout,
    theme,
    qrCanvas: qr.canvas as unknown as HTMLCanvasElement,
  };

  drawBackdrop(card);
  drawHeader(card);
  await drawHilt(card);
  drawBlade(card);
  drawMetadata(card);
  drawQr(card);
  drawFooter(card);

  qr.texture.dispose();

  return canvas;
}

function getPixels(canvas: Canvas): Uint8ClampedArray {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

/**
 * Simulate text-rasterizer drift in-place. Walks the metadata column
 * + header band + footer band and applies a deterministic ±10 luma
 * jitter to a sparse fraction of pixels — roughly approximating the
 * pattern Cairo vs Core Graphics produce around glyph edges. The
 * pattern is sparse (~3% of pixels in those bands) and small in
 * magnitude (within pixelmatch's anti-aliasing detection threshold).
 *
 * Sparsity matches the visible "fringe" of glyph rasterization — the
 * inside of the strokes is usually fine; the AA fringe is where the
 * two engines disagree.
 */
function perturbForDriftSim(canvas: Canvas): void {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  // Bands to perturb — pulled from DEFAULT_LAYOUT.
  const bands: { x: number; y: number; w: number; h: number }[] = [
    // Header
    { x: 0, y: 0, w, h: DEFAULT_LAYOUT.headerH + 1 },
    // Footer
    { x: 0, y: h - DEFAULT_LAYOUT.footerH - 1, w, h: DEFAULT_LAYOUT.footerH + 1 },
    // Metadata column (title + spec + chips)
    {
      x: DEFAULT_LAYOUT.metadataLeftX - 4,
      y: DEFAULT_LAYOUT.metadataTopY - 30,
      w: DEFAULT_LAYOUT.metadataMaxWidth + 8,
      h: 200,
    },
    // Archive stamp
    { x: 20, y: DEFAULT_LAYOUT.headerH + 4, w: 200, h: 36 },
    // QR label
    {
      x: DEFAULT_LAYOUT.qrX - 4,
      y: DEFAULT_LAYOUT.qrY + DEFAULT_LAYOUT.qrSize + Math.max(0, DEFAULT_LAYOUT.qrLabelGap - 4),
      w: DEFAULT_LAYOUT.qrSize + 8,
      h: 24,
    },
  ];

  // Deterministic LCG for the sparse pattern — ensures the prototype
  // produces the same numbers on every run.
  let seed = 0x12345678 >>> 0;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (const band of bands) {
    const x0 = Math.max(0, band.x);
    const y0 = Math.max(0, band.y);
    const x1 = Math.min(w, band.x + band.w);
    const y1 = Math.min(h, band.y + band.h);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // ~3% density. Real glyph-edge AA has higher density along
        // stroke edges + lower elsewhere; this is averaged.
        if (rand() < 0.03) {
          const idx = (y * w + x) * 4;
          // ±10 jitter on each of R/G/B independently — comparable
          // to the sub-pixel hinting differences between renderers.
          const jitter = (): number => Math.round((rand() - 0.5) * 20);
          data[idx]     = clampByte(data[idx]     + jitter());
          data[idx + 1] = clampByte(data[idx + 1] + jitter());
          data[idx + 2] = clampByte(data[idx + 2] + jitter());
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

interface DiffCase {
  label: string;
  description: string;
  diffByThreshold: Record<string, number>;
}

const THRESHOLDS = [0.05, 0.1, 0.2, 0.3, 0.5];

async function diffPair(
  label: string,
  description: string,
  a: Canvas,
  b: Canvas,
): Promise<DiffCase> {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`${label}: dim mismatch ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const w = a.width;
  const h = a.height;
  const pa = getPixels(a);
  const pb = getPixels(b);
  const diffByThreshold: Record<string, number> = {};
  for (const t of THRESHOLDS) {
    // Pass `undefined` for the output buffer — we only need the count.
    // (Pixelmatch v7's signature accepts `void | Uint8Array | Uint8ClampedArray`;
    //  earlier @types versions used `null` for the same intent.)
    const mismatched = pixelmatch(pa, pb, undefined, w, h, { threshold: t });
    diffByThreshold[t.toFixed(2)] = mismatched;
  }
  return { label, description, diffByThreshold };
}

async function diffPairAAOff(
  label: string,
  description: string,
  a: Canvas,
  b: Canvas,
): Promise<DiffCase> {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`${label}: dim mismatch`);
  }
  const w = a.width;
  const h = a.height;
  const pa = getPixels(a);
  const pb = getPixels(b);
  const diffByThreshold: Record<string, number> = {};
  for (const t of THRESHOLDS) {
    const mismatched = pixelmatch(pa, pb, undefined, w, h, {
      threshold: t,
      includeAA: true, // disable anti-aliasing detection
    });
    diffByThreshold[t.toFixed(2)] = mismatched;
  }
  return { label, description, diffByThreshold };
}

function formatTable(cases: DiffCase[]): string {
  const headerCells = ['CASE', ...THRESHOLDS.map((t) => `t=${t.toFixed(2)}`)];
  const colW = [44, 11, 11, 11, 11, 11];
  const lines: string[] = [];
  lines.push(headerCells.map((c, i) => c.padEnd(colW[i])).join(''));
  lines.push(headerCells.map((_, i) => '-'.repeat(colW[i] - 1)).join(' '));
  for (const c of cases) {
    const row = [
      c.label.padEnd(colW[0]),
      ...THRESHOLDS.map((t, i) =>
        c.diffByThreshold[t.toFixed(2)].toString().padEnd(colW[i + 1]),
      ),
    ];
    lines.push(row.join(''));
  }
  return lines.join('\n');
}

// ─── Threshold sweep ────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('# pixelmatch threshold sweep — card snapshot v2 prototype\n');
  console.log(
    `Layout: ${DEFAULT_LAYOUT.id} (${DEFAULT_LAYOUT.width}×${DEFAULT_LAYOUT.height})`,
  );
  console.log(`Theme: ${DEFAULT_THEME.id}`);
  console.log(`Total pixels: ${DEFAULT_LAYOUT.width * DEFAULT_LAYOUT.height}\n`);

  const baseline = await renderCard({
    layout: DEFAULT_LAYOUT,
    theme: DEFAULT_THEME,
    config: OBI_WAN_ANH,
    glyph: TEST_GLYPH,
  });

  // === Case 1: identical re-render ===
  // Two passes through the same render path. On a single machine this
  // should produce a 0-pixel diff at any threshold (deterministic
  // canvas + deterministic engine + same node-canvas backend).
  // Captures the lower bound — anything above 0 here is noise.
  const baselineCopy = await renderCard({
    layout: DEFAULT_LAYOUT,
    theme: DEFAULT_THEME,
    config: OBI_WAN_ANH,
    glyph: TEST_GLYPH,
  });

  // === Case 2: 1-px metadata-baseline shift ===
  // Realistic intentional UI tweak — a designer nudges the metadata
  // title down by one pixel. This is the kind of change a regression
  // sentinel MUST catch.
  const shiftedLayout: CardLayout = {
    ...DEFAULT_LAYOUT,
    metadataTopY: DEFAULT_LAYOUT.metadataTopY + 1,
  };
  const shifted1px = await renderCard({
    layout: shiftedLayout,
    theme: DEFAULT_THEME,
    config: OBI_WAN_ANH,
    glyph: TEST_GLYPH,
  });

  // === Case 3: 4-px metadata-baseline shift ===
  // Larger nudge — a noticeable but not blatant typography change.
  const shifted4Layout: CardLayout = {
    ...DEFAULT_LAYOUT,
    metadataTopY: DEFAULT_LAYOUT.metadataTopY + 4,
  };
  const shifted4px = await renderCard({
    layout: shifted4Layout,
    theme: DEFAULT_THEME,
    config: OBI_WAN_ANH,
    glyph: TEST_GLYPH,
  });

  // === Case 4: theme backdrop shift ===
  // Theme backdrop slightly darker — captures a "color-token tweaked"
  // change. The backdrop is gradient-painted across the whole card so
  // every pixel shifts a tiny amount.
  const darkerTheme: CardTheme = {
    ...DEFAULT_THEME,
    backdropMid: '#0e1220',
    backdropOuter: '#070a13',
  };
  const themeShift = await renderCard({
    layout: DEFAULT_LAYOUT,
    theme: darkerTheme,
    config: OBI_WAN_ANH,
    glyph: TEST_GLYPH,
  });

  // === Case 5: blade hue shift (10°) ===
  // Larger semantic change — base color shifts. Tests whether the
  // bloom + capsule pipeline produces a diff that scales sanely with
  // the magnitude of the change (no all-or-nothing thresholding).
  const hueShiftedConfig: BladeConfig = {
    ...OBI_WAN_ANH,
    baseColor: { r: 30, g: 140, b: 230 }, // small hue + saturation tweak
  };
  const blueShift = await renderCard({
    layout: DEFAULT_LAYOUT,
    theme: DEFAULT_THEME,
    config: hueShiftedConfig,
    glyph: TEST_GLYPH,
  });

  // === Case 6: synthetic text-rasterizer drift simulation ===
  // We can't actually swap text rasterizers locally, but we CAN
  // simulate the visible effect of Cairo vs Core Graphics drift by
  // rendering the baseline, then perturbing a narrow band of pixels
  // by ±10 luma in a 1-2 px-wide pattern around the metadata text
  // region. This mimics the "different sub-pixel AA + slightly
  // different glyph hinting" that the Cairo/CG mismatch produces.
  // The resulting diff count tells us roughly what cross-platform
  // text drift WOULD register at each threshold — without actually
  // running on Linux.
  const driftSim = await renderCard({
    layout: DEFAULT_LAYOUT,
    theme: DEFAULT_THEME,
    config: OBI_WAN_ANH,
    glyph: TEST_GLYPH,
  });
  perturbForDriftSim(driftSim);

  const cases: DiffCase[] = [];
  cases.push(await diffPair('1. baseline ≡ baseline', 'identical re-render (lower bound)', baseline, baselineCopy));
  cases.push(await diffPair('2. baseline vs +1px metadata', '1-pixel shift on metadata baseline', baseline, shifted1px));
  cases.push(await diffPair('3. baseline vs +4px metadata', '4-pixel shift on metadata baseline', baseline, shifted4px));
  cases.push(await diffPair('4. baseline vs darker theme backdrop', 'backdrop tone tweak (gradient-wide)', baseline, themeShift));
  cases.push(await diffPair('5. baseline vs blade hue shift', 'small base color tweak', baseline, blueShift));
  cases.push(await diffPair('6. baseline vs synth text-rasterizer drift', '~1-2px band perturbation (Cairo↔CG proxy)', baseline, driftSim));

  console.log(formatTable(cases));

  // Second pass — same cases, but with includeAA: true (anti-alias
  // detection disabled). This exposes how much of the discrimination
  // we lose to AA-suppression. If AA-detection is what's swallowing
  // our real changes (Case 5), turning it off may recover them, but
  // we also lose the suppression that helps with text drift.
  console.log('\n# Pass 2: with `includeAA: true` (AA suppression OFF)\n');
  const aaOffCases: DiffCase[] = [];
  aaOffCases.push(await diffPairAAOff('1. baseline ≡ baseline', '', baseline, baselineCopy));
  aaOffCases.push(await diffPairAAOff('2. baseline vs +1px metadata', '', baseline, shifted1px));
  aaOffCases.push(await diffPairAAOff('3. baseline vs +4px metadata', '', baseline, shifted4px));
  aaOffCases.push(await diffPairAAOff('4. baseline vs darker theme backdrop', '', baseline, themeShift));
  aaOffCases.push(await diffPairAAOff('5. baseline vs blade hue shift', '', baseline, blueShift));
  aaOffCases.push(await diffPairAAOff('6. baseline vs synth text drift', '', baseline, driftSim));
  console.log(formatTable(aaOffCases));
  console.log('\n# Notes\n');
  console.log('Case 1 establishes the deterministic-render floor (must be 0).');
  console.log('Cases 2-3 establish the "intentional change" upper bound at varying magnitudes.');
  console.log('Cases 4-5 show how broad-area perturbations scale across thresholds.');
  console.log('Case 6 is a synthetic proxy for Cairo↔CG glyph drift — sparse');
  console.log('±10 luma jitter on text-bearing bands. Real cross-platform drift');
  console.log('would also show similar bands; for ground truth, run this script');
  console.log('on Linux CI against a macOS-rendered baseline.');
  console.log('\nFor the recommendation, see:');
  console.log('  docs/research/CARD_SNAPSHOT_V2_PERCEPTUAL_DIFF.md\n');

  restoreGlobals();
}

main().catch((err: unknown) => {
  restoreGlobals();
  console.error('prototype failed:', err);
  process.exit(1);
});

// ─── Card-snapshot golden-hash — layout × theme matrix ──────────────
//
// Pixel-output regression sentinel for the saber-card pipeline. Pins
// the rendered chrome + blade + hilt + QR composition for the
// 3×5 layout × theme matrix:
//
//   layouts: default · og · instagram
//   themes:  default · light · imperial · jedi · space
//
// = 15 cases.
//
// STORY_LAYOUT and VERTICAL_LAYOUT are excluded — their portrait
// orientation pushes text rendering into regions the region-mask
// strategy doesn't cover, producing cross-platform divergence (Cairo
// on Linux CI vs Core Graphics on macOS). Re-add them in a follow-up
// PR that either widens the masking to cover portrait-specific text
// rects, or confines text rendering to the existing masked regions.
// (The 3 horizontal/square layouts that pass — default 1200×675,
// og 1200×630, instagram 1080×1080 — all hash byte-stable.)
//
// === Approach A — region-masked hashing (chosen) ===
//
// PR #147 dropped the original card-snapshot tests because Cairo (CI)
// and Core Graphics (Mac authoring) rasterize text differently —
// even coarse 4×4 + 16-level luma quantization wasn't enough to
// swallow the per-glyph drift.
//
// This file zeros out every text-bearing rect (header band, footer
// band, metadata column, archive stamp, QR label) BEFORE hashing.
// What remains is pixel-aligned arithmetic that both rasterizers
// agree on byte-for-byte:
//
//   • Backdrop gradients + grid dots + HUD brackets + crosshairs +
//     vignette + scanlines.
//   • The watermark glyph (single isolated low-α character — Cairo
//     and Core Graphics both rasterize it stably; if a future Cairo
//     update breaks this, the watermark band is the next mask
//     candidate).
//   • The blade pipeline (capsule + bloom + tip cone) — already
//     proven cross-platform stable by the renderer-level golden hash.
//   • The hilt (canvas-primitive — no SVG/text rasterization).
//   • The QR code modules (pixel-aligned squares).
//
// Approaches considered but rejected:
//
//   • Approach B (perceptual diff with tolerance) — would need to
//     plumb a new test runner shape (vitest's `toMatchSnapshot` is
//     hash-equality only). High test-infra cost.
//
//   • Approach C (process.platform skip) — current CI is Linux-only,
//     authoring is macOS. A platform skip would either run on no
//     contributors' machines or give false-positive coverage. Bad
//     trade.
//
// === When a hash mismatch fires ===
// 1. Inspect visually: open the editor + render the same combo via
//    the CrystalPanel "Save share card" button. Does the change look
//    intentional?
// 2. Intentional: regenerate via
//    `pnpm vitest run -u tests/cardSnapshotGoldenHash`.
// 3. Unintentional: bisect to find the card-pipeline commit. Both
//    engine + renderer hashes should still pass (they're untouched);
//    only the card chrome changed.
//
// === What this hash does NOT cover ===
// Text rendering. If `drawHeader` switches the title from
// "◈ KYBERSTATION" to "KYBERSTATION ◈", this suite passes. Text
// regressions need component-level tests — `drawMetadata.test.ts`
// asserting the exact `presetLabel` formatting, etc.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BladeEngine,
  BladeState,
  type BladeConfig,
} from '@kyberstation/engine';
import {
  DEFAULT_LAYOUT,
  OG_LAYOUT,
  INSTAGRAM_LAYOUT,
} from '@/lib/sharePack/card/cardLayout';
import {
  DEFAULT_THEME,
  LIGHT_THEME,
  IMPERIAL_THEME,
  JEDI_THEME,
  SPACE_THEME,
} from '@/lib/sharePack/card/cardTheme';
import { drawBackdrop } from '@/lib/sharePack/card/drawBackdrop';
import { drawHeader } from '@/lib/sharePack/card/drawHeader';
import { drawHilt } from '@/lib/sharePack/card/drawHilt';
import { drawBlade } from '@/lib/sharePack/card/drawBlade';
import { drawMetadata } from '@/lib/sharePack/card/drawMetadata';
import { drawQr } from '@/lib/sharePack/card/drawQr';
import { drawFooter } from '@/lib/sharePack/card/drawFooter';
import type {
  CardContext,
  CardLayout,
  CardTheme,
  Ctx,
} from '@/lib/sharePack/card/cardTypes';

import { createTestCanvas, installCanvasGlobals } from './setup';
import { hashCanvas, hashCanvasWithMasks } from './hash';

// ─── Canvas globals: install once for the whole suite ───────────────

let restoreGlobals: () => void;
beforeAll(() => {
  restoreGlobals = installCanvasGlobals();
});
afterAll(() => {
  restoreGlobals?.();
});

// ─── Canonical config — Obi-Wan ANH (matches bladeStore DEFAULT_CONFIG) ───

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

// Deterministic glyph for the QR — a known short string that produces
// a stable QR code module pattern. Real Kyber Glyphs are longer; for
// drift-sentinel purposes we want a small payload that exercises the
// QR module-distribution logic the same way every time.
const TEST_GLYPH = 'JED:test-card-snapshot-2026-04-30';

// ─── Layout × Theme matrix ──────────────────────────────────────────

// STORY_LAYOUT + VERTICAL_LAYOUT excluded from the matrix — their
// portrait orientation pushes text rendering into regions the region-
// mask strategy doesn't cover, producing cross-platform divergence
// (Cairo on Linux CI vs Core Graphics on macOS). The 3 layouts that
// remain (default / og / instagram) all hash cross-platform-stable.
// Re-add the 2 portrait layouts in a follow-up PR that widens the
// masking to cover portrait-specific text rects.
const LAYOUTS: CardLayout[] = [
  DEFAULT_LAYOUT,
  OG_LAYOUT,
  INSTAGRAM_LAYOUT,
];

const THEMES: CardTheme[] = [
  DEFAULT_THEME,
  LIGHT_THEME,
  IMPERIAL_THEME,
  JEDI_THEME,
  SPACE_THEME,
];

// ─── Render harness ────────────────────────────────────────────────
//
// Mirrors `renderCardSnapshot`'s drawer order exactly. We don't call
// the orchestrator directly because:
//   1. It returns a Blob via `convertToBlob` / `toBlob`, neither of
//      which exists on node-canvas. Even with our OffscreenCanvas
//      polyfill returning a real Canvas, the dispatch in cardSnapshot.ts
//      checks for `convertToBlob` (function) → `toBlob` (function); both
//      are undefined on node-canvas, throwing `'toBlob failed'`.
//   2. We want raw pixel access for masked hashing, not a serialized
//      PNG.
//
// Instead, replicate the exact `renderCardSnapshot` z-order. If the
// orchestrator changes (e.g. adds a new drawer), this harness has to
// be updated too — that's a feature, not a bug: the test directory
// becomes the canonical contract for what's in a card.

import { createQrSurface } from '@/lib/crystal/qrSurface';

interface RenderArgs {
  layout: CardLayout;
  theme: CardTheme;
  config: BladeConfig;
  glyph: string;
  bladeState: BladeState;
}

async function renderCardForHash(args: RenderArgs): Promise<ReturnType<typeof createTestCanvas>> {
  const { layout, theme, config, glyph, bladeState } = args;

  // Pre-render QR. Same options as renderCardSnapshot to keep
  // module-distribution byte-identical.
  const qr = await createQrSurface(glyph, {
    canvasSize: 512,
    errorCorrectionLevel: 'Q',
    margin: 2,
  });

  const canvas = createTestCanvas(layout.width, layout.height);
  const ctx = canvas.getContext('2d') as unknown as Ctx;
  if (!ctx) throw new Error('renderCardForHash: no 2D context');

  // Capture the engine LED buffer at the requested state. drawBlade
  // reads from `options.config` directly (not from a passed buffer),
  // but we use captureStateFrame here as a forward-compat hook —
  // future drawBlade migrations to the workbench renderer (PR #147's
  // trajectory) consume an LED buffer, and this scaffold handles
  // both.
  const engine = new BladeEngine();
  void engine.captureStateFrame(bladeState, config, undefined, {
    progress: bladeState === BladeState.ON ? 1 : 0,
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

  // Z-order: identical to renderCardSnapshot.
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

// ─── Tests ──────────────────────────────────────────────────────────

describe('card snapshot golden hash — layout × theme matrix (region-masked)', () => {
  for (const layout of LAYOUTS) {
    for (const theme of THEMES) {
      const id = `${layout.id} × ${theme.id}`;
      it(id, async () => {
        const canvas = await renderCardForHash({
          layout,
          theme,
          config: OBI_WAN_ANH,
          glyph: TEST_GLYPH,
          bladeState: BladeState.ON,
        });

        // Sanity: canvas dims match the layout.
        expect(canvas.width).toBe(layout.width);
        expect(canvas.height).toBe(layout.height);

        // Region-masked hash — see ./hash.ts for the masking strategy.
        // File-based snapshot lives at __snapshots__/cardSnapshot.test.ts.snap.
        expect(hashCanvasWithMasks(canvas, layout)).toMatchSnapshot();
      });
    }
  }

  // ─── Drift sentinels ──────────────────────────────────────────────
  //
  // Same shape as the renderer-level golden hash sentinel — locks the
  // FNV-1a hash function for a known input so toolchain bumps don't
  // silently invalidate the suite.

  it('FNV-1a hash function is stable for a known input', () => {
    const canvas = createTestCanvas(2, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('drift sentinel: no 2D context');
    const imgData = ctx.createImageData(2, 1);
    imgData.data[0] = 255; imgData.data[1] = 0;   imgData.data[2] = 0;   imgData.data[3] = 255;
    imgData.data[4] = 0;   imgData.data[5] = 255; imgData.data[6] = 0;   imgData.data[7] = 255;
    ctx.putImageData(imgData, 0, 0);
    expect(hashCanvas(canvas)).toMatchSnapshot();
  });

  it('region-masked hash zeros the masked pixels deterministically', () => {
    // A canvas filled with a known pattern → mask bands → hash.
    // Asserts the masked output is hash-stable + that two distinct
    // text fills produce IDENTICAL masked hashes (the property the
    // approach depends on cross-platform).
    const layout = DEFAULT_LAYOUT;
    const fillCanvas = (text: string) => {
      const canvas = createTestCanvas(layout.width, layout.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('drift sentinel: no 2D context');
      // Solid backdrop the same way each run.
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(0, 0, layout.width, layout.height);
      // Different text in header/footer/metadata regions on each run
      // — these MUST be masked away by hashCanvasWithMasks.
      ctx.fillStyle = '#ffffff';
      ctx.font = "700 24px sans-serif";
      ctx.fillText(text, 32, 32);
      ctx.fillText(text, 32, layout.height - 16);
      ctx.fillText(text, layout.metadataLeftX, layout.metadataTopY);
      return canvas;
    };

    const hashA = hashCanvasWithMasks(fillCanvas('Variant Alpha'), layout);
    const hashB = hashCanvasWithMasks(fillCanvas('Variant Beta'), layout);
    expect(hashA).toBe(hashB);
    // Snapshot the actual hash so a mask-region change shows up.
    expect(hashA).toMatchSnapshot();
  });
});

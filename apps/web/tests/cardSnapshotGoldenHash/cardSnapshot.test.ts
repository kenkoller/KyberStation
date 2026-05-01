// ─── Card-snapshot golden-hash — layout × theme matrix v2 ──────────────
//
// Pixel-output regression sentinel for the saber-card pipeline. Restores
// the full 5 layouts × 5 themes = 25 combos coverage that PR #147 + PR
// #217 dropped, by routing snapshots through PLATFORM-SPECIFIC golden
// files instead of trying to make the matrix cross-platform stable.
//
// === Why platform-specific golden files (PR #223 research) ===
//
//   - Cairo (Linux CI, FreeType + Pango) and Core Graphics (macOS, Core
//     Text) rasterize text differently. Coarse hashing (4×4 + 16-level
//     luma quantize) was insufficient (PR #147). Region-masking was
//     insufficient — drawHilt + drawMetadata's chip row both write text
//     outside maskable rects (PR #217).
//   - Pixelmatch threshold-tuning explored in PR #223: NO valid
//     threshold valley exists between "swallows Cairo↔CG drift" and
//     "preserves real change detection". Verdict: do not adopt
//     pixelmatch for this matrix.
//   - Recommended approach: split CI into Linux + macOS jobs, author
//     baselines per-platform, both committed. Standard vitest snapshot
//     infrastructure handles it via `resolveSnapshotPath` config that
//     routes test files into platform-suffixed snapshot files.
//
// === Snapshot files ===
//
// `vitest.config.ts` configures `resolveSnapshotPath` to interpolate
// `process.platform` for THIS specific test file:
//
//   apps/web/tests/cardSnapshotGoldenHash/__snapshots__/
//     cardSnapshot.darwin.test.ts.snap   ← recorded on macOS
//     cardSnapshot.linux.test.ts.snap    ← recorded on Linux CI
//
// The FNV-1a drift sentinel uses standard cross-platform-stable
// `toMatchSnapshot()` (lives in the same per-platform file but the same
// hash should match on every platform).
//
// === When a hash mismatch fires ===
//
// 1. Inspect: does the change look intentional (a real card-pipeline
//    change)?
// 2. Intentional: regenerate via `pnpm --filter @kyberstation/web test
//    -u tests/cardSnapshotGoldenHash`. Vitest writes new hashes into
//    THIS PLATFORM's snapshot file. The OTHER platform must regen on
//    its CI runner OR via the workflow_dispatch on the macOS workflow.
// 3. Unintentional: bisect to find the card-pipeline commit. Check the
//    renderer-level golden hashes (./rendererGoldenHash/) — those use
//    pixel-aligned arithmetic and shouldn't drift. Card hashes drift
//    when chrome / chips / hilt / metadata change.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  drawBackdrop,
} from '@/lib/sharePack/card/drawBackdrop';
import { drawHeader } from '@/lib/sharePack/card/drawHeader';
import { drawHilt } from '@/lib/sharePack/card/drawHilt';
import { drawBlade } from '@/lib/sharePack/card/drawBlade';
import { drawMetadata } from '@/lib/sharePack/card/drawMetadata';
import { drawQr } from '@/lib/sharePack/card/drawQr';
import { drawFooter } from '@/lib/sharePack/card/drawFooter';
import { LAYOUT_CATALOG } from '@/lib/sharePack/card/cardLayout';
import { THEME_CATALOG } from '@/lib/sharePack/card/cardTheme';
import { createQrSurface } from '@/lib/crystal/qrSurface';
import type {
  CardContext,
  CardSnapshotOptions,
  Ctx,
} from '@/lib/sharePack/card/cardTypes';
import type { BladeConfig } from '@kyberstation/engine';
import type { Canvas } from 'canvas';

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

// ─── Canonical config + glyph ───────────────────────────────────────
//
// One representative config per matrix run. The matrix exercises layout
// × theme combinations, NOT config variations — that's the renderer
// golden-hash's job. Pick a stable "Obi-Wan blue / 144 LEDs / Standard"
// shape so each card has the same contents and the only varying axis is
// presentation.

const REPRESENTATIVE_CONFIG: BladeConfig = {
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

// Stable glyph string. Same string every test → same QR every test
// (modulo theme color). The Q-level error correction + 2-module margin
// are the same as the production card.
const REPRESENTATIVE_GLYPH = 'JEDtest123abcXYZ';

const REPRESENTATIVE_PRESET_NAME = 'Obi-Wan Kenobi';
const REPRESENTATIVE_CRYSTAL_NAME = 'Test Crystal';

// ─── Card render harness — direct drawer composition ─────────────────
//
// Replicates `renderCardSnapshot`'s body but skips the OffscreenCanvas
// → blob conversion. Returns the canvas itself so we can hash it.
//
// Identical z-order to the production code so hashes track production
// drift exactly. Any change to the production drawer order would
// require a matching change here AND a snapshot regeneration.

async function renderCardToCanvas(
  layoutId: string,
  themeId: string,
): Promise<Canvas> {
  const layout = LAYOUT_CATALOG[layoutId];
  const theme = THEME_CATALOG[themeId];
  if (!layout) throw new Error(`unknown layout: ${layoutId}`);
  if (!theme) throw new Error(`unknown theme: ${themeId}`);

  const options: CardSnapshotOptions = {
    config: REPRESENTATIVE_CONFIG,
    glyph: REPRESENTATIVE_GLYPH,
    presetName: REPRESENTATIVE_PRESET_NAME,
    crystalName: REPRESENTATIVE_CRYSTAL_NAME,
    layout,
    theme,
  };

  // QR surface — flat canvas stamped onto the card. Match production
  // settings (canvasSize 512, errorCorrectionLevel 'Q', margin 2).
  const qr = await createQrSurface(options.glyph, {
    canvasSize: 512,
    errorCorrectionLevel: 'Q',
    margin: 2,
  });

  const canvas = createTestCanvas(layout.width, layout.height);
  const ctx = canvas.getContext('2d') as unknown as Ctx;
  if (!ctx) throw new Error('canvas context unavailable');

  const card: CardContext = {
    ctx,
    options,
    layout,
    theme,
    qrCanvas: qr.canvas,
  };

  // Z-order matters: backdrop → header → hilt → blade → metadata → QR
  // → footer. Mirrors `renderCardSnapshot` exactly.
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

// ─── Layout × theme matrix (5 × 5 = 25 combos) ──────────────────────

const LAYOUT_IDS = ['default', 'og', 'instagram', 'story', 'vertical'] as const;
const THEME_IDS = ['default', 'light', 'imperial', 'jedi', 'space'] as const;

describe('card snapshot golden hash — layout × theme matrix', () => {
  for (const layoutId of LAYOUT_IDS) {
    for (const themeId of THEME_IDS) {
      it(`${layoutId} × ${themeId}`, async () => {
        const canvas = await renderCardToCanvas(layoutId, themeId);
        const hash = hashCanvas(canvas);
        // File-based snapshot — see __snapshots__/cardSnapshot.<platform>.test.ts.snap
        // First run records; subsequent runs compare. The `vitest.config.ts`
        // `resolveSnapshotPath` callback selects the platform-specific
        // file, so a darwin run reads/writes cardSnapshot.darwin.test.ts.snap
        // and a linux run reads/writes cardSnapshot.linux.test.ts.snap.
        expect(hash).toMatchSnapshot();
      });
    }
  }

  // ─── Drift sentinel (cross-platform-stable) ────────────────────────
  //
  // FNV-1a should produce the same hash on every platform for the same
  // input bytes. This sentinel proves the hash function still works as
  // expected — if it flips, every other hash is suspect.
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
});

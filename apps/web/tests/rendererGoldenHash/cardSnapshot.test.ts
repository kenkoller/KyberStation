// ─── Renderer golden-hash — card snapshot drawer pipeline ───────────
//
// Pins the rendered-canvas output of individual card drawers across
// layout × theme combinations. Catches drift in:
//
//   • drawBackdrop's grid-dot lattice, blueprint details, corner
//     brackets, edge vignette, and scanlines.
//   • drawBlade's delegation to `drawWorkbenchBlade` (capsule rasterizer
//     + 3-mip bloom), theme-aware composite mode, and engine → LED
//     buffer capture path.
//
// What this DOES NOT cover (text-heavy drawers):
//
//   • drawHeader, drawMetadata, drawFooter — all use Orbitron /
//     JetBrains Mono text rendering, which diverges between macOS
//     (Core Text) and Linux CI (FreeType + Pango). Even coarse
//     hashing is too granular to mask font-glyph rasterization
//     drift. See PR #147 drop notes for background.
//   • drawHilt — uses SVG → Image → drawImage which needs DOM.
//   • drawQr — uses qrSurface module + external qrcode dep.
//
// === Strategy ===
// drawBackdrop: uses `hashCanvasCoarse` because it contains one small
// text element (the "◢ CLASSIFIED: BLADE-A" archive stamp) whose
// rendering diverges across platforms. The coarse 4×4 tile + 16-level
// quantization absorbs that variance.
//
// drawBlade: uses `hashCanvas` (full fidelity) because it's entirely
// pixel-aligned math — capsule rasterizer + bloom mip-chain with no
// text or font rendering involved.
//
// === When a hash mismatch fires ===
// Same procedure as bladeRenderer.test.ts:
// 1. Inspect visually — does the change look intentional?
// 2. Intentional: `pnpm vitest run -u tests/rendererGoldenHash/cardSnapshot`.
// 3. Unintentional: bisect the commit that changed drawer output.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drawBackdrop } from '@/lib/sharePack/card/drawBackdrop';
import { drawBlade } from '@/lib/sharePack/card/drawBlade';
import { DEFAULT_LAYOUT, LAYOUT_CATALOG } from '@/lib/sharePack/card/cardLayout';
import {
  DEFAULT_THEME,
  LIGHT_THEME,
  IMPERIAL_THEME,
  JEDI_THEME,
  SPACE_THEME,
  THEME_CATALOG,
} from '@/lib/sharePack/card/cardTheme';
import type {
  CardContext,
  CardLayout,
  CardTheme,
  CardSnapshotOptions,
} from '@/lib/sharePack/card/cardTypes';
import type { BladeConfig } from '@kyberstation/engine';
import { createTestCanvas, installCanvasGlobals } from './setup';
import { hashCanvas, hashCanvasCoarse } from './hash';

// ─── Canvas globals ────────────────────────────────────────────────

let restoreGlobals: () => void;
beforeAll(() => {
  restoreGlobals = installCanvasGlobals();
});
afterAll(() => {
  restoreGlobals?.();
});

// ─── Test configs ──────────────────────────────────────────────────

const OBI_WAN_BLUE: BladeConfig = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 255, b: 255 },
  blastColor: { r: 255, g: 200, b: 80 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 500,
  shimmer: 0.2,
  ledCount: 144,
};

const VADER_RED: BladeConfig = {
  ...OBI_WAN_BLUE,
  baseColor: { r: 255, g: 0, b: 0 },
  style: 'unstable',
  shimmer: 0.6,
};

const YODA_GREEN: BladeConfig = {
  ...OBI_WAN_BLUE,
  baseColor: { r: 0, g: 210, b: 50 },
  style: 'stable',
  shimmer: 0.15,
};

// ─── Helpers ───────────────────────────────────────────────────────

/** Build a minimal CardContext for testing a single drawer. */
function buildCardContext(
  canvas: ReturnType<typeof createTestCanvas>,
  config: BladeConfig,
  layout: CardLayout,
  theme: CardTheme,
): CardContext {
  // node-canvas's CanvasRenderingContext2D is structurally compatible
  // with the browser's but TS's strict mode sees a few missing props
  // from the OffscreenCanvasRenderingContext2D branch of the Ctx union.
  // The cast is safe — drawers only call standard 2D context methods.
  const ctx = canvas.getContext('2d')! as unknown as import('@/lib/sharePack/card/cardTypes').Ctx;
  const options: CardSnapshotOptions = {
    config,
    glyph: 'test-glyph-abc123',
  };
  // Dummy QR canvas — drawBackdrop and drawBlade don't use it.
  const qrCanvas = createTestCanvas(168, 168) as unknown as HTMLCanvasElement;
  return { ctx, options, layout, theme, qrCanvas };
}

// ─── drawBackdrop golden-hash ──────────────────────────────────────
//
// Tests 5 themes × the DEFAULT_LAYOUT. Uses coarse hashing because
// the archive stamp renders font glyphs that diverge cross-platform.
// The grid dots, vignette, bracket geometry, and scanlines are all
// pixel-aligned and the coarse tile quantization is stable for those.

describe('drawBackdrop golden-hash', () => {
  const themes: [string, CardTheme][] = [
    ['default', DEFAULT_THEME],
    ['light', LIGHT_THEME],
    ['imperial', IMPERIAL_THEME],
    ['jedi', JEDI_THEME],
    ['space', SPACE_THEME],
  ];

  for (const [themeName, theme] of themes) {
    it(`default layout × ${themeName} theme`, () => {
      const canvas = createTestCanvas(
        DEFAULT_LAYOUT.width,
        DEFAULT_LAYOUT.height,
      );
      const card = buildCardContext(canvas, OBI_WAN_BLUE, DEFAULT_LAYOUT, theme);
      drawBackdrop(card);
      const hash = hashCanvasCoarse(canvas);
      expect(hash).toMatchSnapshot();
    });
  }

  // Cross-color check: backdrop wash is tinted by baseColor,
  // so different configs should produce different hashes.
  it('backdrop wash varies by baseColor', () => {
    const canvasBlue = createTestCanvas(
      DEFAULT_LAYOUT.width,
      DEFAULT_LAYOUT.height,
    );
    const cardBlue = buildCardContext(
      canvasBlue,
      OBI_WAN_BLUE,
      DEFAULT_LAYOUT,
      DEFAULT_THEME,
    );
    drawBackdrop(cardBlue);
    const hashBlue = hashCanvasCoarse(canvasBlue);

    const canvasRed = createTestCanvas(
      DEFAULT_LAYOUT.width,
      DEFAULT_LAYOUT.height,
    );
    const cardRed = buildCardContext(
      canvasRed,
      VADER_RED,
      DEFAULT_LAYOUT,
      DEFAULT_THEME,
    );
    drawBackdrop(cardRed);
    const hashRed = hashCanvasCoarse(canvasRed);

    expect(hashBlue).not.toBe(hashRed);
  });
});

// ─── drawBlade golden-hash ─────────────────────────────────────────
//
// Tests 3 configs × 2 themes (dark=additive / light=source-over).
// Full-fidelity hashing — the blade pipeline is entirely pixel-math
// (capsule rasterizer + bloom mips), no text rendering involved.

describe('drawBlade golden-hash', () => {
  const configs: [string, BladeConfig][] = [
    ['obi-wan-blue', OBI_WAN_BLUE],
    ['vader-red', VADER_RED],
    ['yoda-green', YODA_GREEN],
  ];

  const themes: [string, CardTheme][] = [
    ['default', DEFAULT_THEME],
    ['light', LIGHT_THEME],
  ];

  for (const [configName, config] of configs) {
    for (const [themeName, theme] of themes) {
      it(`${configName} × ${themeName} theme`, () => {
        const canvas = createTestCanvas(
          DEFAULT_LAYOUT.width,
          DEFAULT_LAYOUT.height,
        );
        const card = buildCardContext(canvas, config, DEFAULT_LAYOUT, theme);
        drawBlade(card);
        const hash = hashCanvas(canvas);
        expect(hash).toMatchSnapshot();
      });
    }
  }

  // Blade color identity: different configs must hash differently.
  it('different configs produce different hashes', () => {
    const hashes = configs.map(([, config]) => {
      const canvas = createTestCanvas(
        DEFAULT_LAYOUT.width,
        DEFAULT_LAYOUT.height,
      );
      const card = buildCardContext(canvas, config, DEFAULT_LAYOUT, DEFAULT_THEME);
      drawBlade(card);
      return hashCanvas(canvas);
    });
    const unique = new Set(hashes);
    expect(unique.size).toBe(hashes.length);
  });

  // Theme composite mode: lighter vs source-over should differ.
  it('dark (lighter) vs light (source-over) produce different hashes', () => {
    const canvasDark = createTestCanvas(
      DEFAULT_LAYOUT.width,
      DEFAULT_LAYOUT.height,
    );
    const cardDark = buildCardContext(
      canvasDark,
      OBI_WAN_BLUE,
      DEFAULT_LAYOUT,
      DEFAULT_THEME,
    );
    drawBlade(cardDark);
    const hashDark = hashCanvas(canvasDark);

    const canvasLight = createTestCanvas(
      DEFAULT_LAYOUT.width,
      DEFAULT_LAYOUT.height,
    );
    const cardLight = buildCardContext(
      canvasLight,
      OBI_WAN_BLUE,
      DEFAULT_LAYOUT,
      LIGHT_THEME,
    );
    drawBlade(cardLight);
    const hashLight = hashCanvas(canvasLight);

    expect(hashDark).not.toBe(hashLight);
  });
});

// ─── FNV hash drift sentinel ───────────────────────────────────────
//
// Same pattern as bladeRenderer.test.ts: catch FNV-1a implementation
// changes by checking a known pixel pattern against a fixed expected
// hash. Uses a tiny canvas with a simple known fill.

describe('card-snapshot FNV drift sentinel', () => {
  it('hashCanvas on a solid-fill 10×10 is stable', () => {
    const canvas = createTestCanvas(10, 10);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a2b3c';
    ctx.fillRect(0, 0, 10, 10);
    const hash = hashCanvas(canvas);
    expect(hash).toMatchSnapshot();
  });

  it('hashCanvasCoarse on a solid-fill 10×10 is stable', () => {
    const canvas = createTestCanvas(10, 10);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a2b3c';
    ctx.fillRect(0, 0, 10, 10);
    const hash = hashCanvasCoarse(canvas);
    expect(hash).toMatchSnapshot();
  });
});

// ─── Layout × theme catalog sanity ─────────────────────────────────
//
// Structural checks that the catalog stays in sync — not pixel tests,
// but they catch regressions like a layout missing a field.

describe('card catalog sanity', () => {
  it('LAYOUT_CATALOG has at least 4 entries', () => {
    const ids = Object.keys(LAYOUT_CATALOG);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  it('THEME_CATALOG has exactly 5 entries', () => {
    const ids = Object.keys(THEME_CATALOG);
    expect(ids.length).toBe(5);
  });

  it('every layout has required dimensional fields', () => {
    for (const [id, layout] of Object.entries(LAYOUT_CATALOG)) {
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
      expect(layout.headerH).toBeGreaterThan(0);
      expect(layout.footerH).toBeGreaterThan(0);
      expect(layout.bladeThickness).toBeGreaterThan(0);
      expect(layout.id).toBe(id);
      // Horizontal layouts must have valid blade X span.
      // Vertical layouts have bladeStartX/bladeEndX = 0 by convention
      // and use bladeY1/bladeY2 instead.
      if (layout.saberOrientation !== 'vertical') {
        expect(layout.bladeStartX).toBeGreaterThan(0);
        expect(layout.bladeEndX).toBeGreaterThan(layout.bladeStartX);
      } else {
        expect(layout.bladeY1).toBeDefined();
        expect(layout.bladeY2).toBeDefined();
        expect(layout.bladeY2!).toBeGreaterThan(layout.bladeY1!);
      }
    }
  });

  it('every theme fills all CardTheme tokens', () => {
    const requiredKeys: (keyof CardTheme)[] = [
      'id',
      'backdropBladeWash',
      'backdropMid',
      'backdropOuter',
      'backdropEdge',
      'scanlineColor',
      'scanlineAlpha',
      'gridColor',
      'gridAlpha',
      'hudBracketColor',
      'watermarkColor',
      'archiveStampBg',
      'archiveStampText',
      'vignetteColor',
      'hiltAccent',
      'bladeComposite',
      'headerBand',
      'headerText',
      'headerAccent',
      'headerSeparator',
      'metadataTitle',
      'metadataSpec',
      'metadataGlyphLabel',
      'metadataGlyphText',
      'chipBg',
      'chipText',
      'chipBorder',
      'chipGlyph',
      'qrBg',
      'qrLabelText',
      'qrPanelBorder',
      'footerBand',
      'footerText',
      'footerSeparator',
    ];
    for (const [id, theme] of Object.entries(THEME_CATALOG)) {
      for (const key of requiredKeys) {
        expect(theme[key]).toBeDefined();
      }
      expect(theme.id).toBe(id);
    }
  });
});

// ─── Renderer golden-hash — Saber Card pipeline ─────────────────────
//
// Pins the rendered-canvas output of the Saber Card drawer pipeline
// (`apps/web/lib/sharePack/card/`) for a representative slice of the
// layout × theme matrix. The Card is the primary share artifact —
// regressions in the drawer pipeline ship as broken-looking PNGs to
// every user clicking "Save share card."
//
// Why we compose drawers directly instead of calling renderCardSnapshot:
//
//   `renderCardSnapshot` calls `createQrSurface` (real qrcode.js +
//   Three.js texture) + `drawHilt` (which pulls in HiltRenderer SVG
//   for vertical layouts — async + Image decode). Both work in the
//   browser; in node we'd need elaborate stubs. Composing the
//   drawers directly bypasses both concerns and exercises the SAME
//   per-pixel canvas math.
//
// Specifically excluded:
//
//   • createQrSurface — we replace with a deterministic fake canvas
//     containing a fixed pattern. The `drawQr` drawer reads it as
//     opaque pixel data, so this gives identical output across runs.
//   • drawHilt vertical SVG path — only horizontal layouts here
//     (default / og / instagram / story); they hit the canvas-
//     primitive `drawCanvasHilt` path, no Image needed.
//
// === When a hash mismatch fires ===
// Same idiom as bladeRenderer.test.ts. When intentional, regenerate
// snapshots via `pnpm vitest run -u tests/rendererGoldenHash/cardSnapshot`.
// Snapshot file: `__snapshots__/cardSnapshot.test.ts.snap`.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  OG_LAYOUT,
  INSTAGRAM_LAYOUT,
  STORY_LAYOUT,
  DEFAULT_THEME,
  LIGHT_THEME,
  IMPERIAL_THEME,
  JEDI_THEME,
  SPACE_THEME,
} from '@/lib/sharePack/cardSnapshot';
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
import type { BladeConfig } from '@kyberstation/engine';
import { createTestCanvas, installCanvasGlobals } from './setup';
// Card snapshot tests use the coarse hash because card compositing (drawBackdrop
// vignette, drawBlade additive bloom, drawMetadata text antialiasing) is sensitive
// to the host's font hinting + Cairo rasterization. macOS-recorded snapshots
// drift from Linux CI hashes by 8-byte FNV deltas even though the visual output
// is identical to the eye. The coarse hash downsamples to 4x4 tiles + quantizes
// luma to 16 levels, smoothing over platform AA without losing regression
// coverage of layout/color/composite changes. The blade-renderer test stays on
// full-fidelity hashCanvas because its output is pixel-aligned capsule math.
import { hashCanvasCoarse } from './hash';

// ─── Canvas globals ─────────────────────────────────────────────────

let restoreGlobals: () => void;
beforeAll(() => {
  restoreGlobals = installCanvasGlobals();
});
afterAll(() => {
  restoreGlobals?.();
});

// ─── Canonical config ───────────────────────────────────────────────
//
// Hilt + blade + metadata all derive from this config. The layout ×
// theme matrix below holds the config fixed so hash changes attribute
// to layout / theme changes only.

const OBI_WAN_CONFIG: BladeConfig = {
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

const SAMPLE_GLYPH = 'JED:obi-test-glyph-12345';

// ─── Fake QR canvas — deterministic stand-in for createQrSurface ────
//
// drawQr accepts `card.qrCanvas` and `drawImage`s it into the QR
// panel. Real createQrSurface would invoke qrcode.js + Three.js;
// neither is needed here — `drawImage` only needs a canvas-shaped
// surface. We fill with a deterministic checkerboard so the hash
// reflects the QR drawer's positioning + composite without depending
// on qrcode.js's internal module layout.

function makeFakeQrCanvas(): unknown {
  const c = createTestCanvas(512, 512);
  const ctx = c.getContext('2d');
  // Fixed 8-px checkerboard — visually QR-like + every test-run gives
  // identical pixels.
  for (let y = 0; y < 512; y += 8) {
    for (let x = 0; x < 512; x += 8) {
      const on = ((x / 8) + (y / 8)) % 2 === 0;
      ctx.fillStyle = on ? '#000' : '#fff';
      ctx.fillRect(x, y, 8, 8);
    }
  }
  return c;
}

// ─── Card render harness ────────────────────────────────────────────

interface CardCase {
  id: string;
  layout: CardLayout;
  theme: CardTheme;
}

// Layout × theme matrix. Only horizontal sabers; the drawHilt vertical
// path is intentionally untested here (it's an SVG-decode pipeline
// covered separately when its outer surface stabilizes).
//
// Choices document the COVERAGE GOAL:
//   • default × default          — happy-path baseline
//   • default × imperial         — high-contrast theme variant
//   • default × jedi             — cream-on-brown, alt vignette/hilt
//   • default × space            — pure-black backdrop
//   • default × light            — light-theme bloom regression sentinel (PR #143)
//   • og × default               — alternate aspect ratio (1200×630)
//   • instagram × default        — square (1080×1080)
//   • story × space              — vertical (1080×1920) + minimal theme
const CARD_CASES: CardCase[] = [
  { id: 'default × default',   layout: DEFAULT_LAYOUT,   theme: DEFAULT_THEME },
  { id: 'default × imperial',  layout: DEFAULT_LAYOUT,   theme: IMPERIAL_THEME },
  { id: 'default × jedi',      layout: DEFAULT_LAYOUT,   theme: JEDI_THEME },
  { id: 'default × space',     layout: DEFAULT_LAYOUT,   theme: SPACE_THEME },
  { id: 'default × light',     layout: DEFAULT_LAYOUT,   theme: LIGHT_THEME },
  { id: 'og × default',        layout: OG_LAYOUT,        theme: DEFAULT_THEME },
  { id: 'instagram × default', layout: INSTAGRAM_LAYOUT, theme: DEFAULT_THEME },
  { id: 'story × space',       layout: STORY_LAYOUT,     theme: SPACE_THEME },
];

describe('renderer golden hash — Saber Card', () => {
  for (const c of CARD_CASES) {
    it(c.id, async () => {
      // Skip vertical layouts here — drawHilt vertical needs SVG-Image
      // decode that we explicitly excluded from this harness. STORY
      // layout (the only vertical one) currently has saberOrientation
      // 'horizontal' in the catalog, so it falls through to the canvas
      // primitive path. Confirm via assertion to surface drift.
      if (c.layout.saberOrientation === 'vertical') {
        expect.fail(
          `${c.id}: vertical layout reaches drawHilt SVG path — out of scope for this harness. ` +
          `Add a dedicated vertical-hilt test or skip via layout filter.`,
        );
      }

      const canvas = createTestCanvas(c.layout.width, c.layout.height);
      const ctx = canvas.getContext('2d') as unknown as Ctx;

      const card: CardContext = {
        ctx,
        options: {
          config: OBI_WAN_CONFIG,
          glyph: SAMPLE_GLYPH,
          presetName: 'Obi-Wan Kenobi',
          crystalName: 'Azure',
          layout: c.layout,
          theme: c.theme,
        },
        layout: c.layout,
        theme: c.theme,
        qrCanvas: makeFakeQrCanvas() as HTMLCanvasElement,
      };

      // Drawer composition matches `renderCardSnapshot` exactly.
      drawBackdrop(card);
      drawHeader(card);
      await drawHilt(card);
      drawBlade(card);
      drawMetadata(card);
      drawQr(card);
      drawFooter(card);

      expect(canvas.width).toBe(c.layout.width);
      expect(canvas.height).toBe(c.layout.height);
      expect(hashCanvasCoarse(canvas)).toMatchSnapshot();
    });
  }
});

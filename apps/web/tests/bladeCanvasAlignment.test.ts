// ─── BladeCanvas ↔ bladeRenderMetrics alignment tests ──────────────────────
//
// Verifies that BladeCanvas's inline geometry formulas and the shared
// `computeBladeRenderMetrics` helper produce identical blade start
// positions and blade widths for the same inputs. These two code paths
// must stay in lock-step so the BLADE PREVIEW, PIXEL STRIP, and
// ANALYSIS RAIL all render their per-LED content at the same horizontal
// extent.
//
// BladeCanvas geometry (horizontal mode, Phase 1.5f):
//   bladeStartPx = cw * (bladeStartFrac / 1000)
//   maxBladePx   = max(0, cw * AUTO_FIT_FILL - bladeStartPx)
//   scale        = maxBladePx / BLADE_LEN
//   bladeLenPx   = BLADE_LEN * (bladeInches / MAX_BLADE_INCHES) * scale
//                = maxBladePx * (bladeInches / MAX_BLADE_INCHES)
//
// computeBladeRenderMetrics geometry:
//   bladeLeftPx  = cw * (bladeStartFrac / 1000)
//   maxBladePx   = max(0, cw * AUTO_FIT_FILL - bladeLeftPx)
//   bladeWidthPx = maxBladePx * (bladeInches / MAX_BLADE_INCHES)
//
// After the Issue #8 fix, both paths use `inferBladeInches` from
// `lib/bladeLengths.ts` to map ledCount -> inches, so the inch value
// is guaranteed identical for the same ledCount input. The formulas
// above are algebraically identical — these tests pin that invariant.

import { describe, it, expect } from 'vitest';
import {
  computeBladeRenderMetrics,
  AUTO_FIT_FILL,
  BLADE_LEN,
  MAX_BLADE_INCHES,
} from '../lib/bladeRenderMetrics';
import { inferBladeInches } from '../lib/bladeLengths';

// ─── Constants parity ───────────────────────────────────────────────

describe('BladeCanvas ↔ bladeRenderMetrics constant parity', () => {
  it('AUTO_FIT_FILL is 0.90', () => {
    // Both BladeCanvas and bladeRenderMetrics must use the same fill ratio.
    expect(AUTO_FIT_FILL).toBe(0.90);
  });

  it('BLADE_LEN is 830 (design-space blade width for 40")', () => {
    expect(BLADE_LEN).toBe(830);
  });

  it('MAX_BLADE_INCHES is 40', () => {
    expect(MAX_BLADE_INCHES).toBe(40);
  });
});

// ─── Geometry alignment ─────────────────────────────────────────────

describe('BladeCanvas ↔ bladeRenderMetrics geometry alignment', () => {
  // Reproduce BladeCanvas's inline getBaseScale + getBladeStartPx +
  // bladeLenPx formulas as pure functions so we can compare outputs.
  function bladeCanvasGeometry(cw: number, ledCount: number, bladeStartFrac: number) {
    const bladeInches = inferBladeInches(ledCount);
    const bladeStartPx = cw * (bladeStartFrac / 1000);
    const maxBladePx = Math.max(0, cw * AUTO_FIT_FILL - bladeStartPx);
    const scale = BLADE_LEN > 0 ? maxBladePx / BLADE_LEN : 1;
    const bladeLenPx = BLADE_LEN * (bladeInches / MAX_BLADE_INCHES) * scale;
    return { bladeStartPx, bladeLenPx, bladeInches };
  }

  // Matrix of representative inputs covering every preset bucket.
  const LED_COUNTS = [0, 1, 73, 74, 88, 89, 103, 104, 117, 118, 132, 144, 145, 147, 288];
  const CONTAINER_WIDTHS = [500, 800, 1000, 1200, 1600];
  const BLADE_START_FRACS = [80, 130, 180, 250, 350];

  for (const cw of CONTAINER_WIDTHS) {
    for (const ledCount of LED_COUNTS) {
      for (const frac of BLADE_START_FRACS) {
        it(`cw=${cw} ledCount=${ledCount} frac=${frac} — blade start + width match`, () => {
          const canvas = bladeCanvasGeometry(cw, ledCount, frac);
          const metrics = computeBladeRenderMetrics({
            containerWidthPx: cw,
            ledCount,
            bladeStartFrac: frac,
          });

          // Blade start position must be identical.
          expect(canvas.bladeStartPx).toBeCloseTo(metrics.bladeLeftPx, 10);

          // Blade width must be identical.
          expect(canvas.bladeLenPx).toBeCloseTo(metrics.bladeWidthPx, 10);

          // Both must infer the same blade inches.
          expect(canvas.bladeInches).toBe(metrics.bladeInches);
        });
      }
    }
  }

  it('144 LEDs maps to 36" in both paths (the Issue #8 drift fix)', () => {
    // This is the specific case that was broken before the fix:
    // BladeCanvas's inline ternary had <= 132 for 36", but
    // inferBladeInches correctly maps 144 -> 36".
    const cw = 1000;
    const frac = 180;
    const canvas = bladeCanvasGeometry(cw, 144, frac);
    const metrics = computeBladeRenderMetrics({
      containerWidthPx: cw,
      ledCount: 144,
      bladeStartFrac: frac,
    });

    expect(canvas.bladeInches).toBe(36);
    expect(metrics.bladeInches).toBe(36);
    expect(canvas.bladeLenPx).toBeCloseTo(metrics.bladeWidthPx, 10);
  });
});

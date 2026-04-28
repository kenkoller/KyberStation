// ─── OV2 — bladeRenderMetrics regression tests ──
//
// Pins the pure geometry helper that PixelStripPanel + the
// ExpandedAnalysisSlot's LayerCanvas use to anchor their per-LED
// content to the blade's rendered extent in
// BladeCanvas. These assertions capture the invariants that matter for
// visual alignment:
//
//   1. inferBladeInches maps every LED-count bucket per the piecewise
//      ladder in BladeCanvas (also BLADE_LENGTH_PRESETS in engine types).
//   2. computeBladeRenderMetrics is symmetric: equal left + right
//      padding around the blade extent at panX = 0.
//   3. Longer blades produce proportionally wider blade rects.
//   4. pixels-per-LED is consistent with bladeWidthPx / ledCount.
//   5. bladeRightPx = bladeLeftPx + bladeWidthPx (internal consistency).

import { describe, it, expect } from 'vitest';
import {
  inferBladeInches,
  computeBladeRenderMetrics,
  AUTO_FIT_FILL,
} from '../lib/bladeRenderMetrics';

// Phase 1.5f: DEFAULT_BLADE_START_FRAC in bladeRenderMetrics.ts mirrors
// REGION_LIMITS.bladeStartFrac.default in uiStore. Kept in sync by hand.
const DEFAULT_BLADE_START_FRAC = 180;

// ─── inferBladeInches ────────────────────────────────────────────────────────

describe('inferBladeInches', () => {
  it('maps 73 and below to the 20" bucket', () => {
    expect(inferBladeInches(0)).toBe(20);
    expect(inferBladeInches(1)).toBe(20);
    expect(inferBladeInches(73)).toBe(20);
  });

  it('74..88 → 24"', () => {
    expect(inferBladeInches(74)).toBe(24);
    expect(inferBladeInches(88)).toBe(24);
  });

  it('89..103 → 28"', () => {
    expect(inferBladeInches(89)).toBe(28);
    expect(inferBladeInches(103)).toBe(28);
  });

  it('104..117 → 32"', () => {
    expect(inferBladeInches(104)).toBe(32);
    expect(inferBladeInches(117)).toBe(32);
  });

  it('118..144 → 36"', () => {
    // Updated 2026-04-27 overnight: Neopixel-blade community standard
    // is "144 LEDs/m density" with "1m ≈ 36 inches" treated as canonical,
    // so 144 LEDs is the standard 36" blade. Threshold raised from 132
    // to 144 to match.
    expect(inferBladeInches(118)).toBe(36);
    expect(inferBladeInches(132)).toBe(36);
    expect(inferBladeInches(144)).toBe(36);
  });

  it('145 and above → 40"', () => {
    expect(inferBladeInches(145)).toBe(40);
    expect(inferBladeInches(147)).toBe(40);
    expect(inferBladeInches(288)).toBe(40);
    expect(inferBladeInches(10000)).toBe(40);
  });

  it('default 144 LED config maps to 36"', () => {
    // bladeStore DEFAULT_CONFIG.ledCount = 144 → 36" preset (community-
    // standard mapping, post 2026-04-27 overnight correction).
    expect(inferBladeInches(144)).toBe(36);
  });
});

// ─── computeBladeRenderMetrics ───────────────────────────────────────────────

describe('computeBladeRenderMetrics', () => {
  it('returns self-consistent left + width + right', () => {
    const m = computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 144 });
    expect(m.bladeRightPx).toBeCloseTo(m.bladeLeftPx + m.bladeWidthPx, 10);
  });

  it('passes the containerWidthPx back on the metrics object', () => {
    const m = computeBladeRenderMetrics({ containerWidthPx: 900, ledCount: 144 });
    expect(m.containerWidthPx).toBe(900);
  });

  it('infers blade inches from ledCount', () => {
    expect(computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 88 }).bladeInches).toBe(24);
    // 144 → 36" (community-standard mapping, post 2026-04-27 correction).
    expect(computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 144 }).bladeInches).toBe(36);
    expect(computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 147 }).bladeInches).toBe(40);
  });

  it('40" blade occupies the largest width; 20" the smallest (monotonic)', () => {
    const cw = 1000;
    const m20 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 73 });
    const m24 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 88 });
    const m28 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 103 });
    const m32 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 117 });
    const m36 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 144 });
    const m40 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 147 });
    expect(m20.bladeWidthPx).toBeLessThan(m24.bladeWidthPx);
    expect(m24.bladeWidthPx).toBeLessThan(m28.bladeWidthPx);
    expect(m28.bladeWidthPx).toBeLessThan(m32.bladeWidthPx);
    expect(m32.bladeWidthPx).toBeLessThan(m36.bladeWidthPx);
    expect(m36.bladeWidthPx).toBeLessThan(m40.bladeWidthPx);
  });

  it('blade width is strictly proportional to inches (Phase 1.5f)', () => {
    // Phase 1.5f removed the design-space auto-fit buffer. All blades
    // share the same `maxBladePx` (container × AUTO_FIT_FILL - bladeLeftPx);
    // blade width = maxBladePx × (inches / MAX_INCHES). So a 24" blade is
    // exactly 24/40 = 0.6× the width of a 40" blade at the same container
    // width + bladeStartFrac.
    const cw = 1000;
    const m24 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 88 });
    const m40 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 147 });
    const actualRatio = m24.bladeWidthPx / m40.bladeWidthPx;
    expect(actualRatio).toBeCloseTo(24 / 40, 10);
    expect(actualRatio).toBeLessThan(1);
  });

  it('pixelsPerLed matches bladeWidthPx / ledCount', () => {
    const m = computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 144 });
    expect(m.pixelsPerLed).toBeCloseTo(m.bladeWidthPx / 144, 10);
  });

  it('pixelsPerLed is 0 when ledCount is 0 (degenerate guard)', () => {
    const m = computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 0 });
    expect(m.pixelsPerLed).toBe(0);
  });

  it('scales proportionally with container width', () => {
    // Same LED count at 500px and 1000px → 1000px version has exactly 2×
    // the blade-left and blade-width.
    const m500 = computeBladeRenderMetrics({ containerWidthPx: 500, ledCount: 144 });
    const m1000 = computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 144 });
    expect(m1000.bladeWidthPx / m500.bladeWidthPx).toBeCloseTo(2, 10);
    expect(m1000.bladeLeftPx / m500.bladeLeftPx).toBeCloseTo(2, 10);
  });

  it('bladeLeftPx = containerWidthPx * (bladeStartFrac / 1000) — Phase 1.5f', () => {
    // Point-A divider: user-draggable fraction-of-container-width × 1000.
    // Same formula shared by BladeCanvas getBladeStartPx, PixelStripPanel,
    // and VisualizationStack's computeGraphBounds so all three rails
    // anchor to the same X.
    const cw = 1000;
    const m = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 144 });
    // Default bladeStartFrac = 180 → 0.18 → 180 px at cw=1000.
    expect(m.bladeLeftPx).toBeCloseTo(cw * (DEFAULT_BLADE_START_FRAC / 1000), 10);
  });

  it('bladeStartFrac shifts bladeLeftPx; 40" width fills post-divider space', () => {
    const cw = 1000;
    // Use ledCount: 147 (the new 40" preset) so this test still asserts
    // the 40"-blade fills-space property post-2026-04-27 correction.
    const m180 = computeBladeRenderMetrics({
      containerWidthPx: cw,
      ledCount: 147,
      bladeStartFrac: 180,
    });
    const m250 = computeBladeRenderMetrics({
      containerWidthPx: cw,
      ledCount: 147,
      bladeStartFrac: 250,
    });
    // 250 - 180 = 70 → 70/1000 * cw = 70 px rightward shift.
    expect(m250.bladeLeftPx - m180.bladeLeftPx).toBeCloseTo(70, 5);
    // 40" blade width = (cw * AUTO_FIT_FILL - bladeLeftPx) * (40/40).
    const expected40Width = cw * AUTO_FIT_FILL - m180.bladeLeftPx;
    expect(m180.bladeWidthPx).toBeCloseTo(expected40Width, 5);
  });

  it('never returns NaN values for edge inputs', () => {
    const m = computeBladeRenderMetrics({ containerWidthPx: 0, ledCount: 0 });
    expect(Number.isNaN(m.bladeLeftPx)).toBe(false);
    expect(Number.isNaN(m.bladeWidthPx)).toBe(false);
    expect(Number.isNaN(m.bladeRightPx)).toBe(false);
    expect(Number.isNaN(m.pixelsPerLed)).toBe(false);
  });
});

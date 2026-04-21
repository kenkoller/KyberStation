// ─── OV2 — bladeRenderMetrics regression tests ──
//
// Pins the pure geometry helper that PixelStripPanel + RGBGraphPanel use
// to anchor their per-LED content to the blade's rendered extent in
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
  BLADE_START,
  BLADE_LEN,
  MAX_BLADE_INCHES,
  AUTO_FIT_FILL,
  BLADE_TAIL_MARGIN_DS,
} from '../lib/bladeRenderMetrics';

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

  it('118..132 → 36"', () => {
    expect(inferBladeInches(118)).toBe(36);
    expect(inferBladeInches(132)).toBe(36);
  });

  it('133 and above → 40"', () => {
    expect(inferBladeInches(133)).toBe(40);
    expect(inferBladeInches(144)).toBe(40);
    expect(inferBladeInches(288)).toBe(40);
    expect(inferBladeInches(10000)).toBe(40);
  });

  it('default 144 LED config maps to 40"', () => {
    // bladeStore DEFAULT_CONFIG.ledCount = 144 → 40" preset
    expect(inferBladeInches(144)).toBe(40);
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
    expect(computeBladeRenderMetrics({ containerWidthPx: 1000, ledCount: 144 }).bladeInches).toBe(40);
  });

  it('40" blade occupies the largest width; 20" the smallest (monotonic)', () => {
    const cw = 1000;
    const m20 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 73 });
    const m24 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 88 });
    const m28 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 103 });
    const m32 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 117 });
    const m36 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 132 });
    const m40 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 144 });
    expect(m20.bladeWidthPx).toBeLessThan(m24.bladeWidthPx);
    expect(m24.bladeWidthPx).toBeLessThan(m28.bladeWidthPx);
    expect(m28.bladeWidthPx).toBeLessThan(m32.bladeWidthPx);
    expect(m32.bladeWidthPx).toBeLessThan(m36.bladeWidthPx);
    expect(m36.bladeWidthPx).toBeLessThan(m40.bladeWidthPx);
  });

  it('blade width scales with inches but not strictly linearly (auto-fit buffer)', () => {
    const cw = 1000;
    // BladeCanvas's auto-fit makes each blade's (hilt + blade + tail)
    // extent fill 90% of the container, so a 24" blade gets scaled UP
    // more than a 40" blade to hit the same target. Width ratio is
    // therefore NOT 24/40 — it's (scaledBladeLen24 / bladeExtent24) /
    // (scaledBladeLen40 / bladeExtent40) times the common usable width,
    // which simplifies to (498/812) / (830/1144) ≈ 0.845.
    const m24 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 88 });
    const m40 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount: 144 });
    const actualRatio = m24.bladeWidthPx / m40.bladeWidthPx;
    // Reconstruct the expected ratio from the design-space constants so
    // the assertion stays stable if those constants are ever re-tuned.
    const scaledLen24 = BLADE_LEN * (24 / MAX_BLADE_INCHES);
    const scaledLen40 = BLADE_LEN * (40 / MAX_BLADE_INCHES);
    const ext24 = BLADE_START + scaledLen24 + BLADE_TAIL_MARGIN_DS;
    const ext40 = BLADE_START + scaledLen40 + BLADE_TAIL_MARGIN_DS;
    const expectedRatio = (scaledLen24 / ext24) / (scaledLen40 / ext40);
    expect(actualRatio).toBeCloseTo(expectedRatio, 10);
    // Sanity: shorter blade should still be visibly smaller than longer.
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

  it('leaves symmetric empty margin around the (hilt + blade + tail) extent', () => {
    // Because leftMarginPx = (containerWidthPx - usableWidthPx) / 2 and the
    // blade extent fills `usableWidthPx`, the right margin (from bladeRight
    // through the tail-margin-DS buffer to the container edge) equals the
    // left margin. Verify by reconstructing that identity.
    const cw = 1000;
    const ledCount = 144;
    const m = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount });
    const scaledBladeLenDS = BLADE_LEN * (m.bladeInches / MAX_BLADE_INCHES);
    const bladeExtentDS = BLADE_START + scaledBladeLenDS + BLADE_TAIL_MARGIN_DS;
    const scale = (cw * AUTO_FIT_FILL) / bladeExtentDS;
    const tailTipPx = m.bladeRightPx + BLADE_TAIL_MARGIN_DS * scale;
    const rightMargin = cw - tailTipPx;
    const leftMargin = cw * (1 - AUTO_FIT_FILL) / 2;
    expect(rightMargin).toBeCloseTo(leftMargin, 5);
  });

  it('panX shifts bladeLeftPx without changing width', () => {
    const cw = 1000;
    const ledCount = 144;
    const m0 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount, panX: 0 });
    const m50 = computeBladeRenderMetrics({ containerWidthPx: cw, ledCount, panX: 50 });
    // panX=50 design-space → scale * 50 px real shift to the right.
    const scaledBladeLenDS = BLADE_LEN * (m0.bladeInches / MAX_BLADE_INCHES);
    const bladeExtentDS = BLADE_START + scaledBladeLenDS + BLADE_TAIL_MARGIN_DS;
    const scale = (cw * AUTO_FIT_FILL) / bladeExtentDS;
    expect(m50.bladeLeftPx - m0.bladeLeftPx).toBeCloseTo(50 * scale, 5);
    expect(m50.bladeWidthPx).toBeCloseTo(m0.bladeWidthPx, 10);
  });

  it('never returns NaN values for edge inputs', () => {
    const m = computeBladeRenderMetrics({ containerWidthPx: 0, ledCount: 0 });
    expect(Number.isNaN(m.bladeLeftPx)).toBe(false);
    expect(Number.isNaN(m.bladeWidthPx)).toBe(false);
    expect(Number.isNaN(m.bladeRightPx)).toBe(false);
    expect(Number.isNaN(m.pixelsPerLed)).toBe(false);
  });
});

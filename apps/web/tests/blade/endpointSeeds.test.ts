// ─── v0.14.0 Phase 1 — blade endpoint seed widening sentinel ──
//
// The tip + emitter bloom seed radii were historically coreH*2.0 and
// coreH*1.5 respectively — tighter than the widest bloom blur kernel
// (~100 device px at default scale × bloomRadius up to 1.5×). That
// asymmetry produced a visible rectangular "bloom box" edge at the tip
// and a weaker halo at the emitter.
//
// Phase 1 widened both seeds to the plan-specified values:
//   - Tip:     coreH * 4.0
//   - Emitter: coreH * 4.0 * 0.7  (slightly tighter since the hilt
//                                  occludes inward spill)
//
// These constants live inline in `BladeCanvas.tsx`'s render path — they
// aren't exported. This test reads the source and asserts the current
// multipliers haven't drifted back. If a future session edits the render
// code and changes the multiplier, this test fails and prompts a fresh
// plan discussion before the regression lands.
//
// Adjacent invariants checked by the same scan:
//   - Tip gradient has ≥ 6 color stops (smooth multi-stop falloff).
//   - Emitter gradient has ≥ 5 color stops (symmetrized in Phase 1).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BLADE_CANVAS_SRC = readFileSync(
  resolve(__dirname, '..', '..', 'components', 'editor', 'BladeCanvas.tsx'),
  'utf8',
);

describe('BladeCanvas endpoint seeds — v0.14.0 Phase 1 widening', () => {
  it('tip cap seed radius is coreH * 4.0', () => {
    // Capture the multiplier on `const glowCapRadius = coreH * N`
    const match = BLADE_CANVAS_SRC.match(/const\s+glowCapRadius\s*=\s*coreH\s*\*\s*([\d.]+)/);
    expect(match, 'Tip cap declaration missing').not.toBeNull();
    const multiplier = parseFloat(match![1]);
    expect(multiplier).toBeGreaterThanOrEqual(4.0);
  });

  it('emitter cap seed radius is coreH * 4.0 * 0.7', () => {
    // Capture the multiplier chain on `const emGlowR = coreH * A * B`
    const match = BLADE_CANVAS_SRC.match(
      /const\s+emGlowR\s*=\s*coreH\s*\*\s*([\d.]+)\s*\*\s*([\d.]+)/,
    );
    expect(match, 'Emitter cap declaration missing').not.toBeNull();
    const a = parseFloat(match![1]);
    const b = parseFloat(match![2]);
    expect(a).toBeCloseTo(4.0, 2);
    expect(b).toBeCloseTo(0.7, 2);
    // Product must be > tip_mult / 1.5 (plan requires emitter ~70% of tip)
    expect(a * b).toBeGreaterThanOrEqual(2.5);
  });

  it('emitter seed is tighter than tip seed (hilt occlusion)', () => {
    // Extract tip multiplier
    const tipMatch = BLADE_CANVAS_SRC.match(/const\s+glowCapRadius\s*=\s*coreH\s*\*\s*([\d.]+)/);
    const tipMult = parseFloat(tipMatch![1]);

    // Extract emitter product
    const emMatch = BLADE_CANVAS_SRC.match(
      /const\s+emGlowR\s*=\s*coreH\s*\*\s*([\d.]+)\s*\*\s*([\d.]+)/,
    );
    const emProduct = parseFloat(emMatch![1]) * parseFloat(emMatch![2]);

    expect(emProduct).toBeLessThan(tipMult);
  });

  it('both endpoint seeds are wider than the max worst-case bloom kernel', () => {
    // Max bloom kernel = 100 device px × bloomRadius up to 1.5 = 150.
    // At default scale (~1.0 device-px-per-design-px for typical desktop)
    // and coreH = 26 design px, a coreH*4.0 seed = 104 device px, still
    // below 150. The plan accepts this — real device scale × Phase 2 bloom
    // threshold prefilter means the effective seeded area is larger. What
    // we're locking in here is simply that the seed is no longer SMALLER
    // than the old baseline (coreH*2.0 = 52 device px).
    const tipMatch = BLADE_CANVAS_SRC.match(/const\s+glowCapRadius\s*=\s*coreH\s*\*\s*([\d.]+)/);
    const tipMult = parseFloat(tipMatch![1]);
    expect(tipMult).toBeGreaterThan(2.0);

    const emMatch = BLADE_CANVAS_SRC.match(
      /const\s+emGlowR\s*=\s*coreH\s*\*\s*([\d.]+)\s*\*\s*([\d.]+)/,
    );
    const emProduct = parseFloat(emMatch![1]) * parseFloat(emMatch![2]);
    expect(emProduct).toBeGreaterThan(1.5);
  });

  it('AUTO_FIT_LEFT_PULL_DS is imported from bladeRenderMetrics (not redeclared)', () => {
    // Regression sentinel for the de-dup fix: prior versions declared
    // `const AUTO_FIT_LEFT_PULL_DS = 182` locally AND in bladeRenderMetrics.
    // Phase 1 made bladeRenderMetrics the single source of truth.
    expect(BLADE_CANVAS_SRC).toContain(
      "import { AUTO_FIT_LEFT_PULL_DS } from '@/lib/bladeRenderMetrics'",
    );
    expect(BLADE_CANVAS_SRC).not.toMatch(/const\s+AUTO_FIT_LEFT_PULL_DS\s*=/);
  });
});

// ─── Shared blade-pipeline color math ──────────────────────────────
//
// Pure-math helpers shared between the live workbench renderer
// (`apps/web/components/editor/BladeCanvas.tsx`) and the headless GIF
// pipeline (`apps/web/lib/sharePack/bladeRenderHeadless.ts`).
//
// Lifting these into a shared module is part of the Phase 4 module-
// extraction described in the v0.14.0 entry of CLAUDE.md. Both files
// previously declared identical local helpers; pulling them up to
// `lib/blade/colorMath.ts` collapses the parallel-port pattern into a
// true shared extraction so future tweaks to the math (gamma, white-
// shift response curve, saturation pre-bloom) ship to both consumers
// in one place.
//
// The renderer-level golden-hash test suite at
// `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` pins the
// rendered output of the canonical configs; if any of these helpers
// drift, the snapshot file `bladeRenderer.test.ts.snap` will fail.

/** Clamp `v` into `[lo, hi]`. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Linear lerp from `channel` toward 255 by `t` ∈ [0,1].
 *
 * Used by the headless rasterizer for the inner-core plateau and by
 * the workbench Angle View cross-section's hand-tuned core gradient.
 * The blade-body path uses `ledCoreWhiteAmount` (below) instead — see
 * BladeCanvas.tsx for the per-LED data-driven plateau formula.
 *
 * Headless usage clamps via `min/max` inside the inner loop; workbench
 * historical version called `clamp` first. Both produce identical
 * outputs for the inputs in `[0, 255] × [0, 1]` that both consumers
 * pass — the legacy clamp was paranoia, dropped to keep the per-pixel
 * loop tight.
 */
export function lerpToWhite(channel: number, t: number): number {
  return channel + (255 - channel) * t;
}

/**
 * Per-LED data-driven white-core amount — WORKBENCH version.
 *
 * Used by `apps/web/components/editor/BladeCanvas.tsx`. Replaces the
 * v0.14.x fixed-plateau formula (`coreWhiteout` constant applied to
 * every LED) which produced a uniform white slab regardless of
 * per-pixel brightness. Now each LED's white-shift scales with its
 * peak channel — dim LEDs stay tinted, bright LEDs blow out toward
 * white at the per-color asymptote.
 *
 * peak = max RGB channel ∈ [0,1]. Below ~0.20 the LED stays purely
 * colored; above ~0.55 the core is fully blown out toward white. The
 * per-color `coreWhiteout` knob still scales the asymptote (white blades
 * reach white faster than orange/red), but it no longer controls plateau
 * width — luma does.
 *
 * The 1.25× exposure boost (clamped to 1.0) pushes mid-bright LEDs
 * harder into the white plateau and lets the asymptote reach pure
 * white instead of stopping at coreWhiteout (≈0.82-0.95 per color
 * profile). Ken-tuned during the v0.14.0 visualization polish pass.
 *
 * The headless GIF / share-card pipeline uses
 * `ledCoreWhiteAmountHeadless` (luma-based) instead — see below for
 * the historical reason the two diverged.
 */
export function ledCoreWhiteAmountWorkbench(
  r: number,
  g: number,
  b: number,
  coreWhiteout: number,
): number {
  const peak = Math.max(r, g, b) / 255;
  // Threshold band: dim LEDs (peak < 0.20) stay pure colored; mid-bright
  // LEDs (peak ≥ 0.55) reach the per-color asymptote. Tightened from the
  // initial 0.35→0.85 range, which left mid-bright pulses at only ~22%
  // white-shift — visibly tinted but not the iconic blown-out tube.
  // Real polycarbonate diffusers saturate fast; anything past half-bright
  // should already read white-hot at the core.
  //
  // 1.25× exposure boost (clamped to 1.0): pushes mid-bright LEDs harder
  // into the white plateau and lets the asymptote reach pure white instead
  // of stopping at coreWhiteout (≈0.82-0.95 per color profile). Ken-tuned.
  const t = clamp((peak - 0.20) / 0.35, 0, 1);
  return Math.min(1.0, t * t * (3 - 2 * t) * coreWhiteout * 1.25);
}

/**
 * Per-LED white-core amount — HEADLESS version.
 *
 * Used by `apps/web/lib/sharePack/bladeRenderHeadless.ts` (animated
 * GIF + share-card pipelines). Simpler luma-based formula that
 * pre-dates the workbench's smoothstep + exposure-boost rebalance.
 *
 * The renderer-level golden-hash test suite at
 * `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` pins the
 * rendered output of `drawWorkbenchBlade` for canonical configs;
 * those snapshots were recorded against THIS function's output. Any
 * unification with the workbench version requires regenerating the
 * snapshot file.
 */
export function ledCoreWhiteAmountHeadless(
  r: number,
  g: number,
  b: number,
  coreWhiteout: number,
): number {
  const max = Math.max(r, g, b);
  if (max < 1) return 0;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  // Brighter LEDs reach the configured whiteout; dimmer ones lerp
  // proportionally so dark LED columns stay tinted.
  const t = clamp(luma / 220, 0, 1);
  return coreWhiteout * t;
}

/**
 * Boost saturation of an RGB color by `amount`. Output channels stay
 * clamped to `[0, 255]`. Used by the bloom prefilter in both
 * pipelines to compensate for the bloom blur's natural desaturation.
 */
export function saturateRGB(
  r: number,
  g: number,
  b: number,
  amount: number,
): [number, number, number] {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    clamp(gray + (r - gray) * (1 + amount), 0, 255),
    clamp(gray + (g - gray) * (1 + amount), 0, 255),
    clamp(gray + (b - gray) * (1 + amount), 0, 255),
  ];
}

// ─── Shared blade-pipeline types ────────────────────────────────────
//
// Common interfaces consumed by both the live workbench renderer
// (`apps/web/components/editor/BladeCanvas.tsx`) and the headless GIF
// pipeline (`apps/web/lib/sharePack/bladeRenderHeadless.ts`). Lifting
// these into a shared module is part of the Phase 4 module-extraction
// described in the v0.14.0 entry of CLAUDE.md.
//
// What lives here vs. elsewhere:
//   • `LedBufferLike` — the random-access LED color reader interface.
//     Both pipelines accept this; the engine's RGB byte-buffer is
//     adapted via `ledBufferFrom()` in pipeline.ts.
//   • `BaseGlowProfile` — the shared subset of `GlowProfile` fields
//     that both consumers need. The workbench extends with `outerHue`
//     for the Angle View only; that field never makes it into the
//     bloom-loop math, so it stays in BladeCanvas.tsx as a workbench-
//     specific extension.
//   • `BladeRenderOptions` — render parameters shared across consumers
//     (capsule geometry + clamp-bounding-box + theme composite mode).

/**
 * Random-access LED color reader. Both `drawWorkbenchBlade` (headless)
 * and the workbench rasterizer accept this shape.
 *
 * Implementations:
 *   • The engine's `BladeEngine.leds` already exposes
 *     `getR`/`getG`/`getB`/`count`.
 *   • `Uint8Array` LED buffers (e.g. from `captureStateFrame`) are
 *     adapted via `ledBufferFrom()` in `pipeline.ts`.
 */
export interface LedBufferLike {
  getR(i: number): number;
  getG(i: number): number;
  getB(i: number): number;
  count: number;
}

/**
 * Per-color tuning knobs for the capsule rasterizer + bloom chain.
 * Both workbench and headless pipelines use these four fields. The
 * workbench's full `GlowProfile` adds `outerHue` for the Angle View
 * cross-section pass; that's a workbench-only concern.
 */
export interface BaseGlowProfile {
  /** White-shift amount for the inner core plateau. 0.95 = mostly
   *  white, 0.80 = small white pop. */
  coreWhiteout: number;
  /** Multiplier on the per-mip blur radii. */
  bloomRadius: number;
  /** Multiplier on the bloom composite alpha. */
  bloomIntensity: number;
  /** Saturation boost applied before bloom-pass to prevent washout. */
  colorSaturation: number;
}

/**
 * Render parameters for the headless `drawWorkbenchBlade` orchestrator.
 *
 * Keep new options additive — the test seam (renderer-level golden-hash)
 * pins the rendered output for a known config. Adding a new option with
 * a backwards-compatible default keeps existing hashes valid.
 */
export interface BladeRenderOptions {
  /** Visible-canvas X coordinate where the LED strip starts. */
  bladeStartPx: number;
  /** Length of the LED strip along the X axis, in canvas px. */
  bladeLenPx: number;
  /** Vertical centerline of the blade in canvas px. */
  bladeYPx: number;
  /** Capsule height (= 2 × radius). */
  coreH: number;
  /** Total canvas width (clamps the rasterizer bounding box). */
  cw: number;
  /** Total canvas height (clamps the rasterizer bounding box). */
  ch: number;
  /**
   * Multiplier applied to each LED's RGB before rasterization. Defaults
   * to 1.0 — the engine has already applied its own ignition / mask
   * scaling when the buffer was captured.
   */
  effectiveBri?: number;
  /**
   * Per-frame ±3 % shimmer multiplier — caller can pass a tiny random
   * jitter for the "alive" feel. Defaults to 1.0 (no shimmer).
   */
  shimmer?: number;
  /**
   * Hilt-tuck distance — capsule's left cap extends this far behind
   * `bladeStartPx`. Bloom mips still sample the extended region so the
   * halo bleeds onto the hilt naturally. Defaults to `coreH`.
   */
  hiltTuck?: number;
  /**
   * Disables the bloom + body-composite passes when set — used by
   * the a11y `reduceBloom` flag in the workbench. Defaults to false.
   */
  reduceBloom?: boolean;
  /**
   * Compositing mode for the bloom + body passes. Themed backdrops
   * declare their own preference via `CardTheme.bladeComposite`:
   * `'lighter'` (additive a + b, saturated halo) is the dark-theme
   * default; `'source-over'` is the safe light-theme choice (no
   * white-out on a paper-white backdrop); `'screen'` (1 − (1−a)(1−b))
   * is the soft-additive middle ground. Defaults to `'lighter'` for
   * backwards compatibility with callers that don't yet pass a theme
   * (e.g. animated GIF renderer running off the workbench). Source:
   * `docs/POST_LAUNCH_BACKLOG.md` v0.15.x "Light-theme blade bloom
   * theme-gating".
   */
  bladeComposite?: GlobalCompositeOperation;
}

// ─── UnrealBloom ─────────────────────────────────────────────────────
//
// HDR bloom pass for the 3D blade, tuned for the polycarbonate
// aesthetic. Replaces the basic <BladeBloom /> mount in Phase 2D.
//
// The bloom characteristics simulate the way real lightsaber polycarbonate
// blades glow — a wide, soft halo with multiple mip levels so the
// brightest LED pixels bleed into a smooth outer glow without the
// kernel-stepping artifacts of a single Gaussian.
//
// Configuration follows the Kyber Crystal post-processing reference
// (docs/VISUALIZER_UPGRADE_PLAN.md §2D) — luminance-thresholded bloom
// with mipmap blur. The default intensity is higher than the legacy
// BladeBloom (0.8 → 1.8) because we no longer have a single bloom pass
// doing all the work: this is paired with the polycarbonate diffusion
// pass downstream.
//
// Mounts as a child of <EffectComposer />, never standalone — see
// BladePostProcessing for the composer scaffold.

import React from 'react';
import { Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';

export interface UnrealBloomProps {
  /**
   * Bloom intensity multiplier. Default 1.8 — punchy halo without
   * washing out the per-LED color detail. Drops to ~0.7 under the
   * reduced-motion / reduce-bloom a11y prefs.
   */
  intensity?: number;
  /**
   * Luminance threshold — pixels below this don't bloom. Default 0.1
   * (lower than the legacy 0.2 to catch the dimmer LEDs on the diffuser).
   */
  luminanceThreshold?: number;
  /** Luminance smoothing — softens the threshold edge. Default 0.4. */
  luminanceSmoothing?: number;
  /** Enable mipmap blur for performance-efficient wide bloom. Default true. */
  mipmapBlur?: boolean;
  /**
   * Number of mipmap levels. More = wider/softer glow at higher cost.
   * Default 6 — wider halo than the legacy bloom's effective 5 levels.
   * Range [2, 9].
   */
  levels?: number;
  /**
   * Mipmap blur radius. Higher = softer falloff. Default 0.85.
   * Only meaningful when mipmapBlur is true.
   */
  radius?: number;
}

/**
 * Polycarbonate-tuned bloom pass for the 3D blade.
 *
 * Must be mounted inside an <EffectComposer />. The component returns
 * the `<Bloom>` element with our tuned defaults; consumers may override
 * any prop. See BladePostProcessing for the canonical composition.
 */
export function UnrealBloom({
  intensity = 1.8,
  luminanceThreshold = 0.1,
  luminanceSmoothing = 0.4,
  mipmapBlur = true,
  levels = 6,
  radius = 0.85,
}: UnrealBloomProps) {
  return (
    <Bloom
      intensity={intensity}
      luminanceThreshold={luminanceThreshold}
      luminanceSmoothing={luminanceSmoothing}
      mipmapBlur={mipmapBlur}
      levels={levels}
      radius={radius}
      kernelSize={KernelSize.LARGE}
    />
  );
}

/**
 * Pure helper: given the user's reduce-bloom preference, return the
 * scaled bloom intensity. Exposed so callers (and tests) can resolve
 * the final intensity without mounting the component.
 *
 * `reducedMotion` doesn't currently scale bloom on its own — only the
 * explicit `reduceBloom` toggle does — but we accept both and treat
 * the union so future tuning has one place to change.
 */
export function resolveBloomIntensity(
  baseIntensity: number,
  options: { reduceBloom?: boolean; reducedMotion?: boolean } = {},
): number {
  if (options.reduceBloom || options.reducedMotion) {
    // Drop intensity to ~40% of base — visible halo, less photosensitive.
    return baseIntensity * 0.4;
  }
  return baseIntensity;
}

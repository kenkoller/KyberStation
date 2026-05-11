// ─── BladeBloom ───────────────────────────────────────────────────
//
// Post-processing bloom effect for the 3D blade scene.
// Uses @react-three/postprocessing EffectComposer + Bloom to produce
// a real HDR bloom halo around the emissive blade mesh.
//
// The bloom pass reads the HDR output from the blade's additive
// materials (emissive intensity > 1.0) and applies a multi-pass
// Gaussian blur on bright pixels, producing a smooth glow halo.
//
// Parameters are tuned to balance:
//   - Intensity: visible glow without washing out blade colors
//   - Luminance threshold: only blade emissive pixels bloom (not hilt)
//   - Kernel size: smooth halo without visible stepping
//   - Mip levels: 5 for a wide glow radius at reasonable cost

import React from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';

export interface BladeBloomProps {
  /** Bloom intensity multiplier. Default: 0.8 */
  intensity?: number;
  /** Luminance threshold — pixels below this don't bloom. Default: 0.2 */
  luminanceThreshold?: number;
  /** Luminance smoothing — softens the threshold edge. Default: 0.4 */
  luminanceSmoothing?: number;
  /** Mip map blur levels. More = wider glow. Default: 5 */
  mipmapBlur?: boolean;
  /** Whether bloom is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Bloom post-processing for the 3D blade scene.
 * Mount inside the R3F Canvas, after all meshes.
 *
 * Uses mipmapBlur mode for performance-efficient wide bloom
 * without the kernel size → quality tradeoff of classic Gaussian.
 */
export function BladeBloom({
  intensity = 0.8,
  luminanceThreshold = 0.2,
  luminanceSmoothing = 0.4,
  mipmapBlur = true,
  enabled = true,
}: BladeBloomProps) {
  if (!enabled) return null;

  return (
    <EffectComposer>
      <Bloom
        intensity={intensity}
        luminanceThreshold={luminanceThreshold}
        luminanceSmoothing={luminanceSmoothing}
        mipmapBlur={mipmapBlur}
        kernelSize={KernelSize.LARGE}
      />
    </EffectComposer>
  );
}

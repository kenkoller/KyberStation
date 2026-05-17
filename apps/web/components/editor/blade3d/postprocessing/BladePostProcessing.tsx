// ─── BladePostProcessing ─────────────────────────────────────────────
//
// Top-level post-processing composer for the 3D blade scene. Mounts
// three passes inside a single <EffectComposer />:
//
//   1. UnrealBloom              — HDR halo glow on emissive pixels
//   2. PolycarbonateDiffusion   — screen-space soft blur on the blade
//   3. BladeMotionBlur          — directional blur driven by swing speed
//
// Phase 2D of the Visualizer Upgrade Plan (docs/VISUALIZER_UPGRADE_PLAN.md).
//
// Performance / accessibility gating happens here:
//   - Desktop: all three passes on by default.
//   - Mobile (< 600px width): motion blur off + diffusion intensity
//     halved to keep the GPU budget reasonable.
//   - prefers-reduced-motion: motion blur off (forced strength 0),
//     bloom intensity scaled down to ~40% of base.
//   - reduceBloom user pref: bloom intensity scaled to ~40%.
//   - Graphics quality 'low': entire post-processing chain skipped.
//
// The composer mounts even when individual passes are disabled — we
// only unmount the whole composer when graphicsQuality === 'low' or
// `enabled === false`. This avoids EffectComposer remount flicker
// when toggling individual passes mid-session.

'use client';

import React from 'react';
import { EffectComposer } from '@react-three/postprocessing';
import type { BladeEngine } from '@kyberstation/engine';
import { UnrealBloom, resolveBloomIntensity } from './UnrealBloom';
import { PolycarbonateDiffusion } from './PolycarbonateDiffusion';
import { BladeMotionBlur } from './BladeMotionBlur';

export interface BladePostProcessingProps {
  /** Engine ref so motion blur can read swingSpeed each frame. */
  engineRef: React.RefObject<BladeEngine | null>;
  /**
   * Master toggle. When false, the entire composer unmounts and the
   * scene renders without any post-processing. Default true.
   */
  enabled?: boolean;
  /**
   * User a11y prefs. When true, the bloom intensity is reduced and
   * the motion blur pass is forced to 0 strength. Default false.
   */
  reducedMotion?: boolean;
  /**
   * Standalone user pref to dim the bloom halo without turning off
   * motion blur. Independent of `reducedMotion`. Default false.
   */
  reduceBloom?: boolean;
  /**
   * Tier from the accessibility store. 'low' skips all post-processing;
   * 'medium' keeps bloom but skips motion blur + halves diffusion;
   * 'high' (default) runs all three passes at full quality.
   */
  graphicsQuality?: 'high' | 'medium' | 'low';
  /**
   * When true (mobile / narrow viewport), the motion blur pass is
   * skipped and diffusion intensity is halved. Default false.
   */
  isMobile?: boolean;
  /** Override the bloom intensity (mainly for tests + tuning). */
  bloomIntensity?: number;
  /** Override the diffusion intensity (mainly for tests + tuning). */
  diffusionIntensity?: number;
}

/**
 * Resolve the final post-processing config from the user's prefs +
 * the device profile. Exported as a pure function so tests can
 * verify the gating logic without mounting any GL context.
 */
export interface PostProcessingConfig {
  bloom: { enabled: boolean; intensity: number };
  diffusion: { enabled: boolean; intensity: number };
  motionBlur: { enabled: boolean };
}

export const BASE_BLOOM_INTENSITY = 1.8;
export const BASE_DIFFUSION_INTENSITY = 0.5;

export function resolvePostProcessingConfig(
  props: Pick<
    BladePostProcessingProps,
    | 'enabled'
    | 'reducedMotion'
    | 'reduceBloom'
    | 'graphicsQuality'
    | 'isMobile'
    | 'bloomIntensity'
    | 'diffusionIntensity'
  >,
): PostProcessingConfig | null {
  const {
    enabled = true,
    reducedMotion = false,
    reduceBloom = false,
    graphicsQuality = 'high',
    isMobile = false,
    bloomIntensity,
    diffusionIntensity,
  } = props;

  // Master gate — composer is unmounted entirely.
  if (!enabled) return null;
  if (graphicsQuality === 'low') return null;

  const baseBloom = bloomIntensity ?? BASE_BLOOM_INTENSITY;
  const resolvedBloom = resolveBloomIntensity(baseBloom, { reduceBloom, reducedMotion });

  const baseDiffusion = diffusionIntensity ?? BASE_DIFFUSION_INTENSITY;
  // Mobile or medium-tier: halve diffusion to drop fill-rate cost.
  const diffusionScale = isMobile || graphicsQuality === 'medium' ? 0.5 : 1.0;

  // Motion blur is the most expensive pass + the least essential.
  // Off on mobile, medium tier, and reduced-motion.
  const motionEnabled =
    !isMobile && graphicsQuality !== 'medium' && !reducedMotion;

  return {
    bloom: { enabled: true, intensity: resolvedBloom },
    diffusion: {
      enabled: true,
      intensity: baseDiffusion * diffusionScale,
    },
    motionBlur: { enabled: motionEnabled },
  };
}

/**
 * Mount the post-processing pipeline. Returns null if the resolved
 * config says everything is off (graphicsQuality 'low' or enabled
 * false) — the scene renders without any composer in that case.
 */
export function BladePostProcessing(props: BladePostProcessingProps) {
  const config = resolvePostProcessingConfig(props);
  if (!config) return null;

  return (
    <EffectComposer>
      <UnrealBloom intensity={config.bloom.intensity} />
      <PolycarbonateDiffusion intensity={config.diffusion.intensity} />
      {config.motionBlur.enabled ? (
        <BladeMotionBlur
          engineRef={props.engineRef}
          reducedMotion={props.reducedMotion}
        />
      ) : (
        // R3F EffectComposer is strict about children — pass a no-op
        // BladeMotionBlur with reducedMotion=true so the effect mounts
        // but renders as a pass-through (strength forced to 0). This
        // avoids the remount-flicker that happens when the child array
        // length changes.
        <BladeMotionBlur engineRef={props.engineRef} reducedMotion={true} />
      )}
    </EffectComposer>
  );
}

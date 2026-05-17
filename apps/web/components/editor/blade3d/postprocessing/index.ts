// ─── blade3d postprocessing barrel ─────────────────────────────────
//
// Public API for the 3D blade post-processing pipeline (Phase 2D of
// the Visualizer Upgrade Plan).

export {
  BladePostProcessing,
  resolvePostProcessingConfig,
  BASE_BLOOM_INTENSITY,
  BASE_DIFFUSION_INTENSITY,
} from './BladePostProcessing';
export type {
  BladePostProcessingProps,
  PostProcessingConfig,
} from './BladePostProcessing';

export { UnrealBloom, resolveBloomIntensity } from './UnrealBloom';
export type { UnrealBloomProps } from './UnrealBloom';

export {
  PolycarbonateDiffusion,
  PolycarbonateDiffusionEffect,
} from './PolycarbonateDiffusion';
export type {
  PolycarbonateDiffusionProps,
  PolycarbonateDiffusionEffectOptions,
} from './PolycarbonateDiffusion';

export {
  BladeMotionBlur,
  BladeMotionBlurEffect,
  swingSpeedToBlurStrength,
  bladeAngleToBlurDirection,
  MOTION_BLUR_DEAD_ZONE,
  MOTION_BLUR_MAX_STRENGTH,
} from './BladeMotionBlur';
export type {
  BladeMotionBlurProps,
  BladeMotionBlurEffectOptions,
} from './BladeMotionBlur';

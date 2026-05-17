// ─── blade3d barrel ────────────────────────────────────────────────
//
// Public API for the 3D blade renderer (Phase 2A of Visualizer Upgrade).

export { BladeScene3D } from './BladeScene3D';
export type { BladeScene3DProps } from './BladeScene3D';

// Phase 2C interaction helpers (exported for tests + downstream tuning).
export {
  uvYToLedIndex,
  createDragAccumulator,
  updateDragAccumulator,
  resetDragAccumulator,
  DRAG_RETRACT_UV_THRESHOLD,
  DRAG_RETRACT_RESET_GAP_MS,
  HOLD_LOCKUP_MS,
  ORBIT_ROTATE_SPEED,
} from './BladeScene3D';
export type { DragAccumulator } from './BladeScene3D';

export {
  createBladeGeometry,
  createBladeTipGeometry,
  createFullBladeGeometry,
} from './BladeGeometry';
export type { BladeGeometryOptions } from './BladeGeometry';

export {
  createBladeMaterial,
  createLedTexture,
  updateLedTexture,
  getLedTextureFromMaterial,
} from './BladeMaterial';
export type { BladeMaterialOptions } from './BladeMaterial';

export {
  extractProfileFromPath,
  buildHiltProfile,
  buildDefaultHiltProfile,
  createHiltLathGeometry,
  createHiltGeometry3D,
  createHiltMaterial,
} from './HiltGeometry3D';

export { BladeBloom } from './BladeBloom';
export type { BladeBloomProps } from './BladeBloom';

// Phase 2D — post-processing pipeline (bloom + diffusion + motion blur).
export {
  BladePostProcessing,
  resolvePostProcessingConfig,
  UnrealBloom,
  resolveBloomIntensity,
  PolycarbonateDiffusion,
  PolycarbonateDiffusionEffect,
  BladeMotionBlur,
  BladeMotionBlurEffect,
  swingSpeedToBlurStrength,
  bladeAngleToBlurDirection,
  BASE_BLOOM_INTENSITY,
  BASE_DIFFUSION_INTENSITY,
  MOTION_BLUR_DEAD_ZONE,
  MOTION_BLUR_MAX_STRENGTH,
} from './postprocessing';
export type {
  BladePostProcessingProps,
  PostProcessingConfig,
  UnrealBloomProps,
  PolycarbonateDiffusionProps,
  PolycarbonateDiffusionEffectOptions,
  BladeMotionBlurProps,
  BladeMotionBlurEffectOptions,
} from './postprocessing';

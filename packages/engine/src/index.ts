// ─── Core engine ───
export { BladeEngine } from './BladeEngine.js';
export { LEDArray, lerpColor, scaleColor, hslToRgb, blendAdd, blendScreen, blendMultiply, clampColor } from './LEDArray.js';
export { MotionSimulator } from './motion/MotionSimulator.js';
export { createEasingFunction, getEasingPresetNames, EASING_PRESETS } from './easing.js';
export { noise, noise2d, fbm } from './noise.js';

// ─── Color Theory ───
export {
  rgbToHsl,
  hslToRgb as hslToRgbFull,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  clampRGB,
  mixColors,
  getHarmonyColors,
} from './colorTheory.js';
export type { HarmonyType } from './colorTheory.js';

// ─── Types ───
export type {
  RGB,
  StyleContext,
  BladeStyle,
  EffectType,
  EffectParams,
  EffectContext,
  BladeEffect,
  IgnitionAnimation,
  IgnitionContext,
  LayerDirection,
  BlendMode,
  LayerConfig,
  BladeSegment,
  BladeTopology,
  EasingFunction,
  CubicBezierEasing,
  PresetEasing,
  EasingConfig,
  BladeConfig,
  SegmentRole,
  EffectScoping,
  SegmentAnimationConfig,
  SegmentSpatialInfo,
  PhysicalLayout,
  TopologyPresetId,
  BladeLengthConfig,
} from './types.js';

// ─── Animation Templates ───
export { ANIMATION_TEMPLATES, getTemplatesByCategory, getCategories } from './animations/templates.js';
export type { AnimationTemplate, AnimationCategory, AnimationTemplateEvent } from './animations/templates.js';

// ─── Storage Estimator ───
export {
  estimateFontSize,
  estimateConfigSize,
  estimateOLEDSize,
  estimateTotal,
  formatBytes,
  CARD_SIZES,
} from './storage/StorageEstimator.js';
export type { StorageBudget, StorageBreakdownItem } from './storage/StorageEstimator.js';

// ─── OLED BMP Codec ───
export { encodeBMP, decodeBMP, getResolutionDims } from './oled/BMPCodec.js';
export type { OLEDResolution, BMPDecodeResult } from './oled/BMPCodec.js';

// ─── Parameter Groups ───
export { PARAMETER_GROUPS } from './parameterGroups.js';
export type { ParameterGroup, ParameterDef, ParameterOption } from './parameterGroups.js';

export {
  BladeState,
  DEFAULT_TOPOLOGY,
  CROSSGUARD_TOPOLOGY,
  STAFF_TOPOLOGY,
  TRIPLE_TOPOLOGY,
  QUAD_STAR_TOPOLOGY,
  INQUISITOR_TOPOLOGY,
  SPLIT_BLADE_TOPOLOGY,
  ACCENT_TOPOLOGY,
  TOPOLOGY_PRESETS,
  BLADE_LENGTH_PRESETS,
} from './types.js';

// ─── Core engine ───
export { BladeEngine } from './BladeEngine.js';
export { LEDArray, lerpColor, scaleColor, hslToRgb, blendAdd, blendScreen, blendMultiply, clampColor } from './LEDArray.js';
export { MotionSimulator } from './motion/MotionSimulator.js';
export { createEasingFunction, getEasingPresetNames, EASING_PRESETS } from './easing.js';
export { noise, noise2d, fbm } from './noise.js';

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

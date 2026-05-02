// ─── Core engine ───
export { BladeEngine } from './BladeEngine.js';
export {
  captureSequence,
  captureSequenceWithStates,
  computeFrameCount,
} from './captureSequence.js';
export type {
  CaptureSequenceMode,
  CaptureSequenceOptions,
} from './captureSequence.js';
export { LEDArray, lerpColor, scaleColor, hslToRgb, blendAdd, blendScreen, blendMultiply, clampColor } from './LEDArray.js';
export { MotionSimulator } from './motion/MotionSimulator.js';
export { createEasingFunction, getEasingPresetNames, EASING_PRESETS } from './easing.js';
export { noise, noise2d, fbm, directionalPosition } from './noise.js';

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

// ─── Style factory ───
// Exposes the style registry for standalone style evaluation (e.g. the
// LayerStack per-row thumbnails, which render each layer's output
// without spinning up a full BladeEngine).
export { createStyle } from './styles/index.js';

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

// PARAMETER_GROUPS export removed along with parameterGroups.ts per the
// 2026-04-19 dead-code audit — zero consumers inside or outside the
// engine package.

// ─── Modulation Routing (v1.1 / Friday v1.0 Preview) ───
//
// The modulation subsystem is exposed at the top-level barrel so
// consumers (apps/web, packages/codegen) can import `BuiltInModulatorId`,
// `ModulationBinding`, etc. directly from `@kyberstation/engine` rather
// than mirroring the unions inline. See `docs/MODULATION_ROUTING_V1.1.md`.
export type {
  BuiltInModulatorId,
  ModulatorId,
  ModulatorDescriptor,
  ParameterPath,
  BindingCombinator,
  ModulationBinding,
  NumericLiteralNode,
  VariableRefNode,
  BinaryOp,
  BinaryOpNode,
  UnaryOp,
  UnaryOpNode,
  BuiltInFnId,
  CallNode,
  ExpressionNode,
  EvalContext,
  SerializedExpression,
  SerializedBinding,
  ModulationPayload,
  BladeConfigWithModulation,
  SamplerState,
  ParameterClampRange,
  ParameterClampRanges,
} from './modulation/index.js';
export {
  BUILT_IN_MODULATORS,
  lookupModulator,
  isBuiltInModulatorId,
  sampleModulators,
  emptySamplerState,
  applyBindings,
  parseExpression,
  evaluate,
  ExpressionParseError,
} from './modulation/index.js';

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
  migrateBlendMode,
  migrateImportFields,
} from './types.js';

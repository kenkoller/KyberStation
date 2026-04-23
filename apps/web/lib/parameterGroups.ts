// ─── Parameter Groups — modulation target registry ─────────────────────
//
// A registry of every MODULATABLE numeric leaf on `BladeConfig`. Each
// descriptor carries a dotted path (the string the UI + engine use as a
// binding target), a display name, a group label for UI bucketing, a
// numeric range for clamping + scrubbing, the default value that matches
// `bladeStore.DEFAULT_CONFIG`, a unit string for UI labels, and a
// `isModulatable` flag so enum / boolean / structured fields can still
// surface in parameter pickers without being valid drop-targets.
//
// Status: v1.0 launch registry. Author: Agent C (modulation routing
// sprint, 2026-04-22). Adding a new `BladeConfig` field that wants to
// participate in modulation means extending this table.
//
// ── Conventions ────────────────────────────────────────────────────────
//
// • Color components are enumerated per-channel (baseColor.r, etc.).
//   Each channel is a 0-255 integer but we declare the range that way
//   and let the clamp step in `applyBindings` keep the value sane.
//
// • Numeric fields that come from BladeConfig's 0-100 percent convention
//   (e.g., `clashIntensity`, `colorHueShiftSpeed`, `motionSmoothing`) are
//   declared on [0, 100] with unit '' (plain number). If a field maps to
//   a visible percent in the UI, the UI layer is free to format it.
//
// • Fields that are clearly continuous 0..1 (like `shimmer`, spatial
//   positions, blast position, `lockupPosition`) are declared on [0, 1].
//
// • Fields for ms durations use unit 'ms' and a conservative upper bound
//   drawn from the UI scrub ranges we ship today.
//
// • `stripType`, `bladeType`, `style`, `ignition`, `retraction`,
//   `blendMode`, `blendMaskType`, `gradientInterpolation`,
//   `scrollDirection`, `scrollRepeatMode`, `spatialDirection` — all
//   enum/string fields. Not included (bindings can only target numeric
//   leaves).
//
// • Boolean fields (`preonEnabled`, `dualModeIgnition`,
//   `stutterFullExtend`) — not included; bindings can't produce booleans.
//
// • Structured fields (`imageData`, `imageWidth/Height`, `colorPositions`,
//   `ignitionCurve`, `retractionCurve`, `ignitionEasing`,
//   `retractionEasing`, `motionSwingColorShift`, `customLedCount`) —
//   not included; these are opt-in structures or arrays.
//
// • Optional fields carry their "natural" default in `default`. When a
//   field is undefined in DEFAULT_CONFIG we pick the value that matches
//   the engine's runtime fallback (documented per line below).

export type ParameterGroup = 'color' | 'motion' | 'timing' | 'style' | 'other';

export interface ParameterDescriptor {
  /** Dotted path into `BladeConfig`. Example: `"shimmer"` or `"baseColor.r"`. */
  path: string;
  displayName: string;
  group: ParameterGroup;
  range: { min: number; max: number };
  default: number;
  /** '' | 'ms' | '°' | 'px' | 'Hz' — UI label string, keep short. */
  unit: string;
  /** `false` means the UI can show this parameter but a binding cannot target it. */
  isModulatable: boolean;
}

// ── Descriptors ────────────────────────────────────────────────────────
//
// Listed in UI-natural order (top-of-panel first). The grouping maps to
// the 5 bucket tabs the Inspector ROUTING tab will render.

const PARAMETER_DESCRIPTORS_MUTABLE: ParameterDescriptor[] = [
  // ── baseColor ─ DEFAULT_CONFIG = {0, 140, 255} ───────────────────────
  { path: 'baseColor.r', displayName: 'Base · R', group: 'color', range: { min: 0, max: 255 }, default: 0, unit: '', isModulatable: true },
  { path: 'baseColor.g', displayName: 'Base · G', group: 'color', range: { min: 0, max: 255 }, default: 140, unit: '', isModulatable: true },
  { path: 'baseColor.b', displayName: 'Base · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  // ── clashColor ─ DEFAULT_CONFIG = {255, 255, 255} ────────────────────
  { path: 'clashColor.r', displayName: 'Clash · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'clashColor.g', displayName: 'Clash · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'clashColor.b', displayName: 'Clash · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  // ── lockupColor ─ DEFAULT_CONFIG = {255, 200, 80} ────────────────────
  { path: 'lockupColor.r', displayName: 'Lockup · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'lockupColor.g', displayName: 'Lockup · G', group: 'color', range: { min: 0, max: 255 }, default: 200, unit: '', isModulatable: true },
  { path: 'lockupColor.b', displayName: 'Lockup · B', group: 'color', range: { min: 0, max: 255 }, default: 80, unit: '', isModulatable: true },

  // ── blastColor ─ DEFAULT_CONFIG = {255, 255, 255} ────────────────────
  { path: 'blastColor.r', displayName: 'Blast · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'blastColor.g', displayName: 'Blast · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'blastColor.b', displayName: 'Blast · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  // ── Optional effect colors — default 255/255/255 when unset. ─────────
  { path: 'dragColor.r', displayName: 'Drag · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'dragColor.g', displayName: 'Drag · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'dragColor.b', displayName: 'Drag · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  { path: 'meltColor.r', displayName: 'Melt · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'meltColor.g', displayName: 'Melt · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'meltColor.b', displayName: 'Melt · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  { path: 'lightningColor.r', displayName: 'Lightning · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'lightningColor.g', displayName: 'Lightning · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'lightningColor.b', displayName: 'Lightning · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  { path: 'preonColor.r', displayName: 'Preon · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'preonColor.g', displayName: 'Preon · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'preonColor.b', displayName: 'Preon · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  { path: 'gradientEnd.r', displayName: 'Gradient End · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'gradientEnd.g', displayName: 'Gradient End · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'gradientEnd.b', displayName: 'Gradient End · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  { path: 'edgeColor.r', displayName: 'Edge · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'edgeColor.g', displayName: 'Edge · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'edgeColor.b', displayName: 'Edge · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  { path: 'tipColor.r', displayName: 'Tip · R', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'tipColor.g', displayName: 'Tip · G', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },
  { path: 'tipColor.b', displayName: 'Tip · B', group: 'color', range: { min: 0, max: 255 }, default: 255, unit: '', isModulatable: true },

  // ── Core scalars ─────────────────────────────────────────────────────
  // shimmer: DEFAULT_CONFIG = 0.1, ProffieOS convention is 0..1 brightness modulation.
  { path: 'shimmer', displayName: 'Shimmer', group: 'style', range: { min: 0, max: 1 }, default: 0.1, unit: '', isModulatable: true },
  // ledCount: physical hardware count — not meaningfully modulatable, but exposed for UI.
  { path: 'ledCount', displayName: 'LED Count', group: 'other', range: { min: 1, max: 400 }, default: 144, unit: 'px', isModulatable: false },

  // ── Ignition / Retraction timing (ms) ────────────────────────────────
  // DEFAULT_CONFIG.ignitionMs = 300, .retractionMs = 800. Range matches
  // the ProffieOS-practical window the UI exposes today (100-2000 ms).
  { path: 'ignitionMs', displayName: 'Ignition', group: 'timing', range: { min: 100, max: 2000 }, default: 300, unit: 'ms', isModulatable: true },
  { path: 'retractionMs', displayName: 'Retraction', group: 'timing', range: { min: 100, max: 2000 }, default: 800, unit: 'ms', isModulatable: true },
  // preonMs — 0 when preonEnabled is false; design doc default is 300ms.
  { path: 'preonMs', displayName: 'Preon Duration', group: 'timing', range: { min: 0, max: 2000 }, default: 300, unit: 'ms', isModulatable: true },
  // ignitionAngleThreshold — design-doc default 0.3, range 0..1.
  { path: 'ignitionAngleThreshold', displayName: 'Dual-Mode Angle Threshold', group: 'timing', range: { min: 0, max: 1 }, default: 0.3, unit: '', isModulatable: true },

  // ── Spatial effect positions (0..1 fraction of blade) ────────────────
  // Each is optional on BladeConfig; default matches "center" or the
  // per-effect default in the engine source comments (see types.ts).
  { path: 'lockupPosition', displayName: 'Lockup Position', group: 'other', range: { min: 0, max: 1 }, default: 0.5, unit: '', isModulatable: true },
  { path: 'lockupRadius', displayName: 'Lockup Radius', group: 'other', range: { min: 0, max: 1 }, default: 0.12, unit: '', isModulatable: true },
  { path: 'dragPosition', displayName: 'Drag Position', group: 'other', range: { min: 0, max: 1 }, default: 0, unit: '', isModulatable: true },
  { path: 'dragRadius', displayName: 'Drag Radius', group: 'other', range: { min: 0, max: 1 }, default: 0.15, unit: '', isModulatable: true },
  { path: 'meltPosition', displayName: 'Melt Position', group: 'other', range: { min: 0, max: 1 }, default: 1, unit: '', isModulatable: true },
  { path: 'meltRadius', displayName: 'Melt Radius', group: 'other', range: { min: 0, max: 1 }, default: 0.18, unit: '', isModulatable: true },
  { path: 'stabPosition', displayName: 'Stab Position', group: 'other', range: { min: 0, max: 1 }, default: 0.5, unit: '', isModulatable: true },
  { path: 'stabRadius', displayName: 'Stab Radius', group: 'other', range: { min: 0, max: 1 }, default: 0.2, unit: '', isModulatable: true },
  { path: 'blastPosition', displayName: 'Blast Position', group: 'other', range: { min: 0, max: 1 }, default: 0.5, unit: '', isModulatable: true },
  { path: 'blastRadius', displayName: 'Blast Radius', group: 'other', range: { min: 0, max: 1 }, default: 0.5, unit: '', isModulatable: true },

  // ── Noise parameters (ranges from types.ts comments) ─────────────────
  { path: 'noiseScale', displayName: 'Noise Scale', group: 'style', range: { min: 1, max: 100 }, default: 30, unit: '', isModulatable: true },
  { path: 'noiseSpeed', displayName: 'Noise Speed', group: 'style', range: { min: 0, max: 100 }, default: 20, unit: '', isModulatable: true },
  // Octaves is discrete (1-6) — modulatable in principle but bindings rarely want integer-only outputs.
  // Leave it as isModulatable: true; applyBindings rounds via clamp + UI scrub steps.
  { path: 'noiseOctaves', displayName: 'Noise Octaves', group: 'style', range: { min: 1, max: 6 }, default: 2, unit: '', isModulatable: true },
  { path: 'noiseTurbulence', displayName: 'Noise Turbulence', group: 'style', range: { min: 0, max: 100 }, default: 0, unit: '', isModulatable: true },
  { path: 'noiseIntensity', displayName: 'Noise Intensity', group: 'style', range: { min: 0, max: 100 }, default: 50, unit: '', isModulatable: true },

  // ── Motion reactivity ────────────────────────────────────────────────
  { path: 'motionSwingSensitivity', displayName: 'Swing Sensitivity', group: 'motion', range: { min: 0, max: 100 }, default: 50, unit: '', isModulatable: true },
  { path: 'motionAngleInfluence', displayName: 'Angle Influence', group: 'motion', range: { min: 0, max: 100 }, default: 30, unit: '', isModulatable: true },
  { path: 'motionTwistResponse', displayName: 'Twist Response', group: 'motion', range: { min: 0, max: 100 }, default: 20, unit: '', isModulatable: true },
  { path: 'motionSmoothing', displayName: 'Motion Smoothing', group: 'motion', range: { min: 0, max: 100 }, default: 60, unit: '', isModulatable: true },
  { path: 'motionSwingBrighten', displayName: 'Swing Brighten', group: 'motion', range: { min: 0, max: 100 }, default: 30, unit: '', isModulatable: true },

  // ── Color dynamics ───────────────────────────────────────────────────
  { path: 'colorHueShiftSpeed', displayName: 'Hue Shift Speed', group: 'color', range: { min: 0, max: 100 }, default: 0, unit: '', isModulatable: true },
  { path: 'colorSaturationPulse', displayName: 'Saturation Pulse', group: 'color', range: { min: 0, max: 100 }, default: 0, unit: '', isModulatable: true },
  { path: 'colorBrightnessWave', displayName: 'Brightness Wave', group: 'color', range: { min: 0, max: 100 }, default: 0, unit: '', isModulatable: true },
  { path: 'colorFlickerRate', displayName: 'Flicker Rate', group: 'color', range: { min: 0, max: 100 }, default: 0, unit: '', isModulatable: true },
  { path: 'colorFlickerDepth', displayName: 'Flicker Depth', group: 'color', range: { min: 0, max: 100 }, default: 30, unit: '', isModulatable: true },

  // ── Spatial pattern ──────────────────────────────────────────────────
  { path: 'spatialWaveFrequency', displayName: 'Wave Frequency', group: 'style', range: { min: 1, max: 20 }, default: 3, unit: 'Hz', isModulatable: true },
  { path: 'spatialWaveSpeed', displayName: 'Wave Speed', group: 'style', range: { min: 0, max: 100 }, default: 30, unit: '', isModulatable: true },
  { path: 'spatialSpread', displayName: 'Wave Spread', group: 'style', range: { min: 0, max: 100 }, default: 50, unit: '', isModulatable: true },
  { path: 'spatialPhase', displayName: 'Wave Phase', group: 'style', range: { min: 0, max: 360 }, default: 0, unit: '°', isModulatable: true },

  // ── Blend secondary amount ───────────────────────────────────────────
  { path: 'blendSecondaryAmount', displayName: 'Secondary Blend', group: 'style', range: { min: 0, max: 100 }, default: 0, unit: '', isModulatable: true },

  // ── Tip / emitter ────────────────────────────────────────────────────
  { path: 'tipLength', displayName: 'Tip Length', group: 'other', range: { min: 0, max: 50 }, default: 10, unit: '', isModulatable: true },
  { path: 'tipFade', displayName: 'Tip Fade', group: 'other', range: { min: 0, max: 100 }, default: 50, unit: '', isModulatable: true },
  { path: 'emitterFlare', displayName: 'Emitter Flare', group: 'other', range: { min: 0, max: 100 }, default: 20, unit: '', isModulatable: true },
  { path: 'emitterFlareWidth', displayName: 'Emitter Flare Width', group: 'other', range: { min: 0, max: 50 }, default: 5, unit: '', isModulatable: true },

  // ── Image scroll ─────────────────────────────────────────────────────
  // scrollSpeed = px/sec per types.ts. imageData / width / height are
  // structured — not modulatable here.
  { path: 'scrollSpeed', displayName: 'Scroll Speed', group: 'motion', range: { min: 0, max: 500 }, default: 30, unit: '', isModulatable: true },

  // ── Ignition / retraction parameter knobs ────────────────────────────
  { path: 'stutterCount', displayName: 'Stutter Count', group: 'timing', range: { min: 5, max: 60 }, default: 30, unit: '', isModulatable: true },
  { path: 'stutterAmplitude', displayName: 'Stutter Amplitude', group: 'timing', range: { min: 1, max: 30 }, default: 10, unit: '', isModulatable: true },
  { path: 'glitchDensity', displayName: 'Glitch Density', group: 'timing', range: { min: 1, max: 20 }, default: 3, unit: '', isModulatable: true },
  { path: 'glitchIntensity', displayName: 'Glitch Intensity', group: 'timing', range: { min: 10, max: 100 }, default: 100, unit: '', isModulatable: true },
  { path: 'sparkSize', displayName: 'Spark Size', group: 'timing', range: { min: 1, max: 15 }, default: 5, unit: '', isModulatable: true },
  { path: 'sparkTrail', displayName: 'Spark Trail', group: 'timing', range: { min: 1, max: 20 }, default: 5, unit: '', isModulatable: true },
  { path: 'wipeSoftness', displayName: 'Wipe Softness', group: 'timing', range: { min: 1, max: 20 }, default: 3, unit: '', isModulatable: true },
  { path: 'shatterScale', displayName: 'Shatter Scale', group: 'timing', range: { min: 5, max: 50 }, default: 20, unit: '', isModulatable: true },
  { path: 'shatterDimSpeed', displayName: 'Shatter Dim Speed', group: 'timing', range: { min: 10, max: 100 }, default: 100, unit: '', isModulatable: true },

  // ── Effect customization ─────────────────────────────────────────────
  { path: 'clashLocation', displayName: 'Clash Location', group: 'other', range: { min: 0, max: 100 }, default: 50, unit: '', isModulatable: true },
  { path: 'clashIntensity', displayName: 'Clash Intensity', group: 'other', range: { min: 0, max: 100 }, default: 75, unit: '', isModulatable: true },
  // blastCount is a discrete count 1-5; modulatable in principle.
  { path: 'blastCount', displayName: 'Blast Count', group: 'other', range: { min: 1, max: 5 }, default: 1, unit: '', isModulatable: true },
  { path: 'blastSpread', displayName: 'Blast Spread', group: 'other', range: { min: 0, max: 100 }, default: 50, unit: '', isModulatable: true },
  { path: 'stabDepth', displayName: 'Stab Depth', group: 'other', range: { min: 0, max: 100 }, default: 80, unit: '', isModulatable: true },
];

export const PARAMETER_DESCRIPTORS: readonly ParameterDescriptor[] =
  Object.freeze([...PARAMETER_DESCRIPTORS_MUTABLE]);

// ── Index built once at module load for O(1) path lookups ─────────────

const PATH_INDEX: ReadonlyMap<string, ParameterDescriptor> = new Map(
  PARAMETER_DESCRIPTORS.map((p) => [p.path, p]),
);

/** Lookup a parameter descriptor by its dotted path. */
export function getParameter(path: string): ParameterDescriptor | undefined {
  return PATH_INDEX.get(path);
}

/** Return only parameters that can be targeted by a binding. */
export function getModulatableParameters(): readonly ParameterDescriptor[] {
  return PARAMETER_DESCRIPTORS.filter((p) => p.isModulatable);
}

/**
 * Single-param modulatability check. Returns `false` for unknown paths
 * and for known-but-not-modulatable paths. Bindings should gate on this.
 */
export function isParameterModulatable(path: string): boolean {
  const p = PATH_INDEX.get(path);
  return p !== undefined && p.isModulatable;
}

/** All parameters for a given group. */
export function getParametersByGroup(
  group: ParameterGroup,
): readonly ParameterDescriptor[] {
  return PARAMETER_DESCRIPTORS.filter((p) => p.group === group);
}

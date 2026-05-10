// ─── Template Parameter Annotations ───────────────────────────────────
//
// Human-readable descriptions for ProffieOS template arguments.
// Displayed as gray annotations in the Template Tree Panel (Phase 5B).
//
// Keys are template names (case-sensitive, matching registry names).
// Values are arrays of descriptions, one per arg in positional order.
// Omit trailing undescribed args; the renderer shows nothing for them.

/**
 * Per-argument descriptions for known ProffieOS templates.
 * Array index corresponds to argument position (0-based).
 */
export const PARAM_ANNOTATIONS: Record<string, string[]> = {
  // ─── Colors ─
  Rgb:               ['Red (0-255)', 'Green (0-255)', 'Blue (0-255)'],
  Rgb16:             ['Red (0-65535)', 'Green (0-65535)', 'Blue (0-65535)'],
  RgbArg:            ['Argument number', 'Default color'],
  ColorChange:       ['Transition', '...colors'],
  Mix:               ['Mix factor (0=A, 32768=B)', 'Color A', 'Color B'],
  EasyBlade:         ['Base color', 'Clash color'],

  // ─── Styles ─
  AudioFlicker:      ['Color A', 'Color B'],
  Layers:            ['...layers (base + overlays)'],
  StyleFire:         ['Base color', 'Tip color', 'Delay', 'Spark count', 'Temperature'],
  Pulsing:           ['Color A', 'Color B', 'Pulse period (ms)'],
  PulsingF:          ['Color A', 'Color B', 'Pulse function'],
  Stripes:           ['Width', 'Speed', '...colors'],
  Rainbow:           [],
  Gradient:          ['...colors (evenly spaced)'],
  Cylon:             ['Color', 'Width', 'Speed'],
  HumpFlicker:       ['Color A', 'Color B', 'Amount'],
  RandomFlicker:     ['Color A', 'Color B'],
  BrownNoiseFlicker: ['Color A', 'Color B', 'Grade'],
  Sparkle:           ['Base color', 'Sparkle color', 'Chance', 'Size'],
  BladeAngle:        ['Minimum angle', 'Maximum angle'],

  // ─── Functions ─
  Int:               ['Constant value (0-32768)'],
  IntArg:            ['Argument number', 'Default value'],
  Scale:             ['Function to scale', 'Output when 0', 'Output when 32768'],
  InvertF:           ['Function to invert'],
  ClampF:            ['Function', 'Min', 'Max'],
  IfOn:              ['Value when on', 'Value when off'],
  ChangeSlowly:      ['Function', 'Speed'],
  Sin:               ['RPM', 'Low', 'High'],
  Saw:               ['RPM', 'Low', 'High'],
  Bump:              ['Center position', 'Bump width'],
  SmoothStep:        ['Start position', 'End position'],
  NoisySoundLevel:   [],
  SmoothSoundLevel:  [],
  SwingSpeed:        ['Full-speed threshold (RPM)'],
  SwingAcceleration: ['Scaling factor'],
  ClashImpactF:      ['Max output', 'Window (ms)'],
  Percentage:        ['Function', 'Percentage (0-100)'],
  VolumeLevel:       [],
  ModF:              ['Input function', 'Modulus'],
  BendTimePowX:      ['Function', 'Exponent'],
  Trigger:           ['Effect type', 'Fade-out (ms)', 'Fade-in (ms)', 'Sustain (ms)'],
  EffectPulseF:      ['Effect type'],
  Mult:              ['Function A', 'Function B'],
  Sum:               ['Function A', 'Function B'],
  Subtract:          ['Function A', 'Function B'],
  Divide:            ['Function A', 'Function B'],
  HoldPeakF:         ['Function', 'Decay rate', 'Hold (ms)'],
  IsLessThan:        ['Value', 'Threshold', 'If true', 'If false'],
  IsGreaterThan:     ['Value', 'Threshold', 'If true', 'If false'],
  LayerFunctions:    ['...functions'],
  EffectRandomF:     ['Effect type'],
  EffectPosition:    ['Effect type'],
  TimeSinceEffect:   ['Effect type', 'Max (ms)'],
  WavLen:            ['Function'],
  WavNum:            ['Effect type'],

  // ─── Transitions ─
  TrFade:            ['Fade time (ms)'],
  TrSmoothFade:      ['Fade time (ms)'],
  TrWipe:            ['Wipe time (ms)'],
  TrWipeIn:          ['Wipe time (ms)'],
  TrWipeX:           ['Wipe time function'],
  TrWipeInX:         ['Wipe time function'],
  TrInstant:         [],
  TrDelay:           ['Delay (ms)'],
  TrConcat:          ['...transitions and colors (alternating)'],
  TrRandom:          ['...transitions to pick from'],
  TrSelect:          ['Selection function', '...transitions'],
  TrColorCycle:      ['Cycle speed (ms)'],
  TrCenterWipe:      ['Wipe time (ms)', 'Center position'],
  TrCenterWipeIn:    ['Wipe time (ms)', 'Center position'],
  TrCenterWipeX:     ['Wipe time function', 'Center position function'],
  TrCenterWipeInX:   ['Wipe time function', 'Center position function'],
  TrCenterWipeInSpark: ['Wipe time function', 'Spark color', 'Spark size'],
  TrCenterWipeSpark: ['Wipe time function', 'Spark color', 'Spark size'],
  TrJoin:            ['Transition A', 'Transition B'],
  TrJoinR:           ['Transition A', 'Transition B'],
  TrDoEffect:        ['Transition', 'Effect type', 'Location'],
  TrExtend:          ['Extension (ms)', 'Transition'],
  TrExtendX:         ['Extension function', 'Transition'],
  TrBoingX:          ['Boing time function', 'Bounces'],
  TrLoop:            ['Loop count', 'Transition'],
  TrLoopUntil:       ['Transition', 'Condition', 'Loop transition'],
  TrSequence:        ['...transitions (played in order)'],

  // ─── Wrappers / effect layers ─
  InOutTrL:          ['Base style', 'Ignition transition', 'Retraction transition'],
  InOutHelperL:      ['Base style', 'Ignition transition', 'Retraction transition'],
  TransitionEffectL: ['Transition sequence', 'Effect type'],
  AlphaL:            ['Layer color', 'Alpha function'],
  BlastL:            ['Blast color', 'Fade (ms)', 'Size', 'Wave speed', 'Wave size'],
  SimpleClashL:      ['Clash color', 'Clash duration (ms)', 'Width'],
  LockupTrL:         ['Base', 'Begin transition', 'End transition', 'Lockup type'],
  MultiTransitionEffectL: ['...transition groups'],
  RotateColorsX:     ['Rotation function', 'Color'],
  ResponsiveLockupL: ['Lockup color', 'Transition in', 'Transition out', 'Center', 'Width'],
  ResponsiveLightningBlockL: ['Block color', 'Transition in', 'Transition out'],
  ResponsiveMeltL:   ['Melt color', 'Transition in', 'Transition out', 'Center', 'Width'],
  ResponsiveClashL:  ['Clash color', 'Transition in', 'Transition out', 'Center', 'Width'],
  ResponsiveBlastL:  ['Blast color', 'Fade (ms)', 'Size', 'Wave speed', 'Wave size'],
  ResponsiveBlastFadeL: ['Blast color', 'Size', 'Fade (ms)', 'Wave size'],
  ResponsiveBlastWaveL: ['Blast color', 'Fade (ms)', 'Size', 'Wave speed', 'Wave size'],
  ResponsiveStabL:   ['Stab color', 'Transition in', 'Transition out', 'Center', 'Width'],
  ResponsiveDragL:   ['Drag color', 'Transition in', 'Transition out', 'Center', 'Width'],
  OnSparkL:          ['Spark color', 'Spark size', 'Spark duration (ms)'],
  ColorSelect:       ['Selection function', '...colors'],
  EffectSequence:    ['Effect type', '...styles'],

  // ─── Shorthand (StylePtr / StyleNormalPtr) ─
  StylePtr:          ['...style definition'],
  StyleNormalPtr:    ['Base color', 'Clash color', 'Ignition (ms)', 'Retraction (ms)'],
};

/**
 * Get the annotation for a specific argument of a template.
 * Returns undefined if no annotation exists.
 */
export function getParamAnnotation(templateName: string, argIndex: number): string | undefined {
  const annotations = PARAM_ANNOTATIONS[templateName];
  if (!annotations || argIndex >= annotations.length) return undefined;
  return annotations[argIndex];
}

/**
 * Check if a template name matches an Rgb color node.
 * Rgb<r,g,b> nodes get a color swatch in the tree view.
 */
export function isColorNode(name: string): boolean {
  return name === 'Rgb' || name === 'Rgb16' || name === 'RgbArg';
}

/**
 * Check if a template name matches a named ProffieOS color constant.
 * e.g., Red, Blue, White, DarkOrange, etc.
 */
// Module-scope Set — avoids per-call allocation
const NAMED_COLORS = new Set([
  'Red', 'Green', 'Blue', 'Yellow', 'Cyan', 'Magenta', 'White', 'Black',
  'Orange', 'DarkOrange', 'Tomato', 'OrangeRed', 'LemonChiffon',
  'GreenYellow', 'Aquamarine', 'DeepSkyBlue', 'DodgerBlue', 'SteelBlue',
  'Coral', 'Pink', 'HotPink', 'DeepPink', 'MediumPurple', 'Violet',
  'Ivory', 'LightCyan', 'MistyRose', 'NavajoWhite', 'Snow',
  'AliceBlue', 'Chartreuse', 'Cornsilk', 'Gold', 'Honeydew',
  'LavenderBlush', 'LightYellow', 'Linen', 'MintCream',
  'OldLace', 'SeaShell', 'SpringGreen',
]);

export function isNamedColorNode(name: string): boolean {
  return NAMED_COLORS.has(name);
}

/**
 * Extract RGB values from an Rgb<r,g,b> TemplateNode.
 * Returns null if not a valid Rgb node with 3 integer args.
 */
export function extractRgbFromNode(args: Array<{ name: string }>): { r: number; g: number; b: number } | null {
  if (args.length !== 3) return null;
  const r = parseInt(args[0].name, 10);
  const g = parseInt(args[1].name, 10);
  const b = parseInt(args[2].name, 10);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r: Math.min(255, Math.max(0, r)), g: Math.min(255, Math.max(0, g)), b: Math.min(255, Math.max(0, b)) };
}

/**
 * Map a named ProffieOS color to its RGB value for swatches.
 */
// Module-scope map — avoids per-call allocation.
// Every entry in NAMED_COLORS should have a mapping here.
const NAMED_COLOR_RGB: Record<string, { r: number; g: number; b: number }> = {
  Red:          { r: 255, g: 0,   b: 0   },
  Green:        { r: 0,   g: 255, b: 0   },
  Blue:         { r: 0,   g: 0,   b: 255 },
  Yellow:       { r: 255, g: 255, b: 0   },
  Cyan:         { r: 0,   g: 255, b: 255 },
  Magenta:      { r: 255, g: 0,   b: 255 },
  White:        { r: 255, g: 255, b: 255 },
  Black:        { r: 0,   g: 0,   b: 0   },
  Orange:       { r: 255, g: 165, b: 0   },
  DarkOrange:   { r: 255, g: 140, b: 0   },
  Tomato:       { r: 255, g: 99,  b: 71  },
  OrangeRed:    { r: 255, g: 69,  b: 0   },
  Pink:         { r: 255, g: 192, b: 203 },
  HotPink:      { r: 255, g: 105, b: 180 },
  DeepPink:     { r: 255, g: 20,  b: 147 },
  Gold:         { r: 255, g: 215, b: 0   },
  Coral:        { r: 255, g: 127, b: 80  },
  Violet:       { r: 238, g: 130, b: 238 },
  DeepSkyBlue:  { r: 0,   g: 191, b: 255 },
  DodgerBlue:   { r: 30,  g: 144, b: 255 },
  SteelBlue:    { r: 70,  g: 130, b: 180 },
  SpringGreen:  { r: 0,   g: 255, b: 127 },
  Chartreuse:   { r: 127, g: 255, b: 0   },
  Aquamarine:   { r: 127, g: 255, b: 212 },
  MediumPurple: { r: 147, g: 112, b: 219 },
  GreenYellow:  { r: 173, g: 255, b: 47  },
  // Previously missing — standard CSS named colors
  LemonChiffon: { r: 255, g: 250, b: 205 },
  Ivory:        { r: 255, g: 255, b: 240 },
  LightCyan:    { r: 224, g: 255, b: 255 },
  MistyRose:    { r: 255, g: 228, b: 225 },
  NavajoWhite:  { r: 255, g: 222, b: 173 },
  Snow:         { r: 255, g: 250, b: 250 },
  AliceBlue:    { r: 240, g: 248, b: 255 },
  Cornsilk:     { r: 255, g: 248, b: 220 },
  Honeydew:     { r: 240, g: 255, b: 240 },
  LavenderBlush:{ r: 255, g: 240, b: 245 },
  LightYellow:  { r: 255, g: 255, b: 224 },
  Linen:        { r: 250, g: 240, b: 230 },
  MintCream:    { r: 245, g: 255, b: 250 },
  OldLace:      { r: 253, g: 245, b: 230 },
  SeaShell:     { r: 255, g: 245, b: 238 },
};

export function namedColorToRgb(name: string): { r: number; g: number; b: number } | null {
  return NAMED_COLOR_RGB[name] ?? null;
}

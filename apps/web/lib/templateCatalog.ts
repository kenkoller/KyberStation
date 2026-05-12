// ─── Template Catalog ───
// Structured catalog of ProffieOS templates for the Template Insertion Palette
// (Phase 7 of the Fredrik Style Editor Integration Plan).
//
// Organizes the ~80 most commonly used templates from the 372+ registered
// names in packages/template-eval/src/registry.ts into browsable categories
// with signatures, descriptions, and default insertion args.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateCatalogCategory =
  | 'colors'
  | 'styles'
  | 'functions'
  | 'transitions'
  | 'effects'
  | 'wrappers';

export interface TemplateCatalogEntry {
  /** Canonical ProffieOS template name (matches registry key). */
  name: string;
  /** Category for grouping in the palette UI. */
  category: TemplateCatalogCategory;
  /** Human-readable signature, e.g. 'Rgb<R,G,B>' or 'TrFade<ms>'. */
  signature: string;
  /** One-line description of what this template does. */
  description: string;
  /** Default argument values for insertion (as raw template strings). */
  defaultArgs: string[];
}

export interface TemplateExample {
  /** Display name shown in the examples list. */
  name: string;
  /** One-line description of the style. */
  description: string;
  /** Full ProffieOS template string ready for parsing. */
  templateString: string;
}

// ---------------------------------------------------------------------------
// Category labels (for UI display)
// ---------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<TemplateCatalogCategory, string> = {
  colors: 'Colors',
  styles: 'Styles',
  functions: 'Functions',
  transitions: 'Transitions',
  effects: 'Effects',
  wrappers: 'Wrappers',
};

export const CATEGORY_ORDER: TemplateCatalogCategory[] = [
  'colors',
  'styles',
  'functions',
  'transitions',
  'effects',
  'wrappers',
];

// ---------------------------------------------------------------------------
// Catalog entries — ~80 most commonly used templates
// ---------------------------------------------------------------------------

const COLOR_ENTRIES: TemplateCatalogEntry[] = [
  // Parametric color constructors
  {
    name: 'Rgb',
    category: 'colors',
    signature: 'Rgb<R,G,B>',
    description: 'Constant color from 8-bit RGB components (0-255).',
    defaultArgs: ['255', '0', '0'],
  },
  {
    name: 'Rgb16',
    category: 'colors',
    signature: 'Rgb16<R,G,B>',
    description: 'Constant color from 16-bit RGB components (0-65535).',
    defaultArgs: ['65535', '0', '0'],
  },
  {
    name: 'RgbArg',
    category: 'colors',
    signature: 'RgbArg<ARG,DEFAULT_COLOR>',
    description: 'Editable RGB color argument for style customization.',
    defaultArgs: ['1', 'Rgb<255,0,0>'],
  },
  {
    name: 'Hue',
    category: 'colors',
    signature: 'Hue<degrees>',
    description: 'Color from a hue angle (0-360) at full saturation.',
    defaultArgs: ['0'],
  },
  {
    name: 'Mix',
    category: 'colors',
    signature: 'Mix<F,COLOR1,COLOR2>',
    description: 'Blend two colors using a 0-32768 function as mix factor.',
    defaultArgs: ['Int<16384>', 'Red', 'Blue'],
  },
  {
    name: 'Gradient',
    category: 'colors',
    signature: 'Gradient<COLOR1,COLOR2,...>',
    description: 'Smooth gradient across the blade from multiple colors.',
    defaultArgs: ['Red', 'Blue'],
  },
  {
    name: 'Rainbow',
    category: 'colors',
    signature: 'Rainbow',
    description: 'Full rainbow spectrum cycling across the blade.',
    defaultArgs: [],
  },
  {
    name: 'RgbCycle',
    category: 'colors',
    signature: 'RgbCycle',
    description: 'Cycling RGB color wheel animation.',
    defaultArgs: [],
  },
  {
    name: 'RotateColorsX',
    category: 'colors',
    signature: 'RotateColorsX<F,COLOR>',
    description: 'Hue-rotate a color by a function value.',
    defaultArgs: ['Variation', 'Red'],
  },
  {
    name: 'ColorChange',
    category: 'colors',
    signature: 'ColorChange<TRANSITION,COLOR1,COLOR2,...>',
    description: 'Cycle through colors on aux button press with transition.',
    defaultArgs: ['TrInstant', 'Red', 'Green', 'Blue'],
  },
  {
    name: 'ColorSelect',
    category: 'colors',
    signature: 'ColorSelect<F,COLOR1,COLOR2,...>',
    description: 'Select a color from a list based on a function value.',
    defaultArgs: ['Variation', 'Red', 'Green', 'Blue'],
  },
  {
    name: 'AlphaL',
    category: 'colors',
    signature: 'AlphaL<COLOR,F>',
    description: 'Apply alpha/opacity to a color using a function.',
    defaultArgs: ['White', 'Int<16384>'],
  },
  {
    name: 'PixelateX',
    category: 'colors',
    signature: 'PixelateX<COLOR,SIZE>',
    description: 'Pixelate a color pattern into blocks of specified size.',
    defaultArgs: ['Rainbow', 'Int<5000>'],
  },
  {
    name: 'ColorSequence',
    category: 'colors',
    signature: 'ColorSequence<COLOR1,COLOR2,...>',
    description: 'Fixed sequence of color blocks along the blade.',
    defaultArgs: ['Red', 'Green', 'Blue'],
  },
  {
    name: 'ColorCycle',
    category: 'colors',
    signature: 'ColorCycle<COLOR1,COLOR2,...>',
    description: 'Animated cycling through a color list.',
    defaultArgs: ['Red', 'Green', 'Blue'],
  },
  {
    name: 'RandomL',
    category: 'colors',
    signature: 'RandomL<COLOR1,COLOR2,...>',
    description: 'Randomly select and display one of the provided colors.',
    defaultArgs: ['Red', 'Green', 'Blue'],
  },

  // Common named colors (subset — users can type any named color directly)
  {
    name: 'Red',
    category: 'colors',
    signature: 'Red',
    description: 'Named color: red (255, 0, 0).',
    defaultArgs: [],
  },
  {
    name: 'Green',
    category: 'colors',
    signature: 'Green',
    description: 'Named color: green (0, 255, 0).',
    defaultArgs: [],
  },
  {
    name: 'Blue',
    category: 'colors',
    signature: 'Blue',
    description: 'Named color: blue (0, 0, 255).',
    defaultArgs: [],
  },
  {
    name: 'White',
    category: 'colors',
    signature: 'White',
    description: 'Named color: white (255, 255, 255).',
    defaultArgs: [],
  },
  {
    name: 'Black',
    category: 'colors',
    signature: 'Black',
    description: 'Named color: black (0, 0, 0). Transparent in layers.',
    defaultArgs: [],
  },
  {
    name: 'Yellow',
    category: 'colors',
    signature: 'Yellow',
    description: 'Named color: yellow (255, 255, 0).',
    defaultArgs: [],
  },
  {
    name: 'Cyan',
    category: 'colors',
    signature: 'Cyan',
    description: 'Named color: cyan (0, 255, 255).',
    defaultArgs: [],
  },
  {
    name: 'Magenta',
    category: 'colors',
    signature: 'Magenta',
    description: 'Named color: magenta (255, 0, 255).',
    defaultArgs: [],
  },
  {
    name: 'Orange',
    category: 'colors',
    signature: 'Orange',
    description: 'Named color: orange (255, 165, 0).',
    defaultArgs: [],
  },
  {
    name: 'Purple',
    category: 'colors',
    signature: 'Purple',
    description: 'Named color: purple (128, 0, 128).',
    defaultArgs: [],
  },
  {
    name: 'DeepSkyBlue',
    category: 'colors',
    signature: 'DeepSkyBlue',
    description: 'Named color: deep sky blue (0, 191, 255).',
    defaultArgs: [],
  },
];

const STYLE_ENTRIES: TemplateCatalogEntry[] = [
  {
    name: 'Layers',
    category: 'styles',
    signature: 'Layers<BASE,LAYER1,LAYER2,...>',
    description: 'Composite multiple layers with the base color underneath.',
    defaultArgs: ['Red', 'SimpleClashL<White>'],
  },
  {
    name: 'AudioFlicker',
    category: 'styles',
    signature: 'AudioFlicker<COLOR1,COLOR2>',
    description: 'Flicker between two colors driven by audio input.',
    defaultArgs: ['Red', 'Rgb<128,0,0>'],
  },
  {
    name: 'AudioFlickerL',
    category: 'styles',
    signature: 'AudioFlickerL<COLOR>',
    description: 'Audio flicker layer blending toward a color.',
    defaultArgs: ['White'],
  },
  {
    name: 'StyleFire',
    category: 'styles',
    signature: 'StyleFire<COLOR1,COLOR2,DELAY,SPEED>',
    description: 'Animated fire effect using two colors.',
    defaultArgs: ['Red', 'Rgb<255,80,0>', '0', '3'],
  },
  {
    name: 'StaticFire',
    category: 'styles',
    signature: 'StaticFire<COLOR1,COLOR2,DELAY,SPEED>',
    description: 'Fire effect with a static (non-audio-reactive) pattern.',
    defaultArgs: ['Red', 'Rgb<255,80,0>', '0', '3'],
  },
  {
    name: 'Pulsing',
    category: 'styles',
    signature: 'Pulsing<COLOR1,COLOR2,PERIOD_MS>',
    description: 'Smoothly pulse between two colors over a period.',
    defaultArgs: ['Red', 'Rgb<80,0,0>', '2000'],
  },
  {
    name: 'Stripes',
    category: 'styles',
    signature: 'Stripes<WIDTH,SPEED,COLOR1,COLOR2,...>',
    description: 'Scrolling colored stripes along the blade.',
    defaultArgs: ['3000', '-1000', 'Red', 'Rgb<128,0,0>', 'Rgb<60,0,0>'],
  },
  {
    name: 'StripesX',
    category: 'styles',
    signature: 'StripesX<WIDTH_F,SPEED_F,COLOR1,COLOR2,...>',
    description: 'Stripes with function-driven width and speed.',
    defaultArgs: ['Int<3000>', 'Int<-1000>', 'Red', 'Rgb<128,0,0>'],
  },
  {
    name: 'Blinking',
    category: 'styles',
    signature: 'Blinking<COLOR1,COLOR2,ON_MS,OFF_MS>',
    description: 'Blink between two colors with configurable timing.',
    defaultArgs: ['Red', 'Black', '500', '500'],
  },
  {
    name: 'Cylon',
    category: 'styles',
    signature: 'Cylon<COLOR,SIZE,SPEED>',
    description: 'Bouncing scanner dot (Cylon/KITT effect).',
    defaultArgs: ['Red', '10', '1000'],
  },
  {
    name: 'RandomFlicker',
    category: 'styles',
    signature: 'RandomFlicker<COLOR1,COLOR2>',
    description: 'Random per-pixel flicker between two colors.',
    defaultArgs: ['Red', 'Rgb<128,0,0>'],
  },
  {
    name: 'BrownNoiseFlicker',
    category: 'styles',
    signature: 'BrownNoiseFlicker<COLOR1,COLOR2,GRADE>',
    description: 'Organic flicker using Brownian noise.',
    defaultArgs: ['Red', 'Rgb<128,0,0>', 'Int<100>'],
  },
  {
    name: 'HumpFlicker',
    category: 'styles',
    signature: 'HumpFlicker<COLOR1,COLOR2,GRADE>',
    description: 'Hump-shaped flicker pattern between two colors.',
    defaultArgs: ['Red', 'Rgb<128,0,0>', '30'],
  },
  {
    name: 'AlphaMixL',
    category: 'styles',
    signature: 'AlphaMixL<F,COLOR1,COLOR2>',
    description: 'Layer that alpha-blends two colors by a function.',
    defaultArgs: ['Int<16384>', 'Red', 'Blue'],
  },
  {
    name: 'Sparkle',
    category: 'styles',
    signature: 'Sparkle<COLOR,SPARK_CHANCE>',
    description: 'Random sparkling pixels overlaid on the blade.',
    defaultArgs: ['White', '200'],
  },
  {
    name: 'Strobe',
    category: 'styles',
    signature: 'Strobe<COLOR1,COLOR2,FREQUENCY,DURATION>',
    description: 'Strobe flash effect at a given frequency.',
    defaultArgs: ['White', 'Black', '15', '1'],
  },
  {
    name: 'OnSpark',
    category: 'styles',
    signature: 'OnSpark<COLOR,SPARK_MS>',
    description: 'Brief spark flash on ignition.',
    defaultArgs: ['White', '200'],
  },
  {
    name: 'Lockup',
    category: 'styles',
    signature: 'Lockup<COLOR1,COLOR2,SHAPE>',
    description: 'Basic lockup effect (saber-to-saber clash hold).',
    defaultArgs: ['Red', 'White', 'Int<26000>'],
  },
  {
    name: 'LocalizedClashL',
    category: 'styles',
    signature: 'LocalizedClashL<COLOR,BUMP_MS,WIDTH>',
    description: 'Localized clash flash at the impact point.',
    defaultArgs: ['White', '100', 'Int<26000>'],
  },
  {
    name: 'BlastFadeout',
    category: 'styles',
    signature: 'BlastFadeout<COLOR,SIZE>',
    description: 'Blast deflection effect with fadeout.',
    defaultArgs: ['White', '250'],
  },
  {
    name: 'RandomPerLEDFlickerL',
    category: 'styles',
    signature: 'RandomPerLEDFlickerL<COLOR>',
    description: 'Per-LED random flicker layer.',
    defaultArgs: ['Rgb<128,128,128>'],
  },
];

const FUNCTION_ENTRIES: TemplateCatalogEntry[] = [
  {
    name: 'Int',
    category: 'functions',
    signature: 'Int<N>',
    description: 'Constant integer value (0-32768 scale for most uses).',
    defaultArgs: ['16384'],
  },
  {
    name: 'IntArg',
    category: 'functions',
    signature: 'IntArg<ARG,DEFAULT>',
    description: 'Editable integer argument for style customization.',
    defaultArgs: ['1', '16384'],
  },
  {
    name: 'Scale',
    category: 'functions',
    signature: 'Scale<F,MIN,MAX>',
    description: 'Rescale a function from 0-32768 to MIN-MAX range.',
    defaultArgs: ['SwingSpeed<400>', 'Int<0>', 'Int<32768>'],
  },
  {
    name: 'SwingSpeed',
    category: 'functions',
    signature: 'SwingSpeed<THRESHOLD>',
    description: 'Current swing speed (0-32768), threshold in deg/sec.',
    defaultArgs: ['400'],
  },
  {
    name: 'SwingAcceleration',
    category: 'functions',
    signature: 'SwingAcceleration<>',
    description: 'Current swing acceleration value.',
    defaultArgs: [],
  },
  {
    name: 'BladeAngle',
    category: 'functions',
    signature: 'BladeAngle<>',
    description: 'Blade orientation angle (0=up, 32768=down).',
    defaultArgs: [],
  },
  {
    name: 'TwistAngle',
    category: 'functions',
    signature: 'TwistAngle<>',
    description: 'Blade twist rotation angle.',
    defaultArgs: [],
  },
  {
    name: 'TwistAcceleration',
    category: 'functions',
    signature: 'TwistAcceleration<>',
    description: 'Current twist acceleration value.',
    defaultArgs: [],
  },
  {
    name: 'SoundLevel',
    category: 'functions',
    signature: 'SoundLevel<>',
    description: 'Current sound output level (0-32768).',
    defaultArgs: [],
  },
  {
    name: 'NoisySoundLevel',
    category: 'functions',
    signature: 'NoisySoundLevel<>',
    description: 'Raw (unsmoothed) sound output level.',
    defaultArgs: [],
  },
  {
    name: 'SmoothSoundLevel',
    category: 'functions',
    signature: 'SmoothSoundLevel<>',
    description: 'Smoothed sound output level for gradual transitions.',
    defaultArgs: [],
  },
  {
    name: 'VolumeLevel',
    category: 'functions',
    signature: 'VolumeLevel<>',
    description: 'Current volume setting as a function value.',
    defaultArgs: [],
  },
  {
    name: 'BatteryLevel',
    category: 'functions',
    signature: 'BatteryLevel<>',
    description: 'Current battery charge level (0=empty, 32768=full).',
    defaultArgs: [],
  },
  {
    name: 'Variation',
    category: 'functions',
    signature: 'Variation',
    description: 'Returns the current variation/preset selection index.',
    defaultArgs: [],
  },
  {
    name: 'Sin',
    category: 'functions',
    signature: 'Sin<RPM>',
    description: 'Sine wave oscillator at RPM speed (0-32768 output).',
    defaultArgs: ['Int<200>'],
  },
  {
    name: 'Bump',
    category: 'functions',
    signature: 'Bump<POSITION,WIDTH>',
    description: 'Gaussian bump at a blade position with given width.',
    defaultArgs: ['Int<16384>', 'Int<10000>'],
  },
  {
    name: 'SmoothStep',
    category: 'functions',
    signature: 'SmoothStep<POSITION,WIDTH>',
    description: 'Smooth step function at a position along the blade.',
    defaultArgs: ['Int<16384>', 'Int<8000>'],
  },
  {
    name: 'ClampF',
    category: 'functions',
    signature: 'ClampF<F,MIN,MAX>',
    description: 'Clamp a function value between minimum and maximum.',
    defaultArgs: ['SwingSpeed<400>', 'Int<0>', 'Int<32768>'],
  },
  {
    name: 'ChangeSlowly',
    category: 'functions',
    signature: 'ChangeSlowly<F,SPEED>',
    description: 'Smooth out rapid function changes with a speed limit.',
    defaultArgs: ['SwingSpeed<400>', 'Int<2000>'],
  },
  {
    name: 'Sum',
    category: 'functions',
    signature: 'Sum<F1,F2>',
    description: 'Add two function values together.',
    defaultArgs: ['Int<0>', 'Int<0>'],
  },
  {
    name: 'Mult',
    category: 'functions',
    signature: 'Mult<F1,F2>',
    description: 'Multiply two function values (result / 32768).',
    defaultArgs: ['Int<16384>', 'Int<16384>'],
  },
  {
    name: 'Percentage',
    category: 'functions',
    signature: 'Percentage<F,PERCENT>',
    description: 'Scale a function by a percentage (0-100).',
    defaultArgs: ['Int<32768>', '50'],
  },
  {
    name: 'Divide',
    category: 'functions',
    signature: 'Divide<F1,F2>',
    description: 'Divide one function value by another.',
    defaultArgs: ['Int<32768>', 'Int<2>'],
  },
  {
    name: 'Subtract',
    category: 'functions',
    signature: 'Subtract<F1,F2>',
    description: 'Subtract one function value from another.',
    defaultArgs: ['Int<32768>', 'Int<16384>'],
  },
  {
    name: 'IsLessThan',
    category: 'functions',
    signature: 'IsLessThan<F1,F2>',
    description: 'Returns 32768 if F1 < F2, else 0.',
    defaultArgs: ['SwingSpeed<400>', 'Int<16384>'],
  },
  {
    name: 'IsGreaterThan',
    category: 'functions',
    signature: 'IsGreaterThan<F1,F2>',
    description: 'Returns 32768 if F1 > F2, else 0.',
    defaultArgs: ['SwingSpeed<400>', 'Int<16384>'],
  },
  {
    name: 'IsBetween',
    category: 'functions',
    signature: 'IsBetween<F,LOW,HIGH>',
    description: 'Returns 32768 if F is between LOW and HIGH, else 0.',
    defaultArgs: ['SwingSpeed<400>', 'Int<8000>', 'Int<24000>'],
  },
  {
    name: 'Ifon',
    category: 'functions',
    signature: 'Ifon<ON_VALUE,OFF_VALUE>',
    description: 'Return different values based on blade on/off state.',
    defaultArgs: ['Int<32768>', 'Int<0>'],
  },
  {
    name: 'ClashImpactF',
    category: 'functions',
    signature: 'ClashImpactF<>',
    description: 'Clash impact strength as a function value.',
    defaultArgs: [],
  },
  {
    name: 'TimeSinceEffect',
    category: 'functions',
    signature: 'TimeSinceEffect<EFFECT>',
    description: 'Milliseconds since the last trigger of an effect.',
    defaultArgs: ['EFFECT_CLASH'],
  },
  {
    name: 'EffectPosition',
    category: 'functions',
    signature: 'EffectPosition<EFFECT>',
    description: 'Blade position of the last effect trigger.',
    defaultArgs: ['EFFECT_CLASH'],
  },
  {
    name: 'EffectRandomF',
    category: 'functions',
    signature: 'EffectRandomF<EFFECT>',
    description: 'Random value generated per effect trigger.',
    defaultArgs: ['EFFECT_BLAST'],
  },
  {
    name: 'RandomF',
    category: 'functions',
    signature: 'RandomF<>',
    description: 'Continuously varying random function value.',
    defaultArgs: [],
  },
  {
    name: 'RandomPerLEDF',
    category: 'functions',
    signature: 'RandomPerLEDF<>',
    description: 'Independent random value per LED pixel.',
    defaultArgs: [],
  },
  {
    name: 'CenterDistF',
    category: 'functions',
    signature: 'CenterDistF<CENTER>',
    description: 'Distance from each LED to a center point.',
    defaultArgs: ['Int<16384>'],
  },
  {
    name: 'SlowNoise',
    category: 'functions',
    signature: 'SlowNoise<SPEED>',
    description: 'Slowly varying smooth noise function.',
    defaultArgs: ['Int<1000>'],
  },
  {
    name: 'HoldPeakF',
    category: 'functions',
    signature: 'HoldPeakF<F,HOLD_MS,DECAY>',
    description: 'Hold peak value of a function with decay.',
    defaultArgs: ['SwingSpeed<400>', 'Int<300>', 'Int<2000>'],
  },
  {
    name: 'BlastF',
    category: 'functions',
    signature: 'BlastF<FADEOUT,SIZE>',
    description: 'Blast effect function for custom blast layers.',
    defaultArgs: ['200', '250'],
  },
  {
    name: 'LockupPulseF',
    category: 'functions',
    signature: 'LockupPulseF<LOCKUP_TYPE>',
    description: 'Pulsing function active during lockup.',
    defaultArgs: ['SaberBase::LOCKUP_NORMAL'],
  },
  {
    name: 'PulsingF',
    category: 'functions',
    signature: 'PulsingF<PERIOD_MS>',
    description: 'Smooth pulsing function with configurable period.',
    defaultArgs: ['2000'],
  },
  {
    name: 'EffectPulseF',
    category: 'functions',
    signature: 'EffectPulseF<EFFECT>',
    description: 'Single pulse triggered by an effect event.',
    defaultArgs: ['EFFECT_CLASH'],
  },
  {
    name: 'SparkleF',
    category: 'functions',
    signature: 'SparkleF<CHANCE>',
    description: 'Random sparkle pattern with configurable density.',
    defaultArgs: ['200'],
  },
  {
    name: 'Remap',
    category: 'functions',
    signature: 'Remap<F,SHAPE>',
    description: 'Remap a function through another function as LUT.',
    defaultArgs: ['CenterDistF<Int<16384>>', 'Int<16384>'],
  },
  {
    name: 'LinearSectionF',
    category: 'functions',
    signature: 'LinearSectionF<POSITION,WIDTH>',
    description: 'Linear section highlight at a position on the blade.',
    defaultArgs: ['Int<16384>', 'Int<8000>'],
  },
  {
    name: 'CircularSectionF',
    category: 'functions',
    signature: 'CircularSectionF<POSITION,WIDTH>',
    description: 'Circular section highlight wrapping around blade ends.',
    defaultArgs: ['Int<16384>', 'Int<8000>'],
  },
  {
    name: 'IncrementWithReset',
    category: 'functions',
    signature: 'IncrementWithReset<F,RESET,SPEED,INITIAL>',
    description: 'Auto-incrementing value that resets on a trigger.',
    defaultArgs: ['BladeAngle<>', 'Int<0>', 'Int<200>', 'Int<0>'],
  },
  {
    name: 'IgnitionTime',
    category: 'functions',
    signature: 'IgnitionTime<MS>',
    description: 'Time in ms since ignition started.',
    defaultArgs: ['300'],
  },
  {
    name: 'RetractionTime',
    category: 'functions',
    signature: 'RetractionTime<MS>',
    description: 'Time in ms since retraction started.',
    defaultArgs: ['500'],
  },
  {
    name: 'ThresholdPulseF',
    category: 'functions',
    signature: 'ThresholdPulseF<F,THRESHOLD,HOLD_MS>',
    description: 'Pulse when function exceeds threshold, hold for duration.',
    defaultArgs: ['SwingSpeed<400>', 'Int<16384>', 'Int<200>'],
  },
  {
    name: 'Trigger',
    category: 'functions',
    signature: 'Trigger<EFFECT,HOLD_MS,DECAY_MS>',
    description: 'Triggered value from an effect with hold and decay.',
    defaultArgs: ['EFFECT_CLASH', 'Int<200>', 'Int<300>'],
  },
  {
    name: 'WavLen',
    category: 'functions',
    signature: 'WavLen<>',
    description: 'Current WAV playback position as a function.',
    defaultArgs: [],
  },
  {
    name: 'BendTimePowX',
    category: 'functions',
    signature: 'BendTimePowX<F,POWER>',
    description: 'Time-bending function with power curve.',
    defaultArgs: ['Int<16384>', 'Int<16384>'],
  },
  {
    name: 'BendTimePowInvX',
    category: 'functions',
    signature: 'BendTimePowInvX<F,POWER>',
    description: 'Inverse time-bending function with power curve.',
    defaultArgs: ['Int<16384>', 'Int<16384>'],
  },
  {
    name: 'ModF',
    category: 'functions',
    signature: 'ModF<F,MOD>',
    description: 'Modulo operation on a function value.',
    defaultArgs: ['Int<32768>', 'Int<16384>'],
  },
  {
    name: 'IntSelect',
    category: 'functions',
    signature: 'IntSelect<F,INT1,INT2,...>',
    description: 'Select an integer from a list based on a function.',
    defaultArgs: ['Variation', 'Int<100>', 'Int<200>', 'Int<300>'],
  },
];

const TRANSITION_ENTRIES: TemplateCatalogEntry[] = [
  {
    name: 'TrInstant',
    category: 'transitions',
    signature: 'TrInstant',
    description: 'Instant transition with no animation.',
    defaultArgs: [],
  },
  {
    name: 'TrFade',
    category: 'transitions',
    signature: 'TrFade<MS>',
    description: 'Smooth crossfade over a duration in milliseconds.',
    defaultArgs: ['300'],
  },
  {
    name: 'TrFadeX',
    category: 'transitions',
    signature: 'TrFadeX<MS_F>',
    description: 'Fade transition with function-controlled duration.',
    defaultArgs: ['Int<300>'],
  },
  {
    name: 'TrSmoothFade',
    category: 'transitions',
    signature: 'TrSmoothFade<MS>',
    description: 'Extra-smooth fade using an S-curve.',
    defaultArgs: ['300'],
  },
  {
    name: 'TrWipe',
    category: 'transitions',
    signature: 'TrWipe<MS>',
    description: 'Wipe from emitter to tip over a duration.',
    defaultArgs: ['300'],
  },
  {
    name: 'TrWipeX',
    category: 'transitions',
    signature: 'TrWipeX<MS_F>',
    description: 'Wipe with function-controlled duration.',
    defaultArgs: ['Int<300>'],
  },
  {
    name: 'TrWipeIn',
    category: 'transitions',
    signature: 'TrWipeIn<MS>',
    description: 'Wipe from tip to emitter (reverse direction).',
    defaultArgs: ['500'],
  },
  {
    name: 'TrWipeInX',
    category: 'transitions',
    signature: 'TrWipeInX<MS_F>',
    description: 'Reverse wipe with function-controlled duration.',
    defaultArgs: ['Int<500>'],
  },
  {
    name: 'TrCenterWipe',
    category: 'transitions',
    signature: 'TrCenterWipe<MS>',
    description: 'Wipe expanding from the center outward.',
    defaultArgs: ['300'],
  },
  {
    name: 'TrCenterWipeX',
    category: 'transitions',
    signature: 'TrCenterWipeX<MS_F>',
    description: 'Center wipe with function-controlled duration.',
    defaultArgs: ['Int<300>'],
  },
  {
    name: 'TrCenterWipeIn',
    category: 'transitions',
    signature: 'TrCenterWipeIn<MS>',
    description: 'Wipe collapsing inward toward the center.',
    defaultArgs: ['300'],
  },
  {
    name: 'TrCenterWipeInSpark',
    category: 'transitions',
    signature: 'TrCenterWipeInSpark<MS,SPARK_SIZE>',
    description: 'Center wipe inward with a spark at the leading edge.',
    defaultArgs: ['300', 'Int<8000>'],
  },
  {
    name: 'TrDelay',
    category: 'transitions',
    signature: 'TrDelay<MS>',
    description: 'Delay before the next transition starts.',
    defaultArgs: ['300'],
  },
  {
    name: 'TrConcat',
    category: 'transitions',
    signature: 'TrConcat<TR1,INTERMEDIATE_COLOR,TR2,...>',
    description: 'Chain transitions with intermediate colors.',
    defaultArgs: ['TrFade<200>', 'White', 'TrFade<200>'],
  },
  {
    name: 'TrJoin',
    category: 'transitions',
    signature: 'TrJoin<TR1,TR2>',
    description: 'Run two transitions simultaneously, finish with latest.',
    defaultArgs: ['TrFade<300>', 'TrWipe<300>'],
  },
  {
    name: 'TrJoinR',
    category: 'transitions',
    signature: 'TrJoinR<TR1,TR2>',
    description: 'Run two transitions simultaneously, finish with earliest.',
    defaultArgs: ['TrFade<300>', 'TrWipe<300>'],
  },
  {
    name: 'TrExtend',
    category: 'transitions',
    signature: 'TrExtend<MS,TR>',
    description: 'Extend a transition to last at least MS milliseconds.',
    defaultArgs: ['500', 'TrFade<200>'],
  },
  {
    name: 'TrWaveX',
    category: 'transitions',
    signature: 'TrWaveX<COLOR,FADE_MS,SIZE,DELAY,POSITION>',
    description: 'Animated wave pulse emanating from a position.',
    defaultArgs: ['White', 'Int<200>', 'Int<100>', 'Int<0>', 'Int<16384>'],
  },
  {
    name: 'TrSparkX',
    category: 'transitions',
    signature: 'TrSparkX<COLOR,SPARK_MS,SIZE,POSITION>',
    description: 'Spark effect expanding from a position.',
    defaultArgs: ['White', 'Int<200>', 'Int<300>', 'Int<16384>'],
  },
  {
    name: 'TrWipeSparkTip',
    category: 'transitions',
    signature: 'TrWipeSparkTip<MS,SIZE>',
    description: 'Wipe with a sparkle tip at the leading edge.',
    defaultArgs: ['300', 'Int<300>'],
  },
  {
    name: 'TrSelect',
    category: 'transitions',
    signature: 'TrSelect<F,TR1,TR2,...>',
    description: 'Select a transition based on a function value.',
    defaultArgs: ['Variation', 'TrFade<300>', 'TrWipe<300>'],
  },
  {
    name: 'TrDoEffect',
    category: 'transitions',
    signature: 'TrDoEffect<EFFECT,DELAY_MS>',
    description: 'Trigger an effect event during a transition.',
    defaultArgs: ['EFFECT_CLASH', '0'],
  },
  {
    name: 'TrBoing',
    category: 'transitions',
    signature: 'TrBoing<MS,BOUNCES>',
    description: 'Bouncy spring transition effect.',
    defaultArgs: ['500', '3'],
  },
  {
    name: 'TrColorCycleX',
    category: 'transitions',
    signature: 'TrColorCycleX<MS_F>',
    description: 'Transition via a color cycle effect.',
    defaultArgs: ['Int<500>'],
  },
  {
    name: 'TrCenterWipeSpark',
    category: 'transitions',
    signature: 'TrCenterWipeSpark<MS,SPARK_SIZE>',
    description: 'Center wipe outward with spark at the leading edges.',
    defaultArgs: ['300', 'Int<8000>'],
  },
  {
    name: 'TrBlink',
    category: 'transitions',
    signature: 'TrBlink<MS,ON_MS,OFF_MS>',
    description: 'Blinking transition between old and new colors.',
    defaultArgs: ['500', '100', '100'],
  },
  {
    name: 'TrLoopN',
    category: 'transitions',
    signature: 'TrLoopN<N,TR>',
    description: 'Repeat a transition N times.',
    defaultArgs: ['3', 'TrFade<200>'],
  },
  {
    name: 'TrLoopUntil',
    category: 'transitions',
    signature: 'TrLoopUntil<CONDITION,TR,TIMEOUT>',
    description: 'Repeat a transition until a condition or timeout.',
    defaultArgs: ['Int<0>', 'TrFade<200>', 'Int<3000>'],
  },
  {
    name: 'TrSequence',
    category: 'transitions',
    signature: 'TrSequence<TR1,TR2,...>',
    description: 'Play transitions in sequence, one after another.',
    defaultArgs: ['TrFade<200>', 'TrWipe<200>', 'TrWipeIn<200>'],
  },
];

const EFFECT_ENTRIES: TemplateCatalogEntry[] = [
  {
    name: 'SimpleClashL',
    category: 'effects',
    signature: 'SimpleClashL<COLOR,MS>',
    description: 'Full-blade flash on clash impact.',
    defaultArgs: ['White', '40'],
  },
  {
    name: 'ResponsiveClashL',
    category: 'effects',
    signature: 'ResponsiveClashL<COLOR,TR_IN,TR_OUT,SIZE>',
    description: 'Localized clash flash with responsive positioning.',
    defaultArgs: ['White', 'TrInstant', 'TrFade<200>', 'Int<26000>'],
  },
  {
    name: 'BlastL',
    category: 'effects',
    signature: 'BlastL<COLOR,FADEOUT,SIZE>',
    description: 'Blaster deflection flash with fadeout.',
    defaultArgs: ['White', '200', '250'],
  },
  {
    name: 'ResponsiveBlastL',
    category: 'effects',
    signature: 'ResponsiveBlastL<COLOR,FADE,SIZE,SPEED>',
    description: 'Responsive blast with size and speed control.',
    defaultArgs: ['White', 'Int<400>', 'Int<200>', 'Int<100>'],
  },
  {
    name: 'ResponsiveBlastFadeL',
    category: 'effects',
    signature: 'ResponsiveBlastFadeL<COLOR,SIZE,FADE>',
    description: 'Responsive blast with configurable fade behavior.',
    defaultArgs: ['White', 'Int<2000>', 'Int<400>'],
  },
  {
    name: 'ResponsiveBlastWaveL',
    category: 'effects',
    signature: 'ResponsiveBlastWaveL<COLOR,SIZE,WAVE_SPEED>',
    description: 'Responsive blast with an expanding wave.',
    defaultArgs: ['White', 'Int<2000>', 'Int<400>'],
  },
  {
    name: 'LockupTrL',
    category: 'effects',
    signature: 'LockupTrL<COLOR,TR_BEGIN,TR_END,LOCKUP_TYPE>',
    description: 'Lockup effect layer with custom begin/end transitions.',
    defaultArgs: ['White', 'TrInstant', 'TrFade<400>', 'SaberBase::LOCKUP_NORMAL'],
  },
  {
    name: 'ResponsiveLockupL',
    category: 'effects',
    signature: 'ResponsiveLockupL<COLOR,TR_IN,TR_OUT,CENTER,SIZE>',
    description: 'Responsive lockup with adjustable center and size.',
    defaultArgs: ['White', 'TrInstant', 'TrFade<400>', 'Int<26000>', 'Int<10000>'],
  },
  {
    name: 'ResponsiveStabL',
    category: 'effects',
    signature: 'ResponsiveStabL<COLOR,TR_IN,TR_OUT,SIZE>',
    description: 'Responsive stab effect at the blade tip.',
    defaultArgs: ['White', 'TrInstant', 'TrFade<300>', 'Int<14000>'],
  },
  {
    name: 'ResponsiveDragL',
    category: 'effects',
    signature: 'ResponsiveDragL<COLOR,TR_IN,TR_OUT,SIZE>',
    description: 'Responsive drag effect (blade tip on ground).',
    defaultArgs: ['White', 'TrInstant', 'TrFade<500>', 'Int<28000>'],
  },
  {
    name: 'ResponsiveLightningBlockL',
    category: 'effects',
    signature: 'ResponsiveLightningBlockL<COLOR,TR_IN,TR_OUT>',
    description: 'Lightning block effect with electrical flashes.',
    defaultArgs: ['White', 'TrInstant', 'TrFade<300>'],
  },
  {
    name: 'ResponsiveMeltL',
    category: 'effects',
    signature: 'ResponsiveMeltL<COLOR,TR_IN,TR_OUT,SIZE>',
    description: 'Melt effect for cutting through objects.',
    defaultArgs: ['Rgb<255,80,0>', 'TrInstant', 'TrFade<500>', 'Int<26000>'],
  },
  {
    name: 'TransitionEffectL',
    category: 'effects',
    signature: 'TransitionEffectL<TR,EFFECT>',
    description: 'Play a transition on an effect event trigger.',
    defaultArgs: ['TrConcat<TrFade<200>,White,TrFade<400>>', 'EFFECT_CLASH'],
  },
  {
    name: 'MultiTransitionEffectL',
    category: 'effects',
    signature: 'MultiTransitionEffectL<TR,EFFECT>',
    description: 'Overlapping transition effects (multiple simultaneous).',
    defaultArgs: ['TrConcat<TrFade<200>,White,TrFade<400>>', 'EFFECT_BLAST'],
  },
  {
    name: 'EffectSequence',
    category: 'effects',
    signature: 'EffectSequence<EFFECT,STYLE1,STYLE2,...>',
    description: 'Cycle through different styles on each effect trigger.',
    defaultArgs: ['EFFECT_CLASH', 'White', 'Yellow', 'Cyan'],
  },
];

const WRAPPER_ENTRIES: TemplateCatalogEntry[] = [
  {
    name: 'InOutTrL',
    category: 'wrappers',
    signature: 'InOutTrL<STYLE,IGNITION_TR,RETRACTION_TR>',
    description: 'Wrap a style with ignition and retraction transitions.',
    defaultArgs: ['Layers<Red,SimpleClashL<White>>', 'TrWipe<300>', 'TrWipeIn<500>'],
  },
  {
    name: 'InOutHelperL',
    category: 'wrappers',
    signature: 'InOutHelperL<STYLE,IGNITION_TR,RETRACTION_TR>',
    description: 'Helper wrapper for ignition/retraction with off state.',
    defaultArgs: ['Layers<Red,SimpleClashL<White>>', 'TrWipe<300>', 'TrWipeIn<500>'],
  },
  {
    name: 'InOutSparkTipL',
    category: 'wrappers',
    signature: 'InOutSparkTipL<STYLE,IGNITION_MS,RETRACTION_MS>',
    description: 'Ignition/retraction with a spark at the extending tip.',
    defaultArgs: ['Layers<Red,SimpleClashL<White>>', '300', '500'],
  },
  {
    name: 'StyleNormalPtr',
    category: 'wrappers',
    signature: 'StyleNormalPtr<BASE,CLASH,IGNITION_MS,RETRACTION_MS>',
    description: 'Standard style pointer with base + clash + timing.',
    defaultArgs: ['Red', 'White', '300', '500'],
  },
  {
    name: 'StylePtr',
    category: 'wrappers',
    signature: 'StylePtr<STYLE>',
    description: 'Style pointer wrapper for raw style definitions.',
    defaultArgs: ['InOutTrL<Layers<Red,SimpleClashL<White>>,TrWipe<300>,TrWipeIn<500>>'],
  },
  {
    name: 'StyleFirePtr',
    category: 'wrappers',
    signature: 'StyleFirePtr<COLOR1,COLOR2>',
    description: 'Pre-built fire style pointer.',
    defaultArgs: ['Red', 'Rgb<255,80,0>'],
  },
  {
    name: 'StyleRainbowPtr',
    category: 'wrappers',
    signature: 'StyleRainbowPtr<>',
    description: 'Pre-built rainbow cycling style pointer.',
    defaultArgs: [],
  },
  {
    name: 'StyleStrobePtr',
    category: 'wrappers',
    signature: 'StyleStrobePtr<COLOR1,COLOR2,FREQ,DURATION>',
    description: 'Pre-built strobe style pointer.',
    defaultArgs: ['White', 'Black', '15', '1'],
  },
  {
    name: 'TransitionLoop',
    category: 'wrappers',
    signature: 'TransitionLoop<COLOR,TR>',
    description: 'Continuously loop a transition effect.',
    defaultArgs: ['White', 'TrFade<1000>'],
  },
  {
    name: 'TransitionLoopL',
    category: 'wrappers',
    signature: 'TransitionLoopL<TR>',
    description: 'Transition loop as a layer.',
    defaultArgs: ['TrFade<1000>'],
  },
  {
    name: 'SequenceL',
    category: 'wrappers',
    signature: 'SequenceL<STYLE1,STYLE2,...>',
    description: 'Cycle through multiple styles in sequence.',
    defaultArgs: ['Red', 'Green', 'Blue'],
  },
  {
    name: 'TransitionPulse',
    category: 'wrappers',
    signature: 'TransitionPulse<COLOR,TR>',
    description: 'Pulsing effect driven by a looping transition.',
    defaultArgs: ['White', 'TrFade<500>'],
  },
  {
    name: 'DimBlade',
    category: 'wrappers',
    signature: 'DimBlade<PERCENTAGE>',
    description: 'Dim the entire blade to a percentage of brightness.',
    defaultArgs: ['50'],
  },
  {
    name: 'EffectPulse',
    category: 'wrappers',
    signature: 'EffectPulse<COLOR,EFFECT>',
    description: 'Brief color pulse on an effect trigger.',
    defaultArgs: ['White', 'EFFECT_CLASH'],
  },
  {
    name: 'InOutFunc',
    category: 'wrappers',
    signature: 'InOutFunc<ON_F,OFF_F>',
    description: 'Control ignition/retraction with function-driven masks.',
    defaultArgs: ['Int<32768>', 'Int<0>'],
  },
];

// ---------------------------------------------------------------------------
// Assembled catalog
// ---------------------------------------------------------------------------

export const TEMPLATE_CATALOG: Record<TemplateCatalogCategory, TemplateCatalogEntry[]> = {
  colors: COLOR_ENTRIES,
  styles: STYLE_ENTRIES,
  functions: FUNCTION_ENTRIES,
  transitions: TRANSITION_ENTRIES,
  effects: EFFECT_ENTRIES,
  wrappers: WRAPPER_ENTRIES,
};

// ---------------------------------------------------------------------------
// Example styles
// ---------------------------------------------------------------------------

export const TEMPLATE_EXAMPLES: TemplateExample[] = [
  {
    name: 'Basic Solid',
    description: 'Simple solid color blade with a white clash effect.',
    templateString: 'Layers<Red,SimpleClashL<White>>',
  },
  {
    name: 'Audio Flicker',
    description: 'Audio-reactive flickering between bright and dim red.',
    templateString: 'Layers<AudioFlicker<Red,Rgb<128,0,0>>,SimpleClashL<White>>',
  },
  {
    name: 'Fire Blade',
    description: 'Animated fire effect using red and orange.',
    templateString: 'StyleFire<Red,Rgb<255,80,0>,0,3>',
  },
  {
    name: 'Rainbow',
    description: 'Full rainbow spectrum cycling across the blade.',
    templateString: 'Layers<Rainbow,SimpleClashL<White>>',
  },
  {
    name: 'Pulsing',
    description: 'Smooth pulsing between bright and dim red over 2 seconds.',
    templateString: 'Layers<Pulsing<Red,Rgb<80,0,0>,2000>,SimpleClashL<White>>',
  },
  {
    name: 'Stripes',
    description: 'Scrolling red stripes of varying intensity.',
    templateString:
      'Layers<Stripes<3000,-1000,Red,Rgb<128,0,0>,Rgb<60,0,0>,Rgb<200,0,0>>,SimpleClashL<White>>',
  },
  {
    name: 'Responsive Clash',
    description: 'Localized clash flash at the point of impact.',
    templateString:
      'Layers<Red,ResponsiveClashL<White,TrInstant,TrFade<200>,Int<26000>>>',
  },
  {
    name: 'Lockup',
    description: 'Full lockup effect with custom transitions.',
    templateString:
      'Layers<Red,LockupTrL<White,TrInstant,TrFade<400>,SaberBase::LOCKUP_NORMAL>>',
  },
  {
    name: 'Blast',
    description: 'Blaster deflection flash with fadeout.',
    templateString: 'Layers<Red,BlastL<White,200,250>>',
  },
  {
    name: 'Color Change',
    description: 'Cycle through six colors on aux button press.',
    templateString: 'ColorChange<TrInstant,Red,Green,Blue,Yellow,Cyan,Magenta>',
  },
  {
    name: 'Gradient',
    description: 'Smooth red-to-blue gradient along the blade.',
    templateString: 'Layers<Gradient<Red,Blue>,SimpleClashL<White>>',
  },
  {
    name: 'Responsive Styles',
    description: 'Color mix driven by swing speed for reactive blade.',
    templateString:
      'Layers<Mix<Scale<SwingSpeed<400>,Int<0>,Int<32768>>,Red,Blue>,SimpleClashL<White>>',
  },
  {
    name: 'Full Style',
    description: 'Complete style with audio flicker, clash, blast, and wipe transitions.',
    templateString:
      'InOutTrL<Layers<AudioFlicker<Red,Rgb<128,0,0>>,SimpleClashL<White>,BlastL<White>>,TrWipe<300>,TrWipeIn<500>>',
  },
];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Flat array of every catalog entry across all categories. */
export function getAllCatalogEntries(): TemplateCatalogEntry[] {
  return CATEGORY_ORDER.flatMap((cat) => TEMPLATE_CATALOG[cat]);
}

/**
 * Case-insensitive search across template name and description.
 * Returns entries whose name or description contains the query substring.
 */
export function searchCatalog(query: string): TemplateCatalogEntry[] {
  if (!query) return getAllCatalogEntries();
  const lc = query.toLowerCase();
  return getAllCatalogEntries().filter(
    (entry) =>
      entry.name.toLowerCase().includes(lc) ||
      entry.description.toLowerCase().includes(lc),
  );
}

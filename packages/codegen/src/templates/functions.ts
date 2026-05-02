// ─── ProffieOS Function Template Definitions ───

import type { TemplateDefinition } from '../types.js';

export const functionTemplates: Map<string, TemplateDefinition> = new Map([
  [
    'Int',
    {
      name: 'Int',
      argTypes: ['INTEGER'],
      description: 'Constant integer value (used in template arguments)',
    },
  ],
  [
    'IntArg',
    {
      name: 'IntArg',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Argument-switchable integer with index and default value (Edit Mode)',
    },
  ],
  [
    'Scale',
    {
      name: 'Scale',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Scale a function output to a min-max range',
    },
  ],
  [
    'Sin',
    {
      name: 'Sin',
      argTypes: ['INTEGER'],
      description: 'Sine wave with period parameter',
    },
  ],
  [
    'Bump',
    {
      name: 'Bump',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: 'Bump (gaussian) function at position with width',
    },
  ],
  [
    'SmoothStep',
    {
      name: 'SmoothStep',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Smooth step from low to high threshold',
    },
  ],
  [
    'LinearSectionF',
    {
      name: 'LinearSectionF',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Linear ramp between two thresholds (low x, low y, high x, high y)',
    },
  ],
  [
    'SliceF',
    {
      name: 'SliceF',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Slice a function output to the [lo, hi] range',
    },
  ],
  [
    'ModF',
    {
      name: 'ModF',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: 'Modulo a function output by an integer',
    },
  ],
  [
    'ClampF',
    {
      name: 'ClampF',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Clamp function output to [lo, hi]',
    },
  ],
  [
    'HoldPeakF',
    {
      name: 'HoldPeakF',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Sample-and-hold peak detector with attack and release',
    },
  ],
  [
    'ThresholdPulseF',
    {
      name: 'ThresholdPulseF',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Emit a pulse when a function crosses a threshold',
    },
  ],
  [
    'LockupPulseF',
    {
      name: 'LockupPulseF',
      argTypes: ['FUNCTION'],
      description: 'Pulse pattern function for lockup effects',
    },
  ],
  [
    'ChangeSlowly',
    {
      name: 'ChangeSlowly',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: 'Smooth a function with a per-tick rate limit',
    },
  ],
  [
    'IsLessThan',
    {
      name: 'IsLessThan',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: 'Returns 32768 when function < threshold, 0 otherwise (boolean predicate)',
    },
  ],
  [
    'IsGreaterThan',
    {
      name: 'IsGreaterThan',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: 'Returns 32768 when function > threshold, 0 otherwise (boolean predicate)',
    },
  ],
  [
    'Sum',
    {
      name: 'Sum',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Add two function outputs (variadic)',
    },
  ],
  [
    'Mult',
    {
      name: 'Mult',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Multiply two function outputs (variadic)',
    },
  ],
  [
    'Ifon',
    {
      name: 'Ifon',
      argTypes: ['INTEGER', 'INTEGER'],
      description: '"If blade is on" branch: returns first arg when on, second when off',
    },
  ],
  [
    'InOutFunc',
    {
      name: 'InOutFunc',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Older in/out helper as a function (returns 0..32768 mask)',
    },
  ],
  [
    'IncrementModuloF',
    {
      name: 'IncrementModuloF',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Incrementing counter with modulo wrap and trigger',
    },
  ],
  [
    'IncrementWithReset',
    {
      name: 'IncrementWithReset',
      argTypes: ['EFFECT', 'INTEGER', 'INTEGER'],
      description: 'Counter that increments on EFFECT and resets on a second EFFECT',
    },
  ],
  [
    'EffectIncrementF',
    {
      name: 'EffectIncrementF',
      argTypes: ['EFFECT', 'INTEGER', 'INTEGER'],
      description: 'Counter that increments each time EFFECT fires (modulo limit)',
    },
  ],
  [
    'EffectPosition',
    {
      name: 'EffectPosition',
      argTypes: [],
      description: 'Returns the blade position of the last effect (used as Bump<> centre); takes optional EFFECT arg.',
    },
  ],
  [
    'TimeSinceEffect',
    {
      name: 'TimeSinceEffect',
      argTypes: ['EFFECT'],
      description: 'Milliseconds since the last instance of EFFECT',
    },
  ],
  [
    'EffectRandomF',
    {
      name: 'EffectRandomF',
      argTypes: ['EFFECT'],
      description: 'Random value sampled per EFFECT firing (deterministic per event)',
    },
  ],
  [
    'Trigger',
    {
      name: 'Trigger',
      argTypes: ['EFFECT', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Effect-triggered envelope (attack, sustain, decay) for use inside TransitionPulseL etc.',
    },
  ],
  [
    'Variation',
    {
      name: 'Variation',
      argTypes: [],
      description: 'Color Change variation index. Used as the function input to ColorSelect / RotateColorsX in OS7 Color Change.',
    },
  ],
  [
    'AltF',
    {
      name: 'AltF',
      argTypes: [],
      description: 'Color Change alt-selector function (Fett263 OS7 Edit-Mode alt-color cursor)',
    },
  ],
  [
    'RampF',
    {
      name: 'RampF',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Linear ramp function between two values over a period (used in modulation envelopes)',
    },
  ],
  [
    'SwingSpeed',
    {
      name: 'SwingSpeed',
      argTypes: ['INTEGER'],
      description: 'Returns swing speed with threshold parameter',
    },
  ],
  [
    'SwingAcceleration',
    {
      name: 'SwingAcceleration',
      argTypes: ['INTEGER'],
      description: 'Returns swing acceleration with threshold parameter',
    },
  ],
  [
    'NoisySoundLevel',
    {
      name: 'NoisySoundLevel',
      argTypes: [],
      description: 'Returns current audio level (noisy, unsmoothed)',
    },
  ],
  [
    'SoundLevel',
    {
      name: 'SoundLevel',
      argTypes: [],
      description: 'Returns current audio level (smoothed)',
    },
  ],
  [
    'BatteryLevel',
    {
      name: 'BatteryLevel',
      argTypes: [],
      description: 'Returns current battery voltage level',
    },
  ],
  [
    'BladeAngle',
    {
      name: 'BladeAngle',
      argTypes: [],
      description: 'Returns blade angle relative to gravity (zero-arg or two-arg with min/max)',
    },
  ],
  [
    'TwistAngle',
    {
      name: 'TwistAngle',
      argTypes: [],
      description: 'Returns twist angle of the hilt',
    },
  ],
  [
    'CenterDistF',
    {
      name: 'CenterDistF',
      argTypes: [],
      description: 'Distance from blade center (used to position center-anchored effects)',
    },
  ],
  [
    'ClashImpactF',
    {
      name: 'ClashImpactF',
      argTypes: [],
      description: 'Clash impact magnitude as a function output',
    },
  ],
  [
    'ClashImpactFX',
    {
      name: 'ClashImpactFX',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Clash impact magnitude scaled by function inputs',
    },
  ],
  [
    'SlowNoise',
    {
      name: 'SlowNoise',
      argTypes: ['INTEGER'],
      description: 'Slow random noise function with period parameter',
    },
  ],
  [
    'RandomF',
    {
      name: 'RandomF',
      argTypes: [],
      description: 'Random value (sampled each frame)',
    },
  ],
  [
    'RandomPerLEDF',
    {
      name: 'RandomPerLEDF',
      argTypes: [],
      description: 'Per-LED random function (used in Mix sources for grit)',
    },
  ],
  [
    'HumpFlickerFX',
    {
      name: 'HumpFlickerFX',
      argTypes: ['FUNCTION'],
      description: 'HumpFlicker as a function (vs color)',
    },
  ],
  [
    'SparkleF',
    {
      name: 'SparkleF',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Sparkle as a function output',
    },
  ],
  [
    'StrobeF',
    {
      name: 'StrobeF',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Strobe as a function output',
    },
  ],
  [
    'IgnitionTime',
    {
      name: 'IgnitionTime',
      argTypes: ['INTEGER'],
      description: 'Ignition timing function (default duration in ms)',
    },
  ],
  [
    'RetractionTime',
    {
      name: 'RetractionTime',
      argTypes: ['INTEGER'],
      description: 'Retraction timing function (default duration in ms)',
    },
  ],
  [
    'BendTimePowInvX',
    {
      name: 'BendTimePowInvX',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Inverse-power time-bending function used to shape ignition/retraction curves',
    },
  ],
  [
    'WavLen',
    {
      // Per functions/wavlen.h: WavLen<> or WavLen<EFFECT>. Both valid.
      // Registered as 1-arg; 0-arg call also OK via parser-side suppression.
      name: 'WavLen',
      argTypes: ['EFFECT'],
      description: 'Length in milliseconds of the wav file associated with EFFECT (or last-detected effect when no arg)',
    },
  ],
  // ── Math primitives (functions/subtract.h, divide.h, mod.h) ──
  [
    'Subtract',
    {
      name: 'Subtract',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Subtract second function from first (A - B)',
    },
  ],
  [
    'Divide',
    {
      name: 'Divide',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Divide F by V (returns 0 when V=0); not the inverse of Mult since Mult uses fixed-point math',
    },
  ],
  [
    'IsBetween',
    {
      // Per functions/isbetween.h: IsBetween<F, BOTTOM, TOP>.
      // Returns 32768 when F > BOTTOM and < TOP, else 0.
      name: 'IsBetween',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Returns 32768 when F > BOTTOM and < TOP, else 0 (boolean predicate)',
    },
  ],
  [
    'Percentage',
    {
      // Per functions/mult.h: Percentage<F, V> — multiply F by V/100.
      name: 'Percentage',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: 'Multiply F by a percentage V (e.g. Percentage<F, 50> halves the value)',
    },
  ],
  // ── IntSelect / IntSelectX (variadic select-by-index) ──
  [
    'IntSelect',
    {
      // Per functions/int_select.h: IntSelect<SELECTION, Int1, Int2...>.
      // Variadic on integer args; declared in VARIADIC_TEMPLATES.
      name: 'IntSelect',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Select one of N integers based on a selection function (variadic)',
    },
  ],
  [
    'IntSelectX',
    {
      // Per functions/int_select.h: IntSelectX<SELECTION, F1, F2, ...>.
      name: 'IntSelectX',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Select one of N functions based on a selection function (variadic)',
    },
  ],
  // ── Effect-pulse + Layer-functions wrappers ──
  [
    'EffectPulse',
    {
      // Per functions/effect_increment.h: EffectPulse<EFFECT>.
      // Returns 32768 ONCE per EFFECT firing.
      name: 'EffectPulse',
      argTypes: ['EFFECT'],
      description: 'Returns 32768 once each time EFFECT fires (use as PULSE arg in IncrementModulo etc.)',
    },
  ],
  [
    'EffectPulseF',
    {
      // Internal SVF-style alias for EffectPulse — both forms appear in code.
      name: 'EffectPulseF',
      argTypes: ['EFFECT'],
      description: 'EffectPulse alias (SVF-style suffix)',
    },
  ],
  [
    'LayerFunctions',
    {
      // Per functions/layer_functions.h: LayerFunctions<F1, F2, ...> — variadic.
      name: 'LayerFunctions',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Composite multiple alpha functions (variadic; each layered on top)',
    },
  ],
  // ── Sound / blaster / haptic functions ──
  [
    'SmoothSoundLevel',
    {
      // Per functions/sound_level.h: SmoothSoundLevel.
      name: 'SmoothSoundLevel',
      argTypes: [],
      description: 'Returns smoothed audio level',
    },
  ],
  [
    'NoisySoundLevelCompat',
    {
      // Per functions/sound_level.h: NoisySoundLevelCompat — pre-OS6 compat shim.
      name: 'NoisySoundLevelCompat',
      argTypes: [],
      description: 'Pre-OS6 compatibility audio level (drops some smoothing)',
    },
  ],
  [
    'VolumeLevel',
    {
      // Per functions/volume_level.h: VolumeLevel.
      name: 'VolumeLevel',
      argTypes: [],
      description: 'Returns the current global volume setting',
    },
  ],
  [
    'WavNum',
    {
      // Per functions/wavnum.h: WavNum<>.
      name: 'WavNum',
      argTypes: [],
      description: 'Returns the index of the most-recently-played wav file',
    },
  ],
  [
    'BlasterModeF',
    {
      // Per functions/blaster_mode.h: BlasterModeF.
      name: 'BlasterModeF',
      argTypes: [],
      description: 'Current blaster mode (Auto/Stun/Kill/etc) for blaster props',
    },
  ],
  [
    'BlasterCharge',
    {
      // Per functions/bullet_count.h: BlasterCharge.
      name: 'BlasterCharge',
      argTypes: [],
      description: 'Returns 0..32768 charge level for a blaster prop',
    },
  ],
  [
    'BulletCount',
    {
      // Per functions/bullet_count.h: BulletCount.
      name: 'BulletCount',
      argTypes: [],
      description: 'Returns the current bullet count for a blaster prop',
    },
  ],
  // ── BladeAngle expansion (X variant + 0/2-arg shim) ──
  [
    'BladeAngleX',
    {
      // Per functions/blade_angle.h: BladeAngleX<MIN, MAX>.
      name: 'BladeAngleX',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Blade-angle function with min/max integer thresholds',
    },
  ],
  [
    'TwistAcceleration',
    {
      // Per functions/twist_angle.h: TwistAcceleration<MAX>.
      name: 'TwistAcceleration',
      argTypes: ['INTEGER'],
      description: 'Twist-acceleration with max threshold',
    },
  ],
  // ── Marble + circular section + brown noise ──
  [
    'MarbleF',
    {
      // Per functions/marble.h: MarbleF<OFFSET, FRICTION, ACCELERATION, GRAVITY>.
      name: 'MarbleF',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Simulates a marble in a circular track (offset, friction, acceleration, gravity)',
    },
  ],
  [
    'CircularSectionF',
    {
      // Per functions/circular_section.h: CircularSectionF<POSITION, FRACTION>.
      name: 'CircularSectionF',
      argTypes: ['FUNCTION', 'FUNCTION'],
      description: 'Returns 32768 for LEDs near POSITION, 0 elsewhere; FRACTION controls width',
    },
  ],
  [
    'BrownNoiseF',
    {
      // Per functions/brown_noise.h: BrownNoiseF<GRADE>.
      name: 'BrownNoiseF',
      argTypes: ['INTEGER'],
      description: 'Brown noise function with grade parameter',
    },
  ],
  // ── Effect blast / blast-fade / original-blast as functions ──
  [
    'BlastF',
    {
      // Per functions/blast.h: BlastF<FADEOUT_MS, WAVE_SIZE, WAVE_MS, EFFECT>.
      name: 'BlastF',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER', 'EFFECT'],
      description: 'Blast wave function (fadeout, wave size, wave speed, effect type)',
    },
  ],
  [
    'BlastFadeoutF',
    {
      // Per functions/blast.h: BlastFadeoutF<FADEOUT_MS, EFFECT>.
      name: 'BlastFadeoutF',
      argTypes: ['INTEGER', 'EFFECT'],
      description: 'Blast that just fades, no wave (fadeout ms, effect type)',
    },
  ],
  [
    'OriginalBlastF',
    {
      // Per functions/blast.h: OriginalBlastF<EFFECT>.
      name: 'OriginalBlastF',
      argTypes: ['EFFECT'],
      description: 'Original (very early) blast function form',
    },
  ],
  // ── Pin reading + on-spark ──
  [
    'OnsparkF',
    {
      // Per functions/on_spark.h: OnsparkF<MILLIS>.
      name: 'OnsparkF',
      argTypes: ['INTEGER'],
      description: 'On-ignition spark function (duration ms); used by OnSparkL/OnSpark',
    },
  ],
  [
    'ReadPinF',
    {
      // Per functions/readpin.h: ReadPinF<PIN>.
      name: 'ReadPinF',
      argTypes: ['INTEGER'],
      description: 'Read a digital input pin (returns 32768 high, 0 low)',
    },
  ],
  [
    'AnalogReadPinF',
    {
      // Per functions/readpin.h: AnalogReadPinF<PIN>.
      name: 'AnalogReadPinF',
      argTypes: ['INTEGER'],
      description: 'Read an analog input pin (0..32768)',
    },
  ],
  // ── Blinking / random-blink / strobe / sparkle as functions ──
  [
    'BlinkingF',
    {
      // Per functions/blinking.h: BlinkingF<A, B, BLINK_MILLIS_FUNC, BLINK_PROMILLE_FUNC>.
      // Note: A and B are functions returning 0..32768 (used as alpha-mask sources).
      name: 'BlinkingF',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Blinking function source (period + duty as functions)',
    },
  ],
  [
    'RandomBlinkF',
    {
      // Per functions/random_blink.h: RandomBlinkF<MILLIHZ>.
      name: 'RandomBlinkF',
      argTypes: ['INTEGER'],
      description: 'Random blink function with frequency in milli-hertz',
    },
  ],
  // ── IncrementF + IncrementModulo (function-form siblings) ──
  [
    'IncrementF',
    {
      // Per functions/increment.h.
      name: 'IncrementF',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Function-form counter incremented by INCREMENT each PULSE, capped by MAX',
    },
  ],
  [
    'IncrementModulo',
    {
      // Per functions/increment.h: IncrementModulo<PULSE, MAX, INCREMENT>.
      // Already had IncrementModuloF (deprecated SVF-style alias) — registering modern name.
      name: 'IncrementModulo',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Counter that wraps modulo MAX, increments by INCREMENT on each PULSE',
    },
  ],
]);

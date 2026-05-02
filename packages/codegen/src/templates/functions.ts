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
      name: 'WavLen',
      argTypes: ['EFFECT'],
      description: 'Length in milliseconds of the wav file associated with EFFECT',
    },
  ],
]);

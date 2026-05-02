// ─── ProffieOS Transition Template Definitions ───

import type { TemplateDefinition } from '../types.js';

export const transitionTemplates: Map<string, TemplateDefinition> = new Map([
  [
    'TrInstant',
    {
      name: 'TrInstant',
      argTypes: [],
      description: 'Instant transition (no animation)',
    },
  ],
  [
    'TrFade',
    {
      name: 'TrFade',
      argTypes: ['INTEGER'],
      description: 'Fade transition over N milliseconds',
    },
  ],
  [
    'TrFadeX',
    {
      name: 'TrFadeX',
      argTypes: ['FUNCTION'],
      description: 'Fade transition with duration from a function (vs constant ms)',
    },
  ],
  [
    'TrSmoothFade',
    {
      name: 'TrSmoothFade',
      argTypes: ['INTEGER'],
      description: 'Smooth (ease-in/out) fade transition over N milliseconds',
    },
  ],
  [
    'TrSmoothFadeX',
    {
      name: 'TrSmoothFadeX',
      argTypes: ['FUNCTION'],
      description: 'Smooth fade with duration from a function',
    },
  ],
  [
    'TrWipe',
    {
      name: 'TrWipe',
      argTypes: ['INTEGER'],
      description: 'Wipe transition (hilt-to-tip) over N milliseconds',
    },
  ],
  [
    'TrWipeX',
    {
      name: 'TrWipeX',
      argTypes: ['FUNCTION'],
      description: 'Wipe transition with duration from a function',
    },
  ],
  [
    'TrWipeIn',
    {
      name: 'TrWipeIn',
      argTypes: ['INTEGER'],
      description: 'Wipe-in transition (tip-to-hilt) over N milliseconds',
    },
  ],
  [
    'TrWipeInX',
    {
      name: 'TrWipeInX',
      argTypes: ['FUNCTION'],
      description: 'Wipe-in transition with duration from a function',
    },
  ],
  [
    'TrCenterWipeIn',
    {
      name: 'TrCenterWipeIn',
      argTypes: ['INTEGER'],
      description: 'Center-outward wipe transition over N milliseconds',
    },
  ],
  [
    'TrCenterWipeInX',
    {
      name: 'TrCenterWipeInX',
      argTypes: ['FUNCTION'],
      description: 'Center-outward wipe with duration from a function',
    },
  ],
  [
    'TrCenterWipeX',
    {
      name: 'TrCenterWipeX',
      argTypes: ['FUNCTION'],
      description: 'Center wipe with duration from a function',
    },
  ],
  [
    'TrDelay',
    {
      name: 'TrDelay',
      argTypes: ['INTEGER'],
      description: 'Delay (hold current state) for N milliseconds',
    },
  ],
  [
    'TrDelayX',
    {
      name: 'TrDelayX',
      argTypes: ['FUNCTION'],
      description: 'Delay with duration from a function',
    },
  ],
  [
    'TrConcat',
    {
      name: 'TrConcat',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Concatenate transitions in sequence; intermediate COLOR args are allowed between transitions per the OS7 dialect (variadic).',
    },
  ],
  [
    'TrJoin',
    {
      name: 'TrJoin',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Run two transitions in parallel (variadic; OS7 supports more than 2)',
    },
  ],
  [
    'TrJoinR',
    {
      name: 'TrJoinR',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'TrJoin reversed for the retraction phase (variadic)',
    },
  ],
  [
    'TrLoop',
    {
      name: 'TrLoop',
      argTypes: ['TRANSITION'],
      description: 'Loop a transition continuously',
    },
  ],
  [
    'TrLoopN',
    {
      name: 'TrLoopN',
      argTypes: ['INTEGER', 'TRANSITION'],
      description: 'Loop a transition N times',
    },
  ],
  [
    'TrLoopNX',
    {
      name: 'TrLoopNX',
      argTypes: ['FUNCTION', 'TRANSITION'],
      description: 'Loop a transition N times where N comes from a function',
    },
  ],
  [
    'TrLoopUntil',
    {
      name: 'TrLoopUntil',
      argTypes: ['FUNCTION', 'TRANSITION', 'TRANSITION'],
      description: 'Loop a transition until a function condition; second transition runs once the condition is met',
    },
  ],
  [
    'TrColorCycle',
    {
      name: 'TrColorCycle',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Hue-cycling transition (period, low brightness, high brightness)',
    },
  ],
  [
    'TrColorCycleX',
    {
      name: 'TrColorCycleX',
      argTypes: ['FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Hue-cycling transition with parameters driven by functions',
    },
  ],
  [
    'TrWaveX',
    {
      name: 'TrWaveX',
      argTypes: ['COLOR', 'FUNCTION', 'FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Wave-shaped transition with function-driven parameters',
    },
  ],
  [
    'TrSparkX',
    {
      name: 'TrSparkX',
      argTypes: ['COLOR', 'FUNCTION', 'FUNCTION', 'FUNCTION'],
      description: 'Spark transition with function-driven parameters',
    },
  ],
  [
    'TrWipeSparkTip',
    {
      name: 'TrWipeSparkTip',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Wipe with spark effect at the tip (color + duration)',
    },
  ],
  [
    'TrWipeSparkTipX',
    {
      name: 'TrWipeSparkTipX',
      argTypes: ['COLOR', 'FUNCTION'],
      description: 'Wipe with tip spark, duration from a function',
    },
  ],
  [
    'TrWipeInSparkTip',
    {
      name: 'TrWipeInSparkTip',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Wipe-in with spark effect at the tip',
    },
  ],
  [
    'TrSelect',
    {
      // Variadic: a function returning 0..N-1 selects between N transitions.
      // Fett263 commonly uses 2- and 3-way; OS7 allows more.
      name: 'TrSelect',
      argTypes: ['FUNCTION', 'TRANSITION', 'TRANSITION'],
      description:
        'Select between N transitions based on a function value (variadic). Fett263 dual-mode ignition/retraction.',
    },
  ],
  [
    'TrRandom',
    {
      name: 'TrRandom',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Pick a random transition from the supplied list (variadic)',
    },
  ],
  [
    'TrSequence',
    {
      name: 'TrSequence',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Cycle the supplied transitions in order (variadic)',
    },
  ],
  [
    'TrBlinkX',
    {
      name: 'TrBlinkX',
      argTypes: ['FUNCTION', 'FUNCTION', 'COLOR'],
      description: 'Blink transition (frequency function, duty function, color)',
    },
  ],
  [
    'TrBoing',
    {
      name: 'TrBoing',
      argTypes: ['INTEGER', 'INTEGER'],
      description: '"Boing" overshoot transition (duration, bounces)',
    },
  ],
  [
    'TrBoingX',
    {
      name: 'TrBoingX',
      argTypes: ['FUNCTION', 'INTEGER'],
      description: '"Boing" transition with duration from a function',
    },
  ],
  [
    'TrExtend',
    {
      name: 'TrExtend',
      argTypes: ['INTEGER', 'TRANSITION'],
      description: 'Extend a transition by N ms (holds the end state at full)',
    },
  ],
  [
    'TrExtendX',
    {
      name: 'TrExtendX',
      argTypes: ['FUNCTION', 'TRANSITION'],
      description: 'Extend a transition by a duration from a function',
    },
  ],
  [
    'TrDoEffect',
    {
      name: 'TrDoEffect',
      argTypes: ['TRANSITION', 'EFFECT', 'INTEGER'],
      description: 'Trigger an effect mid-transition (transition, effect id, count)',
    },
  ],
  [
    'TrDoEffectX',
    {
      name: 'TrDoEffectX',
      argTypes: ['TRANSITION', 'EFFECT', 'FUNCTION'],
      description: 'Trigger an effect mid-transition with count from a function',
    },
  ],
  [
    'TrDoEffectAlwaysX',
    {
      name: 'TrDoEffectAlwaysX',
      argTypes: ['TRANSITION', 'EFFECT', 'FUNCTION'],
      description: 'Always trigger an effect mid-transition (overrides cooldown)',
    },
  ],
]);

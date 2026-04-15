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
    'TrWipe',
    {
      name: 'TrWipe',
      argTypes: ['INTEGER'],
      description: 'Wipe transition (hilt-to-tip) over N milliseconds',
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
    'TrCenterWipeIn',
    {
      name: 'TrCenterWipeIn',
      argTypes: ['INTEGER'],
      description: 'Center-outward wipe transition over N milliseconds',
    },
  ],
  [
    'TrSmoothFade',
    {
      name: 'TrSmoothFade',
      argTypes: ['INTEGER'],
      description: 'Smooth fade transition over N milliseconds',
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
    'TrConcat',
    {
      name: 'TrConcat',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Concatenate multiple transitions in sequence',
    },
  ],
  [
    'TrWipeSparkTip',
    {
      name: 'TrWipeSparkTip',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Wipe with spark effect at the tip, color + duration',
    },
  ],
]);

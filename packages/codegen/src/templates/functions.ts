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
    'Scale',
    {
      name: 'Scale',
      argTypes: ['FUNCTION', 'INTEGER', 'INTEGER'],
      description: 'Scale a function output to a min-max range',
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
    'NoisySoundLevel',
    {
      name: 'NoisySoundLevel',
      argTypes: [],
      description: 'Returns current audio level (noisy, unsmoothed)',
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
      description: 'Returns blade angle relative to gravity',
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
    'IntArg',
    {
      name: 'IntArg',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Argument-switchable integer with index and default value (for Edit Mode)',
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
]);

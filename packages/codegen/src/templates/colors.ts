// ─── ProffieOS Color Template Definitions ───

import type { TemplateDefinition } from '../types.js';

export const colorTemplates: Map<string, TemplateDefinition> = new Map([
  [
    'Rgb',
    {
      name: 'Rgb',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Solid RGB color (0-255 per channel)',
    },
  ],
  [
    'RgbArg',
    {
      name: 'RgbArg',
      argTypes: ['INTEGER', 'COLOR'],
      description: 'Argument-switchable RGB color with index and default',
    },
  ],
  [
    'Mix',
    {
      name: 'Mix',
      argTypes: ['FUNCTION', 'COLOR', 'COLOR'],
      description: 'Mix two colors by a function amount (0-32768)',
    },
  ],
  [
    'Gradient',
    {
      name: 'Gradient',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Gradient between two or more colors along blade',
    },
  ],
  [
    'AudioFlicker',
    {
      name: 'AudioFlicker',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Flicker between two colors driven by audio',
    },
  ],
  [
    'StyleFire',
    {
      name: 'StyleFire',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER'],
      description: 'Fire-style effect with two colors and intensity controls',
    },
  ],
  [
    'Pulsing',
    {
      name: 'Pulsing',
      argTypes: ['COLOR', 'COLOR', 'INTEGER'],
      description: 'Pulsing between two colors with period in ms',
    },
  ],
  [
    'Stripes',
    {
      name: 'Stripes',
      argTypes: ['INTEGER', 'INTEGER', 'COLOR', 'COLOR', 'COLOR'],
      description: 'Moving stripe pattern with width, speed, and 3+ colors',
    },
  ],
  [
    'HumpFlicker',
    {
      name: 'HumpFlicker',
      argTypes: ['COLOR', 'COLOR', 'INTEGER'],
      description: 'Smooth hump-shaped flicker between two colors',
    },
  ],
  [
    'Rainbow',
    {
      name: 'Rainbow',
      argTypes: [],
      description: 'Full rainbow cycle along the blade',
    },
  ],
  [
    'FireConfig',
    {
      name: 'FireConfig',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Configuration for StyleFire (intensity, delay, speed)',
    },
  ],
  [
    'RotateColorsX',
    {
      name: 'RotateColorsX',
      argTypes: ['FUNCTION', 'COLOR'],
      description: 'Rotate hue of a color by a function amount',
    },
  ],
]);

// Named color constants (no angle-bracket args)
export const namedColors: Map<string, TemplateDefinition> = new Map([
  ['Black', { name: 'Black', argTypes: [], description: 'Black (0,0,0)' }],
  ['White', { name: 'White', argTypes: [], description: 'White (255,255,255)' }],
  ['Red', { name: 'Red', argTypes: [], description: 'Red (255,0,0)' }],
  ['Green', { name: 'Green', argTypes: [], description: 'Green (0,255,0)' }],
  ['Blue', { name: 'Blue', argTypes: [], description: 'Blue (0,0,255)' }],
  ['Yellow', { name: 'Yellow', argTypes: [], description: 'Yellow (255,255,0)' }],
  ['Orange', { name: 'Orange', argTypes: [], description: 'Orange (255,165,0)' }],
  ['Cyan', { name: 'Cyan', argTypes: [], description: 'Cyan (0,255,255)' }],
  ['Magenta', { name: 'Magenta', argTypes: [], description: 'Magenta (255,0,255)' }],
  [
    'DeepSkyBlue',
    { name: 'DeepSkyBlue', argTypes: [], description: 'DeepSkyBlue (0,191,255)' },
  ],
  [
    'DodgerBlue',
    { name: 'DodgerBlue', argTypes: [], description: 'DodgerBlue (30,144,255)' },
  ],
]);

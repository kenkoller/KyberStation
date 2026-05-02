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
    'Rgb16',
    {
      name: 'Rgb16',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Solid 16-bit-per-channel RGB color (HDR; 0-65535 per channel)',
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
    'RgbCycle',
    {
      name: 'RgbCycle',
      argTypes: [],
      description: 'Full RGB color cycle (rotates through R, G, B over time)',
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
      description: 'Flicker between two colors driven by audio level',
    },
  ],
  [
    'BrownNoiseFlicker',
    {
      name: 'BrownNoiseFlicker',
      argTypes: ['COLOR', 'COLOR', 'INTEGER'],
      description: 'Brown-noise flicker between two colors with depth (0-255). Fett263 default for many "stable" presets.',
    },
  ],
  [
    'RandomFlicker',
    {
      name: 'RandomFlicker',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Uncorrelated random flicker between two colors',
    },
  ],
  [
    'RandomPerLEDFlicker',
    {
      name: 'RandomPerLEDFlicker',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Per-LED random flicker (gritty look used in fire/shock styles)',
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
    'StaticFire',
    {
      name: 'StaticFire',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Static fire variant with extended cooling/sparking parameters',
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
      description: 'Moving stripe pattern with width, speed, and 2+ colors (variadic)',
    },
  ],
  [
    'StripesX',
    {
      name: 'StripesX',
      argTypes: ['FUNCTION', 'FUNCTION', 'COLOR', 'COLOR'],
      description: 'Stripes with width and speed driven by functions (variadic colors)',
    },
  ],
  [
    'HardStripes',
    {
      name: 'HardStripes',
      argTypes: ['INTEGER', 'INTEGER', 'COLOR', 'COLOR'],
      description: 'Stripes with hard edges (no smoothing between colors); variadic',
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
      description: 'Rotate hue of a color by a function amount. With Variation<> as the function this is the OS7 Color Change adjuster.',
    },
  ],
  [
    'ColorChange',
    {
      name: 'ColorChange',
      argTypes: ['TRANSITION', 'COLOR', 'COLOR'],
      description: 'Color Change wheel: cycles through the supplied colors with the user-facing 12-step ratchet (variadic).',
    },
  ],
  [
    'ColorSelect',
    {
      name: 'ColorSelect',
      argTypes: ['FUNCTION', 'TRANSITION', 'COLOR', 'COLOR'],
      description: 'Function-driven color select (Variation, AltF, etc.); variadic colors after the transition.',
    },
  ],
  [
    'ColorSequence',
    {
      name: 'ColorSequence',
      argTypes: ['INTEGER', 'COLOR', 'COLOR'],
      description: 'Step through a sequence of colors at a fixed period (variadic colors)',
    },
  ],
  [
    'ColorCycle',
    {
      name: 'ColorCycle',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER', 'COLOR', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Cycle a color along the blade with on/off ratios and period',
    },
  ],
  [
    'Sparkle',
    {
      name: 'Sparkle',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER'],
      description: 'Glittering speckle effect between two colors with size + density',
    },
  ],
  [
    'Blinking',
    {
      name: 'Blinking',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER'],
      description: 'Blink between two colors at a fixed period (period, duty cycle)',
    },
  ],
  [
    'RandomBlink',
    {
      name: 'RandomBlink',
      argTypes: ['INTEGER', 'COLOR', 'COLOR'],
      description: 'Randomly blink each LED between two colors at a given probability',
    },
  ],
  [
    'Strobe',
    {
      name: 'Strobe',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER'],
      description: 'Strobe between two colors at a fixed Hz (frequency + on time)',
    },
  ],
  [
    'Cylon',
    {
      name: 'Cylon',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Cylon scanner sweep with width and speed',
    },
  ],
  [
    'PixelateX',
    {
      name: 'PixelateX',
      argTypes: ['FUNCTION', 'COLOR', 'COLOR'],
      description: 'Pixelated mosaic between two colors driven by a function',
    },
  ],
  [
    'Sequence',
    {
      name: 'Sequence',
      argTypes: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Step through frames in sequence (frame count, on time, off time, repeat)',
    },
  ],
]);

// Named color constants (no angle-bracket args)
// Sourced from ProffieOS color.h. ProffieOS accepts both PascalCase
// (`Red`) and uppercase macro forms (`RED`); the latter shows up in
// legacy Fredrik Style Editor exports and `EASYBLADE`-style configs.
export const namedColors: Map<string, TemplateDefinition> = new Map([
  // ── Core named colors (PascalCase) ──
  ['Black', { name: 'Black', argTypes: [], description: 'Black (0,0,0)' }],
  ['White', { name: 'White', argTypes: [], description: 'White (255,255,255)' }],
  ['Red', { name: 'Red', argTypes: [], description: 'Red (255,0,0)' }],
  ['Green', { name: 'Green', argTypes: [], description: 'Green (0,255,0)' }],
  ['Blue', { name: 'Blue', argTypes: [], description: 'Blue (0,0,255)' }],
  ['Yellow', { name: 'Yellow', argTypes: [], description: 'Yellow (255,255,0)' }],
  ['Orange', { name: 'Orange', argTypes: [], description: 'Orange (255,165,0)' }],
  ['Cyan', { name: 'Cyan', argTypes: [], description: 'Cyan (0,255,255)' }],
  ['Magenta', { name: 'Magenta', argTypes: [], description: 'Magenta (255,0,255)' }],
  ['Purple', { name: 'Purple', argTypes: [], description: 'Purple (128,0,128)' }],
  ['Pink', { name: 'Pink', argTypes: [], description: 'Pink (255,192,203)' }],
  ['Brown', { name: 'Brown', argTypes: [], description: 'Brown (165,42,42)' }],
  ['Gray', { name: 'Gray', argTypes: [], description: 'Gray (128,128,128)' }],
  ['Silver', { name: 'Silver', argTypes: [], description: 'Silver (192,192,192)' }],
  ['Gold', { name: 'Gold', argTypes: [], description: 'Gold (255,215,0)' }],
  ['Lime', { name: 'Lime', argTypes: [], description: 'Lime (0,255,0)' }],
  ['Maroon', { name: 'Maroon', argTypes: [], description: 'Maroon (128,0,0)' }],
  ['Navy', { name: 'Navy', argTypes: [], description: 'Navy (0,0,128)' }],
  ['Olive', { name: 'Olive', argTypes: [], description: 'Olive (128,128,0)' }],
  ['Teal', { name: 'Teal', argTypes: [], description: 'Teal (0,128,128)' }],
  ['Crimson', { name: 'Crimson', argTypes: [], description: 'Crimson (220,20,60)' }],
  ['Coral', { name: 'Coral', argTypes: [], description: 'Coral (255,127,80)' }],
  ['Salmon', { name: 'Salmon', argTypes: [], description: 'Salmon (250,128,114)' }],
  ['Tomato', { name: 'Tomato', argTypes: [], description: 'Tomato (255,99,71)' }],
  ['Violet', { name: 'Violet', argTypes: [], description: 'Violet (238,130,238)' }],
  ['Indigo', { name: 'Indigo', argTypes: [], description: 'Indigo (75,0,130)' }],
  ['Turquoise', { name: 'Turquoise', argTypes: [], description: 'Turquoise (64,224,208)' }],
  ['MossGreen', { name: 'MossGreen', argTypes: [], description: 'MossGreen (138,154,91)' }],
  ['PaleGreen', { name: 'PaleGreen', argTypes: [], description: 'PaleGreen (152,251,152)' }],
  ['ForestGreen', { name: 'ForestGreen', argTypes: [], description: 'ForestGreen (34,139,34)' }],
  ['LightSkyBlue', { name: 'LightSkyBlue', argTypes: [], description: 'LightSkyBlue (135,206,250)' }],
  [
    'DeepSkyBlue',
    { name: 'DeepSkyBlue', argTypes: [], description: 'DeepSkyBlue (0,191,255)' },
  ],
  [
    'DodgerBlue',
    { name: 'DodgerBlue', argTypes: [], description: 'DodgerBlue (30,144,255)' },
  ],
  ['RoyalBlue', { name: 'RoyalBlue', argTypes: [], description: 'RoyalBlue (65,105,225)' }],
  ['SteelBlue', { name: 'SteelBlue', argTypes: [], description: 'SteelBlue (70,130,180)' }],
  // ── ALL-CAPS macro aliases (legacy Fredrik Style Editor forms) ──
  ['BLACK', { name: 'BLACK', argTypes: [], description: 'BLACK macro alias for Black' }],
  ['WHITE', { name: 'WHITE', argTypes: [], description: 'WHITE macro alias for White' }],
  ['RED', { name: 'RED', argTypes: [], description: 'RED macro alias for Red' }],
  ['GREEN', { name: 'GREEN', argTypes: [], description: 'GREEN macro alias for Green' }],
  ['BLUE', { name: 'BLUE', argTypes: [], description: 'BLUE macro alias for Blue' }],
  ['YELLOW', { name: 'YELLOW', argTypes: [], description: 'YELLOW macro alias for Yellow' }],
  ['ORANGE', { name: 'ORANGE', argTypes: [], description: 'ORANGE macro alias for Orange' }],
  ['CYAN', { name: 'CYAN', argTypes: [], description: 'CYAN macro alias for Cyan' }],
  ['MAGENTA', { name: 'MAGENTA', argTypes: [], description: 'MAGENTA macro alias for Magenta' }],
  ['PURPLE', { name: 'PURPLE', argTypes: [], description: 'PURPLE macro alias for Purple' }],
  ['PINK', { name: 'PINK', argTypes: [], description: 'PINK macro alias for Pink' }],
]);

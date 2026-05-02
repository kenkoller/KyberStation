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
    'Pixelate',
    {
      name: 'Pixelate',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Pixelated mosaic between two colors with constant N (sister of PixelateX)',
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
  // ── ProffieOS sister-form aliases for the *L / *X family ─────────────
  // Many color templates ship in 3 forms: the layer-form (`XxxL<...>`),
  // the function-form-of-layer (`XxxX<...>`), and the constant-int form
  // (`Xxx<...>`). Fett263's OS7 generator emits each of them where the
  // user picks "function-driven" / "constant" parameter shapes.
  [
    'PulsingX',
    {
      name: 'PulsingX',
      argTypes: ['COLOR', 'COLOR', 'FUNCTION'],
      description: 'Pulsing between two colors with period from a function (vs constant ms)',
    },
  ],
  [
    'PulsingL',
    {
      name: 'PulsingL',
      argTypes: ['COLOR', 'FUNCTION'],
      description: 'Pulsing as overlay layer (color + period function)',
    },
  ],
  [
    'BlinkingX',
    {
      name: 'BlinkingX',
      argTypes: ['COLOR', 'COLOR', 'FUNCTION', 'FUNCTION'],
      description: 'Blink between two colors with period and duty driven by functions',
    },
  ],
  [
    'BlinkingL',
    {
      name: 'BlinkingL',
      argTypes: ['COLOR', 'FUNCTION', 'FUNCTION'],
      description: 'Blink as overlay layer (color + period function + duty function)',
    },
  ],
  [
    'RandomBlinkX',
    {
      name: 'RandomBlinkX',
      argTypes: ['FUNCTION', 'COLOR', 'COLOR'],
      description: 'Random blink between two colors at frequency from a function',
    },
  ],
  [
    'RandomBlinkL',
    {
      name: 'RandomBlinkL',
      argTypes: ['FUNCTION', 'COLOR'],
      description: 'Random blink as overlay layer (frequency function + color)',
    },
  ],
  [
    'StrobeX',
    {
      name: 'StrobeX',
      argTypes: ['COLOR', 'COLOR', 'FUNCTION', 'FUNCTION'],
      description: 'Strobe between two colors with frequency + on-time driven by functions',
    },
  ],
  [
    'StrobeL',
    {
      name: 'StrobeL',
      argTypes: ['COLOR', 'FUNCTION', 'FUNCTION'],
      description: 'Strobe as overlay layer (color + frequency function + on-time function)',
    },
  ],
  [
    'SparkleL',
    {
      name: 'SparkleL',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Sparkle as overlay layer (color + chance promille + intensity)',
    },
  ],
  // ── Legacy "RandomL" — short-hand for RandomFlickerL ─────────────────
  // ProffieOS exposes `RandomL` as the actual function-style alias for
  // RandomFlicker (see styles/random_flicker.h: `using RandomL =
  // AlphaL<B, RandomF>;`). Old configs sometimes use this short form.
  [
    'RandomL',
    {
      name: 'RandomL',
      argTypes: ['COLOR'],
      description: 'Random per-frame flicker overlay (legacy short form of RandomFlickerL)',
    },
  ],
  // ── Legacy color-form aliases (no L/X-prefix) ────────────────────────
  // Used by Fredrik's Style Editor exports + EASYBLADE-style configs.
  // The L-form does the rendering; the non-L form is `Layers<base,
  // BlastL<...>>`. EasyBlade is a SimpleClash<Lockup<Blast<...>...>>
  // shorthand for the simplest possible blade.
  [
    'EasyBlade',
    {
      name: 'EasyBlade',
      argTypes: ['COLOR', 'COLOR'],
      description: 'EasyBlade legacy 2-arg shorthand: <COLOR, CLASH_COLOR>. Expands to SimpleClash<Lockup<Blast<COLOR,WHITE>,AudioFlicker<COLOR,WHITE>>,CLASH_COLOR>.',
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
  // ── ProffieOS color.h X11 + custom palette ──
  // Sourced verbatim from ProffieOS/styles/colors.h. This is the
  // canonical set of named colors that ANY ProffieOS config can use
  // — every entry below is `typedef Rgb<r,g,b> Name;` in upstream.
  ['AliceBlue', { name: 'AliceBlue', argTypes: [], description: 'AliceBlue (223,239,255)' }],
  ['Aqua', { name: 'Aqua', argTypes: [], description: 'Aqua (0,255,255)' }],
  ['Aquamarine', { name: 'Aquamarine', argTypes: [], description: 'Aquamarine (55,255,169)' }],
  ['Azure', { name: 'Azure', argTypes: [], description: 'Azure (223,255,255)' }],
  ['Bisque', { name: 'Bisque', argTypes: [], description: 'Bisque (255,199,142)' }],
  ['BlanchedAlmond', { name: 'BlanchedAlmond', argTypes: [], description: 'BlanchedAlmond (255,213,157)' }],
  ['Chartreuse', { name: 'Chartreuse', argTypes: [], description: 'Chartreuse (55,255,0)' }],
  ['Cornsilk', { name: 'Cornsilk', argTypes: [], description: 'Cornsilk (255,239,184)' }],
  ['DarkOrange', { name: 'DarkOrange', argTypes: [], description: 'DarkOrange (255,68,0)' }],
  ['DeepPink', { name: 'DeepPink', argTypes: [], description: 'DeepPink (255,0,75)' }],
  ['FloralWhite', { name: 'FloralWhite', argTypes: [], description: 'FloralWhite (255,244,223)' }],
  ['Fuchsia', { name: 'Fuchsia', argTypes: [], description: 'Fuchsia (255,0,255)' }],
  ['GhostWhite', { name: 'GhostWhite', argTypes: [], description: 'GhostWhite (239,239,255)' }],
  ['GreenYellow', { name: 'GreenYellow', argTypes: [], description: 'GreenYellow (108,255,6)' }],
  ['HoneyDew', { name: 'HoneyDew', argTypes: [], description: 'HoneyDew (223,255,223)' }],
  ['HotPink', { name: 'HotPink', argTypes: [], description: 'HotPink (255,36,118)' }],
  ['Ivory', { name: 'Ivory', argTypes: [], description: 'Ivory (255,255,223)' }],
  ['LavenderBlush', { name: 'LavenderBlush', argTypes: [], description: 'LavenderBlush (255,223,233)' }],
  ['LemonChiffon', { name: 'LemonChiffon', argTypes: [], description: 'LemonChiffon (255,244,157)' }],
  ['LightCyan', { name: 'LightCyan', argTypes: [], description: 'LightCyan (191,255,255)' }],
  ['LightPink', { name: 'LightPink', argTypes: [], description: 'LightPink (255,121,138)' }],
  ['LightSalmon', { name: 'LightSalmon', argTypes: [], description: 'LightSalmon (255,91,50)' }],
  ['LightYellow', { name: 'LightYellow', argTypes: [], description: 'LightYellow (255,255,191)' }],
  ['MintCream', { name: 'MintCream', argTypes: [], description: 'MintCream (233,255,244)' }],
  ['MistyRose', { name: 'MistyRose', argTypes: [], description: 'MistyRose (255,199,193)' }],
  ['Moccasin', { name: 'Moccasin', argTypes: [], description: 'Moccasin (255,199,119)' }],
  ['NavajoWhite', { name: 'NavajoWhite', argTypes: [], description: 'NavajoWhite (255,187,108)' }],
  ['OrangeRed', { name: 'OrangeRed', argTypes: [], description: 'OrangeRed (255,14,0)' }],
  ['PapayaWhip', { name: 'PapayaWhip', argTypes: [], description: 'PapayaWhip (255,221,171)' }],
  ['PeachPuff', { name: 'PeachPuff', argTypes: [], description: 'PeachPuff (255,180,125)' }],
  ['SeaShell', { name: 'SeaShell', argTypes: [], description: 'SeaShell (255,233,219)' }],
  ['Snow', { name: 'Snow', argTypes: [], description: 'Snow (255,244,244)' }],
  ['SpringGreen', { name: 'SpringGreen', argTypes: [], description: 'SpringGreen (0,255,55)' }],
  // ── ProffieOS custom (high-saturation neon) palette ──
  ['ElectricPurple', { name: 'ElectricPurple', argTypes: [], description: 'ElectricPurple (127,0,255)' }],
  ['ElectricViolet', { name: 'ElectricViolet', argTypes: [], description: 'ElectricViolet (71,0,255)' }],
  ['ElectricLime', { name: 'ElectricLime', argTypes: [], description: 'ElectricLime (156,255,0)' }],
  ['Amber', { name: 'Amber', argTypes: [], description: 'Amber (255,135,0)' }],
  ['CyberYellow', { name: 'CyberYellow', argTypes: [], description: 'CyberYellow (255,168,0)' }],
  ['CanaryYellow', { name: 'CanaryYellow', argTypes: [], description: 'CanaryYellow (255,221,0)' }],
  ['Flamingo', { name: 'Flamingo', argTypes: [], description: 'Flamingo (255,80,154)' }],
  ['VividViolet', { name: 'VividViolet', argTypes: [], description: 'VividViolet (90,0,255)' }],
  ['PsychedelicPurple', { name: 'PsychedelicPurple', argTypes: [], description: 'PsychedelicPurple (186,0,255)' }],
  ['HotMagenta', { name: 'HotMagenta', argTypes: [], description: 'HotMagenta (255,0,156)' }],
  ['BrutalPink', { name: 'BrutalPink', argTypes: [], description: 'BrutalPink (255,0,128)' }],
  ['NeonRose', { name: 'NeonRose', argTypes: [], description: 'NeonRose (255,0,55)' }],
  ['VividRaspberry', { name: 'VividRaspberry', argTypes: [], description: 'VividRaspberry (255,0,38)' }],
  ['HaltRed', { name: 'HaltRed', argTypes: [], description: 'HaltRed (255,0,19)' }],
  ['MoltenCore', { name: 'MoltenCore', argTypes: [], description: 'MoltenCore (255,24,0)' }],
  ['SafetyOrange', { name: 'SafetyOrange', argTypes: [], description: 'SafetyOrange (255,33,0)' }],
  ['OrangeJuice', { name: 'OrangeJuice', argTypes: [], description: 'OrangeJuice (255,55,0)' }],
  ['ImperialYellow', { name: 'ImperialYellow', argTypes: [], description: 'ImperialYellow (255,115,0)' }],
  ['SchoolBus', { name: 'SchoolBus', argTypes: [], description: 'SchoolBus (255,176,0)' }],
  ['SuperSaiyan', { name: 'SuperSaiyan', argTypes: [], description: 'SuperSaiyan (255,186,0)' }],
  ['Star', { name: 'Star', argTypes: [], description: 'Star (255,201,0)' }],
  ['Lemon', { name: 'Lemon', argTypes: [], description: 'Lemon (255,237,0)' }],
  ['ElectricBanana', { name: 'ElectricBanana', argTypes: [], description: 'ElectricBanana (246,255,0)' }],
  ['BusyBee', { name: 'BusyBee', argTypes: [], description: 'BusyBee (231,255,0)' }],
  ['ZeusBolt', { name: 'ZeusBolt', argTypes: [], description: 'ZeusBolt (219,255,0)' }],
  ['LimeZest', { name: 'LimeZest', argTypes: [], description: 'LimeZest (186,255,0)' }],
  ['Limoncello', { name: 'Limoncello', argTypes: [], description: 'Limoncello (135,255,0)' }],
  ['CathodeGreen', { name: 'CathodeGreen', argTypes: [], description: 'CathodeGreen (0,255,22)' }],
  ['MintyParadise', { name: 'MintyParadise', argTypes: [], description: 'MintyParadise (0,255,128)' }],
  ['PlungePool', { name: 'PlungePool', argTypes: [], description: 'PlungePool (0,255,156)' }],
  ['VibrantMint', { name: 'VibrantMint', argTypes: [], description: 'VibrantMint (0,255,201)' }],
  ['MasterSwordBlue', { name: 'MasterSwordBlue', argTypes: [], description: 'MasterSwordBlue (0,255,219)' }],
  ['BrainFreeze', { name: 'BrainFreeze', argTypes: [], description: 'BrainFreeze (0,219,255)' }],
  ['BlueRibbon', { name: 'BlueRibbon', argTypes: [], description: 'BlueRibbon (0,33,255)' }],
  ['RareBlue', { name: 'RareBlue', argTypes: [], description: 'RareBlue (0,13,255)' }],
  ['OverdueBlue', { name: 'OverdueBlue', argTypes: [], description: 'OverdueBlue (13,0,255)' }],
  ['ViolentViolet', { name: 'ViolentViolet', argTypes: [], description: 'ViolentViolet (55,0,255)' }],
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

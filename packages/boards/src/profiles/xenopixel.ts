import type {
  BoardProfile,
  XenoBladeEffect,
  XenoIgnitionStyle,
  XenoLightEffect,
} from '../types.js';

// ─── Xenopixel V3 Blade Effects ───
// Source: XENO3.0 Setting Change Manual (SyberSabers + DamienSaber)
// IDs map to the fontconfig.ini "A" field (blade effect 0-7)

export const XENO_BLADE_EFFECTS: readonly XenoBladeEffect[] = [
  { id: 0, name: 'Fire Blade', kyberStyle: 'fire' },
  { id: 1, name: 'Steady Blade', kyberStyle: 'stable' },
  { id: 2, name: 'Unstable Blade', kyberStyle: 'unstable' },
  { id: 3, name: 'Rainbow Blade', kyberStyle: 'rainbow' },
  { id: 4, name: 'Candy Blade', kyberStyle: null },
  { id: 5, name: 'Crack Blade', kyberStyle: 'crystalShatter' },
  { id: 6, name: 'Pulse Blade', kyberStyle: 'pulse' },
  { id: 7, name: 'Flashing Blade', kyberStyle: null },
] as const;

// ─── Xenopixel V3 Ignition Styles ───
// IDs map to the fontconfig.ini "F" field (blade style / ignition 0-11)
// IDs 0-4 are "blade mode" styles; 5-11 are "special preon" ignitions.

export const XENO_IGNITION_STYLES: readonly XenoIgnitionStyle[] = [
  { id: 0, name: 'Standard Blade' },
  { id: 1, name: 'Velocity Blade' },
  { id: 2, name: 'Torch Blade' },
  { id: 3, name: 'Blaster Blade' },
  { id: 4, name: 'Ghost Blade' },
  { id: 5, name: 'Stack Ignition', category: 'special-preon' },
  { id: 6, name: 'FoldTile Ignition', category: 'special-preon' },
  { id: 7, name: 'Word Ignition', category: 'special-preon' },
  { id: 8, name: 'Faser Ignition', category: 'special-preon' },
  { id: 9, name: 'Scavenger Ignition', category: 'special-preon' },
  { id: 10, name: 'Hunter Ignition', category: 'special-preon' },
  { id: 11, name: 'Broken Ignition', category: 'special-preon' },
] as const;

// ─── Xenopixel V3 Blaster Light Effects ───
// IDs map to the fontconfig.ini "B" field (blaster light effect 0-2)

export const XENO_BLASTER_EFFECTS: readonly XenoLightEffect[] = [
  { id: 0, name: 'Blaster Effect 1' },
  { id: 1, name: 'Blaster Effect 2' },
  { id: 2, name: 'Blaster Effect 3' },
] as const;

// ─── Xenopixel V3 Force Light Effects ───
// IDs map to the fontconfig.ini "C" field (force lighting effect 0-1)

export const XENO_FORCE_EFFECTS: readonly XenoLightEffect[] = [
  { id: 0, name: 'Force Effect 1' },
  { id: 1, name: 'Force Effect 2' },
] as const;

// ─── Shared types ───

const XENOPIXEL_EFFECTS_V2: BoardProfile['supportedEffects'] = [
  { kyberstationEffect: 'clash', boardEffectName: 'clash', notes: 'Basic clash flash, color not customizable' },
  { kyberstationEffect: 'lockup', boardEffectName: 'lockup', notes: 'Basic lockup flicker, firmware-defined' },
  { kyberstationEffect: 'blast', boardEffectName: 'blast', notes: 'Basic blast flash, firmware-defined' },
  { kyberstationEffect: 'drag', boardEffectName: null, notes: 'Drag not supported on Xenopixel V2' },
  { kyberstationEffect: 'melt', boardEffectName: null, notes: 'Melt not supported on Xenopixel V2' },
  { kyberstationEffect: 'lightning', boardEffectName: null, notes: 'Lightning block not supported on Xenopixel V2' },
  { kyberstationEffect: 'stab', boardEffectName: null, notes: 'Stab not supported on Xenopixel V2' },
  { kyberstationEffect: 'force', boardEffectName: null, notes: 'Force effect not supported on Xenopixel V2' },
];

const XENOPIXEL_EFFECTS_V3: BoardProfile['supportedEffects'] = [
  { kyberstationEffect: 'clash', boardEffectName: 'clash', notes: 'Clash flash, configurable via flash_on_clash + clash_sensitivity' },
  { kyberstationEffect: 'lockup', boardEffectName: 'lockup', notes: 'Lockup effect with configurable multilock mode' },
  { kyberstationEffect: 'blast', boardEffectName: 'blast', notes: '3 blaster light effects selectable per font' },
  { kyberstationEffect: 'drag', boardEffectName: 'drag', notes: 'Drag effect on V3' },
  { kyberstationEffect: 'melt', boardEffectName: null, notes: 'Melt available on firmware V1.3.1+' },
  { kyberstationEffect: 'lightning', boardEffectName: 'lightning_block', notes: 'Lightning block mode toggle in config.ini' },
  { kyberstationEffect: 'stab', boardEffectName: 'stab', notes: 'Stab effect on V3' },
  { kyberstationEffect: 'force', boardEffectName: 'force', notes: '2 force lighting effects selectable per font' },
];

// Map Xenopixel V3's actual blade effects to KyberStation style entries
const XENOPIXEL_STYLES_V2: BoardProfile['supportedStyles'] = [
  { kyberstationStyle: 'stable', boardStyleName: 'solid', notes: 'Solid blade color — primary Xenopixel V2 mode' },
];

const XENOPIXEL_STYLES_V3: BoardProfile['supportedStyles'] = [
  { kyberstationStyle: 'fire', boardStyleName: 'fire', configMapping: { bladeEffect: '0' }, notes: 'Fire Blade effect (ID 0)' },
  { kyberstationStyle: 'stable', boardStyleName: 'steady', configMapping: { bladeEffect: '1' }, notes: 'Steady Blade — solid color (ID 1)' },
  { kyberstationStyle: 'unstable', boardStyleName: 'unstable', configMapping: { bladeEffect: '2' }, notes: 'Unstable Blade — flicker effect (ID 2)' },
  { kyberstationStyle: 'rainbow', boardStyleName: 'rainbow', configMapping: { bladeEffect: '3' }, notes: 'Rainbow Blade — cycling colors (ID 3)' },
  { kyberstationStyle: 'candy', boardStyleName: 'candy', configMapping: { bladeEffect: '4' }, notes: 'Candy Blade — multi-color segments (ID 4)' },
  { kyberstationStyle: 'crystalShatter', boardStyleName: 'crack', configMapping: { bladeEffect: '5' }, notes: 'Crack Blade — crack/break effect (ID 5)' },
  { kyberstationStyle: 'pulse', boardStyleName: 'pulse', configMapping: { bladeEffect: '6' }, notes: 'Pulse Blade — breathing pulse (ID 6)' },
  { kyberstationStyle: 'flashing', boardStyleName: 'flashing', configMapping: { bladeEffect: '7' }, notes: 'Flashing Blade — strobe/flash (ID 7)' },
];

const XENOPIXEL_TERMINOLOGY: BoardProfile['terminology'] = {
  'blade style': 'Blade Effect',
  clash: 'Clash',
  lockup: 'Lockup',
  preset: 'Font',
  ignition: 'Power On Style',
  retraction: 'Power Off',
  'sound font': 'Sound Font',
};

// ─── Xenopixel V2 Board Profile ───

export const XENOPIXEL_V2: BoardProfile = {
  id: 'xenopixel-v2',
  name: 'Xenopixel V2',
  manufacturer: 'LGT / Generic',
  versions: ['2.0'],
  capabilities: {
    neopixelSupport: true,
    maxLEDs: 144,
    smoothSwing: false,
    bluetoothConfig: false,
    editMode: false,
    customBladeStyles: false,
    multiBladeSupport: false,
    oledSupport: false,
    gestureControl: true,
    colorProfiles: 16,
    soundFontFormat: 'generic',
    maxPresets: 16,
    tier: 3,
    customIgnition: false,
    customRetraction: false,
    customClash: false,
    customLockup: false,
    customBlast: false,
    customDrag: false,
    customMelt: false,
    customLightning: false,
    responsiveEffects: false,
    audioReactiveStyles: false,
    motionReactiveStyles: false,
    colorChangeMode: 'fixed-palette',
    subBladeSupport: false,
    multiDataPin: false,
    maxDataPins: 1,
    layerCompositing: false,
    transitionCustomization: false,
  },
  configFormat: 'none',
  supportedEffects: XENOPIXEL_EFFECTS_V2,
  supportedStyles: XENOPIXEL_STYLES_V2,
  ledConfig: {
    defaultCount: 144,
    maxCount: 144,
    colorOrders: ['GRB'],
  },
  terminology: XENOPIXEL_TERMINOLOGY,
  uiOverrides: {
    hideFeatures: [
      'layer-compositor', 'oled-preview', 'edit-mode', 'sub-blade',
      'custom-ignition', 'custom-retraction', 'effect-panel', 'timeline-panel',
      'routing', 'motion-simulation',
    ],
    disableFeatures: [
      'custom-ignition-code', 'custom-transition-code', 'layer-compositing',
      'audio-reactive', 'motion-reactive', 'effect-customization',
    ],
    showWarnings: [
      'Xenopixel V2 supports color presets only — all blade styles appear as solid colors.',
      'Effects are firmware-baked and cannot be customized.',
      'Color changes are limited to 16 fixed-palette presets.',
    ],
    customPanels: [],
  },
};

// ─── Xenopixel V3 Board Profile ───

export const XENOPIXEL_V3: BoardProfile = {
  id: 'xenopixel-v3',
  name: 'Xenopixel V3',
  manufacturer: 'LGT / Generic',
  versions: ['3.0'],
  capabilities: {
    neopixelSupport: true,
    maxLEDs: 144,
    smoothSwing: true,
    bluetoothConfig: true,
    editMode: false,
    customBladeStyles: false,
    multiBladeSupport: true,
    oledSupport: false,
    gestureControl: true,
    colorProfiles: 'unlimited',
    soundFontFormat: 'generic',
    maxPresets: 40,
    tier: 2,
    customIgnition: false,
    customRetraction: false,
    customClash: false,
    customLockup: false,
    customBlast: false,
    customDrag: false,
    customMelt: false,
    customLightning: false,
    responsiveEffects: false,
    audioReactiveStyles: false,
    motionReactiveStyles: false,
    colorChangeMode: 'full-rgb',
    subBladeSupport: true,
    multiDataPin: false,
    maxDataPins: 1,
    layerCompositing: false,
    transitionCustomization: false,
  },
  configFormat: 'ini-txt',
  supportedEffects: XENOPIXEL_EFFECTS_V3,
  supportedStyles: XENOPIXEL_STYLES_V3,
  ledConfig: {
    defaultCount: 133,
    maxCount: 266,
    colorOrders: ['GRB'],
  },
  terminology: XENOPIXEL_TERMINOLOGY,
  uiOverrides: {
    hideFeatures: [
      'layer-compositor', 'oled-preview', 'edit-mode',
      'custom-ignition', 'custom-retraction', 'timeline-panel',
      'routing', 'motion-simulation', 'code-output',
    ],
    disableFeatures: [
      'custom-ignition-code', 'custom-transition-code', 'layer-compositing',
      'audio-reactive', 'motion-reactive',
    ],
    showWarnings: [
      'Xenopixel V3 supports 8 blade effects and 12 ignition styles — select from the built-in options below.',
      'Full RGB color selection via color wheel.',
      'Export generates SD card config files (fontconfig.ini + config.ini) ready to drop onto your SD card.',
    ],
    customPanels: [
      'xeno-effect-picker', 'xeno-ignition-picker',
      'xeno-motion-panel', 'xeno-settings-panel',
    ],
  },
  xenopixelConfig: {
    bladeEffects: XENO_BLADE_EFFECTS,
    ignitionStyles: XENO_IGNITION_STYLES,
    blasterEffects: XENO_BLASTER_EFFECTS,
    forceEffects: XENO_FORCE_EFFECTS,
    supportsCrossguard: true,
    supportsDoubleBlade: true,
    maxFonts: 40,
    firmwareVersions: ['1.0', '1.2', '1.2.5', '1.3.1', '1.4.0'],
  },
};

export type BoardId =
  | 'proffieboard-v2'
  | 'proffieboard-v3'
  | 'proffie-lite'
  | 'proffie-clone'
  | 'cfx'
  | 'ghv3'
  | 'ghv4'
  | 'verso'
  | 'xenopixel-v2'
  | 'xenopixel-v3'
  | 'lgt-baselit'
  | 'asteria'
  | 'darkwolf'
  | 'damiensaber'
  | 'snpixel-v4'
  | 's-rgb';

export type BoardTier = 1 | 2 | 3;

export type ConfigFormat = 'cpp-template' | 'ini-txt' | 'txt-multifile' | 'json' | 'none';
export type SoundFontFormat = 'proffie' | 'cfx' | 'ghv3' | 'plecter' | 'generic';

export interface BoardCapabilities {
  neopixelSupport: boolean;
  maxLEDs: number;
  smoothSwing: boolean;
  bluetoothConfig: boolean;
  editMode: boolean;
  customBladeStyles: boolean;
  multiBladeSupport: boolean;
  oledSupport: boolean;
  gestureControl: boolean;
  colorProfiles: number | 'unlimited';
  soundFontFormat: SoundFontFormat;
  maxPresets: number | 'unlimited';
  tier: BoardTier;
  customIgnition: boolean;
  customRetraction: boolean;
  customClash: boolean;
  customLockup: boolean;
  customBlast: boolean;
  customDrag: boolean;
  customMelt: boolean;
  customLightning: boolean;
  responsiveEffects: boolean;
  audioReactiveStyles: boolean;
  motionReactiveStyles: boolean;
  colorChangeMode: 'none' | 'fixed-palette' | 'color-wheel' | 'full-rgb';
  subBladeSupport: boolean;
  multiDataPin: boolean;
  maxDataPins: number;
  layerCompositing: boolean;
  transitionCustomization: boolean;
}

export interface EffectMapping {
  kyberstationEffect: string;
  boardEffectName: string | null;
  configParam?: string;
  notes?: string;
}

export interface StyleMapping {
  kyberstationStyle: string;
  boardStyleName: string | null;
  configMapping?: Record<string, string>;
  notes?: string;
}

export interface TerminologyMap {
  'blade style': string;
  clash: string;
  lockup: string;
  preset: string;
  ignition: string;
  retraction: string;
  'sound font': string;
  [key: string]: string;
}

export interface UIOverrides {
  hideFeatures: string[];
  disableFeatures: string[];
  showWarnings: string[];
  customPanels?: string[];
}

// ─── Xenopixel-specific configuration types ───

/**
 * Known Xenopixel V3 firmware versions with feature implications.
 *
 * Each version adds features that affect the emitter output format
 * and the set of available effects:
 *   - '1.0'   — base 8 effects, root-level fontconfig.ini
 *   - '1.2'   — adds motor crystal chamber toggle, BT toggle in config.ini
 *   - '1.2.5' — per-font fontconfig.ini (moved from root to N/fontconfig.ini)
 *   - '1.3.1' — adds knock/poke, lightning block mode, melt effect
 *   - '1.4.0' — configurable in/out time per-font, custom function field
 */
export type XenoFirmwareVersion = '1.0' | '1.2' | '1.2.5' | '1.3.1' | '1.4.0';

/** Describes which features each firmware version unlocks. */
export interface XenoFirmwareFeatures {
  readonly version: XenoFirmwareVersion;
  readonly label: string;
  /** fontconfig.ini lives in each font folder (N/fontconfig.ini) instead of root */
  readonly perFolderFontConfig: boolean;
  /** config.ini includes motor_crystal_chamber and bt_mode fields */
  readonly motorCrystalChamber: boolean;
  /** config.ini includes bt_mode field */
  readonly btMode: boolean;
  /** Melt effect available */
  readonly meltEffect: boolean;
  /** Lightning block mode available */
  readonly lightningBlock: boolean;
  /** Knock and poke gestures available in config.ini */
  readonly knockPoke: boolean;
  /** fontconfig.ini supports configurable in/out time per font */
  readonly configurableInOutTime: boolean;
  /** Custom function field in fontconfig.ini */
  readonly customFunction: boolean;
}

export interface XenoBladeEffect {
  readonly id: number;
  readonly name: string;
  /** KyberStation engine style ID that approximates this effect, or null if no equivalent */
  readonly kyberStyle: string | null;
}

export interface XenoIgnitionStyle {
  readonly id: number;
  readonly name: string;
  /** Category for UI grouping: undefined = standard blade mode, 'special-preon' = special ignition */
  readonly category?: 'special-preon';
}

export interface XenoLightEffect {
  readonly id: number;
  readonly name: string;
}

export interface XenopixelConfig {
  bladeEffects: readonly XenoBladeEffect[];
  ignitionStyles: readonly XenoIgnitionStyle[];
  blasterEffects: readonly XenoLightEffect[];
  forceEffects: readonly XenoLightEffect[];
  supportsCrossguard: boolean;
  supportsDoubleBlade: boolean;
  maxFonts: number;
  firmwareVersions: readonly XenoFirmwareVersion[];
}

// ─── Board Profile ───

export interface BoardProfile {
  id: BoardId;
  name: string;
  manufacturer: string;
  versions: string[];
  capabilities: BoardCapabilities;
  configFormat: ConfigFormat;
  supportedEffects: EffectMapping[];
  supportedStyles: StyleMapping[];
  ledConfig: {
    defaultCount: number;
    maxCount: number;
    colorOrders: string[];
  };
  terminology: TerminologyMap;
  uiOverrides: UIOverrides;
  /** Xenopixel-specific configuration — present only on Xenopixel board profiles */
  xenopixelConfig?: XenopixelConfig;
}

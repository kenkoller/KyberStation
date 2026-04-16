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
}

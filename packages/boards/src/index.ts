// ─── Types ───
export type {
  BoardId,
  BoardTier,
  ConfigFormat,
  SoundFontFormat,
  BoardCapabilities,
  EffectMapping,
  StyleMapping,
  TerminologyMap,
  UIOverrides,
  BoardProfile,
  XenoBladeEffect,
  XenoIgnitionStyle,
  XenoLightEffect,
  XenopixelConfig,
} from './types.js';

// ─── Board Registry & Helpers ───
export {
  BOARD_PROFILES,
  getBoardProfile,
  getBoardsByTier,
} from './profiles/index.js';

// ─── Individual Board Profiles ───
export {
  PROFFIEBOARD_V2,
  PROFFIEBOARD_V3,
} from './profiles/proffieboard.js';

export { CFX_PROFILE } from './profiles/cfx.js';

export {
  GHV3_PROFILE,
  GHV4_PROFILE,
} from './profiles/ghv3.js';

export {
  XENOPIXEL_V2,
  XENOPIXEL_V3,
  XENO_BLADE_EFFECTS,
  XENO_IGNITION_STYLES,
  XENO_BLASTER_EFFECTS,
  XENO_FORCE_EFFECTS,
} from './profiles/xenopixel.js';

export {
  LGT_BASELIT,
  ASTERIA,
  DARKWOLF,
  DAMIENSABER,
  VERSO,
  PROFFIE_LITE,
  PROFFIE_CLONE,
} from './profiles/budget-boards.js';

// ─── Compatibility Scoring ───
export type {
  CompatibilityReport,
  FeatureScore,
  FeatureDegradation,
} from './compatibility.js';

export { scoreCompatibility } from './compatibility.js';

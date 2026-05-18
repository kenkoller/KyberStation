// ─── Types ───
export type {
  BladeDriverType,
  BladeRole,
  BladeSpec,
  BoardId,
  HardwareProfile,
  Provenance,
  WS2811DataPin,
} from './types.js';

// ─── Validators ───
export {
  getMainBlade,
  isKnownDataPin,
  validateProfile,
} from './validators.js';

// ─── Profile Registry & Helpers ───
export {
  ALL_PROFILES,
  all,
  byId,
  byVendor,
} from './profiles/index.js';

// ─── Individual Profiles ───
export { STOCK_PROFFIEBOARD_V3 } from './profiles/stock-proffieboard-v3.js';
export { SABERS89_V3_9 } from './profiles/89sabers-v3.9.js';
export { SABERS89_V3_9_BT } from './profiles/89sabers-v3.9-bt.js';
export { SABERTRIO_STANDARD } from './profiles/sabertrio-standard.js';

// ─── Codegen Adapter ───
export type {
  CodegenBladeHardwareConfigLike,
  CodegenConfigOptionsLike,
  CodegenPresetEntryLike,
} from './codegen-adapter.js';
export { profileToConfigOptions } from './codegen-adapter.js';

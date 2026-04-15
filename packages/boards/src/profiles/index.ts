import type { BoardId, BoardProfile, BoardTier } from '../types.js';
import { PROFFIEBOARD_V2, PROFFIEBOARD_V3 } from './proffieboard.js';
import { CFX_PROFILE } from './cfx.js';
import { GHV3_PROFILE, GHV4_PROFILE } from './ghv3.js';
import { XENOPIXEL_V2, XENOPIXEL_V3 } from './xenopixel.js';
import {
  LGT_BASELIT,
  ASTERIA,
  DARKWOLF,
  DAMIENSABER,
  VERSO,
  PROFFIE_LITE,
  PROFFIE_CLONE,
  SNPIXEL_V4,
  S_RGB,
} from './budget-boards.js';

export const BOARD_PROFILES: Record<BoardId, BoardProfile> = {
  'proffieboard-v2': PROFFIEBOARD_V2,
  'proffieboard-v3': PROFFIEBOARD_V3,
  'proffie-lite': PROFFIE_LITE,
  'proffie-clone': PROFFIE_CLONE,
  cfx: CFX_PROFILE,
  ghv3: GHV3_PROFILE,
  ghv4: GHV4_PROFILE,
  verso: VERSO,
  'xenopixel-v2': XENOPIXEL_V2,
  'xenopixel-v3': XENOPIXEL_V3,
  'lgt-baselit': LGT_BASELIT,
  asteria: ASTERIA,
  darkwolf: DARKWOLF,
  damiensaber: DAMIENSABER,
  'snpixel-v4': SNPIXEL_V4,
  's-rgb': S_RGB,
};

export function getBoardProfile(id: BoardId): BoardProfile {
  const profile = BOARD_PROFILES[id];
  if (!profile) {
    throw new Error(`Unknown board ID: ${id}`);
  }
  return profile;
}

export function getBoardsByTier(tier: BoardTier): BoardProfile[] {
  return Object.values(BOARD_PROFILES).filter(
    (profile) => profile.capabilities.tier === tier,
  );
}

// Re-export individual profiles for direct import
export { PROFFIEBOARD_V2, PROFFIEBOARD_V3 } from './proffieboard.js';
export { CFX_PROFILE } from './cfx.js';
export { GHV3_PROFILE, GHV4_PROFILE } from './ghv3.js';
export { XENOPIXEL_V2, XENOPIXEL_V3 } from './xenopixel.js';
export {
  LGT_BASELIT,
  ASTERIA,
  DARKWOLF,
  DAMIENSABER,
  VERSO,
  PROFFIE_LITE,
  PROFFIE_CLONE,
  SNPIXEL_V4,
  S_RGB,
} from './budget-boards.js';

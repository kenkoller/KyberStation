import type { IgnitionAnimation } from '../../types.js';
import { XenoStandardIgnition } from './XenoStandardIgnition.js';
import { XenoVelocityIgnition } from './XenoVelocityIgnition.js';
import { XenoTorchIgnition } from './XenoTorchIgnition.js';
import { XenoBlasterIgnition } from './XenoBlasterIgnition.js';
import { XenoGhostIgnition } from './XenoGhostIgnition.js';
import { XenoStackIgnition } from './XenoStackIgnition.js';
import { XenoFoldTileIgnition } from './XenoFoldTileIgnition.js';
import { XenoWordIgnition } from './XenoWordIgnition.js';
import { XenoFaserIgnition } from './XenoFaserIgnition.js';
import { XenoScavengerIgnition } from './XenoScavengerIgnition.js';
import { XenoHunterIgnition } from './XenoHunterIgnition.js';
import { XenoBrokenIgnition } from './XenoBrokenIgnition.js';

export { XenoStandardIgnition } from './XenoStandardIgnition.js';
export { XenoVelocityIgnition } from './XenoVelocityIgnition.js';
export { XenoTorchIgnition } from './XenoTorchIgnition.js';
export { XenoBlasterIgnition } from './XenoBlasterIgnition.js';
export { XenoGhostIgnition } from './XenoGhostIgnition.js';
export { XenoStackIgnition } from './XenoStackIgnition.js';
export { XenoFoldTileIgnition } from './XenoFoldTileIgnition.js';
export { XenoWordIgnition } from './XenoWordIgnition.js';
export { XenoFaserIgnition } from './XenoFaserIgnition.js';
export { XenoScavengerIgnition } from './XenoScavengerIgnition.js';
export { XenoHunterIgnition } from './XenoHunterIgnition.js';
export { XenoBrokenIgnition } from './XenoBrokenIgnition.js';

/**
 * Xenopixel ignition/preon IDs mapped to factory functions.
 *
 * IDs 0-4 are the standard blade ignition modes:
 *   0 = Standard (linear wipe)
 *   1 = Velocity (fast scroll)
 *   2 = Torch (fire-like)
 *   3 = Blaster (segmented pulse)
 *   4 = Ghost (simultaneous fade-in)
 *
 * IDs 5-11 are special preon ignition modes:
 *   5 = Stack (segments stack base-to-tip)
 *   6 = Fold Tile (alternating segments from both ends)
 *   7 = Word (typewriter reveal)
 *   8 = Faser (thin line expands to full blade)
 *   9 = Scavenger (expanding scan points)
 *  10 = Hunter (stalking leading edge with trail)
 *  11 = Broken (stuttering gaps fill in)
 */
export const XENO_IGNITION_MAP: Record<number, new () => IgnitionAnimation> = {
  0: XenoStandardIgnition,
  1: XenoVelocityIgnition,
  2: XenoTorchIgnition,
  3: XenoBlasterIgnition,
  4: XenoGhostIgnition,
  5: XenoStackIgnition,
  6: XenoFoldTileIgnition,
  7: XenoWordIgnition,
  8: XenoFaserIgnition,
  9: XenoScavengerIgnition,
  10: XenoHunterIgnition,
  11: XenoBrokenIgnition,
};

/** Registry of all Xenopixel ignition animations, keyed by style ID. */
export const XENO_IGNITION_REGISTRY: Record<string, () => IgnitionAnimation> = {
  'xeno-standard': () => new XenoStandardIgnition(),
  'xeno-velocity': () => new XenoVelocityIgnition(),
  'xeno-torch': () => new XenoTorchIgnition(),
  'xeno-blaster': () => new XenoBlasterIgnition(),
  'xeno-ghost': () => new XenoGhostIgnition(),
  'xeno-stack': () => new XenoStackIgnition(),
  'xeno-fold-tile': () => new XenoFoldTileIgnition(),
  'xeno-word': () => new XenoWordIgnition(),
  'xeno-faser': () => new XenoFaserIgnition(),
  'xeno-scavenger': () => new XenoScavengerIgnition(),
  'xeno-hunter': () => new XenoHunterIgnition(),
  'xeno-broken': () => new XenoBrokenIgnition(),
};

/**
 * Create a Xenopixel ignition animation by firmware ID (0-11).
 * @throws Error if the ID is out of range.
 */
export function createXenoIgnition(ignitionId: number): IgnitionAnimation {
  const Ctor = XENO_IGNITION_MAP[ignitionId];
  if (!Ctor) {
    throw new Error(
      `Xenopixel ignition ID must be an integer 0-11, got ${ignitionId}. ` +
      `Available: ${Object.keys(XENO_IGNITION_MAP).join(', ')}`,
    );
  }
  return new Ctor();
}

/**
 * Map a Xenopixel firmware ignition ID (0-11) to its registry key.
 * @throws Error if the ID is out of range.
 */
export function xenoIgnitionIdToStyleId(ignitionId: number): string {
  const Ctor = XENO_IGNITION_MAP[ignitionId];
  if (!Ctor) {
    throw new Error(
      `Xenopixel ignition ID must be an integer 0-11, got ${ignitionId}.`,
    );
  }
  const instance = new Ctor();
  return instance.id;
}

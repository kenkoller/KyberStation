import type { HardwareProfile } from '../types.js';
import { STOCK_PROFFIEBOARD_V3 } from './stock-proffieboard-v3.js';
import { SABERS89_V3_9 } from './89sabers-v3.9.js';

/**
 * All hardware profiles shipped with KyberStation, in registration order.
 *
 * New profiles get added here as they're contributed. Order in this array
 * does not imply ranking — the UI sorts by vendor / model.
 */
export const ALL_PROFILES: readonly HardwareProfile[] = [
  STOCK_PROFFIEBOARD_V3,
  SABERS89_V3_9,
];

/** Look up a profile by its stable `id`. Returns `undefined` if not found. */
export function byId(id: string): HardwareProfile | undefined {
  return ALL_PROFILES.find((p) => p.id === id);
}

/**
 * Return every profile for a given vendor slug (e.g. `'89sabers'`).
 * Returns an empty array if the vendor has no profiles registered.
 */
export function byVendor(vendor: string): HardwareProfile[] {
  return ALL_PROFILES.filter((p) => p.vendor === vendor);
}

/** Return a copy of every registered profile. */
export function all(): HardwareProfile[] {
  return [...ALL_PROFILES];
}

// Re-export individual profiles for direct import.
export { STOCK_PROFFIEBOARD_V3 } from './stock-proffieboard-v3.js';
export { SABERS89_V3_9 } from './89sabers-v3.9.js';

import type { BladeStyle } from '../../types.js';
import { XenoFireStyle } from './XenoFireStyle.js';
import { XenoSteadyStyle } from './XenoSteadyStyle.js';
import { XenoUnstableStyle } from './XenoUnstableStyle.js';
import { XenoRainbowStyle } from './XenoRainbowStyle.js';
import { XenoCandyStyle } from './XenoCandyStyle.js';
import { XenoCrackStyle } from './XenoCrackStyle.js';
import { XenoPulseStyle } from './XenoPulseStyle.js';
import { XenoFlashingStyle } from './XenoFlashingStyle.js';

export { XenoFireStyle } from './XenoFireStyle.js';
export { XenoSteadyStyle } from './XenoSteadyStyle.js';
export { XenoUnstableStyle } from './XenoUnstableStyle.js';
export { XenoRainbowStyle } from './XenoRainbowStyle.js';
export { XenoCandyStyle } from './XenoCandyStyle.js';
export { XenoCrackStyle } from './XenoCrackStyle.js';
export { XenoPulseStyle } from './XenoPulseStyle.js';
export { XenoFlashingStyle } from './XenoFlashingStyle.js';

/**
 * Xenopixel blade effect IDs mapped to style registry keys.
 * Matches the firmware's fixed 0-7 blade-effect enum.
 */
const XENO_EFFECT_ID_MAP: readonly string[] = [
  'xeno-fire',      // 0
  'xeno-steady',    // 1
  'xeno-unstable',  // 2
  'xeno-rainbow',   // 3
  'xeno-candy',     // 4
  'xeno-crack',     // 5
  'xeno-pulse',     // 6
  'xeno-flashing',  // 7
];

/** Registry of all Xenopixel blade styles, keyed by style ID. */
export const XENO_STYLE_REGISTRY: Record<string, () => BladeStyle> = {
  'xeno-fire': () => new XenoFireStyle(),
  'xeno-steady': () => new XenoSteadyStyle(),
  'xeno-unstable': () => new XenoUnstableStyle(),
  'xeno-rainbow': () => new XenoRainbowStyle(),
  'xeno-candy': () => new XenoCandyStyle(),
  'xeno-crack': () => new XenoCrackStyle(),
  'xeno-pulse': () => new XenoPulseStyle(),
  'xeno-flashing': () => new XenoFlashingStyle(),
};

/**
 * Create a Xenopixel blade style by firmware effect ID (0-7).
 * @throws Error if the effect ID is out of range.
 */
export function createXenoStyle(effectId: number): BladeStyle {
  const styleId = xenoEffectIdToStyleId(effectId);
  const factory = XENO_STYLE_REGISTRY[styleId];
  if (!factory) {
    throw new Error(
      `No Xenopixel style registered for ID "${styleId}". ` +
      `Available: ${Object.keys(XENO_STYLE_REGISTRY).join(', ')}`,
    );
  }
  return factory();
}

/**
 * Map a Xenopixel firmware blade-effect ID (0-7) to its style
 * registry key.
 * @throws Error if the effect ID is out of range (0-7).
 */
export function xenoEffectIdToStyleId(effectId: number): string {
  if (effectId < 0 || effectId > 7 || !Number.isInteger(effectId)) {
    throw new Error(
      `Xenopixel blade effect ID must be an integer 0-7, got ${effectId}.`,
    );
  }
  return XENO_EFFECT_ID_MAP[effectId];
}

import type { BladeStyle } from '../types.js';
import { StableStyle } from './StableStyle.js';
import { UnstableStyle } from './UnstableStyle.js';
import { FireStyle } from './FireStyle.js';
import { PulseStyle } from './PulseStyle.js';
import { RotoscopeStyle } from './RotoscopeStyle.js';
import { GradientStyle } from './GradientStyle.js';
import { PhotonStyle } from './PhotonStyle.js';
import { PlasmaStyle } from './PlasmaStyle.js';
import { CrystalShatterStyle } from './CrystalShatterStyle.js';
import { AuroraStyle } from './AuroraStyle.js';
import { CinderStyle } from './CinderStyle.js';
import { PrismStyle } from './PrismStyle.js';

export { BaseStyle } from './BaseStyle.js';
export { StableStyle } from './StableStyle.js';
export { UnstableStyle } from './UnstableStyle.js';
export { FireStyle } from './FireStyle.js';
export { PulseStyle } from './PulseStyle.js';
export { RotoscopeStyle } from './RotoscopeStyle.js';
export { GradientStyle } from './GradientStyle.js';
export { PhotonStyle } from './PhotonStyle.js';
export { PlasmaStyle } from './PlasmaStyle.js';
export { CrystalShatterStyle } from './CrystalShatterStyle.js';
export { AuroraStyle } from './AuroraStyle.js';
export { CinderStyle } from './CinderStyle.js';
export { PrismStyle } from './PrismStyle.js';

/** Registry of all available blade styles, keyed by style ID. */
export const STYLE_REGISTRY: Record<string, () => BladeStyle> = {
  stable: () => new StableStyle(),
  unstable: () => new UnstableStyle(),
  fire: () => new FireStyle(),
  pulse: () => new PulseStyle(),
  rotoscope: () => new RotoscopeStyle(),
  gradient: () => new GradientStyle(),
  photon: () => new PhotonStyle(),
  plasma: () => new PlasmaStyle(),
  crystalShatter: () => new CrystalShatterStyle(),
  aurora: () => new AuroraStyle(),
  cinder: () => new CinderStyle(),
  prism: () => new PrismStyle(),
};

/**
 * Create a blade style instance by ID.
 * @throws Error if the style ID is not found in the registry.
 */
export function createStyle(id: string): BladeStyle {
  const factory = STYLE_REGISTRY[id];
  if (!factory) {
    throw new Error(
      `Unknown style ID: "${id}". Available styles: ${Object.keys(STYLE_REGISTRY).join(', ')}`,
    );
  }
  return factory();
}

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
import { PaintedStyle } from './PaintedStyle.js';
import { ImageScrollStyle } from './ImageScrollStyle.js';
import { DataStreamStyle } from './DataStreamStyle.js';
import { GravityStyle } from './GravityStyle.js';
import { EmberStyle } from './EmberStyle.js';
import { AutomataStyle } from './AutomataStyle.js';
import { HelixStyle } from './HelixStyle.js';
import { CandleStyle } from './CandleStyle.js';
import { ShatterStyle } from './ShatterStyle.js';
import { NeutronStyle } from './NeutronStyle.js';
import { TorrentStyle } from './TorrentStyle.js';
import { MoireStyle } from './MoireStyle.js';
import { CascadeStyle } from './CascadeStyle.js';
import { VortexStyle } from './VortexStyle.js';
import { NebulaStyle } from './NebulaStyle.js';
import { TidalStyle } from './TidalStyle.js';
import { MirageStyle } from './MirageStyle.js';

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
export { PaintedStyle } from './PaintedStyle.js';
export { ImageScrollStyle } from './ImageScrollStyle.js';
export { DataStreamStyle } from './DataStreamStyle.js';
export { GravityStyle } from './GravityStyle.js';
export { EmberStyle } from './EmberStyle.js';
export { AutomataStyle } from './AutomataStyle.js';
export { HelixStyle } from './HelixStyle.js';
export { CandleStyle } from './CandleStyle.js';
export { ShatterStyle } from './ShatterStyle.js';
export { NeutronStyle } from './NeutronStyle.js';
export { TorrentStyle } from './TorrentStyle.js';
export { MoireStyle } from './MoireStyle.js';
export { CascadeStyle } from './CascadeStyle.js';
export { VortexStyle } from './VortexStyle.js';
export { NebulaStyle } from './NebulaStyle.js';
export { TidalStyle } from './TidalStyle.js';
export { MirageStyle } from './MirageStyle.js';

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
  painted: () => new PaintedStyle(),
  imageScroll: () => new ImageScrollStyle(),
  dataStream: () => new DataStreamStyle(),
  gravity: () => new GravityStyle(),
  ember: () => new EmberStyle(),
  automata: () => new AutomataStyle(),
  helix: () => new HelixStyle(),
  candle: () => new CandleStyle(),
  shatter: () => new ShatterStyle(),
  neutron: () => new NeutronStyle(),
  torrent: () => new TorrentStyle(),
  moire: () => new MoireStyle(),
  cascade: () => new CascadeStyle(),
  vortex: () => new VortexStyle(),
  nebula: () => new NebulaStyle(),
  tidal: () => new TidalStyle(),
  mirage: () => new MirageStyle(),
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

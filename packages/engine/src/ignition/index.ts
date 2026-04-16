import type { IgnitionAnimation } from '../types.js';
import { StandardIgnition } from './StandardIgnition.js';
import { ScrollIgnition } from './ScrollIgnition.js';
import { CenterIgnition } from './CenterIgnition.js';
import { SparkIgnition } from './SparkIgnition.js';
import { WipeIgnition } from './WipeIgnition.js';
import { StutterIgnition } from './StutterIgnition.js';
import { GlitchIgnition } from './GlitchIgnition.js';
import { TwistIgnition } from './TwistIgnition.js';
import { SwingIgnition } from './SwingIgnition.js';
import { StabIgnition } from './StabIgnition.js';
import { CustomCurveIgnition } from './CustomCurveIgnition.js';
import { FadeoutRetraction } from './FadeoutRetraction.js';
import { ShatterRetraction } from './ShatterRetraction.js';
import { FractureIgnition } from './FractureIgnition.js';
import { FlickerOutRetraction } from './FlickerOutRetraction.js';
import { UnravelRetraction } from './UnravelRetraction.js';
import { CrackleIgnition } from './CrackleIgnition.js';
import { DissolveRetraction } from './DissolveRetraction.js';
import { FlashFillIgnition } from './FlashFillIgnition.js';
import { PulseWaveIgnition } from './PulseWaveIgnition.js';
import { DripUpIgnition } from './DripUpIgnition.js';
import { DrainRetraction } from './DrainRetraction.js';

export { BaseIgnition } from './BaseIgnition.js';
export { StandardIgnition } from './StandardIgnition.js';
export { ScrollIgnition } from './ScrollIgnition.js';
export { CenterIgnition } from './CenterIgnition.js';
export { SparkIgnition } from './SparkIgnition.js';
export { WipeIgnition } from './WipeIgnition.js';
export { StutterIgnition } from './StutterIgnition.js';
export { GlitchIgnition } from './GlitchIgnition.js';
export { TwistIgnition } from './TwistIgnition.js';
export { SwingIgnition } from './SwingIgnition.js';
export { StabIgnition } from './StabIgnition.js';
export { CustomCurveIgnition } from './CustomCurveIgnition.js';
export { FadeoutRetraction } from './FadeoutRetraction.js';
export { ShatterRetraction } from './ShatterRetraction.js';
export { FractureIgnition } from './FractureIgnition.js';
export { FlickerOutRetraction } from './FlickerOutRetraction.js';
export { UnravelRetraction } from './UnravelRetraction.js';
export { CrackleIgnition } from './CrackleIgnition.js';
export { DissolveRetraction } from './DissolveRetraction.js';
export { FlashFillIgnition } from './FlashFillIgnition.js';
export { PulseWaveIgnition } from './PulseWaveIgnition.js';
export { DripUpIgnition } from './DripUpIgnition.js';
export { DrainRetraction } from './DrainRetraction.js';

/** Registry mapping ignition style IDs to their constructors. */
export const IGNITION_REGISTRY: Record<string, () => IgnitionAnimation> = {
  standard: () => new StandardIgnition(),
  scroll: () => new ScrollIgnition(),
  center: () => new CenterIgnition(),
  spark: () => new SparkIgnition(),
  wipe: () => new WipeIgnition(),
  stutter: () => new StutterIgnition(),
  glitch: () => new GlitchIgnition(),
  twist: () => new TwistIgnition(),
  swing: () => new SwingIgnition(),
  stab: () => new StabIgnition(),
  'custom-curve': () => new CustomCurveIgnition(),
  crackle: () => new CrackleIgnition(),
  fracture: () => new FractureIgnition(),
  'flash-fill': () => new FlashFillIgnition(),
  'pulse-wave': () => new PulseWaveIgnition(),
  'drip-up': () => new DripUpIgnition(),
};

/** Registry mapping retraction style IDs to their constructors. */
export const RETRACTION_REGISTRY: Record<string, () => IgnitionAnimation> = {
  standard: () => new StandardIgnition(),
  scroll: () => new ScrollIgnition(),
  center: () => new CenterIgnition(),
  fadeout: () => new FadeoutRetraction(),
  shatter: () => new ShatterRetraction(),
  'custom-curve': () => new CustomCurveIgnition(),
  dissolve: () => new DissolveRetraction(),
  flickerOut: () => new FlickerOutRetraction(),
  unravel: () => new UnravelRetraction(),
  drain: () => new DrainRetraction(),
};

/** Create a new ignition animation instance by ID. */
export function createIgnition(id: string): IgnitionAnimation {
  const factory = IGNITION_REGISTRY[id];
  if (!factory) {
    console.warn(`Unknown ignition type: "${id}", falling back to standard`);
    return new StandardIgnition();
  }
  return factory();
}

/** Create a new retraction animation instance by ID. */
export function createRetraction(id: string): IgnitionAnimation {
  const factory = RETRACTION_REGISTRY[id];
  if (!factory) {
    console.warn(`Unknown retraction type: "${id}", falling back to standard`);
    return new StandardIgnition();
  }
  return factory();
}

import type { IgnitionAnimation } from '../types.js';
import { StandardIgnition } from './StandardIgnition.js';
import { ScrollIgnition } from './ScrollIgnition.js';
import { CenterIgnition } from './CenterIgnition.js';
import { SparkIgnition } from './SparkIgnition.js';
import { WipeIgnition } from './WipeIgnition.js';
import { StutterIgnition } from './StutterIgnition.js';
import { GlitchIgnition } from './GlitchIgnition.js';
import { FadeoutRetraction } from './FadeoutRetraction.js';
import { ShatterRetraction } from './ShatterRetraction.js';

export { BaseIgnition } from './BaseIgnition.js';
export { StandardIgnition } from './StandardIgnition.js';
export { ScrollIgnition } from './ScrollIgnition.js';
export { CenterIgnition } from './CenterIgnition.js';
export { SparkIgnition } from './SparkIgnition.js';
export { WipeIgnition } from './WipeIgnition.js';
export { StutterIgnition } from './StutterIgnition.js';
export { GlitchIgnition } from './GlitchIgnition.js';
export { FadeoutRetraction } from './FadeoutRetraction.js';
export { ShatterRetraction } from './ShatterRetraction.js';

/** Registry mapping ignition style IDs to their constructors. */
export const IGNITION_REGISTRY: Record<string, () => IgnitionAnimation> = {
  standard: () => new StandardIgnition(),
  scroll: () => new ScrollIgnition(),
  center: () => new CenterIgnition(),
  spark: () => new SparkIgnition(),
  wipe: () => new WipeIgnition(),
  stutter: () => new StutterIgnition(),
  glitch: () => new GlitchIgnition(),
};

/** Registry mapping retraction style IDs to their constructors. */
export const RETRACTION_REGISTRY: Record<string, () => IgnitionAnimation> = {
  standard: () => new StandardIgnition(),
  scroll: () => new ScrollIgnition(),
  center: () => new CenterIgnition(),
  fadeout: () => new FadeoutRetraction(),
  shatter: () => new ShatterRetraction(),
};

/** Create a new ignition animation instance by ID. */
export function createIgnition(id: string): IgnitionAnimation {
  const factory = IGNITION_REGISTRY[id];
  if (!factory) {
    throw new Error(`Unknown ignition type: ${id}`);
  }
  return factory();
}

/** Create a new retraction animation instance by ID. */
export function createRetraction(id: string): IgnitionAnimation {
  const factory = RETRACTION_REGISTRY[id];
  if (!factory) {
    throw new Error(`Unknown retraction type: ${id}`);
  }
  return factory();
}

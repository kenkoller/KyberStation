import type { BladeEffect, EffectType } from '../types.js';
import { ClashEffect } from './ClashEffect.js';
import { LockupEffect } from './LockupEffect.js';
import { BlastEffect } from './BlastEffect.js';
import { DragEffect } from './DragEffect.js';
import { MeltEffect } from './MeltEffect.js';
import { LightningEffect } from './LightningEffect.js';
import { StabEffect } from './StabEffect.js';
import { ForceEffect } from './ForceEffect.js';

export { BaseEffect } from './BaseEffect.js';
export { ClashEffect } from './ClashEffect.js';
export { LockupEffect } from './LockupEffect.js';
export { BlastEffect } from './BlastEffect.js';
export { DragEffect } from './DragEffect.js';
export { MeltEffect } from './MeltEffect.js';
export { LightningEffect } from './LightningEffect.js';
export { StabEffect } from './StabEffect.js';
export { ForceEffect } from './ForceEffect.js';

/** Registry mapping each EffectType to its constructor. */
export const EFFECT_REGISTRY: Record<EffectType, () => BladeEffect> = {
  clash: () => new ClashEffect(),
  lockup: () => new LockupEffect(),
  blast: () => new BlastEffect(),
  drag: () => new DragEffect(),
  melt: () => new MeltEffect(),
  lightning: () => new LightningEffect(),
  stab: () => new StabEffect(),
  force: () => new ForceEffect(),
};

/** Create a new effect instance by type. */
export function createEffect(type: EffectType): BladeEffect {
  const factory = EFFECT_REGISTRY[type];
  if (!factory) {
    throw new Error(`Unknown effect type: ${type}`);
  }
  return factory();
}

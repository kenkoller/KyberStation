// ─── Multi-Board Emitter Registry ───

export type { BoardEmitter, BoardEmitOptions, EmitterOutput } from './BaseEmitter.js';
export { CFXEmitter } from './CFXEmitter.js';
export { GHv3Emitter } from './GHv3Emitter.js';
export { XenopixelEmitter } from './XenopixelEmitter.js';

import type { BoardEmitter } from './BaseEmitter.js';
import { CFXEmitter } from './CFXEmitter.js';
import { GHv3Emitter } from './GHv3Emitter.js';
import { XenopixelEmitter } from './XenopixelEmitter.js';

const EMITTER_REGISTRY: Record<string, () => BoardEmitter> = {
  cfx: () => new CFXEmitter(),
  ghv3: () => new GHv3Emitter(),
  ghv4: () => new GHv3Emitter(), // GHv4 uses same format as V3
  xenopixel: () => new XenopixelEmitter(),
  'xenopixel-v2': () => new XenopixelEmitter(),
  'xenopixel-v3': () => new XenopixelEmitter(),
};

/**
 * Get a board-specific emitter by board ID.
 * Returns undefined if no emitter exists for that board
 * (ProffieOS uses the existing CodeEmitter/ConfigBuilder directly).
 */
export function getEmitter(boardId: string): BoardEmitter | undefined {
  const factory = EMITTER_REGISTRY[boardId];
  return factory ? factory() : undefined;
}

/**
 * Check if a board has a dedicated emitter.
 * ProffieOS boards don't need one — they use the existing codegen pipeline.
 */
export function hasEmitter(boardId: string): boolean {
  return boardId in EMITTER_REGISTRY;
}

/**
 * List all boards with dedicated emitters.
 */
export function listEmitterBoards(): string[] {
  return Object.keys(EMITTER_REGISTRY);
}

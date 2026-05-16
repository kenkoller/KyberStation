// ─── Multi-Board Emitter Registry ───

export type { BoardEmitter, BoardEmitOptions, EmitterOutput } from './BaseEmitter.js';
export { CFXEmitter } from './CFXEmitter.js';
export { GHv3Emitter } from './GHv3Emitter.js';
export { XenopixelEmitter } from './XenopixelEmitter.js';
export type { XenoEmitterFirmwareVersion } from './XenopixelEmitter.js';
export {
  XENO_BLADE_EFFECTS,
  XENO_IGNITION_STYLES,
  XENO_IGNITION_SPEED_MIN,
  XENO_IGNITION_SPEED_MAX,
  XENO_RETRACTION_SPEED_MIN,
  XENO_RETRACTION_SPEED_MAX,
  mapBladeEffect,
  mapIgnitionStyle,
  clampIgnitionSpeed,
  clampRetractionSpeed,
} from './XenopixelEmitter.js';
export {
  ProffieRuntimeEmitter,
  buildRuntimePresetsFile,
  buildAdvancedStyleString,
} from './ProffieRuntimeEmitter.js';
export type {
  ProffieRuntimePresetInput,
  ProffieRuntimeEmitOptions,
  AdvancedVerbParams,
} from './ProffieRuntimeEmitter.js';

import type { BoardEmitter } from './BaseEmitter.js';
import { CFXEmitter } from './CFXEmitter.js';
import { GHv3Emitter } from './GHv3Emitter.js';
import { XenopixelEmitter } from './XenopixelEmitter.js';
import { ProffieRuntimeEmitter } from './ProffieRuntimeEmitter.js';
import type { XenoEmitterFirmwareVersion } from './XenopixelEmitter.js';

/** Options for emitter creation. */
export interface EmitterOptions {
  /** Firmware version for Xenopixel emitters. Default varies by board entry. */
  firmwareVersion?: XenoEmitterFirmwareVersion;
  /**
   * Compile-time install_time string for ProffieOS runtime emitter.
   * Required for the emitted `presets.ini` to be accepted by firmware.
   * Empty string emits a placeholder the user is expected to replace.
   */
  installTime?: string;
  /** Compile-time NUM_BLADES for ProffieOS runtime emitter. Defaults to 1. */
  numBlades?: 1 | 2 | 3 | 4;
}

const EMITTER_REGISTRY: Record<string, (opts?: EmitterOptions) => BoardEmitter> = {
  cfx: () => new CFXEmitter(),
  ghv3: () => new GHv3Emitter(),
  ghv4: () => new GHv3Emitter(), // GHv4 uses same format as V3
  xenopixel: (opts) => new XenopixelEmitter(opts?.firmwareVersion ?? '1.0'),
  'xenopixel-v2': (opts) => new XenopixelEmitter(opts?.firmwareVersion ?? '1.0'),
  'xenopixel-v3': (opts) => new XenopixelEmitter(opts?.firmwareVersion ?? '1.0'),
  'proffie-runtime': (opts) =>
    new ProffieRuntimeEmitter({
      installTime: opts?.installTime ?? '',
      numBlades: opts?.numBlades ?? 1,
    }),
};

/**
 * Get a board-specific emitter by board ID.
 * Returns undefined if no emitter exists for that board
 * (ProffieOS uses the existing CodeEmitter/ConfigBuilder directly).
 *
 * For Xenopixel boards, pass `options.firmwareVersion` to configure
 * firmware-version-aware output format (default: '1.0').
 */
export function getEmitter(boardId: string, options?: EmitterOptions): BoardEmitter | undefined {
  const factory = EMITTER_REGISTRY[boardId];
  return factory ? factory(options) : undefined;
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

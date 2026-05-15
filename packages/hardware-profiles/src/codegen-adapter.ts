import type { HardwareProfile } from './types.js';

/**
 * Local mirror of `ConfigOptions` from `@kyberstation/codegen`.
 *
 * Same constraint as `BoardId` in `types.ts`: the root `.npmrc` sets
 * `symlink=false`, so package src/ trees cannot import each other at
 * `tsc` time. The mirror lets `profileToConfigOptions()` return a
 * typed value; consumers (apps/web) get the real `ConfigOptions` via
 * their own path mapping and TypeScript structurally allows the
 * assignment.
 *
 * Keep this shape in sync with `packages/codegen/src/types.ts`
 * `ConfigOptions`. If a new field lands there, mirror it here (or
 * leave it absent if the adapter doesn't need to populate it).
 */
export interface CodegenConfigOptionsLike {
  boardType: 'proffieboard_v2' | 'proffieboard_v3';
  propFile?: string;
  numBlades: number;
  numButtons: 1 | 2 | 3;
  volume: number;
  clashThresholdG: number;
  maxClashStrength: number;
  maxLedsPerStrip?: number;
  fett263Defines?: string[];
  presets: CodegenPresetEntryLike[];
  bladeConfig: CodegenBladeHardwareConfigLike[];
  orientation?: 'USB_TOWARDS_BLADE' | 'USB_TOWARDS_POMMEL' | 'USB_PORT_TOWARDS_BLADE';
  motionTimeoutMs?: number;
  enableSerial?: boolean;
}

/** Local mirror of `PresetEntry` from `@kyberstation/codegen`. */
export interface CodegenPresetEntryLike {
  fontName: string;
  trackFile?: string;
  styleCodes: string[];
  presetName: string;
}

/** Local mirror of `BladeHardwareConfig` from `@kyberstation/codegen`. */
export interface CodegenBladeHardwareConfigLike {
  type: 'ws281x' | 'subblade';
  ledCount: number;
  pin: string;
  colorOrder?: string;
  powerPins?: string[];
  subBladeStart?: number;
  subBladeEnd?: number;
}

/**
 * Translate a `HardwareProfile` into the `ConfigOptions` shape consumed
 * by `buildConfigFile()` in `@kyberstation/codegen`. Pure function: no
 * I/O, no globals; tests pin the field-by-field mapping.
 *
 * The caller provides the user's preset list (`presets`) — that data
 * is editor state, not chassis topology. The adapter wires everything
 * that's chassis-driven (board, blades, defines, orientation,
 * timeouts, serial) from `profile`.
 *
 * `maxClashStrength` is fixed at 16. The HardwareProfile spec
 * (`docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md` §4) does not
 * include it; 16 matches the current `zipExporter.ts` default and
 * keeps emit output stable when wiring this in.
 */
export function profileToConfigOptions(
  profile: HardwareProfile,
  presets: CodegenPresetEntryLike[],
): CodegenConfigOptionsLike {
  const boardType: CodegenConfigOptionsLike['boardType'] =
    profile.boardId === 'proffieboard-v2' ? 'proffieboard_v2' : 'proffieboard_v3';

  const maxLedsPerStrip = profile.blades.reduce(
    (max, blade) => Math.max(max, blade.ledCount),
    0,
  );

  const options: CodegenConfigOptionsLike = {
    boardType,
    propFile: profile.propFile,
    numBlades: profile.numBlades,
    numButtons: profile.numButtons,
    volume: profile.defaultVolume,
    clashThresholdG: profile.clashThresholdG,
    maxClashStrength: 16,
    maxLedsPerStrip: maxLedsPerStrip > 0 ? maxLedsPerStrip : undefined,
    fett263Defines: profile.propDefines.length > 0 ? profile.propDefines : undefined,
    presets,
    bladeConfig: profile.blades.map((blade) => ({
      type: 'ws281x',
      ledCount: blade.ledCount,
      pin: blade.dataPin,
      colorOrder: blade.colorOrder ?? 'Color8::GRB',
      powerPins: blade.powerPins,
    })),
    motionTimeoutMs: profile.motionTimeoutMs,
    enableSerial: profile.enableSerial,
  };

  if (profile.orientation !== undefined) {
    options.orientation = profile.orientation;
  }

  return options;
}

// ─── Xenopixel V3 Emitter ───
// Generates real Xenopixel V3 SD card config files:
//   - fontconfig.ini  (per-font preset lines — root or per-folder depending on firmware)
//   - set/config.ini  (global board settings)
//
// Xenopixel V3 uses a compact comma-delimited format for each font preset:
//   font1=(R,G,B),bladeEffect,blasterEffect,forceEffect,lockupEffect,defaultLightEffect,ignitionStyle,ignitionSpeedMs,retractionSpeedMs
//
// Firmware-version-aware (V1.0 → V1.4.0):
//   - V1.0–V1.2:   single fontconfig.ini in SD root
//   - V1.2.5+:     per-font fontconfig.ini (N/fontconfig.ini)
//   - V1.2+:       motor_crystal_chamber + bt_mode in config.ini
//   - V1.3.1+:     melt_mode + lightning_block_mode + knock_on + poke_on in config.ini
//   - V1.4.0+:     configurable in/out time per font, custom_function field in fontconfig.ini

import type { StyleNode } from '../types.js';
import type { BoardEmitter, BoardEmitOptions, EmitterOutput } from './BaseEmitter.js';

// ─── Firmware Version ───

/**
 * Supported Xenopixel V3 firmware versions.
 * Local type to avoid cross-package import from @kyberstation/boards.
 */
export type XenoEmitterFirmwareVersion = '1.0' | '1.2' | '1.2.5' | '1.3.1' | '1.4.0';

/**
 * Feature flags derived from firmware version.
 * Matches the shape in @kyberstation/boards but kept local for decoupling.
 */
interface FirmwareCapabilities {
  perFolderFontConfig: boolean;
  motorCrystalChamber: boolean;
  btMode: boolean;
  meltEffect: boolean;
  lightningBlock: boolean;
  knockPoke: boolean;
  configurableInOutTime: boolean;
  customFunction: boolean;
}

/** Resolve capabilities from a firmware version string. */
function getFirmwareCapabilities(version: XenoEmitterFirmwareVersion): FirmwareCapabilities {
  // Parse version as a comparable number (1.0 → 100, 1.2 → 120, 1.2.5 → 125, etc.)
  const parts = version.split('.').map(Number);
  const v = parts[0] * 100 + (parts[1] ?? 0) * 10 + (parts[2] ?? 0);

  return {
    perFolderFontConfig: v >= 125,    // V1.2.5+
    motorCrystalChamber: v >= 120,    // V1.2+
    btMode: v >= 120,                 // V1.2+
    meltEffect: v >= 131,             // V1.3.1+
    lightningBlock: v >= 131,         // V1.3.1+
    knockPoke: v >= 131,              // V1.3.1+
    configurableInOutTime: v >= 140,  // V1.4.0+
    customFunction: v >= 140,         // V1.4.0+
  };
}

// ─── Xenopixel V3 Interfaces ───

export interface XenoPresetOptions {
  presetName: string;
  fontName: string;
  baseColor: { r: number; g: number; b: number };
  bladeEffect: number;         // 0-7
  blasterEffect: number;       // 0-2
  forceEffect: number;         // 0-1
  lockupEffect: number;        // 0 (only option)
  defaultLightEffect: number;  // 0-2
  ignitionStyle: number;       // 0-11
  ignitionSpeedMs: number;     // typically 100-800
  retractionSpeedMs: number;   // typically 200-1000
  /** V1.4.0+: per-font in time override (ms). undefined = use global PowerOnTime. */
  inTimeMs?: number;
  /** V1.4.0+: per-font out time override (ms). undefined = use global PowerOffTime. */
  outTimeMs?: number;
  /** V1.4.0+: custom function field. undefined = omit. */
  customFunction?: number;
}

export interface XenoGlobalSettings {
  pixelNumber: number;           // blade LED count, default 133
  motionControl: boolean;
  pullPushOn: boolean;
  pushPullOff: boolean;
  pushSensitivity: number;       // default 18
  pullSensitivity: number;       // default 13
  swingOn: boolean;
  swingSensitivity: number;      // default 1100
  twistOn: boolean;
  twistOff: boolean;
  twistSensitivity: number;      // default 220
  volume: number;                // 0-100, default 80
  velocityMode: boolean;
  torchMode: boolean;
  multiblockMode: boolean;
  multilockMode: boolean;
  lightningBlockMode: boolean;
  blasterMode: boolean;
  ghostMode: boolean;
  countdown: boolean;
  flashOnClash: boolean;
  clashSensitivity: number;      // default 2.0
  powerOnTime: number;           // ms, default 2000
  powerOffTime: number;          // ms, default 10000
  /** V1.2+: motor crystal chamber toggle */
  motorCrystalChamber?: boolean;
  /** V1.2+: Bluetooth mode toggle */
  btMode?: boolean;
  /** V1.3.1+: melt effect mode */
  meltMode?: boolean;
  /** V1.3.1+: knock gesture on */
  knockOn?: boolean;
  /** V1.3.1+: poke gesture on */
  pokeOn?: boolean;
}

// ─── Defaults ───

const DEFAULT_GLOBAL_SETTINGS: XenoGlobalSettings = {
  pixelNumber: 133,
  motionControl: true,
  pullPushOn: true,
  pushPullOff: true,
  pushSensitivity: 18,
  pullSensitivity: 13,
  swingOn: true,
  swingSensitivity: 1100,
  twistOn: false,
  twistOff: false,
  twistSensitivity: 220,
  volume: 80,
  velocityMode: false,
  torchMode: false,
  multiblockMode: false,
  multilockMode: false,
  lightningBlockMode: false,
  blasterMode: false,
  ghostMode: false,
  countdown: true,
  flashOnClash: true,
  clashSensitivity: 2.0,
  powerOnTime: 2000,
  powerOffTime: 10000,
};

// ─── Style Mapping ───

/** Xenopixel V3 blade effect IDs (0-7) */
const XENO_BLADE_EFFECTS: Record<string, number> = {
  fire: 0,
  stable: 1,        // Steady
  unstable: 2,
  rainbow: 3,
  candy: 4,
  crystalShatter: 5, // Crack
  pulse: 6,
  flashing: 7,
};

/**
 * Map a KyberStation style name to a Xenopixel blade effect ID.
 * Returns [effectId, degradationNote | null].
 */
function mapBladeEffect(style: string): [number, string | null] {
  const direct = XENO_BLADE_EFFECTS[style];
  if (direct !== undefined) {
    return [direct, null];
  }

  // Degradation mappings — closest available Xeno equivalent
  switch (style) {
    case 'rotoscope':
      return [1, `Style "rotoscope" degraded to Steady (1)`];
    case 'gradient':
      return [1, `Style "gradient" degraded to Steady (1)`];
    case 'photon':
      return [1, `Style "photon" degraded to Steady (1)`];
    case 'plasma':
      return [0, `Style "plasma" degraded to Fire (0)`];
    case 'aurora':
      return [3, `Style "aurora" degraded to Rainbow (3)`];
    case 'cinder':
      return [0, `Style "cinder" degraded to Fire (0)`];
    case 'prism':
      return [3, `Style "prism" degraded to Rainbow (3)`];
    case 'darksaber':
      return [2, `Style "darksaber" degraded to Unstable (2)`];
    case 'dataStream':
      return [1, `Style "dataStream" degraded to Steady (1)`];
    case 'ember':
      return [0, `Style "ember" degraded to Fire (0)`];
    case 'automata':
      return [1, `Style "automata" degraded to Steady (1)`];
    case 'helix':
      return [6, `Style "helix" degraded to Pulse (6)`];
    case 'candle':
      return [0, `Style "candle" degraded to Fire (0)`];
    case 'shatter':
      return [5, `Style "shatter" degraded to Crack (5)`];
    case 'neutron':
      return [6, `Style "neutron" degraded to Pulse (6)`];
    case 'gravity':
      return [1, `Style "gravity" degraded to Steady (1)`];
    default:
      return [1, `Style "${style}" not supported by Xenopixel; defaulted to Steady (1)`];
  }
}

/** Xenopixel V3 ignition style IDs (0-11) */
const XENO_IGNITION_STYLES: Record<string, number> = {
  standard: 0,
  scroll: 1,      // Velocity
  wipe: 2,        // Torch
  spark: 3,       // Blaster
  ghost: 4,       // Ghost
};

/**
 * Map a KyberStation ignition name to a Xenopixel ignition style ID.
 * Returns [styleId, degradationNote | null].
 */
function mapIgnitionStyle(ignition: string): [number, string | null] {
  const direct = XENO_IGNITION_STYLES[ignition];
  if (direct !== undefined) {
    return [direct, null];
  }

  // Degradation mappings
  switch (ignition) {
    case 'center':
      return [0, `Ignition "center" degraded to Standard (0)`];
    case 'stutter':
      return [0, `Ignition "stutter" degraded to Standard (0)`];
    case 'glitch':
      return [4, `Ignition "glitch" degraded to Ghost (4)`];
    case 'crackle':
      return [0, `Ignition "crackle" degraded to Standard (0)`];
    case 'fracture':
      return [0, `Ignition "fracture" degraded to Standard (0)`];
    case 'flashFill':
      return [0, `Ignition "flashFill" degraded to Standard (0)`];
    case 'pulseWave':
      return [1, `Ignition "pulseWave" degraded to Velocity (1)`];
    case 'dripUp':
      return [1, `Ignition "dripUp" degraded to Velocity (1)`];
    default:
      return [0, `Ignition "${ignition}" not supported by Xenopixel; defaulted to Standard (0)`];
  }
}

// ─── Speed Clamping ───

const IGNITION_SPEED_MIN = 100;
const IGNITION_SPEED_MAX = 800;

const RETRACTION_SPEED_MIN = 200;
const RETRACTION_SPEED_MAX = 1000;

function clampIgnitionSpeed(ms: number): number {
  return Math.max(IGNITION_SPEED_MIN, Math.min(IGNITION_SPEED_MAX, ms));
}

function clampRetractionSpeed(ms: number): number {
  return Math.max(RETRACTION_SPEED_MIN, Math.min(RETRACTION_SPEED_MAX, ms));
}

// ─── Formatting ───

function formatRgb(c: { r: number; g: number; b: number }): string {
  const r = Math.max(0, Math.min(255, Math.round(c.r)));
  const g = Math.max(0, Math.min(255, Math.round(c.g)));
  const b = Math.max(0, Math.min(255, Math.round(c.b)));
  return `(${r},${g},${b})`;
}

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

// ─── Emitter ───

export class XenopixelEmitter implements BoardEmitter {
  readonly boardId = 'xenopixel';
  readonly boardName = 'Xenopixel V3';
  readonly formatDescription = 'Xenopixel V3 SD card config (fontconfig.ini + set/config.ini)';

  /** Active firmware version — controls output format. Default: '1.0' (widest compatibility). */
  firmwareVersion: XenoEmitterFirmwareVersion;

  constructor(firmwareVersion: XenoEmitterFirmwareVersion = '1.0') {
    this.firmwareVersion = firmwareVersion;
  }

  /** Get the resolved feature flags for the active firmware version. */
  get capabilities(): FirmwareCapabilities {
    return getFirmwareCapabilities(this.firmwareVersion);
  }

  /**
   * Generate a single fontconfig.ini line for one preset.
   * Format: fontN=(R,G,B),A,B,C,D,E,F,G,H[,inTime,outTime[,customFunction]]
   *
   * V1.4.0+ appends per-font in/out time and custom function fields.
   */
  emitFontConfigLine(fontNumber: number, options: BoardEmitOptions): { line: string; notes: string[] } {
    const notes: string[] = [];
    const caps = this.capabilities;

    // Map style → blade effect
    const [bladeEffect, styleNote] = mapBladeEffect(options.style);
    if (styleNote) notes.push(`Preset "${options.presetName}": ${styleNote}`);

    // Map ignition → ignition style
    const [ignitionStyle, ignNote] = mapIgnitionStyle(options.ignition);
    if (ignNote) notes.push(`Preset "${options.presetName}": ${ignNote}`);

    // Clamp speeds to Xeno-supported ranges
    const ignitionSpeed = clampIgnitionSpeed(options.ignitionMs);
    const retractionSpeed = clampRetractionSpeed(options.retractionMs);

    if (ignitionSpeed !== options.ignitionMs) {
      notes.push(`Preset "${options.presetName}": Ignition speed ${options.ignitionMs}ms clamped to ${ignitionSpeed}ms (range ${IGNITION_SPEED_MIN}-${IGNITION_SPEED_MAX})`);
    }
    if (retractionSpeed !== options.retractionMs) {
      notes.push(`Preset "${options.presetName}": Retraction speed ${options.retractionMs}ms clamped to ${retractionSpeed}ms (range ${RETRACTION_SPEED_MIN}-${RETRACTION_SPEED_MAX})`);
    }

    // Defaults for fields not directly mapped from BoardEmitOptions
    const blasterEffect = 0;
    const forceEffect = 0;
    const lockupEffect = 0;
    const defaultLightEffect = 0;

    const rgb = formatRgb(options.baseColor);
    let line = `font${fontNumber}=${rgb},${bladeEffect},${blasterEffect},${forceEffect},${lockupEffect},${defaultLightEffect},${ignitionStyle},${ignitionSpeed},${retractionSpeed}`;

    // V1.4.0+: append per-font in/out time + custom function
    if (caps.configurableInOutTime) {
      const xenoOpts = options as BoardEmitOptions & {
        xenoInTimeMs?: number;
        xenoOutTimeMs?: number;
        xenoCustomFunction?: number;
      };
      const inTime = xenoOpts.xenoInTimeMs ?? options.ignitionMs;
      const outTime = xenoOpts.xenoOutTimeMs ?? options.retractionMs;
      line += `,${inTime},${outTime}`;

      if (caps.customFunction) {
        const customFn = xenoOpts.xenoCustomFunction ?? 0;
        line += `,${customFn}`;
      }
    }

    return { line, notes };
  }

  /**
   * Generate fontconfig.ini content for multiple presets.
   * Each line is: fontN=(R,G,B),A,B,C,D,E,F,G,H[,inTime,outTime[,customFunction]]
   */
  emitFontConfig(presets: Array<{ options: BoardEmitOptions }>): { content: string; notes: string[] } {
    const lines: string[] = [];
    const allNotes: string[] = [];

    for (let i = 0; i < presets.length; i++) {
      const { line, notes } = this.emitFontConfigLine(i + 1, presets[i].options);
      lines.push(line);
      allNotes.push(...notes);
    }

    return {
      content: lines.join('\n') + '\n',
      notes: allNotes,
    };
  }

  /**
   * Generate config.ini with global settings.
   * This file lives in the set/ folder on the SD card.
   *
   * Output adapts to firmware version:
   *   - V1.2+: includes motor_crystal_chamber + bt_mode
   *   - V1.3.1+: includes melt_mode + knock_on + poke_on
   */
  emitGlobalConfig(settings?: Partial<XenoGlobalSettings>): string {
    const s: XenoGlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, ...settings };
    const caps = this.capabilities;

    const lines: string[] = [];

    lines.push('#Main blade length');
    lines.push(`pixel_number=${s.pixelNumber}`);
    lines.push('');

    lines.push('#Motion control');
    lines.push(`motion_control=${boolToInt(s.motionControl)}`);
    lines.push(`pull_push_on=${boolToInt(s.pullPushOn)}`);
    lines.push(`push_pull_off=${boolToInt(s.pushPullOff)}`);
    lines.push(`push_sensitivity=${s.pushSensitivity}`);
    lines.push(`pull_sensitivity=${s.pullSensitivity}`);
    lines.push(`swing_on=${boolToInt(s.swingOn)}`);
    lines.push(`swing_sensitivity=${s.swingSensitivity}`);
    lines.push(`twist_on=${boolToInt(s.twistOn)}`);
    lines.push(`twist_off=${boolToInt(s.twistOff)}`);
    lines.push(`twist_sensitivity=${s.twistSensitivity}`);

    // V1.3.1+: knock and poke gestures
    if (caps.knockPoke) {
      lines.push(`knock_on=${boolToInt(s.knockOn ?? false)}`);
      lines.push(`poke_on=${boolToInt(s.pokeOn ?? false)}`);
    }
    lines.push('');

    lines.push('#Volume');
    lines.push(`volume=${s.volume}`);
    lines.push('');

    lines.push('#Blade modes');
    lines.push(`velocity_mode=${boolToInt(s.velocityMode)}`);
    lines.push(`torch_mode=${boolToInt(s.torchMode)}`);
    lines.push(`multiblock_mode=${boolToInt(s.multiblockMode)}`);
    lines.push(`multilock_mode=${boolToInt(s.multilockMode)}`);
    lines.push(`lightning_block_mode=${boolToInt(s.lightningBlockMode)}`);
    lines.push(`blaster_mode=${boolToInt(s.blasterMode)}`);
    lines.push(`ghost_mode=${boolToInt(s.ghostMode)}`);

    // V1.3.1+: melt mode
    if (caps.meltEffect) {
      lines.push(`melt_mode=${boolToInt(s.meltMode ?? false)}`);
    }
    lines.push('');

    lines.push('#Sound');
    lines.push(`countdown=${boolToInt(s.countdown)}`);
    lines.push('');

    lines.push('#Clash');
    lines.push(`flash_on_clash=${boolToInt(s.flashOnClash)}`);
    lines.push(`clash_sensitivity=${s.clashSensitivity}`);
    lines.push('');

    lines.push('#Power timing');
    lines.push(`PowerOnTime=${s.powerOnTime}`);
    lines.push(`PowerOffTime=${s.powerOffTime}`);
    lines.push('');

    // V1.2+: motor crystal chamber + Bluetooth
    if (caps.motorCrystalChamber) {
      lines.push('#Hardware');
      lines.push(`motor_crystal_chamber=${boolToInt(s.motorCrystalChamber ?? false)}`);
    }
    if (caps.btMode) {
      lines.push(`bt_mode=${boolToInt(s.btMode ?? true)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ─── BoardEmitter Interface ───

  emit(ast: StyleNode, options: BoardEmitOptions): EmitterOutput {
    return this.emitMultiPreset([{ ast, options }]);
  }

  emitMultiPreset(presets: Array<{ ast: StyleNode; options: BoardEmitOptions }>): EmitterOutput {
    // Derive LED count for global config from the first preset
    const ledCount = presets[0]?.options.ledCount ?? 133;
    const caps = this.capabilities;

    const { content: fontConfigContent, notes } = this.emitFontConfig(
      presets.map(p => ({ options: p.options })),
    );

    const globalConfig = this.emitGlobalConfig({ pixelNumber: ledCount });

    // Build the file map based on firmware version
    const additionalFiles: Record<string, string> = {
      'set/config.ini': globalConfig,
    };

    // V1.2.5+: per-font fontconfig.ini files instead of (or in addition to) root
    if (caps.perFolderFontConfig) {
      for (let i = 0; i < presets.length; i++) {
        const fontNum = i + 1;
        const { line } = this.emitFontConfigLine(fontNum, presets[i].options);
        // Per-folder: N/fontconfig.ini contains just the single font line
        additionalFiles[`${fontNum}/fontconfig.ini`] = line + '\n';
      }
    }

    return {
      configContent: fontConfigContent,
      configFileName: 'fontconfig.ini',
      additionalFiles,
      notes: notes.length > 0 ? notes : undefined,
    };
  }
}

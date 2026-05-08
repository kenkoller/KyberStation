// ─── Xenopixel V3 SD Card Import Parser ───
// Inverse of packages/codegen/src/emitters/XenopixelEmitter.ts.
// Parses Xenopixel V3 SD card config files (set/config.ini + N/fontconfig.ini)
// and reconstructs KyberStation BladeConfig presets from them.
//
// Firmware version detection heuristic (from file structure + config.ini keys):
//   - has N/fontconfig.ini     → V1.2.5+
//   - has motor_crystal_chamber → V1.2+
//   - has melt_mode / knock_on → V1.3.1+
//   - fontconfig line has 10+  → V1.4.0+ (in/out time fields)

import type { BladeConfig, RGB } from '@kyberstation/engine';

// ─── Parsed Types ───

/**
 * Detected firmware version based on file structure + config.ini keys.
 * Matches @kyberstation/boards XenoFirmwareVersion but kept local.
 */
export type DetectedFirmwareVersion = '1.0' | '1.2' | '1.2.5' | '1.3.1' | '1.4.0';

/** Global board settings parsed from set/config.ini */
export interface XenoGlobalConfig {
  pixelNumber: number;
  motionControl: boolean;
  pullPushOn: boolean;
  pushPullOff: boolean;
  pushSensitivity: number;
  pullSensitivity: number;
  swingOn: boolean;
  swingSensitivity: number;
  twistOn: boolean;
  twistOff: boolean;
  twistSensitivity: number;
  volume: number;
  velocityMode: boolean;
  torchMode: boolean;
  multiblockMode: boolean;
  multilockMode: boolean;
  lightningBlockMode: boolean;
  blasterMode: boolean;
  ghostMode: boolean;
  countdown: boolean;
  flashOnClash: boolean;
  clashSensitivity: number;
  powerOnTime: number;
  powerOffTime: number;
  /** V1.2+: motor crystal chamber toggle (undefined if not present in config) */
  motorCrystalChamber?: boolean;
  /** V1.2+: Bluetooth mode (undefined if not present in config) */
  btMode?: boolean;
  /** V1.3.1+: melt mode toggle (undefined if not present in config) */
  meltMode?: boolean;
  /** V1.3.1+: knock gesture (undefined if not present in config) */
  knockOn?: boolean;
  /** V1.3.1+: poke gesture (undefined if not present in config) */
  pokeOn?: boolean;
}

/** Single font preset parsed from a fontconfig.ini line */
export interface XenoFontConfig {
  fontNumber: number;
  baseColor: RGB;
  bladeEffect: number;
  blasterEffect: number;
  forceEffect: number;
  lockupEffect: number;
  defaultLightEffect: number;
  ignitionStyle: number;
  ignitionSpeedMs: number;
  retractionSpeedMs: number;
  /** V1.4.0+: per-font in time override (undefined if not present) */
  inTimeMs?: number;
  /** V1.4.0+: per-font out time override (undefined if not present) */
  outTimeMs?: number;
  /** V1.4.0+: custom function field (undefined if not present) */
  customFunction?: number;
}

/** Full imported config from an SD card */
export interface ImportedXenoConfig {
  global: XenoGlobalConfig;
  fonts: XenoFontConfig[];
  bladeConfigs: BladeConfig[];
  /** Detected firmware version based on file structure + config keys */
  detectedFirmwareVersion: DetectedFirmwareVersion;
  /** Any issues encountered during parsing (non-fatal) */
  warnings: string[];
}

// ─── Defaults (mirror of XenopixelEmitter.ts DEFAULT_GLOBAL_SETTINGS) ───

const DEFAULT_GLOBAL_CONFIG: XenoGlobalConfig = {
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

// ─── Reverse Mappings (effect ID → KyberStation style name) ───

/**
 * Blade effect ID (0-7) → KyberStation style string.
 * Inverse of XenopixelEmitter's XENO_BLADE_EFFECTS mapping.
 * All 8 blade effects map to their corresponding KyberStation style IDs.
 */
const BLADE_EFFECT_TO_STYLE: Record<number, string> = {
  0: 'fire',
  1: 'stable',
  2: 'unstable',
  3: 'rainbow',
  4: 'candy',
  5: 'crystalShatter',
  6: 'pulse',
  7: 'flashing',
};

/**
 * Ignition style ID (0-11) → KyberStation ignition string.
 * Inverse of XenopixelEmitter's XENO_IGNITION_STYLES mapping.
 * IDs 5-11 are special preon ignitions with no direct equivalent;
 * they fall back to 'standard'.
 */
const IGNITION_STYLE_TO_IGNITION: Record<number, string> = {
  0: 'standard',
  1: 'scroll',       // Velocity
  2: 'wipe',         // Torch
  3: 'spark',        // Blaster
  4: 'standard',     // Ghost → closest is standard (emitter maps glitch→ghost)
};
// IDs 5-11 are special preon ignitions; handled by the lookup function below.

// ─── INI Parsing Helpers ───

/**
 * Parse a single INI-style key=value line. Returns null for comments,
 * blank lines, and section headers.
 */
function parseIniLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();

  // Skip empty lines, comments, and section headers
  if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('[')) {
    return null;
  }

  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;

  const key = trimmed.slice(0, eqIndex).trim().toLowerCase();
  const value = trimmed.slice(eqIndex + 1).trim();

  return { key, value };
}

function parseIntSafe(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatSafe(value: string, fallback: number): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolInt(value: string): boolean {
  return value.trim() === '1';
}

/**
 * Parse an RGB tuple string like "(R,G,B)" → RGB object.
 * Handles whitespace inside the parens. Returns null on parse failure.
 */
function parseRgbTuple(value: string): RGB | null {
  // Match (R,G,B) with optional whitespace
  const match = value.match(/\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!match) return null;

  const r = Math.max(0, Math.min(255, parseInt(match[1], 10)));
  const g = Math.max(0, Math.min(255, parseInt(match[2], 10)));
  const b = Math.max(0, Math.min(255, parseInt(match[3], 10)));

  return { r, g, b };
}

// ─── config.ini Parser ───

/**
 * Parse a Xenopixel V3 `set/config.ini` file content into a XenoGlobalConfig.
 * Unknown keys are silently ignored. Missing keys get default values.
 */
export function parseXenoConfigIni(content: string): XenoGlobalConfig {
  const config = { ...DEFAULT_GLOBAL_CONFIG };
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const parsed = parseIniLine(line);
    if (!parsed) continue;

    const { key, value } = parsed;

    switch (key) {
      case 'pixel_number':
        config.pixelNumber = parseIntSafe(value, config.pixelNumber);
        break;
      case 'motion_control':
        config.motionControl = parseBoolInt(value);
        break;
      case 'pull_push_on':
        config.pullPushOn = parseBoolInt(value);
        break;
      case 'push_pull_off':
        config.pushPullOff = parseBoolInt(value);
        break;
      case 'push_sensitivity':
        config.pushSensitivity = parseIntSafe(value, config.pushSensitivity);
        break;
      case 'pull_sensitivity':
        config.pullSensitivity = parseIntSafe(value, config.pullSensitivity);
        break;
      case 'swing_on':
        config.swingOn = parseBoolInt(value);
        break;
      case 'swing_sensitivity':
        config.swingSensitivity = parseIntSafe(value, config.swingSensitivity);
        break;
      case 'twist_on':
        config.twistOn = parseBoolInt(value);
        break;
      case 'twist_off':
        config.twistOff = parseBoolInt(value);
        break;
      case 'twist_sensitivity':
        config.twistSensitivity = parseIntSafe(value, config.twistSensitivity);
        break;
      case 'volume':
        config.volume = parseIntSafe(value, config.volume);
        break;
      case 'velocity_mode':
        config.velocityMode = parseBoolInt(value);
        break;
      case 'torch_mode':
        config.torchMode = parseBoolInt(value);
        break;
      case 'multiblock_mode':
        config.multiblockMode = parseBoolInt(value);
        break;
      case 'multilock_mode':
        config.multilockMode = parseBoolInt(value);
        break;
      case 'lightning_block_mode':
        config.lightningBlockMode = parseBoolInt(value);
        break;
      case 'blaster_mode':
        config.blasterMode = parseBoolInt(value);
        break;
      case 'ghost_mode':
        config.ghostMode = parseBoolInt(value);
        break;
      case 'countdown':
        config.countdown = parseBoolInt(value);
        break;
      case 'flash_on_clash':
        config.flashOnClash = parseBoolInt(value);
        break;
      case 'clash_sensitivity':
        config.clashSensitivity = parseFloatSafe(value, config.clashSensitivity);
        break;
      // Note: emitter writes these as PascalCase (PowerOnTime / PowerOffTime)
      // but we match case-insensitively via the toLowerCase() above
      case 'powerontime':
        config.powerOnTime = parseIntSafe(value, config.powerOnTime);
        break;
      case 'powerofftime':
        config.powerOffTime = parseIntSafe(value, config.powerOffTime);
        break;

      // V1.2+ keys
      case 'motor_crystal_chamber':
        config.motorCrystalChamber = parseBoolInt(value);
        break;
      case 'bt_mode':
        config.btMode = parseBoolInt(value);
        break;

      // V1.3.1+ keys
      case 'melt_mode':
        config.meltMode = parseBoolInt(value);
        break;
      case 'knock_on':
        config.knockOn = parseBoolInt(value);
        break;
      case 'poke_on':
        config.pokeOn = parseBoolInt(value);
        break;
    }
  }

  return config;
}

// ─── fontconfig.ini Parser ───

/**
 * Parse a single fontconfig.ini line in the format:
 *   fontN=(R,G,B),bladeEffect,blasterEffect,forceEffect,lockupEffect,defaultLightEffect,ignitionStyle,ignitionSpeedMs,retractionSpeedMs
 *
 * Returns null if the line doesn't match the expected format.
 */
function parseFontConfigLine(line: string): XenoFontConfig | null {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) {
    return null;
  }

  // Match fontN=...
  const fontMatch = trimmed.match(/^font(\d+)\s*=\s*(.+)$/i);
  if (!fontMatch) return null;

  const fontNumber = parseInt(fontMatch[1], 10);
  const rest = fontMatch[2];

  // The value is: (R,G,B),A,B,C,D,E,F,G,H
  // First, extract the RGB tuple
  const rgbMatch = rest.match(/^\(([^)]*)\)\s*,?\s*(.*)/);
  if (!rgbMatch) return null;

  const rgbPart = `(${rgbMatch[1]})`;
  const rgb = parseRgbTuple(rgbPart);
  if (!rgb) return null;

  // The remaining fields are comma-separated numbers
  const fields = rgbMatch[2].split(',').map(s => s.trim());

  const result: XenoFontConfig = {
    fontNumber,
    baseColor: rgb,
    bladeEffect: parseIntSafe(fields[0] ?? '', 1),
    blasterEffect: parseIntSafe(fields[1] ?? '', 0),
    forceEffect: parseIntSafe(fields[2] ?? '', 0),
    lockupEffect: parseIntSafe(fields[3] ?? '', 0),
    defaultLightEffect: parseIntSafe(fields[4] ?? '', 0),
    ignitionStyle: parseIntSafe(fields[5] ?? '', 0),
    ignitionSpeedMs: parseIntSafe(fields[6] ?? '', 300),
    retractionSpeedMs: parseIntSafe(fields[7] ?? '', 500),
  };

  // V1.4.0+ extended fields: inTime, outTime, customFunction
  if (fields.length > 8 && fields[8] !== undefined && fields[8] !== '') {
    result.inTimeMs = parseIntSafe(fields[8], result.ignitionSpeedMs);
  }
  if (fields.length > 9 && fields[9] !== undefined && fields[9] !== '') {
    result.outTimeMs = parseIntSafe(fields[9], result.retractionSpeedMs);
  }
  if (fields.length > 10 && fields[10] !== undefined && fields[10] !== '') {
    result.customFunction = parseIntSafe(fields[10], 0);
  }

  return result;
}

/**
 * Parse a Xenopixel V3 fontconfig.ini file content.
 * Returns an array of parsed font configs, one per fontN= line found.
 * Lines that don't match the expected format are silently skipped.
 */
export function parseXenoFontConfig(content: string): XenoFontConfig[] {
  const fonts: XenoFontConfig[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const font = parseFontConfigLine(line);
    if (font) {
      fonts.push(font);
    }
  }

  // Sort by font number for deterministic ordering
  fonts.sort((a, b) => a.fontNumber - b.fontNumber);
  return fonts;
}

// ─── Font → BladeConfig Conversion ───

/**
 * Look up the KyberStation style name for a Xenopixel blade effect ID.
 * Returns the style string and an optional warning if the mapping is lossy.
 */
function lookupBladeStyle(effectId: number): [string, string | null] {
  const style = BLADE_EFFECT_TO_STYLE[effectId];
  if (style !== undefined) {
    return [style, null];
  }
  return ['stable', `Unknown blade effect ID ${effectId}; defaulted to "stable"`];
}

/**
 * Look up the KyberStation ignition name for a Xenopixel ignition style ID.
 * Returns the ignition string and an optional warning if the mapping is lossy.
 */
function lookupIgnitionStyle(styleId: number): [string, string | null] {
  const ignition = IGNITION_STYLE_TO_IGNITION[styleId];
  if (ignition !== undefined) {
    if (styleId === 4) {
      return [ignition, `Ignition "Ghost Blade" (${styleId}) mapped to "standard" (closest equivalent)`];
    }
    return [ignition, null];
  }
  // IDs 5-11 are special preon ignitions
  if (styleId >= 5 && styleId <= 11) {
    const preonNames: Record<number, string> = {
      5: 'Stack', 6: 'FoldTile', 7: 'Word', 8: 'Faser',
      9: 'Scavenger', 10: 'Hunter', 11: 'Broken',
    };
    const name = preonNames[styleId] ?? 'Unknown';
    return ['standard', `Special preon ignition "${name}" (${styleId}) has no KyberStation equivalent; mapped to "standard"`];
  }
  return ['standard', `Unknown ignition style ID ${styleId}; defaulted to "standard"`];
}

/**
 * Convert a parsed XenoFontConfig to a KyberStation BladeConfig.
 * The LED count defaults to 133 (Xenopixel default) unless overridden
 * by global config during the full SD card import.
 */
export function xenoFontToBladeConfig(font: XenoFontConfig, ledCount?: number): BladeConfig {
  const [style] = lookupBladeStyle(font.bladeEffect);
  const [ignition] = lookupIgnitionStyle(font.ignitionStyle);

  return {
    name: `Xenopixel Font ${font.fontNumber}`,
    baseColor: { ...font.baseColor },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    style,
    ignition,
    retraction: 'standard',
    ignitionMs: font.ignitionSpeedMs,
    retractionMs: font.retractionSpeedMs,
    shimmer: 0.3,
    ledCount: ledCount ?? 133,
    importedSource: 'Xenopixel V3 SD Card',
    importedAt: Date.now(),
  };
}

// ─── Firmware Version Detection ───

/**
 * Detect the firmware version from SD card structure clues.
 *
 * Heuristic (highest-wins):
 *   1. Any fontconfig.ini line has 10+ comma-separated fields → V1.4.0
 *   2. config.ini has melt_mode / knock_on / poke_on → V1.3.1
 *   3. Per-folder N/fontconfig.ini files exist → V1.2.5
 *   4. config.ini has motor_crystal_chamber / bt_mode → V1.2
 *   5. Otherwise → V1.0
 */
export function detectFirmwareVersion(
  files: Map<string, string>,
  global: XenoGlobalConfig,
  fonts: XenoFontConfig[],
): DetectedFirmwareVersion {
  // Check for V1.4.0 extended fontconfig fields
  const hasExtendedFontFields = fonts.some(f =>
    f.inTimeMs !== undefined || f.outTimeMs !== undefined || f.customFunction !== undefined,
  );
  if (hasExtendedFontFields) return '1.4.0';

  // Check for V1.3.1 config.ini keys
  if (global.meltMode !== undefined || global.knockOn !== undefined || global.pokeOn !== undefined) {
    return '1.3.1';
  }

  // Check for V1.2.5 per-folder fontconfig files
  const hasPerFolderFontConfig = Array.from(files.keys()).some(path => {
    const normalized = path.replace(/\\/g, '/').toLowerCase();
    return /^\d+\/fontconfig\.ini$/.test(normalized);
  });
  if (hasPerFolderFontConfig) return '1.2.5';

  // Check for V1.2 config.ini keys
  if (global.motorCrystalChamber !== undefined || global.btMode !== undefined) {
    return '1.2';
  }

  return '1.0';
}

// ─── SD Card Orchestrator ───

/**
 * Import a full Xenopixel V3 SD card structure.
 *
 * Takes a flat map of `relative-path → file-content` (as would be read
 * from an SD card directory) and returns the fully parsed config with
 * BladeConfig presets ready for use in KyberStation.
 *
 * Expected file paths:
 *   - `set/config.ini` — global board settings
 *   - `fontconfig.ini` or `N/fontconfig.ini` — per-font preset lines
 *
 * The parser is flexible about path separators and casing.
 */
export function importXenoSdCard(files: Map<string, string>): ImportedXenoConfig {
  const warnings: string[] = [];

  // ── Parse global config ──
  let global = { ...DEFAULT_GLOBAL_CONFIG };
  const configIniKey = findFileKey(files, 'set/config.ini');
  if (configIniKey) {
    global = parseXenoConfigIni(files.get(configIniKey)!);
  } else {
    warnings.push('No set/config.ini found; using default global settings');
  }

  // ── Parse font configs ──
  const allFonts: XenoFontConfig[] = [];

  // Look for root-level fontconfig.ini (all fonts in one file)
  const rootFontConfigKey = findFileKey(files, 'fontconfig.ini');
  if (rootFontConfigKey) {
    const fonts = parseXenoFontConfig(files.get(rootFontConfigKey)!);
    allFonts.push(...fonts);
  }

  // Also look for N/fontconfig.ini patterns (per-folder)
  for (const [path, content] of files.entries()) {
    const normalized = path.replace(/\\/g, '/').toLowerCase();
    // Match e.g. "1/fontconfig.ini", "02/fontconfig.ini"
    if (/^\d+\/fontconfig\.ini$/.test(normalized) && content.trim().length > 0) {
      const folderFonts = parseXenoFontConfig(content);
      // Only add fonts that aren't already present (by font number)
      const existingNumbers = new Set(allFonts.map(f => f.fontNumber));
      for (const font of folderFonts) {
        if (!existingNumbers.has(font.fontNumber)) {
          allFonts.push(font);
          existingNumbers.add(font.fontNumber);
        }
      }
    }
  }

  // Sort by font number
  allFonts.sort((a, b) => a.fontNumber - b.fontNumber);

  if (allFonts.length === 0) {
    warnings.push('No font presets found in any fontconfig.ini file');
  }

  // ── Detect firmware version ──
  const detectedFirmwareVersion = detectFirmwareVersion(files, global, allFonts);

  // ── Convert to BladeConfigs ──
  const bladeConfigs: BladeConfig[] = [];
  for (const font of allFonts) {
    const [, styleWarning] = lookupBladeStyle(font.bladeEffect);
    if (styleWarning) warnings.push(`Font ${font.fontNumber}: ${styleWarning}`);

    const [, ignWarning] = lookupIgnitionStyle(font.ignitionStyle);
    if (ignWarning) warnings.push(`Font ${font.fontNumber}: ${ignWarning}`);

    bladeConfigs.push(xenoFontToBladeConfig(font, global.pixelNumber));
  }

  return {
    global,
    fonts: allFonts,
    bladeConfigs,
    detectedFirmwareVersion,
    warnings,
  };
}

// ─── Path Matching Helper ───

/**
 * Find a file key in the map, case-insensitive and path-separator-agnostic.
 */
function findFileKey(files: Map<string, string>, target: string): string | undefined {
  const normalizedTarget = target.replace(/\\/g, '/').toLowerCase();
  for (const key of files.keys()) {
    const normalized = key.replace(/\\/g, '/').toLowerCase();
    if (normalized === normalizedTarget) {
      return key;
    }
  }
  return undefined;
}

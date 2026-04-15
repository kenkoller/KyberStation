// ─── Config Builder ───
// Generates a complete ProffieOS config.h file from structured options.

import type { ConfigOptions, BladeHardwareConfig } from './types.js';

/** Sanitize a string for safe interpolation into C++ string literals. */
function sanitizeCppString(value: string, maxLen = 64): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .slice(0, maxLen);
}

/** Sanitize a file path for safe use in #include directives. */
function sanitizeCppPath(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_\-./]/g, '')
    .replace(/\.\./g, '')
    .slice(0, 64);
}

/**
 * Build a complete ProffieOS config.h file string.
 */
export function buildConfigFile(options: ConfigOptions): string {
  const sections: string[] = [];

  sections.push(buildConfigTop(options));
  if (options.propFile) {
    sections.push(buildConfigProp(options));
  }
  sections.push(buildConfigPresets(options));
  sections.push(buildConfigButtons(options));

  return sections.join('\n\n');
}

// ─── CONFIG_TOP ───

function buildConfigTop(options: ConfigOptions): string {
  const lines: string[] = [];
  lines.push('#ifdef CONFIG_TOP');

  // Board config
  const boardHeader =
    options.boardType === 'proffieboard_v3'
      ? 'proffieboard_v3_config.h'
      : 'proffieboard_v2_config.h';
  lines.push(`#include "${boardHeader}"`);
  lines.push(`const unsigned int maxLedsPerStrip = ${options.maxLedsPerStrip ?? 144};`);

  // Core defines
  lines.push(`#define NUM_BLADES ${options.numBlades}`);
  lines.push(`#define NUM_BUTTONS ${options.numButtons}`);
  lines.push(`#define VOLUME ${options.volume}`);
  lines.push(`#define CLASH_THRESHOLD_G ${options.clashThresholdG}`);
  lines.push(`#define ENABLE_AUDIO`);
  lines.push(`#define ENABLE_MOTION`);
  lines.push(`#define ENABLE_WS2811`);
  lines.push(`#define ENABLE_SD`);

  // Prop file
  if (options.propFile) {
    lines.push(`#define ENABLE_PROP_FILE`);
  }

  // Fett263 defines
  if (options.fett263Defines && options.fett263Defines.length > 0) {
    lines.push('');
    lines.push('// Fett263 prop defines');
    // EDIT_MODE_MENU requires ENABLE_ALL_EDIT_OPTIONS
    if (options.fett263Defines.some(d => d.includes('EDIT_MODE_MENU'))) {
      lines.push('#define ENABLE_ALL_EDIT_OPTIONS');
    }
    for (const def of options.fett263Defines) {
      lines.push(`#define ${def}`);
    }
  }

  lines.push('#endif');
  return lines.join('\n');
}

// ─── CONFIG_PROP ───

function buildConfigProp(options: ConfigOptions): string {
  const lines: string[] = [];
  lines.push('#ifdef CONFIG_PROP');
  lines.push(`#include "../props/${sanitizeCppPath(options.propFile!)}"`);
  lines.push('#endif');
  return lines.join('\n');
}

// ─── CONFIG_PRESETS ───

function buildConfigPresets(options: ConfigOptions): string {
  const lines: string[] = [];
  lines.push('#ifdef CONFIG_PRESETS');

  // Presets array
  lines.push('Preset presets[] = {');
  for (const preset of options.presets) {
    const trackPart = preset.trackFile ? `"${sanitizeCppPath(preset.trackFile)}"` : '"tracks/track.wav"';
    lines.push(`  { "${sanitizeCppString(preset.fontName)}", ${trackPart},`);
    for (let i = 0; i < preset.styleCodes.length; i++) {
      const comma = i < preset.styleCodes.length - 1 ? ',' : ',';
      lines.push(`    ${preset.styleCodes[i]}${comma}`);
    }
    lines.push(`    "${sanitizeCppString(preset.presetName)}"`);
    lines.push('  },');
  }
  lines.push('};');

  lines.push('');

  // Blade config
  lines.push('BladeConfig blades[] = {');
  lines.push(`  { 0,`);
  for (let i = 0; i < options.bladeConfig.length; i++) {
    const blade = options.bladeConfig[i];
    const bladeStr = formatBladePtr(blade);
    const comma = i < options.bladeConfig.length - 1 ? ',' : ',';
    lines.push(`    ${bladeStr}${comma}`);
  }
  lines.push('    CONFIGARRAY(presets) }');
  lines.push('};');

  lines.push('#endif');
  return lines.join('\n');
}

// ─── CONFIG_BUTTONS ───

function buildConfigButtons(options: ConfigOptions): string {
  const lines: string[] = [];
  lines.push('#ifdef CONFIG_BUTTONS');

  if (options.numButtons === 1) {
    lines.push('Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");');
  } else if (options.numButtons >= 2) {
    lines.push('Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");');
    lines.push('Button AuxButton(BUTTON_AUX, auxPin, "aux");');
  }

  lines.push('#endif');
  return lines.join('\n');
}

// ─── Blade Pointer Formatting ───

function formatBladePtr(blade: BladeHardwareConfig): string {
  const colorOrder = blade.colorOrder ?? 'Color8::GRB';
  const powerPins = blade.powerPins ?? ['bladePowerPin2', 'bladePowerPin3'];
  const powerStr = powerPins.join(', ');

  if (blade.type === 'subblade' && blade.subBladeStart !== undefined && blade.subBladeEnd !== undefined) {
    return `SubBlade(${blade.subBladeStart}, ${blade.subBladeEnd}, WS281XBladePtr<${blade.ledCount}, ${blade.pin}, ${colorOrder}, PowerPINS<${powerStr}>>())`;
  }

  return `WS281XBladePtr<${blade.ledCount}, ${blade.pin}, ${colorOrder}, PowerPINS<${powerStr}>>()`;
}

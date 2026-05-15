import { describe, it, expect } from 'vitest';
import type { CodegenPresetEntryLike } from '../src/index.js';
import {
  profileToConfigOptions,
  SABERS89_V3_9,
  STOCK_PROFFIEBOARD_V3,
} from '../src/index.js';

const SAMPLE_PRESETS: CodegenPresetEntryLike[] = [
  {
    fontName: 'SmthJedi',
    styleCodes: ['StylePtr<Black>()'],
    presetName: 'Test',
  },
];

describe('profileToConfigOptions — stock-proffieboard-v3', () => {
  const options = profileToConfigOptions(STOCK_PROFFIEBOARD_V3, SAMPLE_PRESETS);

  it('maps boardId to proffieboard_v3', () => {
    expect(options.boardType).toBe('proffieboard_v3');
  });

  it('passes through numBlades / numButtons / volume / clashThresholdG', () => {
    expect(options.numBlades).toBe(1);
    expect(options.numButtons).toBe(2);
    expect(options.volume).toBe(2000);
    expect(options.clashThresholdG).toBe(3.0);
  });

  it('uses propFile from the profile', () => {
    expect(options.propFile).toBe('saber_fett263_buttons.h');
  });

  it('forwards propDefines as fett263Defines', () => {
    expect(options.fett263Defines).toEqual([
      'FETT263_EDIT_MODE_MENU',
      'FETT263_MULTI_PHASE',
    ]);
  });

  it('omits orientation when the profile leaves it undefined', () => {
    expect(options.orientation).toBeUndefined();
  });

  it('omits enableSerial when the profile sets it false', () => {
    expect(options.enableSerial).toBe(false);
  });

  it('passes motionTimeoutMs through', () => {
    expect(options.motionTimeoutMs).toBe(180000);
  });

  it('produces a single 144-LED bladePin config matching ConfigBuilder defaults', () => {
    expect(options.bladeConfig).toHaveLength(1);
    expect(options.bladeConfig[0]).toEqual({
      type: 'ws281x',
      ledCount: 144,
      pin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
    });
  });

  it('derives maxLedsPerStrip from the largest blade', () => {
    expect(options.maxLedsPerStrip).toBe(144);
  });

  it('uses maxClashStrength 16 (stable default)', () => {
    expect(options.maxClashStrength).toBe(16);
  });

  it('forwards the preset list unchanged', () => {
    expect(options.presets).toBe(SAMPLE_PRESETS);
  });
});

describe('profileToConfigOptions — 89sabers-v3.9', () => {
  const options = profileToConfigOptions(SABERS89_V3_9, SAMPLE_PRESETS);

  it('produces a dual-blade bladeConfig', () => {
    expect(options.numBlades).toBe(2);
    expect(options.bladeConfig).toHaveLength(2);
  });

  it('maps the 128-LED main blade on bladePin', () => {
    expect(options.bladeConfig[0]).toEqual({
      type: 'ws281x',
      ledCount: 128,
      pin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
    });
  });

  it('maps the 30-LED crystal blade on blade2Pin', () => {
    expect(options.bladeConfig[1]).toEqual({
      type: 'ws281x',
      ledCount: 30,
      pin: 'blade2Pin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin4', 'bladePowerPin5'],
    });
  });

  it('derives maxLedsPerStrip from the largest blade (128)', () => {
    expect(options.maxLedsPerStrip).toBe(128);
  });

  it('sets orientation to USB_TOWARDS_BLADE', () => {
    expect(options.orientation).toBe('USB_TOWARDS_BLADE');
  });

  it('enables serial for the Bluetooth-equipped chassis', () => {
    expect(options.enableSerial).toBe(true);
  });

  it('captures MOTION_TIMEOUT=144000 from the line-44 redefinition', () => {
    expect(options.motionTimeoutMs).toBe(144000);
  });

  it('forwards all 14 propDefines as fett263Defines', () => {
    expect(options.fett263Defines).toHaveLength(14);
    expect(options.fett263Defines).toContain('FETT263_MULTI_PHASE');
    expect(options.fett263Defines).toContain('FETT263_SWING_ON_SPEED 500');
    expect(options.fett263Defines).toContain('DISABLE_DIAGNOSTIC_COMMANDS');
  });

  it('uses VOLUME 1800 and CLASH_THRESHOLD_G 4.5', () => {
    expect(options.volume).toBe(1800);
    expect(options.clashThresholdG).toBe(4.5);
  });
});

// ─── ConfigBuilder Tests ───

import { describe, it, expect } from 'vitest';
import { buildConfigFile } from '../src/index.js';
import type { ConfigOptions, PresetEntry, BladeHardwareConfig } from '../src/index.js';

// ─── Helpers ───

function makeOptions(overrides: Partial<ConfigOptions> = {}): ConfigOptions {
  return {
    boardType: 'proffieboard_v3',
    numBlades: 1,
    numButtons: 2,
    volume: 2000,
    clashThresholdG: 3,
    maxClashStrength: 16,
    presets: [
      {
        fontName: 'font1',
        trackFile: 'tracks/track1.wav',
        styleCodes: ['StylePtr<Layers<AudioFlicker<Rgb<0,0,255>,White>>>()'],
        presetName: 'Blue Blade',
      },
    ],
    bladeConfig: [
      {
        type: 'ws281x',
        ledCount: 144,
        pin: 'bladePin',
        colorOrder: 'Color8::GRB',
        powerPins: ['bladePowerPin2', 'bladePowerPin3'],
      },
    ],
    ...overrides,
  };
}

// ─── Tests ───

describe('buildConfigFile', () => {
  describe('CONFIG_TOP section', () => {
    it('contains #ifdef CONFIG_TOP', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('#ifdef CONFIG_TOP');
    });

    it('closes CONFIG_TOP with #endif', () => {
      const output = buildConfigFile(makeOptions());
      // Should have at least one #endif after CONFIG_TOP
      const topSection = output.split('#ifdef CONFIG_PRESETS')[0];
      expect(topSection).toContain('#endif');
    });

    it('includes v3 board config for proffieboard_v3', () => {
      const output = buildConfigFile(makeOptions({ boardType: 'proffieboard_v3' }));
      expect(output).toContain('#include "proffieboard_v3_config.h"');
    });

    it('includes v2 board config for proffieboard_v2', () => {
      const output = buildConfigFile(makeOptions({ boardType: 'proffieboard_v2' }));
      expect(output).toContain('#include "proffieboard_v2_config.h"');
    });

    it('sets NUM_BLADES correctly', () => {
      const output = buildConfigFile(makeOptions({ numBlades: 3 }));
      expect(output).toContain('#define NUM_BLADES 3');
    });

    it('sets NUM_BUTTONS correctly', () => {
      const output = buildConfigFile(makeOptions({ numButtons: 1 }));
      expect(output).toContain('#define NUM_BUTTONS 1');
    });

    it('sets VOLUME correctly', () => {
      const output = buildConfigFile(makeOptions({ volume: 1500 }));
      expect(output).toContain('#define VOLUME 1500');
    });

    it('sets CLASH_THRESHOLD_G correctly', () => {
      const output = buildConfigFile(makeOptions({ clashThresholdG: 4 }));
      expect(output).toContain('#define CLASH_THRESHOLD_G 4');
    });

    it('includes standard enables', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('#define ENABLE_AUDIO');
      expect(output).toContain('#define ENABLE_MOTION');
      expect(output).toContain('#define ENABLE_WS2811');
      expect(output).toContain('#define ENABLE_SD');
    });

    it('includes ENABLE_PROP_FILE when propFile is set', () => {
      const output = buildConfigFile(makeOptions({ propFile: 'saber_fett263_buttons.h' }));
      expect(output).toContain('#define ENABLE_PROP_FILE');
    });

    it('does not include ENABLE_PROP_FILE when propFile is not set', () => {
      const output = buildConfigFile(makeOptions({ propFile: undefined }));
      expect(output).not.toContain('#define ENABLE_PROP_FILE');
    });
  });

  describe('Fett263 defines', () => {
    it('includes Fett263 defines when specified', () => {
      const output = buildConfigFile(makeOptions({
        fett263Defines: ['FETT263_TWIST_ON', 'FETT263_TWIST_OFF'],
      }));
      expect(output).toContain('#define FETT263_TWIST_ON');
      expect(output).toContain('#define FETT263_TWIST_OFF');
    });

    it('includes Fett263 prop defines comment', () => {
      const output = buildConfigFile(makeOptions({
        fett263Defines: ['FETT263_TWIST_ON'],
      }));
      expect(output).toContain('// Fett263 prop defines');
    });

    it('does not include Fett263 section when no defines', () => {
      const output = buildConfigFile(makeOptions({ fett263Defines: undefined }));
      expect(output).not.toContain('// Fett263 prop defines');
    });

    it('does not include Fett263 section when defines array is empty', () => {
      const output = buildConfigFile(makeOptions({ fett263Defines: [] }));
      expect(output).not.toContain('// Fett263 prop defines');
    });
  });

  describe('CONFIG_PRESETS section', () => {
    it('contains #ifdef CONFIG_PRESETS', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('#ifdef CONFIG_PRESETS');
    });

    it('includes prop file path when specified', () => {
      const output = buildConfigFile(makeOptions({ propFile: 'saber_fett263_buttons.h' }));
      expect(output).toContain('#include "../props/saber_fett263_buttons.h"');
    });

    it('does not include prop file include when not specified', () => {
      const output = buildConfigFile(makeOptions({ propFile: undefined }));
      expect(output).not.toContain('#include "../props/');
    });

    it('contains Preset presets[] array', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('Preset presets[] = {');
    });

    it('includes font name in preset entry', () => {
      const output = buildConfigFile(makeOptions({
        presets: [{
          fontName: 'SmthJedi',
          styleCodes: ['StylePtr<Black>()'],
          presetName: 'Test',
        }],
      }));
      expect(output).toContain('"SmthJedi"');
    });

    it('includes track file in preset entry', () => {
      const output = buildConfigFile(makeOptions({
        presets: [{
          fontName: 'font1',
          trackFile: 'tracks/custom.wav',
          styleCodes: ['StylePtr<Black>()'],
          presetName: 'Test',
        }],
      }));
      expect(output).toContain('"tracks/custom.wav"');
    });

    it('uses default track when trackFile not specified', () => {
      const output = buildConfigFile(makeOptions({
        presets: [{
          fontName: 'font1',
          styleCodes: ['StylePtr<Black>()'],
          presetName: 'Test',
        }],
      }));
      expect(output).toContain('"tracks/track.wav"');
    });

    it('includes preset name', () => {
      const output = buildConfigFile(makeOptions({
        presets: [{
          fontName: 'font1',
          styleCodes: ['StylePtr<Black>()'],
          presetName: 'Jedi Blue',
        }],
      }));
      expect(output).toContain('"Jedi Blue"');
    });

    it('includes style codes in preset entry', () => {
      const styleCode = 'StylePtr<Layers<AudioFlicker<Rgb<0,0,255>,White>>>()';
      const output = buildConfigFile(makeOptions({
        presets: [{
          fontName: 'font1',
          styleCodes: [styleCode],
          presetName: 'Test',
        }],
      }));
      expect(output).toContain(styleCode);
    });

    it('handles multiple presets', () => {
      const output = buildConfigFile(makeOptions({
        presets: [
          { fontName: 'font1', styleCodes: ['StylePtr<Black>()'], presetName: 'First' },
          { fontName: 'font2', styleCodes: ['StylePtr<White>()'], presetName: 'Second' },
        ],
      }));
      expect(output).toContain('"font1"');
      expect(output).toContain('"font2"');
      expect(output).toContain('"First"');
      expect(output).toContain('"Second"');
    });
  });

  describe('blade configuration', () => {
    it('contains BladeConfig blades[] array', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('BladeConfig blades[] = {');
    });

    it('formats ws281x blade correctly', () => {
      const output = buildConfigFile(makeOptions({
        bladeConfig: [{
          type: 'ws281x',
          ledCount: 144,
          pin: 'bladePin',
          colorOrder: 'Color8::GRB',
          powerPins: ['bladePowerPin2', 'bladePowerPin3'],
        }],
      }));
      expect(output).toContain('WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3>>()');
    });

    it('formats subblade correctly', () => {
      const output = buildConfigFile(makeOptions({
        bladeConfig: [{
          type: 'subblade',
          ledCount: 144,
          pin: 'bladePin',
          colorOrder: 'Color8::GRB',
          powerPins: ['bladePowerPin2'],
          subBladeStart: 0,
          subBladeEnd: 72,
        }],
      }));
      expect(output).toContain('SubBlade(0, 72, WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin2>>())');
    });

    it('uses default colorOrder and powerPins when not specified', () => {
      const output = buildConfigFile(makeOptions({
        bladeConfig: [{
          type: 'ws281x',
          ledCount: 100,
          pin: 'bladePin',
        }],
      }));
      expect(output).toContain('Color8::GRB');
      expect(output).toContain('bladePowerPin2, bladePowerPin3');
    });

    it('includes CONFIGARRAY(presets) in blade config', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('CONFIGARRAY(presets)');
    });

    it('handles multiple blade configs', () => {
      const output = buildConfigFile(makeOptions({
        bladeConfig: [
          { type: 'ws281x', ledCount: 144, pin: 'bladePin' },
          { type: 'ws281x', ledCount: 5, pin: 'blade2Pin' },
        ],
      }));
      expect(output).toContain('WS281XBladePtr<144, bladePin');
      expect(output).toContain('WS281XBladePtr<5, blade2Pin');
    });
  });

  describe('CONFIG_BUTTONS section', () => {
    it('contains #ifdef CONFIG_BUTTONS', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('#ifdef CONFIG_BUTTONS');
    });

    it('includes PowerButton for 1-button config', () => {
      const output = buildConfigFile(makeOptions({ numButtons: 1 }));
      expect(output).toContain('Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");');
    });

    it('does not include AuxButton for 1-button config', () => {
      const output = buildConfigFile(makeOptions({ numButtons: 1 }));
      expect(output).not.toContain('AuxButton');
    });

    it('includes both PowerButton and AuxButton for 2-button config', () => {
      const output = buildConfigFile(makeOptions({ numButtons: 2 }));
      expect(output).toContain('Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");');
      expect(output).toContain('Button AuxButton(BUTTON_AUX, auxPin, "aux");');
    });

    it('includes both buttons for 3-button config', () => {
      const output = buildConfigFile(makeOptions({ numButtons: 3 }));
      expect(output).toContain('Button PowerButton');
      expect(output).toContain('Button AuxButton');
    });
  });

  describe('overall structure', () => {
    it('contains all three section guards', () => {
      const output = buildConfigFile(makeOptions());
      expect(output).toContain('#ifdef CONFIG_TOP');
      expect(output).toContain('#ifdef CONFIG_PRESETS');
      expect(output).toContain('#ifdef CONFIG_BUTTONS');
    });

    it('sections appear in correct order: TOP, PRESETS, BUTTONS', () => {
      const output = buildConfigFile(makeOptions());
      const topIdx = output.indexOf('#ifdef CONFIG_TOP');
      const presetsIdx = output.indexOf('#ifdef CONFIG_PRESETS');
      const buttonsIdx = output.indexOf('#ifdef CONFIG_BUTTONS');
      expect(topIdx).toBeLessThan(presetsIdx);
      expect(presetsIdx).toBeLessThan(buttonsIdx);
    });

    it('has three #endif directives', () => {
      const output = buildConfigFile(makeOptions());
      const endifCount = (output.match(/#endif/g) || []).length;
      expect(endifCount).toBe(3);
    });
  });
});

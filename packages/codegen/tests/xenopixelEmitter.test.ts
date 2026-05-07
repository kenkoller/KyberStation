// ─── Xenopixel V3 Emitter Tests ───

import { describe, it, expect } from 'vitest';
import { XenopixelEmitter } from '../src/emitters/XenopixelEmitter.js';
import type { BoardEmitOptions } from '../src/emitters/BaseEmitter.js';
import type { StyleNode } from '../src/types.js';

// ─── Helpers ───

/** Minimal AST node — Xenopixel emitter doesn't consume the AST directly */
function dummyAst(): StyleNode {
  return { type: 'template', name: 'Layers', args: [] };
}

function makeOptions(overrides: Partial<BoardEmitOptions> = {}): BoardEmitOptions {
  return {
    presetName: 'Obi-Wan',
    fontName: 'obiwan',
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    ledCount: 144,
    ...overrides,
  };
}

// ─── Tests ───

describe('XenopixelEmitter', () => {
  const emitter = new XenopixelEmitter();

  describe('metadata', () => {
    it('reports correct board identity', () => {
      expect(emitter.boardId).toBe('xenopixel');
      expect(emitter.boardName).toBe('Xenopixel V3');
      expect(emitter.formatDescription).toContain('fontconfig.ini');
      expect(emitter.formatDescription).toContain('config.ini');
    });
  });

  // ── Single Preset fontconfig.ini ──

  describe('emitFontConfigLine', () => {
    it('generates correct format for a basic preset', () => {
      const opts = makeOptions();
      const { line, notes } = emitter.emitFontConfigLine(1, opts);

      // font1=(0,0,255),1,0,0,0,0,0,300,500
      expect(line).toBe('font1=(0,0,255),1,0,0,0,0,0,300,500');
      expect(notes).toHaveLength(0);
    });

    it('uses correct font number in prefix', () => {
      const { line } = emitter.emitFontConfigLine(5, makeOptions());
      expect(line).toMatch(/^font5=/);
    });

    it('formats RGB correctly with clamping', () => {
      const opts = makeOptions({ baseColor: { r: 128, g: 64, b: 200 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toMatch(/^font1=\(128,64,200\),/);
    });

    it('clamps RGB values to 0-255 range', () => {
      const opts = makeOptions({ baseColor: { r: -10, g: 300, b: 128.7 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toMatch(/^font1=\(0,255,129\),/);
    });
  });

  // ── Multi-Preset fontconfig.ini ──

  describe('emitFontConfig', () => {
    it('generates multiple font lines', () => {
      const presets = [
        { options: makeOptions({ presetName: 'Obi-Wan', baseColor: { r: 0, g: 0, b: 255 } }) },
        { options: makeOptions({ presetName: 'Vader', baseColor: { r: 255, g: 0, b: 0 }, style: 'unstable' }) },
        { options: makeOptions({ presetName: 'Yoda', baseColor: { r: 0, g: 255, b: 0 } }) },
      ];

      const { content, notes } = emitter.emitFontConfig(presets);
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toMatch(/^font1=/);
      expect(lines[1]).toMatch(/^font2=/);
      expect(lines[2]).toMatch(/^font3=/);
    });

    it('ends with a trailing newline', () => {
      const { content } = emitter.emitFontConfig([{ options: makeOptions() }]);
      expect(content).toMatch(/\n$/);
    });
  });

  // ── Style-to-Effect Mapping ──

  describe('blade effect mapping', () => {
    const directMappings: Array<[string, number, string]> = [
      ['fire', 0, 'Fire'],
      ['stable', 1, 'Steady'],
      ['unstable', 2, 'Unstable'],
      ['rainbow', 3, 'Rainbow'],
      ['candy', 4, 'Candy'],
      ['crystalShatter', 5, 'Crack'],
      ['pulse', 6, 'Pulse'],
      ['flashing', 7, 'Flashing'],
    ];

    it.each(directMappings)(
      'maps "%s" directly to effect %d (%s)',
      (style, expectedId) => {
        const opts = makeOptions({ style });
        const { line, notes } = emitter.emitFontConfigLine(1, opts);
        // Effect ID is the first field after the RGB tuple
        const afterRgb = line.split('),')[1];
        const effectId = Number(afterRgb.split(',')[0]);
        expect(effectId).toBe(expectedId);
        expect(notes.filter(n => n.includes('degraded') || n.includes('not supported'))).toHaveLength(0);
      },
    );

    const degradedMappings: Array<[string, number]> = [
      ['rotoscope', 1],
      ['gradient', 1],
      ['photon', 1],
      ['plasma', 0],
      ['aurora', 3],
      ['cinder', 0],
      ['prism', 3],
      ['darksaber', 2],
      ['dataStream', 1],
      ['ember', 0],
      ['automata', 1],
      ['helix', 6],
      ['candle', 0],
      ['shatter', 5],
      ['neutron', 6],
      ['gravity', 1],
    ];

    it.each(degradedMappings)(
      'degrades "%s" to effect %d with a note',
      (style, expectedId) => {
        const opts = makeOptions({ style });
        const { line, notes } = emitter.emitFontConfigLine(1, opts);
        const afterRgb = line.split('),')[1];
        const effectId = Number(afterRgb.split(',')[0]);
        expect(effectId).toBe(expectedId);
        expect(notes.some(n => n.includes('degraded') || n.includes('not supported'))).toBe(true);
      },
    );

    it('falls back to Steady (1) for completely unknown styles', () => {
      const opts = makeOptions({ style: 'nonexistent_style_xyz' });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const effectId = Number(afterRgb.split(',')[0]);
      expect(effectId).toBe(1);
      expect(notes.some(n => n.includes('not supported'))).toBe(true);
    });
  });

  // ── Ignition-to-Style Mapping ──

  describe('ignition style mapping', () => {
    const directMappings: Array<[string, number, string]> = [
      ['standard', 0, 'Standard'],
      ['scroll', 1, 'Velocity'],
      ['wipe', 2, 'Torch'],
      ['spark', 3, 'Blaster'],
      ['ghost', 4, 'Ghost'],
    ];

    it.each(directMappings)(
      'maps "%s" directly to ignition style %d (%s)',
      (ignition, expectedId) => {
        const opts = makeOptions({ ignition });
        const { line, notes } = emitter.emitFontConfigLine(1, opts);
        // Ignition style is field index 5 after the RGB close-paren
        const afterRgb = line.split('),')[1];
        const fields = afterRgb.split(',');
        const ignitionId = Number(fields[5]);
        expect(ignitionId).toBe(expectedId);
        expect(notes.filter(n => n.includes('Ignition'))).toHaveLength(0);
      },
    );

    const degradedIgnitions: Array<[string, number]> = [
      ['center', 0],
      ['stutter', 0],
      ['glitch', 4],
      ['crackle', 0],
      ['fracture', 0],
      ['flashFill', 0],
      ['pulseWave', 1],
      ['dripUp', 1],
    ];

    it.each(degradedIgnitions)(
      'degrades ignition "%s" to style %d with a note',
      (ignition, expectedId) => {
        const opts = makeOptions({ ignition });
        const { line, notes } = emitter.emitFontConfigLine(1, opts);
        const afterRgb = line.split('),')[1];
        const fields = afterRgb.split(',');
        const ignitionId = Number(fields[5]);
        expect(ignitionId).toBe(expectedId);
        expect(notes.some(n => n.includes('Ignition') && (n.includes('degraded') || n.includes('not supported')))).toBe(true);
      },
    );

    it('falls back to Standard (0) for unknown ignitions', () => {
      const opts = makeOptions({ ignition: 'nonexistent_ignition_xyz' });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      const ignitionId = Number(fields[5]);
      expect(ignitionId).toBe(0);
      expect(notes.some(n => n.includes('not supported'))).toBe(true);
    });
  });

  // ── Speed Clamping ──

  describe('speed clamping', () => {
    it('clamps ignition speed below minimum (100ms)', () => {
      const opts = makeOptions({ ignitionMs: 50 });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(Number(fields[6])).toBe(100);
      expect(notes.some(n => n.includes('clamped') && n.includes('Ignition'))).toBe(true);
    });

    it('clamps ignition speed above maximum (800ms)', () => {
      const opts = makeOptions({ ignitionMs: 1200 });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(Number(fields[6])).toBe(800);
      expect(notes.some(n => n.includes('clamped') && n.includes('Ignition'))).toBe(true);
    });

    it('clamps retraction speed below minimum (200ms)', () => {
      const opts = makeOptions({ retractionMs: 100 });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(Number(fields[7])).toBe(200);
      expect(notes.some(n => n.includes('clamped') && n.includes('Retraction'))).toBe(true);
    });

    it('clamps retraction speed above maximum (1000ms)', () => {
      const opts = makeOptions({ retractionMs: 1500 });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(Number(fields[7])).toBe(1000);
      expect(notes.some(n => n.includes('clamped') && n.includes('Retraction'))).toBe(true);
    });

    it('does not clamp speeds within range', () => {
      const opts = makeOptions({ ignitionMs: 400, retractionMs: 600 });
      const { line, notes } = emitter.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(Number(fields[6])).toBe(400);
      expect(Number(fields[7])).toBe(600);
      expect(notes.filter(n => n.includes('clamped'))).toHaveLength(0);
    });

    it('accepts boundary values without clamping', () => {
      const opts = makeOptions({ ignitionMs: 100, retractionMs: 1000 });
      const { notes } = emitter.emitFontConfigLine(1, opts);
      expect(notes.filter(n => n.includes('clamped'))).toHaveLength(0);
    });
  });

  // ── Global Config ──

  describe('emitGlobalConfig', () => {
    it('generates valid config.ini with defaults', () => {
      const config = emitter.emitGlobalConfig();

      expect(config).toContain('pixel_number=133');
      expect(config).toContain('motion_control=1');
      expect(config).toContain('pull_push_on=1');
      expect(config).toContain('push_pull_off=1');
      expect(config).toContain('push_sensitivity=18');
      expect(config).toContain('pull_sensitivity=13');
      expect(config).toContain('swing_on=1');
      expect(config).toContain('swing_sensitivity=1100');
      expect(config).toContain('twist_on=0');
      expect(config).toContain('twist_off=0');
      expect(config).toContain('twist_sensitivity=220');
      expect(config).toContain('volume=80');
      expect(config).toContain('velocity_mode=0');
      expect(config).toContain('torch_mode=0');
      expect(config).toContain('multiblock_mode=0');
      expect(config).toContain('multilock_mode=0');
      // lightning_block_mode is V1.3.1+ only — should NOT be in V1.0 default
      expect(config).not.toContain('lightning_block_mode');
      expect(config).toContain('blaster_mode=0');
      expect(config).toContain('ghost_mode=0');
      expect(config).toContain('countdown=1');
      expect(config).toContain('flash_on_clash=1');
      expect(config).toContain('clash_sensitivity=2');
      expect(config).toContain('PowerOnTime=2000');
      expect(config).toContain('PowerOffTime=10000');
    });

    it('includes section comments', () => {
      const config = emitter.emitGlobalConfig();
      expect(config).toContain('#Main blade length');
      expect(config).toContain('#Motion control');
      expect(config).toContain('#Volume');
      expect(config).toContain('#Blade modes');
      expect(config).toContain('#Sound');
      expect(config).toContain('#Clash');
      expect(config).toContain('#Power timing');
    });

    it('applies custom settings overrides', () => {
      const config = emitter.emitGlobalConfig({
        pixelNumber: 144,
        volume: 50,
        twistOn: true,
        twistOff: true,
        clashSensitivity: 3.5,
        powerOnTime: 3000,
        swingSensitivity: 900,
      });

      expect(config).toContain('pixel_number=144');
      expect(config).toContain('volume=50');
      expect(config).toContain('twist_on=1');
      expect(config).toContain('twist_off=1');
      expect(config).toContain('clash_sensitivity=3.5');
      expect(config).toContain('PowerOnTime=3000');
      expect(config).toContain('swing_sensitivity=900');
    });

    it('preserves defaults for non-overridden settings', () => {
      const config = emitter.emitGlobalConfig({ volume: 42 });
      expect(config).toContain('volume=42');
      // Everything else stays default
      expect(config).toContain('pixel_number=133');
      expect(config).toContain('motion_control=1');
      expect(config).toContain('PowerOffTime=10000');
    });

    it('converts booleans to 0/1 integers', () => {
      const configAllOff = emitter.emitGlobalConfig({
        motionControl: false,
        pullPushOn: false,
        pushPullOff: false,
        swingOn: false,
        countdown: false,
        flashOnClash: false,
      });

      expect(configAllOff).toContain('motion_control=0');
      expect(configAllOff).toContain('pull_push_on=0');
      expect(configAllOff).toContain('push_pull_off=0');
      expect(configAllOff).toContain('swing_on=0');
      expect(configAllOff).toContain('countdown=0');
      expect(configAllOff).toContain('flash_on_clash=0');
    });
  });

  // ── BoardEmitter Interface ──

  describe('emit (single preset)', () => {
    it('returns fontconfig.ini as configContent', () => {
      const result = emitter.emit(dummyAst(), makeOptions());
      expect(result.configFileName).toBe('fontconfig.ini');
      expect(result.configContent).toMatch(/^font1=/);
    });

    it('includes set/config.ini in additionalFiles', () => {
      const result = emitter.emit(dummyAst(), makeOptions());
      expect(result.additionalFiles).toBeDefined();
      expect(result.additionalFiles!['set/config.ini']).toBeDefined();
      expect(result.additionalFiles!['set/config.ini']).toContain('pixel_number=');
    });

    it('uses ledCount from options for global pixel_number', () => {
      const result = emitter.emit(dummyAst(), makeOptions({ ledCount: 144 }));
      expect(result.additionalFiles!['set/config.ini']).toContain('pixel_number=144');
    });

    it('returns undefined notes when no degradation occurred', () => {
      const result = emitter.emit(dummyAst(), makeOptions({ style: 'stable', ignition: 'standard' }));
      expect(result.notes).toBeUndefined();
    });

    it('returns degradation notes when style is approximated', () => {
      const result = emitter.emit(dummyAst(), makeOptions({ style: 'rotoscope' }));
      expect(result.notes).toBeDefined();
      expect(result.notes!.length).toBeGreaterThan(0);
      expect(result.notes!.some(n => n.includes('rotoscope'))).toBe(true);
    });
  });

  describe('emitMultiPreset', () => {
    it('generates separate font lines per preset', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ presetName: 'Preset1', baseColor: { r: 0, g: 0, b: 255 } }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'Preset2', baseColor: { r: 255, g: 0, b: 0 } }) },
      ];

      const result = emitter.emitMultiPreset(presets);
      const lines = result.configContent.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^font1=/);
      expect(lines[1]).toMatch(/^font2=/);
      // First preset is blue
      expect(lines[0]).toContain('(0,0,255)');
      // Second preset is red
      expect(lines[1]).toContain('(255,0,0)');
    });

    it('aggregates degradation notes from all presets', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ presetName: 'A', style: 'plasma' }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'B', style: 'stable' }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'C', style: 'aurora', ignition: 'stutter' }) },
      ];

      const result = emitter.emitMultiPreset(presets);
      expect(result.notes).toBeDefined();
      expect(result.notes!.some(n => n.includes('Preset "A"'))).toBe(true);
      expect(result.notes!.some(n => n.includes('Preset "C"'))).toBe(true);
      // Preset B has no degradation
      expect(result.notes!.some(n => n.includes('Preset "B"'))).toBe(false);
    });

    it('uses first preset ledCount for global config pixel_number', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ ledCount: 120 }) },
        { ast: dummyAst(), options: makeOptions({ ledCount: 144 }) },
      ];

      const result = emitter.emitMultiPreset(presets);
      expect(result.additionalFiles!['set/config.ini']).toContain('pixel_number=120');
    });

    it('defaults to 133 LEDs when no presets provided', () => {
      const result = emitter.emitMultiPreset([]);
      expect(result.additionalFiles!['set/config.ini']).toContain('pixel_number=133');
    });
  });

  // ── RGB Color Formatting ──

  describe('RGB color formatting', () => {
    it('formats pure red correctly', () => {
      const opts = makeOptions({ baseColor: { r: 255, g: 0, b: 0 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toContain('(255,0,0)');
    });

    it('formats pure green correctly', () => {
      const opts = makeOptions({ baseColor: { r: 0, g: 255, b: 0 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toContain('(0,255,0)');
    });

    it('formats white correctly', () => {
      const opts = makeOptions({ baseColor: { r: 255, g: 255, b: 255 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toContain('(255,255,255)');
    });

    it('formats black correctly', () => {
      const opts = makeOptions({ baseColor: { r: 0, g: 0, b: 0 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toContain('(0,0,0)');
    });

    it('rounds fractional RGB values', () => {
      const opts = makeOptions({ baseColor: { r: 128.4, g: 64.6, b: 200.5 } });
      const { line } = emitter.emitFontConfigLine(1, opts);
      expect(line).toContain('(128,65,201)');
    });
  });

  // ── Full Round-Trip ──

  describe('full round-trip output', () => {
    it('produces a complete valid Xenopixel V3 config set', () => {
      const presets = [
        {
          ast: dummyAst(),
          options: makeOptions({
            presetName: 'Obi-Wan',
            fontName: 'obiwan',
            baseColor: { r: 0, g: 135, b: 255 },
            style: 'stable',
            ignition: 'standard',
            ignitionMs: 200,
            retractionMs: 500,
            ledCount: 133,
          }),
        },
        {
          ast: dummyAst(),
          options: makeOptions({
            presetName: 'Kylo Ren',
            fontName: 'kyloren',
            baseColor: { r: 255, g: 0, b: 0 },
            style: 'unstable',
            ignition: 'spark',
            ignitionMs: 400,
            retractionMs: 600,
            ledCount: 133,
          }),
        },
      ];

      const result = emitter.emitMultiPreset(presets);

      // fontconfig.ini
      expect(result.configFileName).toBe('fontconfig.ini');
      const fontLines = result.configContent.trim().split('\n');
      expect(fontLines[0]).toBe('font1=(0,135,255),1,0,0,0,0,0,200,500');
      expect(fontLines[1]).toBe('font2=(255,0,0),2,0,0,0,0,3,400,600');

      // set/config.ini
      const globalConfig = result.additionalFiles!['set/config.ini'];
      expect(globalConfig).toContain('pixel_number=133');
      expect(globalConfig).toContain('volume=80');
      expect(globalConfig).toContain('motion_control=1');

      // No degradation notes for these well-supported styles
      expect(result.notes).toBeUndefined();
    });

    it('fontconfig.ini line has exactly 9 fields after RGB', () => {
      // Format: fontN=(R,G,B),A,B,C,D,E,F,G,H — that's 8 comma-separated fields after the RGB tuple
      const { line } = emitter.emitFontConfigLine(1, makeOptions());
      const afterEquals = line.split('=')[1];
      // Split by '),': first part is the RGB, second part is the rest
      const parts = afterEquals.split('),');
      expect(parts).toHaveLength(2);
      const fields = parts[1].split(',');
      // 8 fields: bladeEffect, blasterEffect, forceEffect, lockupEffect, defaultLightEffect, ignitionStyle, ignitionSpeed, retractionSpeed
      expect(fields).toHaveLength(8);
      // All fields should be numeric
      for (const f of fields) {
        expect(Number(f)).not.toBeNaN();
      }
    });
  });
});

// ─── Firmware Version Awareness ───

describe('firmware version awareness', () => {
  describe('V1.0 base format', () => {
    const v10 = new XenopixelEmitter('1.0');

    it('explicit V1.0 produces the same 8-field fontconfig format as the default emitter', () => {
      const opts = makeOptions();
      const { line } = v10.emitFontConfigLine(1, opts);
      // Split after the RGB close-paren to get the field list
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(fields).toHaveLength(8);
      // Verify the line matches the expected shape
      expect(line).toBe('font1=(0,0,255),1,0,0,0,0,0,300,500');
    });

    it('config.ini does NOT contain V1.2+ features', () => {
      const config = v10.emitGlobalConfig();
      expect(config).not.toContain('motor_crystal_chamber');
      expect(config).not.toContain('bt_mode');
      expect(config).not.toContain('melt_mode');
      expect(config).not.toContain('knock_on');
      expect(config).not.toContain('poke_on');
    });
  });

  describe('V1.2 motor + BT', () => {
    const v12 = new XenopixelEmitter('1.2');

    it('config.ini CONTAINS motor_crystal_chamber and bt_mode', () => {
      const config = v12.emitGlobalConfig();
      expect(config).toContain('motor_crystal_chamber=');
      expect(config).toContain('bt_mode=');
    });

    it('fontconfig line still has exactly 8 fields after RGB (no extended fields)', () => {
      const opts = makeOptions();
      const { line } = v12.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(fields).toHaveLength(8);
    });

    it('config.ini does NOT contain V1.3.1+ features', () => {
      const config = v12.emitGlobalConfig();
      expect(config).not.toContain('melt_mode');
      expect(config).not.toContain('lightning_block_mode');
      expect(config).not.toContain('knock_on');
      expect(config).not.toContain('poke_on');
    });
  });

  describe('V1.2.5 per-folder fontconfig', () => {
    const v125 = new XenopixelEmitter('1.2.5');

    it('emitMultiPreset produces per-folder fontconfig.ini files', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ presetName: 'A', baseColor: { r: 0, g: 0, b: 255 } }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'B', baseColor: { r: 255, g: 0, b: 0 } }) },
      ];

      const result = v125.emitMultiPreset(presets);
      expect(result.additionalFiles).toBeDefined();
      expect(result.additionalFiles!['1/fontconfig.ini']).toBeDefined();
      expect(result.additionalFiles!['2/fontconfig.ini']).toBeDefined();
    });

    it('each per-folder file contains a single font line', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ presetName: 'A', baseColor: { r: 0, g: 0, b: 255 } }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'B', baseColor: { r: 255, g: 0, b: 0 } }) },
      ];

      const result = v125.emitMultiPreset(presets);
      // Per-folder files should each contain exactly one font line
      const folder1 = result.additionalFiles!['1/fontconfig.ini'].trim();
      const folder2 = result.additionalFiles!['2/fontconfig.ini'].trim();
      expect(folder1.split('\n')).toHaveLength(1);
      expect(folder2.split('\n')).toHaveLength(1);
      expect(folder1).toMatch(/^font1=/);
      expect(folder2).toMatch(/^font2=/);
    });

    it('root fontconfig.ini still contains all lines', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ presetName: 'A', baseColor: { r: 0, g: 0, b: 255 } }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'B', baseColor: { r: 255, g: 0, b: 0 } }) },
      ];

      const result = v125.emitMultiPreset(presets);
      const rootLines = result.configContent.trim().split('\n');
      expect(rootLines).toHaveLength(2);
      expect(rootLines[0]).toMatch(/^font1=/);
      expect(rootLines[1]).toMatch(/^font2=/);
    });
  });

  describe('V1.3.1 melt + knock/poke', () => {
    const v131 = new XenopixelEmitter('1.3.1');

    it('config.ini CONTAINS melt_mode, lightning_block_mode, knock_on, and poke_on', () => {
      const config = v131.emitGlobalConfig();
      expect(config).toContain('melt_mode=');
      expect(config).toContain('lightning_block_mode=');
      expect(config).toContain('knock_on=');
      expect(config).toContain('poke_on=');
    });

    it('inherits V1.2 motor + BT features', () => {
      const config = v131.emitGlobalConfig();
      expect(config).toContain('motor_crystal_chamber=');
      expect(config).toContain('bt_mode=');
    });

    it('inherits V1.2.5 per-folder fontconfig', () => {
      const presets = [
        { ast: dummyAst(), options: makeOptions({ presetName: 'A' }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'B' }) },
      ];

      const result = v131.emitMultiPreset(presets);
      expect(result.additionalFiles!['1/fontconfig.ini']).toBeDefined();
      expect(result.additionalFiles!['2/fontconfig.ini']).toBeDefined();
    });
  });

  describe('V1.4.0 in/out time + custom function', () => {
    const v140 = new XenopixelEmitter('1.4.0');

    it('fontconfig line has MORE than 8 fields after RGB', () => {
      const opts = makeOptions();
      const { line } = v140.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(fields.length).toBeGreaterThan(8);
    });

    it('basic emit appends in-time and out-time after retraction speed', () => {
      const opts = makeOptions({ ignitionMs: 300, retractionMs: 500 });
      const { line } = v140.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      // Fields: bladeEffect,blasterEffect,forceEffect,lockupEffect,defaultLightEffect,ignitionStyle,ignitionSpeed,retractionSpeed,inTime,outTime,customFunction
      // Index 8 = inTime (defaults to ignitionMs), Index 9 = outTime (defaults to retractionMs)
      expect(Number(fields[8])).toBe(300);
      expect(Number(fields[9])).toBe(500);
    });

    it('respects xenoInTimeMs and xenoOutTimeMs overrides', () => {
      const opts = {
        ...makeOptions({ ignitionMs: 300, retractionMs: 500 }),
        xenoInTimeMs: 400,
        xenoOutTimeMs: 600,
      } as BoardEmitOptions & { xenoInTimeMs: number; xenoOutTimeMs: number };

      const { line } = v140.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      expect(Number(fields[8])).toBe(400);
      expect(Number(fields[9])).toBe(600);
    });

    it('appends custom function when xenoCustomFunction is set', () => {
      const opts = {
        ...makeOptions(),
        xenoInTimeMs: 400,
        xenoOutTimeMs: 600,
        xenoCustomFunction: 42,
      } as BoardEmitOptions & { xenoInTimeMs: number; xenoOutTimeMs: number; xenoCustomFunction: number };

      const { line } = v140.emitFontConfigLine(1, opts);
      const afterRgb = line.split('),')[1];
      const fields = afterRgb.split(',');
      // Last field should be the custom function
      expect(Number(fields[fields.length - 1])).toBe(42);
    });

    it('config.ini includes all V1.3.1 features (cumulative)', () => {
      const config = v140.emitGlobalConfig();
      // V1.2
      expect(config).toContain('motor_crystal_chamber=');
      expect(config).toContain('bt_mode=');
      // V1.3.1
      expect(config).toContain('melt_mode=');
      expect(config).toContain('lightning_block_mode=');
      expect(config).toContain('knock_on=');
      expect(config).toContain('poke_on=');
    });
  });

  describe('capabilities getter', () => {
    it('V1.0 has all flags false', () => {
      const caps = new XenopixelEmitter('1.0').capabilities;
      expect(caps.perFolderFontConfig).toBe(false);
      expect(caps.motorCrystalChamber).toBe(false);
      expect(caps.btMode).toBe(false);
      expect(caps.meltEffect).toBe(false);
      expect(caps.lightningBlock).toBe(false);
      expect(caps.knockPoke).toBe(false);
      expect(caps.configurableInOutTime).toBe(false);
      expect(caps.customFunction).toBe(false);
    });

    it('V1.4.0 has all flags true', () => {
      const caps = new XenopixelEmitter('1.4.0').capabilities;
      expect(caps.perFolderFontConfig).toBe(true);
      expect(caps.motorCrystalChamber).toBe(true);
      expect(caps.btMode).toBe(true);
      expect(caps.meltEffect).toBe(true);
      expect(caps.lightningBlock).toBe(true);
      expect(caps.knockPoke).toBe(true);
      expect(caps.configurableInOutTime).toBe(true);
      expect(caps.customFunction).toBe(true);
    });

    it('V1.2 has motor + BT true but perFolderFontConfig false', () => {
      const caps = new XenopixelEmitter('1.2').capabilities;
      expect(caps.motorCrystalChamber).toBe(true);
      expect(caps.btMode).toBe(true);
      expect(caps.perFolderFontConfig).toBe(false);
    });
  });
});

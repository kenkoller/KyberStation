import { describe, it, expect } from 'vitest';
import {
  getEmitter,
  hasEmitter,
  listEmitterBoards,
  CFXEmitter,
  GHv3Emitter,
  XenopixelEmitter,
} from '@bladeforge/codegen';
import type { BoardEmitOptions, BoardEmitter, EmitterOutput, StyleNode } from '@bladeforge/codegen';

// ─── Shared test fixtures ───

/** Minimal valid AST node for emitter calls */
const STUB_AST: StyleNode = {
  type: 'template',
  name: 'Rgb',
  args: [
    { type: 'integer', name: '0', args: [] },
    { type: 'integer', name: '0', args: [] },
    { type: 'integer', name: '255', args: [] },
  ],
};

function makeOptions(overrides?: Partial<BoardEmitOptions>): BoardEmitOptions {
  return {
    presetName: 'Test Preset',
    fontName: 'smoothjedi',
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 200, b: 50 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 200, g: 200, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 300,
    ledCount: 144,
    volume: 1500,
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// Registry functions
// ──────────────────────────────────────────────

describe('Emitter registry: getEmitter', () => {
  it('getEmitter("cfx") returns a CFXEmitter instance', () => {
    const emitter = getEmitter('cfx');
    expect(emitter).toBeDefined();
    expect(emitter).toBeInstanceOf(CFXEmitter);
  });

  it('getEmitter("ghv3") returns a GHv3Emitter instance', () => {
    const emitter = getEmitter('ghv3');
    expect(emitter).toBeDefined();
    expect(emitter).toBeInstanceOf(GHv3Emitter);
  });

  it('getEmitter("ghv4") returns a GHv3Emitter instance (same format)', () => {
    const emitter = getEmitter('ghv4');
    expect(emitter).toBeDefined();
    expect(emitter).toBeInstanceOf(GHv3Emitter);
  });

  it('getEmitter("xenopixel") returns a XenopixelEmitter instance', () => {
    const emitter = getEmitter('xenopixel');
    expect(emitter).toBeDefined();
    expect(emitter).toBeInstanceOf(XenopixelEmitter);
  });

  it('getEmitter("xenopixel-v2") returns a XenopixelEmitter instance', () => {
    const emitter = getEmitter('xenopixel-v2');
    expect(emitter).toBeDefined();
    expect(emitter).toBeInstanceOf(XenopixelEmitter);
  });

  it('getEmitter("xenopixel-v3") returns a XenopixelEmitter instance', () => {
    const emitter = getEmitter('xenopixel-v3');
    expect(emitter).toBeDefined();
    expect(emitter).toBeInstanceOf(XenopixelEmitter);
  });

  it('getEmitter("proffie") returns undefined (Proffie uses existing pipeline)', () => {
    expect(getEmitter('proffie')).toBeUndefined();
  });

  it('getEmitter("proffieboard-v3") returns undefined', () => {
    expect(getEmitter('proffieboard-v3')).toBeUndefined();
  });

  it('getEmitter("unknown-board") returns undefined', () => {
    expect(getEmitter('unknown-board')).toBeUndefined();
  });
});

describe('Emitter registry: hasEmitter', () => {
  it('returns true for cfx', () => {
    expect(hasEmitter('cfx')).toBe(true);
  });

  it('returns true for ghv3', () => {
    expect(hasEmitter('ghv3')).toBe(true);
  });

  it('returns true for ghv4', () => {
    expect(hasEmitter('ghv4')).toBe(true);
  });

  it('returns true for xenopixel', () => {
    expect(hasEmitter('xenopixel')).toBe(true);
  });

  it('returns true for xenopixel-v2 and xenopixel-v3', () => {
    expect(hasEmitter('xenopixel-v2')).toBe(true);
    expect(hasEmitter('xenopixel-v3')).toBe(true);
  });

  it('returns false for proffie boards', () => {
    expect(hasEmitter('proffie')).toBe(false);
    expect(hasEmitter('proffieboard-v2')).toBe(false);
    expect(hasEmitter('proffieboard-v3')).toBe(false);
  });

  it('returns false for unknown boards', () => {
    expect(hasEmitter('nonexistent')).toBe(false);
  });
});

describe('Emitter registry: listEmitterBoards', () => {
  it('returns an array of board IDs', () => {
    const boards = listEmitterBoards();
    expect(Array.isArray(boards)).toBe(true);
    expect(boards.length).toBeGreaterThan(0);
  });

  it('includes cfx, ghv3, ghv4, xenopixel, xenopixel-v2, xenopixel-v3', () => {
    const boards = listEmitterBoards();
    expect(boards).toContain('cfx');
    expect(boards).toContain('ghv3');
    expect(boards).toContain('ghv4');
    expect(boards).toContain('xenopixel');
    expect(boards).toContain('xenopixel-v2');
    expect(boards).toContain('xenopixel-v3');
  });

  it('does not include proffie boards', () => {
    const boards = listEmitterBoards();
    expect(boards).not.toContain('proffie');
    expect(boards).not.toContain('proffieboard-v2');
    expect(boards).not.toContain('proffieboard-v3');
  });
});

// ──────────────────────────────────────────────
// Emitter output shape (all emitters)
// ──────────────────────────────────────────────

describe('All emitters produce valid EmitterOutput', () => {
  const emitterIds = ['cfx', 'ghv3', 'xenopixel'] as const;

  it.each(emitterIds)('"%s" emit() returns configContent and configFileName', (id) => {
    const emitter = getEmitter(id)!;
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(typeof output.configContent).toBe('string');
    expect(output.configContent.length).toBeGreaterThan(0);
    expect(typeof output.configFileName).toBe('string');
    expect(output.configFileName.length).toBeGreaterThan(0);
  });

  it.each(emitterIds)('"%s" emitMultiPreset() handles multiple presets', (id) => {
    const emitter = getEmitter(id)!;
    const output = emitter.emitMultiPreset([
      { ast: STUB_AST, options: makeOptions({ presetName: 'Preset 1' }) },
      { ast: STUB_AST, options: makeOptions({ presetName: 'Preset 2', style: 'fire' }) },
      { ast: STUB_AST, options: makeOptions({ presetName: 'Preset 3', baseColor: { r: 255, g: 0, b: 0 } }) },
    ]);
    expect(typeof output.configContent).toBe('string');
    expect(output.configContent.length).toBeGreaterThan(0);
  });

  it.each(emitterIds)('"%s" has boardId, boardName, and formatDescription', (id) => {
    const emitter = getEmitter(id)!;
    expect(typeof emitter.boardId).toBe('string');
    expect(emitter.boardId.length).toBeGreaterThan(0);
    expect(typeof emitter.boardName).toBe('string');
    expect(emitter.boardName.length).toBeGreaterThan(0);
    expect(typeof emitter.formatDescription).toBe('string');
    expect(emitter.formatDescription.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// CFXEmitter
// ──────────────────────────────────────────────

describe('CFXEmitter', () => {
  const emitter = new CFXEmitter();

  it('boardId is "cfx"', () => {
    expect(emitter.boardId).toBe('cfx');
  });

  it('configFileName is "config.txt"', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configFileName).toBe('config.txt');
  });

  it('output is INI-style text with key=value pairs', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;

    // Should have section headers
    expect(content).toContain('[general]');
    expect(content).toContain('[profile1]');

    // Should have key=value entries
    expect(content).toContain('name=Test Preset');
    expect(content).toContain('font=smoothjedi');
    expect(content).toContain('numprofiles=1');
  });

  it('includes color in CFX format (semicolon-separated RGB)', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;

    // baseColor is {r:0, g:0, b:255} -> "0;0;255"
    expect(content).toContain('color=0;0;255');
    // clashColor is {r:255, g:200, b:50} -> "255;200;50"
    expect(content).toContain('clashcolor=255;200;50');
  });

  it('includes lockup and blast colors when provided', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;
    expect(content).toContain('lockupcolor=255;255;255');
    expect(content).toContain('blastcolor=200;200;255');
  });

  it('includes blade style, ignition, and retraction', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;
    expect(content).toContain('bladestyle=stable');
    expect(content).toContain('ignitiontype=');
    expect(content).toContain('retractiontype=');
    expect(content).toContain('ignitiontime=300');
    expect(content).toContain('retractiontime=300');
  });

  it('includes LED count and volume', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;
    expect(content).toContain('ledcount=144');
    expect(content).toContain('volume=1500');
  });

  it('includes Generated by BladeForge comment', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configContent).toContain('Generated by BladeForge');
  });

  it('multi-preset generates numbered profile sections', () => {
    const output = emitter.emitMultiPreset([
      { ast: STUB_AST, options: makeOptions({ presetName: 'Alpha' }) },
      { ast: STUB_AST, options: makeOptions({ presetName: 'Beta' }) },
    ]);
    const content = output.configContent;
    expect(content).toContain('[profile1]');
    expect(content).toContain('[profile2]');
    expect(content).toContain('name=Alpha');
    expect(content).toContain('name=Beta');
    expect(content).toContain('numprofiles=2');
  });

  it('notes degraded styles', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'rotoscope', presetName: 'Rotoscope Test' }));
    expect(output.notes).toBeDefined();
    expect(output.notes!.length).toBeGreaterThan(0);
    expect(output.notes!.some((n) => n.includes('degraded'))).toBe(true);
  });
});

// ──────────────────────────────────────────────
// GHv3Emitter
// ──────────────────────────────────────────────

describe('GHv3Emitter', () => {
  const emitter = new GHv3Emitter();

  it('boardId is "ghv3"', () => {
    expect(emitter.boardId).toBe('ghv3');
  });

  it('configFileName is "config.ini"', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configFileName).toBe('config.ini');
  });

  it('output is INI-style text with [Preset] sections', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;

    expect(content).toContain('[Global]');
    expect(content).toContain('[Preset1]');
    expect(content).toContain('Name=Test Preset');
    expect(content).toContain('SoundFont=smoothjedi');
  });

  it('uses hex color format (#rrggbb)', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;

    // baseColor {r:0, g:0, b:255} -> "#0000ff"
    expect(content).toContain('BladeColor=#0000ff');
    // clashColor {r:255, g:200, b:50} -> "#ffc832"
    expect(content).toContain('ClashColor=#ffc832');
  });

  it('includes lockup and blast colors when provided', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;
    expect(content).toContain('LockupColor=#ffffff');
    expect(content).toContain('BlastColor=#c8c8ff');
  });

  it('includes blade effect, ignition, and retraction', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const content = output.configContent;
    expect(content).toContain('BladeEffect=Static');
    expect(content).toContain('Ignition=ScrollUp');
    expect(content).toContain('Retraction=ScrollDown');
    expect(content).toContain('IgnitionTime=300');
    expect(content).toContain('RetractionTime=300');
  });

  it('includes LED count', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configContent).toContain('LEDCount=144');
  });

  it('multi-preset generates numbered [Preset] sections', () => {
    const output = emitter.emitMultiPreset([
      { ast: STUB_AST, options: makeOptions({ presetName: 'Jedi' }) },
      { ast: STUB_AST, options: makeOptions({ presetName: 'Sith' }) },
    ]);
    const content = output.configContent;
    expect(content).toContain('[Preset1]');
    expect(content).toContain('[Preset2]');
    expect(content).toContain('Name=Jedi');
    expect(content).toContain('Name=Sith');
    expect(content).toContain('NumPresets=2');
  });

  it('notes degraded styles', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'cinder', presetName: 'Cinder Test' }));
    expect(output.notes).toBeDefined();
    expect(output.notes!.length).toBeGreaterThan(0);
    expect(output.notes!.some((n) => n.includes('degraded'))).toBe(true);
  });

  it('includes Generated by BladeForge comment', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configContent).toContain('Generated by BladeForge');
  });
});

// ──────────────────────────────────────────────
// XenopixelEmitter
// ──────────────────────────────────────────────

describe('XenopixelEmitter', () => {
  const emitter = new XenopixelEmitter();

  it('boardId is "xenopixel"', () => {
    expect(emitter.boardId).toBe('xenopixel');
  });

  it('configFileName is "config.json"', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configFileName).toBe('config.json');
  });

  it('output is valid JSON', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(() => JSON.parse(output.configContent)).not.toThrow();
  });

  it('JSON has version, board, presets, and settings', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const config = JSON.parse(output.configContent);

    expect(config.version).toBe(2);
    expect(config.board).toBe('xenopixel');
    expect(Array.isArray(config.presets)).toBe(true);
    expect(config.presets.length).toBe(1);
    expect(config.settings).toBeDefined();
  });

  it('settings include volume, smooth_swing, and clash_sensitivity', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const config = JSON.parse(output.configContent);

    expect(typeof config.settings.volume).toBe('number');
    expect(typeof config.settings.smooth_swing).toBe('boolean');
    expect(typeof config.settings.clash_sensitivity).toBe('number');
  });

  it('preset contains expected fields with correct types', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const config = JSON.parse(output.configContent);
    const preset = config.presets[0];

    expect(preset.name).toBe('Test Preset');
    expect(preset.font).toBe('smoothjedi');
    expect(Array.isArray(preset.blade_color)).toBe(true);
    expect(preset.blade_color).toEqual([0, 0, 255]);
    expect(Array.isArray(preset.clash_color)).toBe(true);
    expect(preset.clash_color).toEqual([255, 200, 50]);
    expect(Array.isArray(preset.lockup_color)).toBe(true);
    expect(preset.lockup_color).toEqual([255, 255, 255]);
    expect(Array.isArray(preset.blast_color)).toBe(true);
    expect(preset.blast_color).toEqual([200, 200, 255]);
    expect(typeof preset.blade_style).toBe('number');
    expect(typeof preset.ignition_type).toBe('number');
    expect(typeof preset.retraction_type).toBe('number');
    expect(preset.ignition_time).toBe(300);
    expect(preset.retraction_time).toBe(300);
    expect(preset.led_count).toBe(144);
  });

  it('uses default lockup/blast colors when not provided', () => {
    const opts = makeOptions();
    delete opts.lockupColor;
    delete opts.blastColor;
    const output = emitter.emit(STUB_AST, opts);
    const config = JSON.parse(output.configContent);
    const preset = config.presets[0];

    // Default lockup: [255, 200, 80], blast: [255, 255, 255]
    expect(preset.lockup_color).toEqual([255, 200, 80]);
    expect(preset.blast_color).toEqual([255, 255, 255]);
  });

  it('multi-preset generates multiple entries in presets array', () => {
    const output = emitter.emitMultiPreset([
      { ast: STUB_AST, options: makeOptions({ presetName: 'Blue Jedi' }) },
      { ast: STUB_AST, options: makeOptions({ presetName: 'Red Sith', baseColor: { r: 255, g: 0, b: 0 } }) },
    ]);
    const config = JSON.parse(output.configContent);
    expect(config.presets).toHaveLength(2);
    expect(config.presets[0].name).toBe('Blue Jedi');
    expect(config.presets[1].name).toBe('Red Sith');
    expect(config.presets[1].blade_color).toEqual([255, 0, 0]);
  });

  it('maps stable style to blade_style 0', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'stable' }));
    const config = JSON.parse(output.configContent);
    expect(config.presets[0].blade_style).toBe(0);
  });

  it('maps fire style to blade_style 2', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'fire' }));
    const config = JSON.parse(output.configContent);
    expect(config.presets[0].blade_style).toBe(2);
  });

  it('notes degradation for unsupported styles', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'plasma', presetName: 'Plasma Test' }));
    expect(output.notes).toBeDefined();
    expect(output.notes!.length).toBeGreaterThan(0);
    expect(output.notes!.some((n) => n.includes('degraded'))).toBe(true);
  });

  it('volume from options is used in settings', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ volume: 2000 }));
    const config = JSON.parse(output.configContent);
    expect(config.settings.volume).toBe(2000);
  });

  it('defaults volume to 1500 when not provided', () => {
    const opts = makeOptions();
    delete opts.volume;
    const output = emitter.emit(STUB_AST, opts);
    const config = JSON.parse(output.configContent);
    expect(config.settings.volume).toBe(1500);
  });
});

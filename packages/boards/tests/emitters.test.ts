import { describe, it, expect } from 'vitest';
import {
  getEmitter,
  hasEmitter,
  listEmitterBoards,
  CFXEmitter,
  GHv3Emitter,
  XenopixelEmitter,
} from '@kyberstation/codegen';
import type { BoardEmitOptions, BoardEmitter, EmitterOutput, StyleNode } from '@kyberstation/codegen';

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

  it('includes Generated by KyberStation comment', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configContent).toContain('Generated by KyberStation');
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

  it('includes Generated by KyberStation comment', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configContent).toContain('Generated by KyberStation');
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

  it('configFileName is "fontconfig.ini"', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configFileName).toBe('fontconfig.ini');
  });

  it('output is valid fontconfig.ini with font1= line', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    expect(output.configContent).toContain('font1=');
    expect(output.configContent).toMatch(/^font1=\(\d+,\d+,\d+\),/);
  });

  it('emits fontconfig.ini content + set/config.ini as additional file', () => {
    const output = emitter.emit(STUB_AST, makeOptions());

    // fontconfig.ini is the primary output
    expect(output.configFileName).toBe('fontconfig.ini');
    expect(output.configContent).toContain('font1=');

    // set/config.ini is an additional file with global settings
    expect(output.additionalFiles).toBeDefined();
    expect(output.additionalFiles!['set/config.ini']).toBeDefined();
    expect(output.additionalFiles!['set/config.ini']).toContain('pixel_number=');
  });

  it('global config.ini includes motion, volume, and clash settings', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    const globalConfig = output.additionalFiles!['set/config.ini'];

    expect(globalConfig).toContain('volume=');
    expect(globalConfig).toContain('motion_control=');
    expect(globalConfig).toContain('clash_sensitivity=');
    expect(globalConfig).toContain('swing_sensitivity=');
  });

  it('fontconfig line encodes base color as RGB tuple + blade/ignition params', () => {
    const output = emitter.emit(STUB_AST, makeOptions());
    // stable → blade effect 1 (Steady), standard → ignition 0
    // format: font1=(R,G,B),bladeEffect,blasterEffect,forceEffect,lockupEffect,defaultLightEffect,ignitionStyle,ignitionSpeed,retractionSpeed
    expect(output.configContent).toContain('(0,0,255)');
    expect(output.configContent).toMatch(/font1=\(0,0,255\),1,0,0,0,0,0,300,300/);
  });

  it('fontconfig line reflects baseColor from options', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ baseColor: { r: 255, g: 140, b: 0 } }));
    expect(output.configContent).toContain('(255,140,0)');
  });

  it('multi-preset generates multiple font lines', () => {
    const output = emitter.emitMultiPreset([
      { ast: STUB_AST, options: makeOptions({ presetName: 'Blue Jedi' }) },
      { ast: STUB_AST, options: makeOptions({ presetName: 'Red Sith', baseColor: { r: 255, g: 0, b: 0 } }) },
    ]);
    expect(output.configContent).toContain('font1=');
    expect(output.configContent).toContain('font2=');
    expect(output.configContent).toContain('(0,0,255)');
    expect(output.configContent).toContain('(255,0,0)');
  });

  it('maps stable style to blade effect 1 (Steady)', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'stable' }));
    // font1=(R,G,B),<bladeEffect>,...  — bladeEffect is the first comma-delimited field after the RGB tuple
    expect(output.configContent).toMatch(/font1=\(0,0,255\),1,/);
  });

  it('maps fire style to blade effect 0', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'fire' }));
    expect(output.configContent).toMatch(/font1=\(0,0,255\),0,/);
  });

  it('notes degradation for unsupported styles', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ style: 'plasma', presetName: 'Plasma Test' }));
    expect(output.notes).toBeDefined();
    expect(output.notes!.length).toBeGreaterThan(0);
    expect(output.notes!.some((n) => n.includes('degraded'))).toBe(true);
  });

  it('pixel_number in global config reflects ledCount from options', () => {
    const output = emitter.emit(STUB_AST, makeOptions({ ledCount: 133 }));
    const globalConfig = output.additionalFiles!['set/config.ini'];
    expect(globalConfig).toContain('pixel_number=133');
  });

  it('defaults pixel_number to 133 when ledCount not provided', () => {
    const opts = makeOptions();
    delete (opts as any).ledCount;
    const output = emitter.emit(STUB_AST, opts);
    const globalConfig = output.additionalFiles!['set/config.ini'];
    expect(globalConfig).toContain('pixel_number=133');
  });
});

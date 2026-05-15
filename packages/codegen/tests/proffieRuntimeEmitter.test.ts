// ─── ProffieOS Runtime Preset Emitter Tests ───
//
// Byte-pinned tests for `buildRuntimePresetsFile` and `ProffieRuntimeEmitter`.
// The output format is consumed by ProffieOS's `CurrentPreset::Read()` at
// runtime, so any drift breaks real hardware. These tests guard the wire
// format — change them only if the ProffieOS format itself changes.

import { describe, it, expect } from 'vitest';
import {
  buildRuntimePresetsFile,
  ProffieRuntimeEmitter,
} from '../src/emitters/ProffieRuntimeEmitter.js';
import type { BoardEmitOptions } from '../src/emitters/BaseEmitter.js';
import type { StyleNode } from '../src/types.js';

function dummyAst(): StyleNode {
  return { type: 'template', name: 'Layers', args: [] };
}

describe('buildRuntimePresetsFile', () => {
  describe('byte-exact output', () => {
    it('emits a single preset with default variation and track', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'Apr 21 2026 08:44:54',
        numBlades: 1,
        presets: [
          {
            presetName: 'Graflex',
            fontName: 'Graflex',
            builtinPresetIndex: 0,
          },
        ],
      });

      expect(out).toBe(
        [
          'installed=Apr 21 2026 08:44:54',
          'new_preset',
          'font=Graflex',
          'track=tracks/Graflex.wav',
          'style=builtin 0 1',
          'name=Graflex',
          'variation=0',
          'end',
          '',
        ].join('\n'),
      );
    });

    it('emits multiple presets in order with terminator', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'Apr 21 2026 08:44:54',
        numBlades: 1,
        presets: [
          { presetName: 'Graflex', fontName: 'Graflex', builtinPresetIndex: 0 },
          { presetName: 'Vader', fontName: 'Vader', builtinPresetIndex: 1 },
          { presetName: 'Yoda', fontName: 'Yoda', builtinPresetIndex: 5 },
        ],
      });

      expect(out).toBe(
        [
          'installed=Apr 21 2026 08:44:54',
          'new_preset',
          'font=Graflex',
          'track=tracks/Graflex.wav',
          'style=builtin 0 1',
          'name=Graflex',
          'variation=0',
          'new_preset',
          'font=Vader',
          'track=tracks/Vader.wav',
          'style=builtin 1 1',
          'name=Vader',
          'variation=0',
          'new_preset',
          'font=Yoda',
          'track=tracks/Yoda.wav',
          'style=builtin 5 1',
          'name=Yoda',
          'variation=0',
          'end',
          '',
        ].join('\n'),
      );
    });

    it('duplicates style= line per blade for multi-blade chassis', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'May 1 2026 12:00:00',
        numBlades: 4,
        presets: [
          { presetName: 'Krosgaard', fontName: 'krosgaard', builtinPresetIndex: 3 },
        ],
      });

      expect(out).toBe(
        [
          'installed=May 1 2026 12:00:00',
          'new_preset',
          'font=krosgaard',
          'track=tracks/krosgaard.wav',
          'style=builtin 3 1',
          'style=builtin 3 2',
          'style=builtin 3 3',
          'style=builtin 3 4',
          'name=Krosgaard',
          'variation=0',
          'end',
          '',
        ].join('\n'),
      );
    });

    it('uses caller-supplied trackFile when provided', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'X',
        numBlades: 1,
        presets: [
          {
            presetName: 'Custom',
            fontName: 'custom',
            trackFile: 'mytracks/song.wav',
            builtinPresetIndex: 0,
          },
        ],
      });

      expect(out).toContain('track=mytracks/song.wav');
      expect(out).not.toContain('track=tracks/custom.wav');
    });

    it('emits the user-supplied variation value', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'X',
        numBlades: 1,
        presets: [
          {
            presetName: 'Variant',
            fontName: 'v',
            builtinPresetIndex: 0,
            variation: 42,
          },
        ],
      });

      expect(out).toContain('variation=42');
    });

    it('always terminates with `end\\n`', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'X',
        numBlades: 1,
        presets: [],
      });

      expect(out.endsWith('end\n')).toBe(true);
      // Empty presets case: installed line + end line only.
      expect(out).toBe('installed=X\nend\n');
    });
  });

  describe('input sanitization', () => {
    it('strips embedded newlines from values to keep parser happy', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'Apr 21\n2026',
        numBlades: 1,
        presets: [
          {
            presetName: 'Bad\nName',
            fontName: 'bad\nfont',
            builtinPresetIndex: 0,
          },
        ],
      });

      // Newlines inside values must be collapsed; otherwise ProffieOS's
      // readString() truncates the value at the embedded newline.
      const lines = out.split('\n');
      const installedLine = lines.find((l) => l.startsWith('installed='));
      expect(installedLine).toBe('installed=Apr 21 2026');
      const fontLine = lines.find((l) => l.startsWith('font='));
      expect(fontLine).toBe('font=bad font');
      const nameLine = lines.find((l) => l.startsWith('name='));
      expect(nameLine).toBe('name=Bad Name');
    });

    it('rounds variation toward zero', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'X',
        numBlades: 1,
        presets: [
          {
            presetName: 'p',
            fontName: 'f',
            builtinPresetIndex: 0,
            variation: 3.9,
          },
        ],
      });

      expect(out).toContain('variation=3');
    });

    it('falls back to 0 for non-finite variation', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'X',
        numBlades: 1,
        presets: [
          {
            presetName: 'p',
            fontName: 'f',
            builtinPresetIndex: 0,
            variation: Number.NaN,
          },
        ],
      });

      expect(out).toContain('variation=0');
    });

    it('floors negative builtinPresetIndex to 0', () => {
      const out = buildRuntimePresetsFile({
        installTime: 'X',
        numBlades: 1,
        presets: [
          { presetName: 'p', fontName: 'f', builtinPresetIndex: -5 },
        ],
      });

      expect(out).toContain('style=builtin 0 1');
    });
  });
});

describe('ProffieRuntimeEmitter', () => {
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

  describe('metadata', () => {
    it('reports correct board identity', () => {
      const e = new ProffieRuntimeEmitter();
      expect(e.boardId).toBe('proffie-runtime');
      expect(e.boardName).toContain('ProffieOS Runtime');
      expect(e.formatDescription).toContain('presets.ini');
    });
  });

  describe('emit + emitMultiPreset', () => {
    it('builds presets.ini using configured installTime and numBlades', () => {
      const e = new ProffieRuntimeEmitter({
        installTime: 'May 14 2026 18:00:00',
        numBlades: 2,
      });
      const result = e.emit(dummyAst(), makeOptions());

      expect(result.configFileName).toBe('presets.ini');
      expect(result.configContent).toContain('installed=May 14 2026 18:00:00');
      expect(result.configContent).toContain('style=builtin 0 1');
      expect(result.configContent).toContain('style=builtin 0 2');
      expect(result.configContent).toMatch(/end\n$/);
    });

    it('maps array index to builtinPresetIndex by default', () => {
      const e = new ProffieRuntimeEmitter({ installTime: 'X', numBlades: 1 });
      const result = e.emitMultiPreset([
        { ast: dummyAst(), options: makeOptions({ presetName: 'A', fontName: 'a' }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'B', fontName: 'b' }) },
        { ast: dummyAst(), options: makeOptions({ presetName: 'C', fontName: 'c' }) },
      ]);

      expect(result.configContent).toContain('style=builtin 0 1');
      expect(result.configContent).toContain('style=builtin 1 1');
      expect(result.configContent).toContain('style=builtin 2 1');
    });

    it('honors runtimeBuiltinPresetIndex override on options', () => {
      const e = new ProffieRuntimeEmitter({ installTime: 'X', numBlades: 1 });
      const result = e.emit(
        dummyAst(),
        {
          ...makeOptions(),
          // Open-slot extension recognized by the emitter.
          runtimeBuiltinPresetIndex: 17,
        } as BoardEmitOptions,
      );

      expect(result.configContent).toContain('style=builtin 17 1');
    });
  });
});

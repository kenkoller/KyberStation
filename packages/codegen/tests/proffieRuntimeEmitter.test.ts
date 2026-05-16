// ─── ProffieOS Runtime Preset Emitter Tests ───
//
// Byte-pinned tests for `buildRuntimePresetsFile` and `ProffieRuntimeEmitter`.
// The output format is consumed by ProffieOS's `CurrentPreset::Read()` at
// runtime, so any drift breaks real hardware. These tests guard the wire
// format — change them only if the ProffieOS format itself changes.

import { describe, it, expect } from 'vitest';
import {
  buildRuntimePresetsFile,
  buildAdvancedStyleString,
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

describe('buildAdvancedStyleString — Phase C (named verb)', () => {
  it('emits the 11-slot signature in canonical order with 16-bit scaled colors', () => {
    // BladeConfig stores colors as 0-255 (browser convention). The emitter
    // scales each channel × 257 to produce 0-65535 values that match
    // ProffieOS's Color16-based RgbArg parser (styles/rgb_arg.h:41).
    // Without this scaling, runtime presets render at ~0.4% brightness.
    const out = buildAdvancedStyleString({
      color1: { r: 0, g: 140, b: 255 },     // 0, 140*257=35980, 255*257=65535
      color2: { r: 0, g: 140, b: 255 },
      color3: { r: 0, g: 140, b: 255 },
      onSparkColor: { r: 255, g: 255, b: 255 },  // 65535,65535,65535
      onSparkTimeMs: 10,
      blastColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 220, b: 80 },  // 65535, 220*257=56540, 80*257=20560
      clashColor: { r: 255, g: 255, b: 255 },
      extensionMs: 300,
      retractionMs: 800,
      sparkTipColor: { r: 255, g: 255, b: 255 },
    });
    expect(out).toBe(
      'advanced 0,35980,65535 0,35980,65535 0,35980,65535 65535,65535,65535 10 65535,65535,65535 65535,56540,20560 65535,65535,65535 300 800 65535,65535,65535',
    );
  });

  it('clamps RGB values to 0-65535 after × 257 scaling', () => {
    const out = buildAdvancedStyleString({
      color1: { r: -5, g: 300, b: 128 },
      color2: { r: 0, g: 0, b: 0 },
      color3: { r: 0, g: 0, b: 0 },
      onSparkColor: { r: 0, g: 0, b: 0 },
      onSparkTimeMs: 0,
      blastColor: { r: 0, g: 0, b: 0 },
      lockupColor: { r: 0, g: 0, b: 0 },
      clashColor: { r: 0, g: 0, b: 0 },
      extensionMs: 0,
      retractionMs: 0,
      sparkTipColor: { r: 0, g: 0, b: 0 },
    });
    // -5 → 0 (clamped low); 300 × 257 = 77100 → 65535 (clamped high); 128 × 257 = 32896
    expect(out.startsWith('advanced 0,65535,32896 ')).toBe(true);
  });

  it('floors fractional timing values', () => {
    const out = buildAdvancedStyleString({
      color1: { r: 0, g: 0, b: 0 },
      color2: { r: 0, g: 0, b: 0 },
      color3: { r: 0, g: 0, b: 0 },
      onSparkColor: { r: 0, g: 0, b: 0 },
      onSparkTimeMs: 10.9,
      blastColor: { r: 0, g: 0, b: 0 },
      lockupColor: { r: 0, g: 0, b: 0 },
      clashColor: { r: 0, g: 0, b: 0 },
      extensionMs: 300.6,
      retractionMs: 800.3,
      sparkTipColor: { r: 0, g: 0, b: 0 },
    });
    // 10.9 → 10 ; 300.6 → 300 ; 800.3 → 800
    expect(out).toContain(' 10 ');
    expect(out).toContain(' 300 ');
    expect(out).toContain(' 800 ');
  });

  it('passes ProffieOS IsValidStyleString shape (verb + digits/commas/spaces only)', () => {
    const out = buildAdvancedStyleString({
      color1: { r: 12, g: 34, b: 56 },
      color2: { r: 78, g: 90, b: 12 },
      color3: { r: 34, g: 56, b: 78 },
      onSparkColor: { r: 255, g: 255, b: 255 },
      onSparkTimeMs: 10,
      blastColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 220, b: 80 },
      clashColor: { r: 255, g: 255, b: 255 },
      extensionMs: 300,
      retractionMs: 800,
      sparkTipColor: { r: 255, g: 255, b: 255 },
    });
    // Mirror IsValidStyleString from ~/ProffieOS/common/current_preset.h:38
    // - verb: lowercase letters only until first space
    // - args: digits, spaces, commas only after that
    const firstSpace = out.indexOf(' ');
    const verb = out.slice(0, firstSpace);
    const args = out.slice(firstSpace + 1);
    expect(verb).toMatch(/^[a-z]+$/);
    expect(args).toMatch(/^[0-9, ]+$/);
  });
});

describe('buildRuntimePresetsFile — Phase C opt-in', () => {
  it('emits builtin lines when useAdvancedVerb is false (Phase A default)', () => {
    const out = buildRuntimePresetsFile({
      installTime: 'X',
      numBlades: 1,
      useAdvancedVerb: false,
      presets: [
        {
          presetName: 'Test',
          fontName: 'test',
          builtinPresetIndex: 0,
          advanced: {
            color1: { r: 255, g: 0, b: 0 },
            color2: { r: 255, g: 0, b: 0 },
            color3: { r: 255, g: 0, b: 0 },
            onSparkColor: { r: 255, g: 255, b: 255 },
            onSparkTimeMs: 10,
            blastColor: { r: 255, g: 255, b: 255 },
            lockupColor: { r: 255, g: 220, b: 80 },
            clashColor: { r: 255, g: 255, b: 255 },
            extensionMs: 300,
            retractionMs: 800,
            sparkTipColor: { r: 255, g: 255, b: 255 },
          },
        },
      ],
    });
    // Phase A: ignores advanced field, emits builtin
    expect(out).toContain('style=builtin 0 1');
    expect(out).not.toContain('style=advanced');
  });

  it('emits advanced lines when useAdvancedVerb is true AND preset has advanced params', () => {
    const out = buildRuntimePresetsFile({
      installTime: 'X',
      numBlades: 1,
      useAdvancedVerb: true,
      presets: [
        {
          presetName: 'Test',
          fontName: 'test',
          builtinPresetIndex: 0,
          advanced: {
            color1: { r: 255, g: 0, b: 0 },
            color2: { r: 255, g: 0, b: 0 },
            color3: { r: 255, g: 0, b: 0 },
            onSparkColor: { r: 255, g: 255, b: 255 },
            onSparkTimeMs: 10,
            blastColor: { r: 255, g: 255, b: 255 },
            lockupColor: { r: 255, g: 220, b: 80 },
            clashColor: { r: 255, g: 255, b: 255 },
            extensionMs: 300,
            retractionMs: 800,
            sparkTipColor: { r: 255, g: 255, b: 255 },
          },
        },
      ],
    });
    // 16-bit scaled: 255 × 257 = 65535 (clamped to 65535 anyway)
    expect(out).toContain('style=advanced 65535,0,0 ');
    expect(out).not.toContain('style=builtin');
  });

  it('falls back to builtin for presets without advanced params even when useAdvancedVerb is true', () => {
    const out = buildRuntimePresetsFile({
      installTime: 'X',
      numBlades: 1,
      useAdvancedVerb: true,
      presets: [
        // Mixed: first preset has advanced, second does not
        {
          presetName: 'WithAdvanced',
          fontName: 'a',
          builtinPresetIndex: 0,
          advanced: {
            color1: { r: 255, g: 0, b: 0 },
            color2: { r: 255, g: 0, b: 0 },
            color3: { r: 255, g: 0, b: 0 },
            onSparkColor: { r: 255, g: 255, b: 255 },
            onSparkTimeMs: 10,
            blastColor: { r: 255, g: 255, b: 255 },
            lockupColor: { r: 255, g: 220, b: 80 },
            clashColor: { r: 255, g: 255, b: 255 },
            extensionMs: 300,
            retractionMs: 800,
            sparkTipColor: { r: 255, g: 255, b: 255 },
          },
        },
        {
          presetName: 'NoAdvanced',
          fontName: 'b',
          builtinPresetIndex: 5,
        },
      ],
    });
    expect(out).toContain('style=advanced ');
    expect(out).toContain('style=builtin 5 1');
  });

  it('duplicates advanced line per blade for multi-blade chassis', () => {
    const out = buildRuntimePresetsFile({
      installTime: 'X',
      numBlades: 3,
      useAdvancedVerb: true,
      presets: [
        {
          presetName: 'p',
          fontName: 'p',
          builtinPresetIndex: 0,
          advanced: {
            color1: { r: 10, g: 20, b: 30 },
            color2: { r: 10, g: 20, b: 30 },
            color3: { r: 10, g: 20, b: 30 },
            onSparkColor: { r: 0, g: 0, b: 0 },
            onSparkTimeMs: 0,
            blastColor: { r: 0, g: 0, b: 0 },
            lockupColor: { r: 0, g: 0, b: 0 },
            clashColor: { r: 0, g: 0, b: 0 },
            extensionMs: 100,
            retractionMs: 200,
            sparkTipColor: { r: 0, g: 0, b: 0 },
          },
        },
      ],
    });
    const advancedLines = out.split('\n').filter((l) => l.startsWith('style=advanced'));
    expect(advancedLines).toHaveLength(3);
    expect(advancedLines[0]).toBe(advancedLines[1]);
    expect(advancedLines[1]).toBe(advancedLines[2]);
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

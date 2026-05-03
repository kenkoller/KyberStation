// ─── CodeOutput Import Round-Trip Test ───
//
// Regression test for the v0.9.1 data-loss bug: the "Apply to Editor"
// button's inlined loadPreset call only passed the 11 base fields,
// silently dropping spatial lockup, spatial blast, Preon, and extended
// effect colours that reconstructConfig successfully recovers.
//
// The fix lives in `applyReconstructedConfig` in CodeOutput.tsx. This
// test exercises the full round-trip — export → parse → reconstruct →
// apply → compare — and asserts every extended field survives.

import { describe, it, expect } from 'vitest';
import {
  generateStyleCode,
  parseStyleCode,
  reconstructConfig,
} from '@kyberstation/codegen';
import type { BladeConfig } from '@kyberstation/engine';
import { applyReconstructedConfig } from '../components/editor/CodeOutput';

/** Build a maximally-configured BladeConfig that exercises every field
    the reconstructor currently recovers. */
function makeFullConfig(): BladeConfig {
  return {
    name: 'ImportTest',
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 200, b: 100 },
    lockupColor: { r: 255, g: 220, b: 80 },
    blastColor: { r: 255, g: 255, b: 200 },
    dragColor: { r: 255, g: 90, b: 0 },
    lightningColor: { r: 140, g: 180, b: 255 },
    meltColor: { r: 255, g: 60, b: 0 },
    style: 'stable',
    ignition: 'spark',
    retraction: 'fadeout',
    ignitionMs: 450,
    retractionMs: 650,
    shimmer: 0.2,
    ledCount: 144,
    lockupPosition: 0.33,
    lockupRadius: 0.12,
    blastPosition: 0.5,
    blastRadius: 0.45,
    dragPosition: 0.28,
    dragRadius: 0.2,
    meltPosition: 0.72,
    meltRadius: 0.22,
    stabPosition: 0.5,
    stabRadius: 0.25,
    preonEnabled: true,
    preonColor: { r: 200, g: 100, b: 255 },
    preonMs: 400,
  };
}

/** Convenience: run the full export → reconstruct → apply pipeline. */
function roundTripViaApply(source: BladeConfig): BladeConfig {
  const emitted = generateStyleCode(source, { comments: false });
  const parsed = parseStyleCode(emitted);
  if (!parsed.ast) throw new Error(`Parse failed: ${parsed.errors.join(', ')}`);
  const reconstructed = reconstructConfig(parsed.ast);
  return applyReconstructedConfig(reconstructed, source.ledCount);
}

describe('CodeOutput import round-trip (v0.9.1 regression)', () => {
  it('preserves spatial lockup fields through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    // TOP/BOTTOM/SIZE ↔ position/radius encoding is fixed-point to 1/32768,
    // so tolerate one quantisation step.
    const TOL = 2 / 32768;
    expect(result.lockupPosition).toBeDefined();
    expect(Math.abs((result.lockupPosition ?? 0) - source.lockupPosition!))
      .toBeLessThanOrEqual(TOL);
    expect(result.lockupRadius).toBeDefined();
    expect(Math.abs((result.lockupRadius ?? 0) - source.lockupRadius!))
      .toBeLessThanOrEqual(TOL);
  });

  it('preserves spatial blast fields through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    const TOL = 2 / 32768;
    expect(result.blastPosition).toBeDefined();
    expect(Math.abs((result.blastPosition ?? 0) - source.blastPosition!))
      .toBeLessThanOrEqual(TOL);
    expect(result.blastRadius).toBeDefined();
    expect(Math.abs((result.blastRadius ?? 0) - source.blastRadius!))
      .toBeLessThanOrEqual(TOL);
  });

  it('preserves spatial drag/melt/stab fields through Apply (v0.10.0)', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    const TOL = 2 / 32768;
    for (const key of [
      'dragPosition',
      'dragRadius',
      'meltPosition',
      'meltRadius',
      'stabPosition',
      'stabRadius',
    ] as const) {
      const actual = result[key];
      const expected = source[key];
      expect(actual, `${key} missing`).toBeDefined();
      expect(Math.abs((actual ?? 0) - (expected ?? 0))).toBeLessThanOrEqual(TOL);
    }
  });

  it('preserves Preon enable + colour + duration through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    expect(result.preonEnabled).toBe(true);
    expect(result.preonColor).toEqual(source.preonColor);
    expect(result.preonMs).toBe(source.preonMs);
  });

  it('preserves extended effect colours (drag/lightning/melt) through Apply', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    expect(result.dragColor).toEqual(source.dragColor);
    expect(result.lightningColor).toEqual(source.lightningColor);
    expect(result.meltColor).toEqual(source.meltColor);
  });

  it('preserves core fields alongside the extended ones', () => {
    const source = makeFullConfig();
    const result = roundTripViaApply(source);
    expect(result.baseColor).toEqual(source.baseColor);
    expect(result.blastColor).toEqual(source.blastColor);
    expect(result.clashColor).toEqual(source.clashColor);
    expect(result.lockupColor).toEqual(source.lockupColor);
    expect(result.style).toBe(source.style);
    expect(result.ignition).toBe(source.ignition);
    expect(result.retraction).toBe(source.retraction);
    expect(result.ignitionMs).toBe(source.ignitionMs);
    expect(result.retractionMs).toBe(source.retractionMs);
    expect(result.ledCount).toBe(source.ledCount);
  });

  it('falls back gracefully when cppResult is missing fields', () => {
    // Simulate a minimal reconstruction where only base colours are present.
    const minimal = {
      baseColor: { r: 50, g: 60, b: 70 },
      confidence: 0.5,
      warnings: [],
      rawAST: { type: 'raw' as const, name: 'Rainbow', args: [] },
    };
    const result = applyReconstructedConfig(minimal, 144);
    expect(result.baseColor).toEqual({ r: 50, g: 60, b: 70 });
    expect(result.lockupPosition).toBeUndefined();
    expect(result.preonEnabled).toBeUndefined();
    expect(result.style).toBe('stable');
    expect(result.ignition).toBe('standard');
  });

  // ── Phase 2B: import preservation field plumbing ──
  describe('import preservation fields', () => {
    const minimalCppResult = {
      baseColor: { r: 0, g: 0, b: 255 },
      confidence: 0.5,
      warnings: [],
      rawAST: { type: 'raw' as const, name: 'Blue', args: [] },
    };

    it('does NOT populate import fields when rawCode is undefined', () => {
      const result = applyReconstructedConfig(minimalCppResult, 144);
      expect(result.importedRawCode).toBeUndefined();
      expect(result.importedAt).toBeUndefined();
      expect(result.importedSource).toBeUndefined();
    });

    it('does NOT populate import fields when rawCode is empty string', () => {
      const result = applyReconstructedConfig(minimalCppResult, 144, '');
      expect(result.importedRawCode).toBeUndefined();
      expect(result.importedAt).toBeUndefined();
      expect(result.importedSource).toBeUndefined();
    });

    it('does NOT populate import fields when rawCode is whitespace-only', () => {
      const result = applyReconstructedConfig(minimalCppResult, 144, '   \n\t  ');
      expect(result.importedRawCode).toBeUndefined();
    });

    it('populates importedRawCode (trimmed) when rawCode is non-empty', () => {
      const raw = '  StylePtr<Layers<Blue, ResponsiveLockupL<White>>>()  ';
      const result = applyReconstructedConfig(minimalCppResult, 144, raw);
      expect(result.importedRawCode).toBe(raw.trim());
    });

    it('populates importedAt with a recent timestamp', () => {
      const before = Date.now();
      const result = applyReconstructedConfig(minimalCppResult, 144, 'StylePtr<Blue>()');
      const after = Date.now();
      expect(result.importedAt).toBeGreaterThanOrEqual(before);
      expect(result.importedAt).toBeLessThanOrEqual(after);
    });

    it('uses the provided source label when supplied', () => {
      const result = applyReconstructedConfig(
        minimalCppResult,
        144,
        'StylePtr<Blue>()',
        'Fett263 OS7 Style Library',
      );
      expect(result.importedSource).toBe('Fett263 OS7 Style Library');
    });

    it('falls back to "Pasted ProffieOS C++" when source is omitted', () => {
      const result = applyReconstructedConfig(minimalCppResult, 144, 'StylePtr<Blue>()');
      expect(result.importedSource).toBe('Pasted ProffieOS C++');
    });

    it('preserves multi-line raw code with embedded angle brackets', () => {
      const raw = `StylePtr<Layers<
  Stripes<3000, 1500, Rgb<0,140,255>, Rgb<255,255,255>>,
  ResponsiveLockupL<White, TrInstant, TrFade<300>>
>>()`;
      const result = applyReconstructedConfig(minimalCppResult, 144, raw);
      expect(result.importedRawCode).toBe(raw);
    });

    it('still populates the standard reconstructed fields alongside import fields', () => {
      const fullCppResult = {
        baseColor: { r: 100, g: 0, b: 200 },
        clashColor: { r: 255, g: 255, b: 255 },
        style: 'unstable',
        ignitionMs: 500,
        confidence: 0.8,
        warnings: [],
        rawAST: { type: 'raw' as const, name: 'Layers', args: [] },
      };
      const result = applyReconstructedConfig(fullCppResult, 144, 'StylePtr<Layers<...>>()', 'Test');
      // Reconstructed fields preserved
      expect(result.baseColor).toEqual({ r: 100, g: 0, b: 200 });
      expect(result.style).toBe('unstable');
      expect(result.ignitionMs).toBe(500);
      // Import fields populated
      expect(result.importedRawCode).toBe('StylePtr<Layers<...>>()');
      expect(result.importedSource).toBe('Test');
    });
  });

  // Sprint 5C plumbing (2026-05-03): the reconstructor surfaces
  // altPhaseColors (from ColorChange/ColorSelect/ColorChangeL wrappers)
  // and detectedEffectIds (from TransitionEffectL<EFFECT_*, ...> layers).
  // applyReconstructedConfig must pass these through onto BladeConfig so
  // ImportStatusBanner can render the detection-summary chip-line.
  describe('Sprint 5C — altPhaseColors + detectedEffectIds passthrough', () => {
    const baseCppResult = {
      baseColor: { r: 0, g: 140, b: 255 },
      confidence: 0.7,
      warnings: [],
      rawAST: { type: 'raw' as const, name: 'Blue', args: [] },
    };

    it('passes altPhaseColors through when non-empty', () => {
      const cppResult = {
        ...baseCppResult,
        altPhaseColors: [
          { r: 255, g: 0, b: 0 },
          { r: 0, g: 255, b: 0 },
        ],
      };
      const result = applyReconstructedConfig(cppResult, 144);
      expect(result.altPhaseColors).toEqual([
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
      ]);
    });

    it('does NOT attach altPhaseColors when undefined on cppResult', () => {
      const result = applyReconstructedConfig(baseCppResult, 144);
      expect('altPhaseColors' in result).toBe(false);
    });

    it('does NOT attach altPhaseColors when empty array on cppResult', () => {
      const cppResult = { ...baseCppResult, altPhaseColors: [] };
      const result = applyReconstructedConfig(cppResult, 144);
      expect('altPhaseColors' in result).toBe(false);
    });

    it('passes detectedEffectIds through when non-empty', () => {
      const cppResult = {
        ...baseCppResult,
        detectedEffectIds: ['EFFECT_PREON', 'EFFECT_BOOT', 'EFFECT_FORCE'],
      };
      const result = applyReconstructedConfig(cppResult, 144);
      expect(result.detectedEffectIds).toEqual([
        'EFFECT_PREON',
        'EFFECT_BOOT',
        'EFFECT_FORCE',
      ]);
    });

    it('does NOT attach detectedEffectIds when undefined on cppResult', () => {
      const result = applyReconstructedConfig(baseCppResult, 144);
      expect('detectedEffectIds' in result).toBe(false);
    });

    it('does NOT attach detectedEffectIds when empty array on cppResult', () => {
      const cppResult = { ...baseCppResult, detectedEffectIds: [] };
      const result = applyReconstructedConfig(cppResult, 144);
      expect('detectedEffectIds' in result).toBe(false);
    });

    it('passes both fields through together when both present', () => {
      const cppResult = {
        ...baseCppResult,
        altPhaseColors: [{ r: 255, g: 200, b: 100 }],
        detectedEffectIds: ['EFFECT_USER1'],
      };
      const result = applyReconstructedConfig(cppResult, 144);
      expect(result.altPhaseColors).toEqual([{ r: 255, g: 200, b: 100 }]);
      expect(result.detectedEffectIds).toEqual(['EFFECT_USER1']);
    });

    it('coexists with importedRawCode + importedSource', () => {
      const cppResult = {
        ...baseCppResult,
        altPhaseColors: [{ r: 100, g: 100, b: 100 }],
        detectedEffectIds: ['EFFECT_PREON'],
      };
      const result = applyReconstructedConfig(
        cppResult,
        144,
        'StylePtr<...>()',
        'Fett263 OS7 Style Library',
      );
      expect(result.altPhaseColors).toEqual([{ r: 100, g: 100, b: 100 }]);
      expect(result.detectedEffectIds).toEqual(['EFFECT_PREON']);
      expect(result.importedRawCode).toBe('StylePtr<...>()');
      expect(result.importedSource).toBe('Fett263 OS7 Style Library');
    });
  });
});

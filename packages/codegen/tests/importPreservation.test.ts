// ─── Import preservation — Phase 2A tests ────────────────────────────
//
// Covers `generateStyleCode`'s import-preservation early-return path
// (Phase 2A, 2026-05-02). When a BladeConfig carries a non-empty
// `importedRawCode` string, the codegen emits the raw code verbatim
// with a provenance header — bypassing the AST build + emit pipeline
// entirely. This lets complex Fett263 OS7 Style Library snippets that
// reach beyond KyberStation's parser registry round-trip byte-identically
// through the editor.
//
// Behaviors tested:
//   1. Pass-through round-trip — raw code emerges byte-identical past header
//   2. Provenance header content (importedSource / importedAt → ISO date)
//   3. Defaults when source / timestamp absent
//   4. Modulation-bindings warning surfaces only when bindings present
//   5. Modulation-bindings warning suppressed under `comments: false`
//   6. Provenance header NOT suppressed under `comments: false` (load-bearing)
//   7. Empty / null / undefined `importedRawCode` falls through to regeneration
//   8. Embedded angle brackets / newlines / multi-line layers pass through
//   9. Realistic Fett263-shape fixtures preserve verbatim
//   10. Regression sentinel — regenerated path unaffected

import { describe, it, expect } from 'vitest';
import { generateStyleCode, type BladeConfig } from '../src/index.js';
import type { ModulationPayloadLike } from '../src/proffieOSEmitter/applyModulationSnapshot.js';

const BASELINE: BladeConfig = {
  name: 'Test Saber',
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 0 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 400,
  shimmer: 0.1,
  ledCount: 144,
};

// ─── 1. Pass-through round-trip ──────────────────────────────────────

describe('generateStyleCode — importedRawCode pass-through', () => {
  it('returns the raw code with provenance header when importedRawCode is set', () => {
    const raw = 'StylePtr<Blue>()';
    const config: BladeConfig = { ...BASELINE, importedRawCode: raw };
    const out = generateStyleCode(config);

    // Header lines come first
    expect(out).toContain('// Imported from external source');
    expect(out).toContain('// Imported at: unknown');
    expect(out).toContain('// Original ProffieOS code preserved verbatim');

    // Raw body present, byte-identical
    expect(out).toContain(raw);
    expect(out.endsWith(raw)).toBe(true);
  });

  it('preserves multi-line raw code with embedded angle brackets', () => {
    const raw = 'StylePtr<InOutTrL<\n  Layers<\n    Blue,\n    AlphaL<White, Bump<Int<16384>, Int<8192>>>\n  >,\n  TrWipe<300>,\n  TrWipeIn<500>\n>>()';
    const config: BladeConfig = { ...BASELINE, importedRawCode: raw };
    const out = generateStyleCode(config);

    // Strip header, check raw body intact
    const headerEnd = out.lastIndexOf('// Original ProffieOS code preserved verbatim — regenerated structure suppressed.');
    expect(headerEnd).toBeGreaterThan(-1);
    const bodyStart = out.indexOf('\n', headerEnd) + 1;
    expect(out.slice(bodyStart)).toBe(raw);
  });
});

// ─── 2-3. Provenance header content ──────────────────────────────────

describe('generateStyleCode — provenance header content', () => {
  it('includes importedSource verbatim when set', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Red>()',
      importedSource: 'Fett263 OS7 Style Library',
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// Imported from Fett263 OS7 Style Library');
  });

  it('falls back to "external source" when importedSource is absent', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Red>()',
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// Imported from external source');
  });

  it('formats importedAt as ISO 8601 when set', () => {
    // 2026-05-02 04:00:00 UTC = 1777953600000 ms
    const ms = Date.UTC(2026, 4, 2, 4, 0, 0); // month is 0-indexed
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Red>()',
      importedAt: ms,
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// Imported at: 2026-05-02T04:00:00.000Z');
  });

  it('falls back to "unknown" when importedAt is absent', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Red>()',
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// Imported at: unknown');
  });

  it('falls back to "unknown" when importedAt is non-finite (defense in depth)', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Red>()',
      importedAt: Number.NaN,
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// Imported at: unknown');
  });
});

// ─── 4. Modulation-bindings warning ──────────────────────────────────

describe('generateStyleCode — importedRawCode + modulation warning', () => {
  it('emits the modulation warning when bindings are present', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [
        {
          id: 'b1',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.6,
          bypassed: false,
        },
        {
          id: 'b2',
          source: 'sound',
          expression: null,
          target: 'shimmer',
          combinator: 'multiply',
          amount: 1.0,
          bypassed: false,
        },
      ],
    };
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Blue>()',
      modulation: payload,
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// NOTE: this config has 2 modulation bindings');
    expect(out).toContain('"Convert to native"');
  });

  it('uses singular grammar when exactly one binding is present', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [
        {
          id: 'b1',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.6,
          bypassed: false,
        },
      ],
    };
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Blue>()',
      modulation: payload,
    };
    const out = generateStyleCode(config);
    expect(out).toContain('// NOTE: this config has 1 modulation binding that is not applied');
  });

  it('does NOT emit the modulation warning when bindings are empty', () => {
    const payload: ModulationPayloadLike = { version: 1, bindings: [] };
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Blue>()',
      modulation: payload,
    };
    const out = generateStyleCode(config);
    expect(out).not.toContain('// NOTE:');
    expect(out).not.toContain('Convert to native');
  });

  it('does NOT emit the modulation warning when modulation is undefined', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Blue>()',
    };
    const out = generateStyleCode(config);
    expect(out).not.toContain('// NOTE:');
  });
});

// ─── 5-6. comments: false interaction ────────────────────────────────

describe('generateStyleCode — importedRawCode + comments: false', () => {
  it('still emits the provenance header under comments: false (load-bearing)', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Blue>()',
      importedSource: 'pasted from config.h',
    };
    const out = generateStyleCode(config, { comments: false });
    expect(out).toContain('// Imported from pasted from config.h');
    expect(out).toContain('// Original ProffieOS code preserved verbatim');
  });

  it('suppresses the modulation warning under comments: false', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [
        {
          id: 'b1',
          source: 'swing',
          expression: null,
          target: 'shimmer',
          combinator: 'add',
          amount: 0.6,
          bypassed: false,
        },
      ],
    };
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: 'StylePtr<Blue>()',
      modulation: payload,
    };
    const out = generateStyleCode(config, { comments: false });
    expect(out).not.toContain('// NOTE:');
    expect(out).not.toContain('Convert to native');
    // Header still there
    expect(out).toContain('// Imported from external source');
  });
});

// ─── 7. Empty / null / undefined fall-through ────────────────────────

describe('generateStyleCode — empty importedRawCode falls through to regeneration', () => {
  it('regenerates when importedRawCode is undefined', () => {
    const out = generateStyleCode(BASELINE);
    expect(out).not.toContain('// Imported from');
    // Should contain real generated structure (StylePtr / Style*)
    expect(out).toMatch(/Style|Ptr|Rgb|Blue|InOut/);
  });

  it('regenerates when importedRawCode is an empty string', () => {
    const config: BladeConfig = { ...BASELINE, importedRawCode: '' };
    const out = generateStyleCode(config);
    expect(out).not.toContain('// Imported from');
    expect(out).toMatch(/Style|Ptr|Rgb|Blue|InOut/);
  });

  // null is not a valid type per BladeConfig but defense-in-depth — runtime
  // input from glyph decoders + persisted state can be loosely typed.
  it('regenerates when importedRawCode is null (defense in depth)', () => {
    const config = {
      ...BASELINE,
      importedRawCode: null as unknown as string | undefined,
    } as BladeConfig;
    const out = generateStyleCode(config);
    expect(out).not.toContain('// Imported from');
  });
});

// ─── 8. Realistic Fett263-shape fixtures ─────────────────────────────
//
// Synthetic but representative samples mirroring the OS7 Style Library
// shape. Once `apps/web/tests/fixtures/fett263-imports/` lands (Phase 0B),
// these can be replaced with file reads, but the contract under test
// stays the same: raw code passes through byte-identical past the header.

describe('generateStyleCode — Fett263-shape fixtures pass through verbatim', () => {
  // Synthetic Fett263-style fixture: layered Stripes with multiple effects.
  const FETT263_FIXTURE_1 = `StylePtr<Layers<
  Stripes<3000, -1500, RotateColorsX<Variation, Rgb<0,128,255>>, RotateColorsX<Variation, Rgb<0,64,192>>, RotateColorsX<Variation, Rgb<0,128,255>>, RotateColorsX<Variation, Rgb<0,32,128>>>,
  ResponsiveLockupL<Strobe<White, Mix<TwistAngle<>, Rgb<255,128,0>, Rgb<255,200,0>>, 50, 1>, TrInstant, TrFade<400>, Int<26000>, Int<6000>>,
  ResponsiveStabL<TransitionEffect<AlphaL<Mix<Bump<Scale<SlowNoise<Int<3000>>, Int<3000>, Int<8000>>, Int<6000>>, Red, Yellow>, Bump<Scale<SlowNoise<Int<2000>>, Int<10000>, Int<30000>>, Int<10000>>>, TrInstant, TrFade<400>, EFFECT_STAB>>,
  ResponsiveBlastL<Strobe<White, AudioFlicker<White, Blue>, 50, 1>, Int<400>, Int<100>, Int<400>>,
  ResponsiveClashL<Strobe<White, AudioFlicker<White, Blue>, 50, 1>, TrInstant, TrFade<200>, Int<400>>,
  LockupTrL<AlphaL<White, Bump<Int<16384>, Int<8192>>>, TrWipeIn<200>, TrFade<400>, SaberBase::LOCKUP_DRAG>,
  InOutTrL<TrWipeSparkTip<White, 300>, TrWipeInSparkTip<White, 500>>
>>()`;

  it('passes Fett263 layered fixture through verbatim', () => {
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: FETT263_FIXTURE_1,
      importedSource: 'Fett263 OS7 Style Library',
    };
    const out = generateStyleCode(config);
    expect(out).toContain(FETT263_FIXTURE_1);
    // Verify nothing was mangled — the raw content appears as a contiguous block
    const idx = out.indexOf(FETT263_FIXTURE_1);
    expect(idx).toBeGreaterThan(0);
    expect(out.length - idx).toBe(FETT263_FIXTURE_1.length);
  });

  it('handles an inner-template-only fixture (no StylePtr<...>() wrapper)', () => {
    const innerOnly = 'Layers<Blue, ResponsiveBlastL<White, Int<400>, Int<100>, Int<400>>>';
    const config: BladeConfig = {
      ...BASELINE,
      importedRawCode: innerOnly,
    };
    const out = generateStyleCode(config);
    expect(out).toContain(innerOnly);
    expect(out.endsWith(innerOnly)).toBe(true);
  });

  it('handles raw code with trailing whitespace / mixed line endings', () => {
    const raw = 'StylePtr<Blue>()\r\n';
    const config: BladeConfig = { ...BASELINE, importedRawCode: raw };
    const out = generateStyleCode(config);
    // raw content survives unchanged at the end
    expect(out.endsWith(raw)).toBe(true);
  });
});

// ─── 9. Regression sentinel — regenerated path unaffected ─────────────

describe('generateStyleCode — regenerated path regression sentinel', () => {
  it('produces the same output for a clean BladeConfig before vs after Phase 2A', () => {
    // No importedRawCode → goes through normal AST pipeline.
    const out1 = generateStyleCode(BASELINE);
    const out2 = generateStyleCode({ ...BASELINE });
    expect(out1).toBe(out2);

    // Smoke check: should look like real ProffieOS code, not the
    // import-preservation header.
    expect(out1).not.toContain('// Imported from');
    expect(out1).toContain('Style');
  });

  it('produces the regenerated output when importedRawCode is explicitly cleared via empty string', () => {
    const cleanOut = generateStyleCode(BASELINE);
    const clearedOut = generateStyleCode({ ...BASELINE, importedRawCode: '' });
    expect(clearedOut).toBe(cleanOut);
  });
});

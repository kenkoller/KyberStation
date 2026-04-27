// ─── Kyber Glyph v2 — modulation round-trip tests ───
//
// v2's contract: structurally identical body to v1, but the version
// byte is BUMPED to 2 when the payload carries modulation bindings.
// This signals to old clients that they may be losing data they should
// upgrade for. The body roundtrips losslessly through the existing
// v1 diff/applyDelta path.

import { describe, it, expect } from 'vitest';
import type { BladeConfig, ModulationPayload, SerializedBinding } from '@kyberstation/engine';
import {
  encodeGlyph,
  decodeGlyph,
  encodeGlyphFromConfig,
  decodeGlyphToConfig,
  KYBER_GLYPH_VERSION,
  KYBER_GLYPH_VERSION_V2,
  VISUAL_SYSTEM_VERSION,
  CANONICAL_DEFAULT_CONFIG,
  type GlyphPayload,
} from '../lib/sharePack/kyberGlyph';
import bs58 from 'bs58';
import { inflateRaw } from 'pako';

function cloneDefault(): BladeConfig {
  return JSON.parse(JSON.stringify(CANONICAL_DEFAULT_CONFIG));
}

type BladeWithMod = BladeConfig & { modulation?: ModulationPayload };

function mkPayload(blade: BladeWithMod): GlyphPayload {
  return {
    payloadVersion: KYBER_GLYPH_VERSION,
    visualVersion: VISUAL_SYSTEM_VERSION,
    saberType: 'single',
    blades: [blade],
    hiltModel: null,
    soundFontRef: null,
    oledBitmapRef: null,
    propFileId: 'default',
    publicName: null,
    createdAt: 0,
    kyberstationVersion: '0.15.0',
    extras: {},
  };
}

function readVersionByte(glyph: string): number {
  const dot = glyph.indexOf('.');
  const coded = glyph.slice(dot + 1);
  const zipped = bs58.decode(coded);
  const framed = inflateRaw(zipped);
  return framed[0];
}

const swingShimmerBinding: SerializedBinding = {
  id: 'b-swing-shimmer-1',
  source: 'swing',
  target: 'shimmer',
  combinator: 'add',
  amount: 0.6,
  bypassed: false,
  expression: null,
};

const breathingExprBinding: SerializedBinding = {
  id: 'b-breathing-1',
  source: null,
  target: 'shimmer',
  combinator: 'replace',
  amount: 1.0,
  bypassed: false,
  expression: {
    source: 'sin(time * 0.001) * 0.5 + 0.5',
    ast: { kind: 'placeholder' as never } as never, // tests don't exercise the AST
  } as never,
};

// ─── Auto-bump from v1 → v2 ───

describe('Kyber Glyph v2 — version-byte auto-bump', () => {
  it('emits v1 byte when no modulation field is present', () => {
    const blade = cloneDefault();
    const glyph = encodeGlyph(mkPayload(blade));
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION);
  });

  it('emits v1 byte when modulation field exists but bindings array is empty', () => {
    const blade: BladeWithMod = { ...cloneDefault(), modulation: { version: 1, bindings: [] } };
    const glyph = encodeGlyph(mkPayload(blade));
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION);
  });

  it('emits v2 byte when at least one binding is present', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: { version: 1, bindings: [swingShimmerBinding] },
    };
    const glyph = encodeGlyph(mkPayload(blade));
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION_V2);
  });

  it('emits v2 byte when an expression binding is present', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: { version: 1, bindings: [breathingExprBinding] },
    };
    const glyph = encodeGlyph(mkPayload(blade));
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION_V2);
  });

  it('emits v2 byte when caller explicitly passes payloadVersion=2 (even without bindings)', () => {
    const blade = cloneDefault();
    const payload = { ...mkPayload(blade), payloadVersion: KYBER_GLYPH_VERSION_V2 };
    const glyph = encodeGlyph(payload);
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION_V2);
  });

  it('rejects unknown payloadVersions', () => {
    const blade = cloneDefault();
    const payload = { ...mkPayload(blade), payloadVersion: 99 };
    expect(() => encodeGlyph(payload)).toThrow(/v1 or v2 glyphs/);
  });
});

// ─── Round-trip integrity for v2 payloads ───

describe('Kyber Glyph v2 — modulation round-trip integrity', () => {
  it('round-trips a single bare-source binding losslessly', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: { version: 1, bindings: [swingShimmerBinding] },
    };
    const glyph = encodeGlyph(mkPayload(blade));
    const decoded = decodeGlyph(glyph);
    expect(decoded.payloadVersion).toBe(KYBER_GLYPH_VERSION_V2);
    const decodedBlade = decoded.blades[0] as BladeWithMod;
    expect(decodedBlade.modulation?.bindings).toEqual([swingShimmerBinding]);
  });

  it('round-trips a multi-binding config (3 bindings)', () => {
    const bindings: readonly SerializedBinding[] = [
      swingShimmerBinding,
      { ...swingShimmerBinding, id: 'b-2', target: 'baseColor.r', amount: 0.4 },
      { ...swingShimmerBinding, id: 'b-3', source: 'sound', amount: 0.8 },
    ];
    const blade: BladeWithMod = { ...cloneDefault(), modulation: { version: 1, bindings } };
    const glyph = encodeGlyph(mkPayload(blade));
    const decoded = decodeGlyph(glyph);
    const decodedBlade = decoded.blades[0] as BladeWithMod;
    expect(decodedBlade.modulation?.bindings).toEqual(bindings);
  });

  it('preserves the bypassed flag on a binding', () => {
    const bypassed: SerializedBinding = { ...swingShimmerBinding, bypassed: true };
    const blade: BladeWithMod = { ...cloneDefault(), modulation: { version: 1, bindings: [bypassed] } };
    const glyph = encodeGlyph(mkPayload(blade));
    const decoded = decodeGlyph(glyph);
    const decodedBlade = decoded.blades[0] as BladeWithMod;
    expect(decodedBlade.modulation?.bindings[0]?.bypassed).toBe(true);
  });

  it('preserves an expression binding (source string + ast)', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: { version: 1, bindings: [breathingExprBinding] },
    };
    const glyph = encodeGlyph(mkPayload(blade));
    const decoded = decodeGlyph(glyph);
    const decodedBlade = decoded.blades[0] as BladeWithMod;
    const expr = decodedBlade.modulation?.bindings[0]?.expression;
    expect(expr).toBeTruthy();
    expect((expr as { source: string }).source).toBe('sin(time * 0.001) * 0.5 + 0.5');
  });

  it('preserves customModulators array on the modulation payload', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: {
        version: 1,
        bindings: [swingShimmerBinding],
        customModulators: [
          { id: 'custom1', label: 'Custom LFO', kind: 'simulated', identityColor: '#ff00ff' } as never,
        ],
      },
    };
    const glyph = encodeGlyph(mkPayload(blade));
    const decoded = decodeGlyph(glyph);
    const decodedBlade = decoded.blades[0] as BladeWithMod;
    expect(decodedBlade.modulation?.customModulators).toBeDefined();
    expect(decodedBlade.modulation?.customModulators?.length).toBe(1);
  });
});

// ─── Backward compatibility ───

describe('Kyber Glyph v2 — v1 backward compatibility', () => {
  it('v1 glyphs (no modulation) still decode cleanly under the v2-aware decoder', () => {
    const blade = cloneDefault();
    const glyph = encodeGlyph(mkPayload(blade));
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION); // emitted as v1
    const decoded = decodeGlyph(glyph);
    expect(decoded.payloadVersion).toBe(1);
    expect((decoded.blades[0] as BladeWithMod).modulation).toBeUndefined();
  });

  it('a v1 glyph with explicit empty modulation decodes without bindings', () => {
    const blade: BladeWithMod = { ...cloneDefault(), modulation: { version: 1, bindings: [] } };
    const glyph = encodeGlyph(mkPayload(blade));
    const decoded = decodeGlyph(glyph);
    const decodedBlade = decoded.blades[0] as BladeWithMod;
    // Empty bindings might or might not roundtrip depending on diff() — the
    // contract is: bindings.length stays 0 either way.
    const bindings = decodedBlade.modulation?.bindings ?? [];
    expect(bindings.length).toBe(0);
  });
});

// ─── Public-API helper round-trip ───

describe('Kyber Glyph v2 — encodeGlyphFromConfig + decodeGlyphToConfig', () => {
  it('round-trips a config with a recipe-style binding via the high-level API', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: { version: 1, bindings: [swingShimmerBinding] },
    };
    const glyph = encodeGlyphFromConfig(blade as BladeConfig);
    expect(readVersionByte(glyph)).toBe(KYBER_GLYPH_VERSION_V2);
    const decoded = decodeGlyphToConfig(glyph) as BladeWithMod;
    expect(decoded.modulation?.bindings).toEqual([swingShimmerBinding]);
  });
});

// ─── Size budgets ───

describe('Kyber Glyph v2 — size budgets', () => {
  it('a single-binding glyph stays under 200 base58 chars', () => {
    const blade: BladeWithMod = {
      ...cloneDefault(),
      modulation: { version: 1, bindings: [swingShimmerBinding] },
    };
    const glyph = encodeGlyph(mkPayload(blade));
    const dot = glyph.indexOf('.');
    const coded = glyph.slice(dot + 1);
    expect(coded.length).toBeLessThan(200);
  });

  it('a 3-binding glyph stays under 350 base58 chars', () => {
    const bindings: readonly SerializedBinding[] = [
      swingShimmerBinding,
      { ...swingShimmerBinding, id: 'b-2', target: 'noiseLevel', amount: 0.3 },
      { ...swingShimmerBinding, id: 'b-3', source: 'sound', target: 'baseColor.b', amount: 0.5 },
    ];
    const blade: BladeWithMod = { ...cloneDefault(), modulation: { version: 1, bindings } };
    const glyph = encodeGlyph(mkPayload(blade));
    const dot = glyph.indexOf('.');
    const coded = glyph.slice(dot + 1);
    expect(coded.length).toBeLessThan(350);
  });
});

// ─── Kyber Glyph v1 — round-trip + binding-contract tests ───
//
// These tests lock the v1 byte layout. Any change that breaks them
// is a format break and must bump KYBER_GLYPH_VERSION.

import { describe, it, expect } from 'vitest';
import type { BladeConfig } from '@kyberstation/engine';
import {
  encodeGlyph,
  decodeGlyph,
  encodeGlyphFromConfig,
  decodeGlyphToConfig,
  detectArchetype,
  KyberGlyphVersionError,
  KyberGlyphParseError,
  KYBER_GLYPH_VERSION,
  VISUAL_SYSTEM_VERSION,
  CANONICAL_DEFAULT_CONFIG,
  type GlyphPayload,
} from '../lib/sharePack/kyberGlyph';
import { deflateRaw, inflateRaw } from 'pako';
import { Packr } from 'msgpackr';
import bs58 from 'bs58';
import v1Fixtures from './fixtures/kyberGlyphs/v1/fixtures.json';

function cloneDefault(): BladeConfig {
  return JSON.parse(JSON.stringify(CANONICAL_DEFAULT_CONFIG));
}

function mkPayload(blade: BladeConfig, extras?: Record<string, unknown>): GlyphPayload {
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
    kyberstationVersion: '0.11.0',
    extras: extras ?? {},
  };
}

// ─── Round-trip integrity ───

describe('Kyber Glyph v1 — round-trip integrity', () => {
  it('round-trips the canonical default config losslessly', () => {
    const config = cloneDefault();
    const glyph = encodeGlyphFromConfig(config);
    const decoded = decodeGlyphToConfig(glyph);
    expect(decoded).toEqual(config);
  });

  it('round-trips a max-complexity config losslessly', () => {
    const config: BladeConfig = {
      ...cloneDefault(),
      name: 'Darth Vader — battle-hardened',
      baseColor: { r: 255, g: 40, b: 20 },
      clashColor: { r: 255, g: 240, b: 220 },
      lockupColor: { r: 255, g: 180, b: 60 },
      blastColor: { r: 255, g: 255, b: 255 },
      dragColor: { r: 255, g: 100, b: 0 },
      meltColor: { r: 255, g: 80, b: 20 },
      lightningColor: { r: 180, g: 200, b: 255 },
      style: 'unstable',
      ignition: 'stutter',
      retraction: 'dissolve',
      ignitionMs: 450,
      retractionMs: 900,
      shimmer: 0.35,
      ledCount: 160,
      // Spatial
      lockupPosition: 0.33,
      lockupRadius: 0.15,
      dragPosition: 0.9,
      dragRadius: 0.1,
      meltPosition: 1.0,
      meltRadius: 0.12,
      stabPosition: 0.5,
      stabRadius: 0.25,
      blastPosition: 0.6,
      blastRadius: 0.45,
      // Preon
      preonEnabled: true,
      preonColor: { r: 60, g: 0, b: 120 },
      preonMs: 350,
      // Dual-mode ignition
      dualModeIgnition: true,
      ignitionUp: 'scroll',
      ignitionDown: 'spark',
      ignitionAngleThreshold: 0.35,
      retractionUp: 'dissolve',
      retractionDown: 'drain',
      // Noise/motion/color dynamics
      noiseScale: 45,
      noiseSpeed: 30,
      noiseOctaves: 3,
      noiseTurbulence: 20,
      noiseIntensity: 70,
      motionSwingSensitivity: 80,
      motionAngleInfluence: 55,
      motionTwistResponse: 40,
      motionSmoothing: 50,
      motionSwingColorShift: { r: 255, g: 120, b: 80 },
      motionSwingBrighten: 45,
      colorHueShiftSpeed: 15,
      colorSaturationPulse: 25,
      colorBrightnessWave: 10,
      colorFlickerRate: 12,
      colorFlickerDepth: 40,
      // Spatial pattern
      spatialWaveFrequency: 5,
      spatialWaveSpeed: 35,
      spatialDirection: 'tip-to-hilt',
      spatialSpread: 60,
      spatialPhase: 45,
      // Blend/layer
      // (top-level blendMode field was retired 2026-04-29 per
      // Hardware Fidelity tighten — see types.ts; secondary-style
      // blending stays as it's a config knob, not a compositor mode)
      blendSecondaryStyle: 'fire',
      blendSecondaryAmount: 30,
      blendMaskType: 'gradient',
      // Tip/emitter
      tipColor: { r: 255, g: 200, b: 100 },
      tipLength: 12,
      tipFade: 70,
      emitterFlare: 35,
      emitterFlareWidth: 8,
      // Hardware
      stripType: 'dual-neo',
      bladeType: 'neopixel',
    };

    const glyph = encodeGlyphFromConfig(config);
    const decoded = decodeGlyphToConfig(glyph);
    expect(decoded).toEqual(config);
  });

  it('preserves extras bag through round-trip', () => {
    const config = cloneDefault();
    const extras = { customKey: 'preserve-me', nested: { a: 1, b: [1, 2, 3] } };
    const glyph = encodeGlyphFromConfig(config, { extras });
    const payload = decodeGlyph(glyph);
    expect(payload.extras).toEqual(extras);
  });

  it('preserves all GlyphPayload metadata fields', () => {
    const config = cloneDefault();
    const input: GlyphPayload = mkPayload(config);
    input.saberType = 'saberstaff';
    input.blades = [config, { ...config, baseColor: { r: 0, g: 255, b: 0 } }];
    input.hiltModel = 'graflex-v4';
    input.soundFontRef = 'SmoothSwing-Vader';
    input.oledBitmapRef = 'vader-helmet-bmp';
    input.propFileId = 'fett263';
    input.publicName = 'Stormbreaker';
    input.createdAt = 1729209600000;
    input.kyberstationVersion = '0.11.0';

    const glyph = encodeGlyph(input);
    const decoded = decodeGlyph(glyph);

    expect(decoded.payloadVersion).toBe(KYBER_GLYPH_VERSION);
    expect(decoded.visualVersion).toBe(VISUAL_SYSTEM_VERSION);
    expect(decoded.saberType).toBe('saberstaff');
    expect(decoded.blades).toEqual(input.blades);
    expect(decoded.hiltModel).toBe('graflex-v4');
    expect(decoded.soundFontRef).toBe('SmoothSwing-Vader');
    expect(decoded.oledBitmapRef).toBe('vader-helmet-bmp');
    expect(decoded.propFileId).toBe('fett263');
    expect(decoded.publicName).toBe('Stormbreaker');
    expect(decoded.createdAt).toBe(1729209600000);
    expect(decoded.kyberstationVersion).toBe('0.11.0');
  });

  it('handles multi-blade saberstaff with independent blades', () => {
    const bladeA: BladeConfig = { ...cloneDefault(), baseColor: { r: 255, g: 0, b: 0 } };
    const bladeB: BladeConfig = { ...cloneDefault(), baseColor: { r: 0, g: 255, b: 0 }, ledCount: 72 };
    const payload = mkPayload(bladeA);
    payload.saberType = 'saberstaff';
    payload.blades = [bladeA, bladeB];

    const glyph = encodeGlyph(payload);
    const decoded = decodeGlyph(glyph);
    expect(decoded.blades).toHaveLength(2);
    expect(decoded.blades[0]).toEqual(bladeA);
    expect(decoded.blades[1]).toEqual(bladeB);
  });
});

// ─── Deterministic encoding ───

describe('Kyber Glyph v1 — deterministic encoding', () => {
  it('produces byte-identical output for the same config', () => {
    const config = cloneDefault();
    const a = encodeGlyphFromConfig(config);
    const b = encodeGlyphFromConfig(config);
    expect(a).toBe(b);
  });

  it('same payload from different object instances encodes identically', () => {
    const configA = cloneDefault();
    const configB = JSON.parse(JSON.stringify(configA)) as BladeConfig;
    expect(encodeGlyphFromConfig(configA)).toBe(encodeGlyphFromConfig(configB));
  });
});

// ─── Version routing ───

describe('Kyber Glyph v1 — version routing', () => {
  it('throws KyberGlyphVersionError on unknown payload version byte', () => {
    // Synthesise a v99 glyph (clearly future) with a valid MessagePack body.
    // v2 is now registered (modulation routing), so the rejection floor
    // moves to anything not in VERSION_DECODERS.
    const packr = new Packr({ useRecords: false });
    const body = packr.pack({ t: 'single', b: [] }) as Uint8Array;
    const framed = new Uint8Array(body.length + 2);
    framed[0] = 99; // future payload version
    framed[1] = 1;
    framed.set(body, 2);
    const glyph = `JED.${bs58.encode(deflateRaw(framed, { level: 9 }))}`;

    expect(() => decodeGlyph(glyph)).toThrowError(KyberGlyphVersionError);
    try {
      decodeGlyph(glyph);
    } catch (err) {
      expect(err).toBeInstanceOf(KyberGlyphVersionError);
      expect((err as KyberGlyphVersionError).version).toBe(99);
    }
  });

  it('encodes the v1 version byte at offset 0 after inflate', () => {
    const glyph = encodeGlyphFromConfig(cloneDefault());
    const coded = glyph.split('.')[1];
    const zipped = bs58.decode(coded);
    const framed = inflateRaw(zipped);
    expect(framed[0]).toBe(KYBER_GLYPH_VERSION);
    expect(framed[1]).toBe(VISUAL_SYSTEM_VERSION);
  });
});

// ─── Archetype prefix ───

describe('Kyber Glyph v1 — archetype prefix', () => {
  it('red-base stable assigns SIT', () => {
    const red: BladeConfig = { ...cloneDefault(), baseColor: { r: 255, g: 30, b: 20 } };
    expect(detectArchetype(red)).toBe('SIT');
    expect(encodeGlyphFromConfig(red).startsWith('SIT.')).toBe(true);
  });

  it('unstable red assigns SIT', () => {
    const red: BladeConfig = {
      ...cloneDefault(),
      baseColor: { r: 220, g: 40, b: 40 },
      style: 'unstable',
    };
    expect(detectArchetype(red)).toBe('SIT');
  });

  it('Obi-Wan default (blue stable) assigns CNO because the name matches', () => {
    // The default carries name="Obi-Wan ANH", which is a canonical preset.
    expect(detectArchetype(cloneDefault())).toBe('CNO');
  });

  it('blue stable without a canonical name assigns JED', () => {
    const jedi: BladeConfig = { ...cloneDefault(), name: 'My saber', baseColor: { r: 0, g: 140, b: 255 } };
    expect(detectArchetype(jedi)).toBe('JED');
  });

  it('greyish base assigns GRY', () => {
    const grey: BladeConfig = { ...cloneDefault(), name: 'Neutral', baseColor: { r: 180, g: 180, b: 185 } };
    expect(detectArchetype(grey)).toBe('GRY');
  });

  it('unusual hue with custom style falls back to SPC', () => {
    const exotic: BladeConfig = {
      ...cloneDefault(),
      name: 'Exotic',
      baseColor: { r: 80, g: 200, b: 80 },
      style: 'fire',
    };
    expect(detectArchetype(exotic)).toBe('SPC');
  });
});

// ─── Delta encoding size ───

describe('Kyber Glyph v1 — delta encoding keeps payloads small', () => {
  it('default config encodes to a short base58 body', () => {
    const glyph = encodeGlyphFromConfig(cloneDefault());
    const body = glyph.split('.')[1];
    // Empty-delta pathological case: should be well under 40 chars.
    expect(body.length).toBeLessThan(40);
  });

  it('single-field tweak keeps the payload comfortably under the QR V3 budget', () => {
    const tweaked = encodeGlyphFromConfig({ ...cloneDefault(), shimmer: 0.42 });
    const tweakedLen = tweaked.split('.')[1].length;
    // A single-field tweak should still fit inside QR Version 2.
    expect(tweakedLen).toBeLessThan(60);
  });
});

// ─── Error handling ───

describe('Kyber Glyph v1 — error handling', () => {
  it('throws KyberGlyphParseError when separator is missing', () => {
    expect(() => decodeGlyph('notaglyph')).toThrowError(KyberGlyphParseError);
  });

  it('throws KyberGlyphParseError when base58 body is empty', () => {
    expect(() => decodeGlyph('JED.')).toThrowError(KyberGlyphParseError);
  });

  it('throws KyberGlyphParseError on malformed base58', () => {
    // Base58 doesn't include 0/O/I/l — so "0000" is guaranteed-bad.
    expect(() => decodeGlyph('JED.0000000')).toThrowError(KyberGlyphParseError);
  });

  it('throws KyberGlyphParseError on malformed deflate', () => {
    // Valid base58 chars, but not valid deflate bytes.
    expect(() => decodeGlyph('JED.abcdef')).toThrowError(KyberGlyphParseError);
  });

  it('throws when empty string is passed', () => {
    expect(() => decodeGlyph('')).toThrowError(KyberGlyphParseError);
  });
});

// ─── Graceful field addition ───

describe('Kyber Glyph v1 — forward-compatible extras', () => {
  it('preserves unknown top-level keys via the extras bag through re-encode', () => {
    const extras = { futureFeature: { enabled: true, payload: 'mystery' } };
    const once = encodeGlyphFromConfig(cloneDefault(), { extras });
    const decoded1 = decodeGlyph(once);
    const twice = encodeGlyph(decoded1);
    const decoded2 = decodeGlyph(twice);
    expect(decoded2.extras).toEqual(extras);
  });
});

// ─── Randomised round-trip fuzz ───

describe('Kyber Glyph v1 — fuzz round-trip across 50 random configs', () => {
  const STYLES = ['stable', 'unstable', 'pulse', 'rotoscope', 'fire', 'gradient', 'plasma'];
  const IGNITIONS = ['standard', 'scroll', 'spark', 'center', 'wipe', 'stutter', 'glitch'];
  const RETRACTIONS = ['standard', 'dissolve', 'drain', 'unravel', 'flicker-out'];

  function mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomConfig(rng: () => number): BladeConfig {
    const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
    const rgb = () => ({
      r: Math.floor(rng() * 256),
      g: Math.floor(rng() * 256),
      b: Math.floor(rng() * 256),
    });
    const maybe = <T>(v: T) => (rng() < 0.5 ? v : undefined);

    const c: BladeConfig = {
      ...cloneDefault(),
      baseColor: rgb(),
      clashColor: rgb(),
      lockupColor: rgb(),
      blastColor: rgb(),
      style: pick(STYLES),
      ignition: pick(IGNITIONS),
      retraction: pick(RETRACTIONS),
      ignitionMs: Math.floor(rng() * 1500) + 100,
      retractionMs: Math.floor(rng() * 1500) + 100,
      shimmer: rng(),
      ledCount: Math.floor(rng() * 200) + 44,
    };

    // Randomly sprinkle optional fields
    const dragColor = maybe(rgb());
    if (dragColor) c.dragColor = dragColor;
    const meltColor = maybe(rgb());
    if (meltColor) c.meltColor = meltColor;
    const lockupPosition = maybe(rng());
    if (lockupPosition !== undefined) c.lockupPosition = lockupPosition;
    const blastPosition = maybe(rng());
    if (blastPosition !== undefined) c.blastPosition = blastPosition;
    const preonEnabled = maybe(true);
    if (preonEnabled) {
      c.preonEnabled = preonEnabled;
      c.preonColor = rgb();
      c.preonMs = Math.floor(rng() * 500) + 100;
    }
    const noiseScale = maybe(Math.floor(rng() * 100));
    if (noiseScale !== undefined) c.noiseScale = noiseScale;
    const dualMode = maybe(true);
    if (dualMode) {
      c.dualModeIgnition = true;
      c.ignitionUp = pick(IGNITIONS);
      c.ignitionDown = pick(IGNITIONS);
      c.ignitionAngleThreshold = rng();
    }

    return c;
  }

  it('50 random configs all round-trip losslessly', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const c = randomConfig(rng);
      const glyph = encodeGlyphFromConfig(c);
      const decoded = decodeGlyphToConfig(glyph);
      expect(decoded).toEqual(c);
    }
  });
});

// ─── Fixture stability (binding contract) ───

describe('Kyber Glyph v1 — fixture stability', () => {
  // These fixtures lock the v1 byte layout. If any future edit to
  // `kyberGlyph.ts` changes the encoded output for one of these, it
  // has broken the v1 stability contract — bump KYBER_GLYPH_VERSION
  // and add a v2 folder rather than editing these fixtures.
  const fixtures = v1Fixtures as unknown as {
    schemaVersion: number;
    visualVersion: number;
    fixtures: Array<{ name: string; glyph: string; input: { config: BladeConfig } }>;
  };

  it('the fixture schema version matches the current constants', () => {
    expect(fixtures.schemaVersion).toBe(KYBER_GLYPH_VERSION);
    expect(fixtures.visualVersion).toBe(VISUAL_SYSTEM_VERSION);
  });

  for (const fixture of fixtures.fixtures) {
    it(`fixture "${fixture.name}" re-encodes to the exact same glyph`, () => {
      const encoded = encodeGlyphFromConfig(fixture.input.config);
      expect(encoded).toBe(fixture.glyph);
    });

    it(`fixture "${fixture.name}" decodes to the exact input config`, () => {
      const decoded = decodeGlyphToConfig(fixture.glyph);
      expect(decoded).toEqual(fixture.input.config);
    });
  }
});

// ─── Field deletion (delta uses {__kgDelete}) ───

describe('Kyber Glyph v1 — delta deletion semantics', () => {
  it('encodes a config that LACKS a default field correctly', () => {
    // The canonical default has `name`; make a config that omits it.
    const { name: _ignored, ...rest } = cloneDefault();
    void _ignored;
    const glyph = encodeGlyphFromConfig(rest as BladeConfig);
    const decoded = decodeGlyphToConfig(glyph);
    expect('name' in decoded).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  computeCrossfade,
  readSmoothSwingConfig,
} from '../components/editor/SmoothSwingPanel';
import { SMOOTHSWING_DEFAULTS } from '../stores/layerStore';

// ─── computeCrossfade ────────────────────────────────────────────────────────
//
// Pure math helper mirroring SmoothSwingEngine's V2 speed-reactive crossfade.
// Below the silence threshold both gains must be zero; above it the gains
// sum to 1 and the high gain must monotonically increase with speed.

describe('computeCrossfade — below silence threshold', () => {
  it('returns silent + both gains zero below 0.1', () => {
    const r = computeCrossfade(0.05, 1.75);
    expect(r.active).toBe(false);
    expect(r.lowGain).toBe(0);
    expect(r.highGain).toBe(0);
  });

  it('silence extends up to but not including the threshold', () => {
    const r = computeCrossfade(0.099, 1.75);
    expect(r.active).toBe(false);
  });
});

describe('computeCrossfade — above threshold', () => {
  it('marks active and gains sum to 1', () => {
    const r = computeCrossfade(0.5, 1.75);
    expect(r.active).toBe(true);
    expect(r.lowGain + r.highGain).toBeCloseTo(1, 5);
  });

  it('higher speed biases toward high-gain (swingh)', () => {
    const slow = computeCrossfade(0.2, 1.75);
    const fast = computeCrossfade(0.9, 1.75);
    expect(fast.highGain).toBeGreaterThan(slow.highGain);
    expect(fast.lowGain).toBeLessThan(slow.lowGain);
  });

  it('at peak speed the crossfade is effectively all-high', () => {
    const r = computeCrossfade(1.0, 1.75);
    expect(r.highGain).toBeCloseTo(1, 5);
    expect(r.lowGain).toBeCloseTo(0, 5);
  });
});

describe('computeCrossfade — sharpness curve', () => {
  it('higher sharpness biases the mid-speed crossfade toward high', () => {
    const softer = computeCrossfade(0.5, 0.5);
    const sharper = computeCrossfade(0.5, 4.0);
    // At equal speeds a sharper curve should prefer high more aggressively.
    expect(sharper.highGain).toBeGreaterThan(softer.highGain);
  });

  it('clamps pathological sharpness=0 to a safe floor without NaN', () => {
    const r = computeCrossfade(0.5, 0);
    expect(Number.isFinite(r.lowGain)).toBe(true);
    expect(Number.isFinite(r.highGain)).toBe(true);
    expect(r.lowGain).toBeGreaterThanOrEqual(0);
    expect(r.highGain).toBeGreaterThanOrEqual(0);
  });
});

// ─── readSmoothSwingConfig ───────────────────────────────────────────────────
//
// Coerces unknown layer.config payloads into a fully populated
// SmoothSwingLayerConfig. Must backfill defaults for missing fields and
// ignore type-invalid values, so persisted layouts from older saves
// don't desync the plate UI.

describe('readSmoothSwingConfig — default backfill', () => {
  it('returns all defaults for an empty object', () => {
    expect(readSmoothSwingConfig({})).toEqual(SMOOTHSWING_DEFAULTS);
  });

  it('preserves provided numeric fields', () => {
    const r = readSmoothSwingConfig({
      swingThreshold: 420,
      humVolume: 1.5,
    });
    expect(r.swingThreshold).toBe(420);
    expect(r.humVolume).toBe(1.5);
    // Unset fields fall back to defaults.
    expect(r.swingStrength).toBe(SMOOTHSWING_DEFAULTS.swingStrength);
    expect(r.accentSwingSpeed).toBe(SMOOTHSWING_DEFAULTS.accentSwingSpeed);
  });

  it('ignores non-numeric values and substitutes the default', () => {
    const r = readSmoothSwingConfig({
      swingThreshold: 'not a number' as unknown as number,
      swingSharpness: NaN,
    });
    expect(r.swingThreshold).toBe(SMOOTHSWING_DEFAULTS.swingThreshold);
    expect(r.swingSharpness).toBe(SMOOTHSWING_DEFAULTS.swingSharpness);
  });

  it('accepts both V1 and V2 version strings and defaults otherwise', () => {
    expect(readSmoothSwingConfig({ version: 'V1' }).version).toBe('V1');
    expect(readSmoothSwingConfig({ version: 'V2' }).version).toBe('V2');
    expect(readSmoothSwingConfig({ version: 'V3' as unknown as 'V1' }).version).toBe(
      SMOOTHSWING_DEFAULTS.version,
    );
    expect(readSmoothSwingConfig({ version: 42 as unknown as 'V1' }).version).toBe(
      SMOOTHSWING_DEFAULTS.version,
    );
  });
});

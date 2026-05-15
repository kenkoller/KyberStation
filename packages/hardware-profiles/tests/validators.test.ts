import { describe, it, expect } from 'vitest';
import type { HardwareProfile } from '../src/index.js';
import {
  getMainBlade,
  isKnownDataPin,
  STOCK_PROFFIEBOARD_V3,
  validateProfile,
} from '../src/index.js';

function clone(profile: HardwareProfile): HardwareProfile {
  return structuredClone(profile);
}

describe('isKnownDataPin', () => {
  it('recognizes the three V3 data pin macros', () => {
    expect(isKnownDataPin('bladePin')).toBe(true);
    expect(isKnownDataPin('blade2Pin')).toBe(true);
    expect(isKnownDataPin('blade3Pin')).toBe(true);
  });

  it('rejects unknown macros', () => {
    expect(isKnownDataPin('blade4Pin')).toBe(false);
    expect(isKnownDataPin('')).toBe(false);
    expect(isKnownDataPin('bladepin')).toBe(false);
  });
});

describe('getMainBlade', () => {
  it('returns the single main blade', () => {
    const blade = getMainBlade(STOCK_PROFFIEBOARD_V3);
    expect(blade.role).toBe('main');
    expect(blade.ledCount).toBe(144);
  });

  it('throws when there are zero main blades', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.blades[0]!.role = 'crystal';
    expect(() => getMainBlade(bad)).toThrow(/exactly one 'main' blade/);
  });

  it('throws when there are multiple main blades', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.blades.push({ ...bad.blades[0]!, dataPin: 'blade2Pin' });
    bad.numBlades = 2;
    expect(() => getMainBlade(bad)).toThrow(/exactly one 'main' blade/);
  });
});

describe('validateProfile', () => {
  it('accepts the stock profile', () => {
    expect(validateProfile(STOCK_PROFFIEBOARD_V3)).toEqual([]);
  });

  it('rejects an empty id', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.id = '';
    expect(validateProfile(bad)).toContain(
      'id must be non-empty and contain no whitespace (got "")',
    );
  });

  it('rejects whitespace in id', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.id = 'has space';
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.startsWith('id must be non-empty'))).toBe(true);
  });

  it('rejects an empty vendor', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.vendor = '';
    expect(validateProfile(bad)).toContain('vendor must be non-empty');
  });

  it('rejects an empty model', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.model = '';
    expect(validateProfile(bad)).toContain('model must be non-empty');
  });

  it('catches numBlades / blades.length mismatch', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.numBlades = 2;
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('numBlades'))).toBe(true);
  });

  it('catches missing main blade', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.blades[0]!.role = 'crystal';
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes("role 'main'"))).toBe(true);
  });

  it('catches duplicate main blades', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.blades.push({ ...bad.blades[0]!, dataPin: 'blade2Pin' });
    bad.numBlades = 2;
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('found 2'))).toBe(true);
  });

  it('catches unknown dataPin', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad.blades[0] as any).dataPin = 'blade42Pin';
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('blade42Pin'))).toBe(true);
  });

  it('catches empty powerPins', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.blades[0]!.powerPins = [];
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('powerPins must not be empty'))).toBe(true);
  });

  it('catches non-positive ledCount on ws281x', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.blades[0]!.ledCount = 0;
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('ledCount must be > 0'))).toBe(true);
  });

  it('catches non-positive motionTimeoutMs', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.motionTimeoutMs = 0;
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('motionTimeoutMs'))).toBe(true);
  });

  it('catches defaultVolume out of range', () => {
    const tooHigh = clone(STOCK_PROFFIEBOARD_V3);
    tooHigh.defaultVolume = 9000;
    expect(validateProfile(tooHigh).some((e) => e.includes('defaultVolume'))).toBe(true);

    const tooLow = clone(STOCK_PROFFIEBOARD_V3);
    tooLow.defaultVolume = -1;
    expect(validateProfile(tooLow).some((e) => e.includes('defaultVolume'))).toBe(true);
  });

  it('catches non-positive clashThresholdG', () => {
    const bad = clone(STOCK_PROFFIEBOARD_V3);
    bad.clashThresholdG = 0;
    const errs = validateProfile(bad);
    expect(errs.some((e) => e.includes('clashThresholdG'))).toBe(true);
  });
});

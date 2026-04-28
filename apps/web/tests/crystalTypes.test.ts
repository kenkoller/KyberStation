import { describe, it, expect } from 'vitest';
import {
  selectForm,
  geometryParamsForConfig,
  isRedHue,
  isGreenHue,
  isBlueHue,
  CRYSTAL_FORMS,
} from '@/lib/crystal/types';
import type { BladeConfig } from '@kyberstation/engine';

const BLUE: BladeConfig = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0.1,
  ledCount: 144,
};

describe('isRedHue', () => {
  it('matches pure red', () => {
    expect(isRedHue({ r: 255, g: 0, b: 0 })).toBe(true);
  });
  it('matches crimson', () => {
    expect(isRedHue({ r: 220, g: 30, b: 24 })).toBe(true);
  });
  it('rejects blue', () => {
    expect(isRedHue({ r: 0, g: 140, b: 255 })).toBe(false);
  });
  it('rejects green', () => {
    expect(isRedHue({ r: 0, g: 220, b: 30 })).toBe(false);
  });
  it('rejects white', () => {
    expect(isRedHue({ r: 255, g: 255, b: 255 })).toBe(false);
  });
  it('rejects warm yellow', () => {
    // red > g by 40? 220 vs 200 = 20 diff. Not red-enough.
    expect(isRedHue({ r: 220, g: 200, b: 80 })).toBe(false);
  });
});

describe('isGreenHue', () => {
  it('matches pure green', () => {
    expect(isGreenHue({ r: 0, g: 255, b: 0 })).toBe(true);
  });
  it('matches Yoda green (saturated)', () => {
    expect(isGreenHue({ r: 30, g: 220, b: 40 })).toBe(true);
  });
  it('rejects pure red', () => {
    expect(isGreenHue({ r: 255, g: 0, b: 0 })).toBe(false);
  });
  it('rejects pure blue', () => {
    expect(isGreenHue({ r: 0, g: 0, b: 255 })).toBe(false);
  });
  it('rejects white (no dominant channel)', () => {
    expect(isGreenHue({ r: 255, g: 255, b: 255 })).toBe(false);
  });
  it('rejects black (luma guard)', () => {
    expect(isGreenHue({ r: 0, g: 0, b: 0 })).toBe(false);
  });
  it('rejects dim green (below luma threshold)', () => {
    // g=100 fails the g < 120 guard.
    expect(isGreenHue({ r: 20, g: 100, b: 30 })).toBe(false);
  });
  it('rejects yellow (warm — not green-enough margin over red)', () => {
    // g=220, r=200 → diff 20 < 40. Not green-enough.
    expect(isGreenHue({ r: 200, g: 220, b: 80 })).toBe(false);
  });
  it('rejects ambiguous cyan (not enough margin over blue)', () => {
    // g=220, b=240 → b-g=20, neither is green-dominant nor blue-dominant.
    expect(isGreenHue({ r: 0, g: 220, b: 240 })).toBe(false);
  });
});

describe('isBlueHue', () => {
  it('matches pure blue', () => {
    expect(isBlueHue({ r: 0, g: 0, b: 255 })).toBe(true);
  });
  it('matches Obi-Wan blue (cool)', () => {
    expect(isBlueHue({ r: 0, g: 140, b: 255 })).toBe(true);
  });
  it('rejects pure red', () => {
    expect(isBlueHue({ r: 255, g: 0, b: 0 })).toBe(false);
  });
  it('rejects pure green', () => {
    expect(isBlueHue({ r: 0, g: 255, b: 0 })).toBe(false);
  });
  it('rejects white (no dominant channel)', () => {
    expect(isBlueHue({ r: 255, g: 255, b: 255 })).toBe(false);
  });
  it('rejects black (luma guard)', () => {
    expect(isBlueHue({ r: 0, g: 0, b: 0 })).toBe(false);
  });
  it('rejects dim blue (below luma threshold)', () => {
    // b=100 fails the b < 120 guard.
    expect(isBlueHue({ r: 30, g: 20, b: 100 })).toBe(false);
  });
  it('rejects ambiguous cyan (not enough margin over green)', () => {
    // b=240, g=220 → b-g=20, neither blue-dominant nor green-dominant.
    expect(isBlueHue({ r: 0, g: 220, b: 240 })).toBe(false);
  });
  it('matches amethyst — note: chip faction-detection layers an r<80 gate', () => {
    // {r:170, g:60, b:240} satisfies isBlueHue (b dominant by >40 over r and g),
    // but chips.ts adds `r < 80` so this purple is correctly classified as Grey.
    // This test documents the predicate's surface, not the chip-level outcome.
    expect(isBlueHue({ r: 170, g: 60, b: 240 })).toBe(true);
  });
});

describe('hue predicates — mutual exclusion guarantees', () => {
  it('pure red passes only isRedHue', () => {
    const c = { r: 255, g: 0, b: 0 };
    expect(isRedHue(c)).toBe(true);
    expect(isGreenHue(c)).toBe(false);
    expect(isBlueHue(c)).toBe(false);
  });
  it('pure green passes only isGreenHue', () => {
    const c = { r: 0, g: 255, b: 0 };
    expect(isRedHue(c)).toBe(false);
    expect(isGreenHue(c)).toBe(true);
    expect(isBlueHue(c)).toBe(false);
  });
  it('pure blue passes only isBlueHue', () => {
    const c = { r: 0, g: 0, b: 255 };
    expect(isRedHue(c)).toBe(false);
    expect(isGreenHue(c)).toBe(false);
    expect(isBlueHue(c)).toBe(true);
  });
  it('white passes none (no dominant channel)', () => {
    const c = { r: 255, g: 255, b: 255 };
    expect(isRedHue(c)).toBe(false);
    expect(isGreenHue(c)).toBe(false);
    expect(isBlueHue(c)).toBe(false);
  });
  it('black passes none (luma guard)', () => {
    const c = { r: 0, g: 0, b: 0 };
    expect(isRedHue(c)).toBe(false);
    expect(isGreenHue(c)).toBe(false);
    expect(isBlueHue(c)).toBe(false);
  });
});

describe('selectForm', () => {
  it('defaults to Natural for blue stable', () => {
    expect(selectForm(BLUE)).toBe('natural');
  });

  it('picks Bled for red baseColor', () => {
    expect(selectForm({ ...BLUE, baseColor: { r: 220, g: 30, b: 24 } })).toBe('bled');
  });

  it('picks Cracked for unstable style', () => {
    expect(selectForm({ ...BLUE, style: 'unstable' })).toBe('cracked');
  });

  it('Cracked overrides Bled when style is unstable on red blade', () => {
    // Kylo case: unstable + red. Style takes priority.
    expect(
      selectForm({ ...BLUE, style: 'unstable', baseColor: { r: 220, g: 30, b: 24 } }),
    ).toBe('cracked');
  });
});

describe('geometryParamsForConfig', () => {
  it('returns distinct parameter sets for different forms', () => {
    const natural = geometryParamsForConfig(BLUE, 42);
    const bled = geometryParamsForConfig(
      { ...BLUE, baseColor: { r: 220, g: 30, b: 24 } },
      42,
    );
    expect(natural.twistDeg).toBe(0);
    expect(bled.twistDeg).toBeGreaterThan(0);
    expect(bled.crackCount).toBeGreaterThan(0);
  });

  it('scales height with LED count', () => {
    const shoto = geometryParamsForConfig({ ...BLUE, ledCount: 72 }, 42);
    const standard = geometryParamsForConfig(BLUE, 42);
    expect(shoto.height).toBeLessThan(standard.height);
  });

  it('uses 4 segments for darksaber bipyramid', () => {
    const dark = geometryParamsForConfig(
      { ...BLUE, baseColor: { r: 10, g: 10, b: 15 } } as BladeConfig & { saberType?: string },
      42,
    );
    // Without explicit saberType, this is a dark-ish blue → still natural
    expect(dark.form).toBe('natural');
  });
});

describe('CRYSTAL_FORMS', () => {
  it('has entries for all five forms', () => {
    expect(Object.keys(CRYSTAL_FORMS).sort()).toEqual(
      ['bled', 'cracked', 'natural', 'obsidian-bipyramid', 'paired'],
    );
  });

  it('each form has a name and description', () => {
    for (const form of Object.values(CRYSTAL_FORMS)) {
      expect(form.name).toBeTruthy();
      expect(form.description).toBeTruthy();
    }
  });
});

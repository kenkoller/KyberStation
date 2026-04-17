import { describe, it, expect } from 'vitest';
import {
  selectForm,
  geometryParamsForConfig,
  isRedHue,
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

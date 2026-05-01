// ─── Star Wars Visions preset coverage ────────────────────────────────────
//
// Pin the 2026-05-01 Preset Cartography sweep that adds 8 Visions Vol 1
// saber-wielders. Visions exists in a "non-binding canon" gray zone — we
// treat it the same as Acolyte: era 'animated', `screenAccurate: true`,
// continuity unset (defaults to canon).

import { describe, it, expect } from 'vitest';
import { ANIMATED_SERIES_PRESETS, type Preset } from '../src/index.js';

const VISIONS_IDS = [
  'animated-visions-ronin',
  'animated-visions-karre',
  'animated-visions-am',
  'animated-visions-kara',
  'animated-visions-f',
  'animated-visions-tajin-crosser',
  'animated-visions-lop',
  'animated-visions-tingting',
] as const;

function findById(id: string): Preset | undefined {
  return ANIMATED_SERIES_PRESETS.find((p) => p.id === id);
}

describe('Star Wars Visions presets (animated-series.ts)', () => {
  it('ships all 8 Visions presets', () => {
    for (const id of VISIONS_IDS) {
      const preset = findById(id);
      expect(preset, `Expected ${id} in ANIMATED_SERIES_PRESETS`).toBeDefined();
    }
  });

  it('every Visions preset is screenAccurate with era="animated"', () => {
    for (const id of VISIONS_IDS) {
      const preset = findById(id)!;
      expect(preset.era).toBe('animated');
      expect(preset.screenAccurate).toBe(true);
    }
  });

  it('Ronin uses unstable style + red base + heavy white modulation', () => {
    const ronin = findById('animated-visions-ronin')!;
    expect(ronin.affiliation).toBe('sith');
    expect(ronin.config.style).toBe('unstable');
    // Red dominant base
    expect(ronin.config.baseColor.r).toBeGreaterThan(ronin.config.baseColor.g);
    expect(ronin.config.baseColor.r).toBeGreaterThan(ronin.config.baseColor.b);
    // White-ish clash (the "redemption flare" reading)
    const clashSum =
      ronin.config.clashColor.r + ronin.config.clashColor.g + ronin.config.clashColor.b;
    expect(clashSum).toBeGreaterThan(700);
  });

  it('Karre + Am are paired Sith with red + unstable + matching IDs', () => {
    const karre = findById('animated-visions-karre')!;
    const am = findById('animated-visions-am')!;
    expect(karre.affiliation).toBe('sith');
    expect(am.affiliation).toBe('sith');
    expect(karre.config.style).toBe('unstable');
    expect(am.config.style).toBe('unstable');
    // Both red-dominant
    for (const preset of [karre, am]) {
      expect(preset.config.baseColor.r).toBeGreaterThan(preset.config.baseColor.g);
      expect(preset.config.baseColor.r).toBeGreaterThan(preset.config.baseColor.b);
    }
    // Am is more volatile (heavier shimmer + faster ignition) per character
    expect(am.config.shimmer).toBeGreaterThanOrEqual(karre.config.shimmer);
  });

  it('Kara (Ninth Jedi) is yellow Jedi stable', () => {
    const kara = findById('animated-visions-kara')!;
    expect(kara.affiliation).toBe('jedi');
    expect(kara.config.style).toBe('stable');
    // Yellow: r + g >> b
    const { r, g, b } = kara.config.baseColor;
    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });

  it('Visions Jedi (F, Tajin Crosser, Lop, TingTing, Kara) are all stable + Jedi', () => {
    const jediIds = [
      'animated-visions-f',
      'animated-visions-tajin-crosser',
      'animated-visions-lop',
      'animated-visions-tingting',
      'animated-visions-kara',
    ];
    for (const id of jediIds) {
      const preset = findById(id)!;
      expect(preset.affiliation, `${id} affiliation`).toBe('jedi');
      expect(preset.config.style, `${id} style`).toBe('stable');
    }
  });

  it('TingTing is purple (r + b > g)', () => {
    const tingting = findById('animated-visions-tingting')!;
    const { r, g, b } = tingting.config.baseColor;
    expect(r).toBeGreaterThan(g);
    expect(b).toBeGreaterThan(g);
  });

  it('all Visions Jedi blue blades have b > r and b > g', () => {
    const blueIds = [
      'animated-visions-f',
      'animated-visions-tajin-crosser',
      'animated-visions-lop',
    ];
    for (const id of blueIds) {
      const preset = findById(id)!;
      const { r, g, b } = preset.config.baseColor;
      expect(b, `${id} base.b`).toBeGreaterThan(r);
      expect(b, `${id} base.b`).toBeGreaterThan(g);
    }
  });

  it('config shape passes runtime sanity for every Visions preset', () => {
    for (const id of VISIONS_IDS) {
      const preset = findById(id)!;
      expect(preset.config.ledCount).toBe(144);
      expect(preset.config.ignitionMs).toBeGreaterThan(0);
      expect(preset.config.retractionMs).toBeGreaterThan(0);
      expect(preset.config.shimmer).toBeGreaterThanOrEqual(0);
      expect(preset.config.shimmer).toBeLessThanOrEqual(1);
      // RGB channel sanity
      for (const channel of ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const) {
        const color = preset.config[channel] as { r: number; g: number; b: number };
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
      }
    }
  });

  it('ID uniqueness across animated-series.ts after the addition', () => {
    const allIds = ANIMATED_SERIES_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(allIds);
    expect(allIds.length).toBe(uniqueIds.size);
  });
});

// ─── Star Wars Visions Vol 2 preset coverage ──────────────────────────
//
// Vol 2 (2023) widened the studio roster beyond Japan. This batch adds
// 7 saber-wielders across the episodes where a saber is meaningful.

import { describe, it, expect } from 'vitest';
import { ANIMATED_SERIES_PRESETS, type Preset } from '../src/index.js';

const VOL2_IDS = [
  'animated-visions-lola',
  'animated-visions-lolas-master',
  'animated-visions-koten',
  'animated-visions-tichina',
  'animated-visions-tan',
  'animated-visions-rani',
  'animated-visions-golak-inquisitor',
] as const;

function findById(id: string): Preset | undefined {
  return ANIMATED_SERIES_PRESETS.find((p) => p.id === id);
}

describe('Star Wars Visions Vol 2 presets', () => {
  it('ships all 7 Vol 2 presets', () => {
    for (const id of VOL2_IDS) {
      expect(findById(id), `Expected ${id} in ANIMATED_SERIES_PRESETS`).toBeDefined();
    }
  });

  it('every Vol 2 preset has era="animated" + screenAccurate=true', () => {
    for (const id of VOL2_IDS) {
      const preset = findById(id)!;
      expect(preset.era).toBe('animated');
      expect(preset.screenAccurate).toBe(true);
    }
  });

  it('Sith characters (Lola, her Master, Golak Inquisitor) all use unstable style + sith affiliation + red base', () => {
    const sithIds = [
      'animated-visions-lola',
      'animated-visions-lolas-master',
      'animated-visions-golak-inquisitor',
    ];
    for (const id of sithIds) {
      const preset = findById(id)!;
      expect(preset.affiliation).toBe('sith');
      expect(preset.config.style).toBe('unstable');
      const { r, g, b } = preset.config.baseColor;
      expect(r).toBeGreaterThan(g);
      expect(r).toBeGreaterThan(b);
    }
  });

  it('Jedi characters (Koten, Tichina, Tan, Rani) all use stable style + jedi affiliation + blue base', () => {
    const jediIds = [
      'animated-visions-koten',
      'animated-visions-tichina',
      'animated-visions-tan',
      'animated-visions-rani',
    ];
    for (const id of jediIds) {
      const preset = findById(id)!;
      expect(preset.affiliation).toBe('jedi');
      expect(preset.config.style).toBe('stable');
      const { r, g, b } = preset.config.baseColor;
      expect(b).toBeGreaterThan(r);
      expect(b).toBeGreaterThan(g);
    }
  });

  it('Lola is more volatile than her master (higher shimmer)', () => {
    const lola = findById('animated-visions-lola')!;
    const master = findById('animated-visions-lolas-master')!;
    expect(lola.config.shimmer).toBeGreaterThan(master.config.shimmer);
  });

  it('Rani has slow summon ignition for the awakening moment', () => {
    const rani = findById('animated-visions-rani')!;
    expect(rani.config.ignition).toBe('summon');
    expect(rani.config.ignitionMs).toBeGreaterThan(400);
  });

  it('config shape passes runtime sanity for every Vol 2 preset', () => {
    for (const id of VOL2_IDS) {
      const preset = findById(id)!;
      expect(preset.config.ledCount).toBe(144);
      expect(preset.config.ignitionMs).toBeGreaterThan(0);
      expect(preset.config.retractionMs).toBeGreaterThan(0);
      expect(preset.config.shimmer).toBeGreaterThanOrEqual(0);
      expect(preset.config.shimmer).toBeLessThanOrEqual(1);
      for (const channel of ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const) {
        const color = preset.config[channel] as { r: number; g: number; b: number };
        for (const v of [color.r, color.g, color.b]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('Vol 1 presets remain shipped alongside Vol 2', () => {
    expect(findById('animated-visions-ronin'), 'Ronin (Vol 1)').toBeDefined();
    expect(findById('animated-visions-kara'), 'Kara (Vol 1)').toBeDefined();
    expect(findById('animated-visions-tingting'), 'TingTing (Vol 1)').toBeDefined();
  });
});

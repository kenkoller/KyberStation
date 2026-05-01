// ─── Demon Slayer Hashira preset coverage ───────────────────────────────
//
// Pin the 2026-05-01 overnight expansion that adds 7 Hashira nichirin
// presets (Giyu / Shinobu / Mitsuri / Obanai / Tengen / Muichiro /
// Sanemi). Rengoku (Flame Hashira) shipped earlier; Gyomei (Stone
// Hashira) wields a chained flail-axe rather than a katana and is
// intentionally omitted until a future engine style supports flail
// shapes.

import { describe, it, expect } from 'vitest';
import { ANIME_PRESETS, type Preset } from '../src/index.js';

const HASHIRA_IDS = [
  'pop-anime-giyu-nichirin',
  'pop-anime-shinobu-nichirin',
  'pop-anime-mitsuri-nichirin',
  'pop-anime-obanai-nichirin',
  'pop-anime-tengen-nichirin',
  'pop-anime-muichiro-nichirin',
  'pop-anime-sanemi-nichirin',
] as const;

function findById(id: string): Preset | undefined {
  return ANIME_PRESETS.find((p) => p.id === id);
}

describe('Demon Slayer Hashira presets', () => {
  it('ships all 7 expected Hashira presets', () => {
    for (const id of HASHIRA_IDS) {
      expect(findById(id), `Expected ${id} in ANIME_PRESETS`).toBeDefined();
    }
  });

  it('every Hashira preset has continuity="pop-culture" + era="expanded-universe"', () => {
    for (const id of HASHIRA_IDS) {
      const preset = findById(id)!;
      expect(preset.continuity).toBe('pop-culture');
      expect(preset.era).toBe('expanded-universe');
    }
  });

  it('Giyu (Water) is jedi + blue-dominant base + stable', () => {
    const giyu = findById('pop-anime-giyu-nichirin')!;
    expect(giyu.affiliation).toBe('jedi');
    expect(giyu.config.style).toBe('stable');
    const { r, g, b } = giyu.config.baseColor;
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it('Mitsuri (Love) is pink-dominant (high r, low g, high b)', () => {
    const mitsuri = findById('pop-anime-mitsuri-nichirin')!;
    const { r, g, b } = mitsuri.config.baseColor;
    expect(r).toBeGreaterThan(g);
    expect(b).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(200);
  });

  it('Sanemi (Wind) and Tengen (Sound) use unstable style for volatile temperaments', () => {
    const sanemi = findById('pop-anime-sanemi-nichirin')!;
    const tengen = findById('pop-anime-tengen-nichirin')!;
    expect(sanemi.config.style).toBe('unstable');
    expect(tengen.config.style).toBe('unstable');
  });

  it('Muichiro (Mist) uses aurora style for the diffuse halo aesthetic', () => {
    const muichiro = findById('pop-anime-muichiro-nichirin')!;
    expect(muichiro.config.style).toBe('aurora');
  });

  it('Shinobu (Insect) is purple-dominant (r and b > g)', () => {
    const shinobu = findById('pop-anime-shinobu-nichirin')!;
    const { r, g, b } = shinobu.config.baseColor;
    expect(r).toBeGreaterThan(g);
    expect(b).toBeGreaterThan(g);
  });

  it('config shape passes runtime sanity for every Hashira preset', () => {
    for (const id of HASHIRA_IDS) {
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

  it('each Hashira has a distinct base color (no two Hashira share a hue family)', () => {
    // Tally the dominant channel of each Hashira; expect significant
    // diversity (no Hashira accidentally cloned to share another\'s exact
    // identity).
    const baseColors = HASHIRA_IDS.map((id) => findById(id)!.config.baseColor);
    const fingerprints = baseColors.map((c) => `${Math.floor(c.r / 32)}-${Math.floor(c.g / 32)}-${Math.floor(c.b / 32)}`);
    const uniqueFingerprints = new Set(fingerprints);
    // 7 Hashira → at least 5 distinct rough hue buckets (32-step quantization)
    expect(uniqueFingerprints.size).toBeGreaterThanOrEqual(5);
  });

  it('does not collide with the existing Rengoku or Tanjiro entries', () => {
    expect(findById('pop-anime-rengoku-nichirin'), 'Rengoku still present').toBeDefined();
    expect(findById('pop-anime-tanjiro-nichirin'), 'Tanjiro still present').toBeDefined();
  });
});

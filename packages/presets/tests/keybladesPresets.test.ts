// ─── Kingdom Hearts Keyblade expansion preset coverage ─────────────────
//
// Adds 6 iconic Keyblades spanning KH1, KH2, BBS, KH3 in addition to
// the previously-shipped Kingdom Key + Oblivion (Oblivion uses the
// darksaber engine path per the 2026-05-01 audit).

import { describe, it, expect } from 'vitest';
import { FINAL_FANTASY_PRESETS, type Preset } from '../src/index.js';

const KEYBLADE_IDS = [
  'pop-kh-way-to-the-dawn',
  'pop-kh-stormfall-aqua',
  'pop-kh-wayward-wind-ventus',
  'pop-kh-earthshaker-terra',
  'pop-kh-star-seeker-sora',
  'pop-kh-three-wishes-sora',
] as const;

function findById(id: string): Preset | undefined {
  return FINAL_FANTASY_PRESETS.find((p) => p.id === id);
}

describe('KH Keyblade expansion presets', () => {
  it('ships all 6 Keyblade presets', () => {
    for (const id of KEYBLADE_IDS) {
      expect(findById(id), `Expected ${id} in FINAL_FANTASY_PRESETS`).toBeDefined();
    }
  });

  it('every Keyblade has continuity="pop-culture" + era="expanded-universe"', () => {
    for (const id of KEYBLADE_IDS) {
      const preset = findById(id)!;
      expect(preset.continuity).toBe('pop-culture');
      expect(preset.era).toBe('expanded-universe');
    }
  });

  it('Way to the Dawn (Riku) is neutral + unstable + blue-dominant', () => {
    const wttd = findById('pop-kh-way-to-the-dawn')!;
    expect(wttd.affiliation).toBe('neutral');
    expect(wttd.config.style).toBe('unstable');
    const { r, g, b } = wttd.config.baseColor;
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it('BBS trio (Aqua/Stormfall, Ven/Wayward Wind, Terra/Earthshaker) all use stable + jedi', () => {
    const bbsIds = [
      'pop-kh-stormfall-aqua',
      'pop-kh-wayward-wind-ventus',
      'pop-kh-earthshaker-terra',
    ];
    for (const id of bbsIds) {
      const preset = findById(id)!;
      expect(preset.affiliation).toBe('jedi');
      expect(preset.config.style).toBe('stable');
    }
  });

  it('Aqua\'s Stormfall is blue-dominant (water aesthetic)', () => {
    const aqua = findById('pop-kh-stormfall-aqua')!;
    const { r, g, b } = aqua.config.baseColor;
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it("Ventus's Wayward Wind is green-dominant (wind/grass aesthetic)", () => {
    const ventus = findById('pop-kh-wayward-wind-ventus')!;
    const { r, g, b } = ventus.config.baseColor;
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('Terra\'s Earthshaker is warm-orange (earth aesthetic)', () => {
    const terra = findById('pop-kh-earthshaker-terra')!;
    const { r, g, b } = terra.config.baseColor;
    expect(r).toBeGreaterThan(b); // warm tones favor red over blue
    expect(r).toBeGreaterThanOrEqual(g);
  });

  it('config shape passes runtime sanity for every Keyblade', () => {
    for (const id of KEYBLADE_IDS) {
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

  it('preserves existing Kingdom Key + Oblivion entries', () => {
    expect(findById('pop-ff-kingdom-key'), 'Kingdom Key still present').toBeDefined();
    expect(findById('pop-ff-oblivion'), 'Oblivion still present').toBeDefined();
  });
});

// ─── Acolyte + Maul lifecycle preset coverage ────────────────────────────
//
// Pin the 2026-05-01 Preset Cartography mini-sprint addition: 8 Acolyte
// presets in EXTENDED_UNIVERSE_PRESETS + 2 Maul lifecycle variants in
// PREQUEL_ERA_PRESETS. The goal is to catch silent regressions where a
// future audit-and-tighten pass might drop a preset without leaving an
// explicit "intentionally removed" comment.

import { describe, it, expect } from 'vitest';
import {
  EXTENDED_UNIVERSE_PRESETS,
  PREQUEL_ERA_PRESETS,
  type Preset,
} from '../src/index.js';

const ACOLYTE_IDS = [
  'eu-sol-green',
  'eu-indara-blue',
  'eu-yord-fandar-blue',
  'eu-jecki-lon-blue',
  'eu-vernestra-rwoh-purple-standard',
  'eu-master-kelnacca-blue',
  'eu-torbin-blue',
  'eu-qimir-stranger-red',
] as const;

const MAUL_LIFECYCLE_IDS = [
  'prequel-maul-crime-lord',
  'prequel-maul-rebels-tatooine',
] as const;

function findById(presets: readonly Preset[], id: string): Preset | undefined {
  return presets.find((p) => p.id === id);
}

describe('Acolyte presets (extended-universe.ts)', () => {
  it('ships all 8 expected Acolyte presets', () => {
    for (const id of ACOLYTE_IDS) {
      const preset = findById(EXTENDED_UNIVERSE_PRESETS, id);
      expect(preset, `Expected ${id} in EXTENDED_UNIVERSE_PRESETS`).toBeDefined();
    }
  });

  it('every Acolyte preset has era="expanded-universe" and screenAccurate=true', () => {
    for (const id of ACOLYTE_IDS) {
      const preset = findById(EXTENDED_UNIVERSE_PRESETS, id)!;
      expect(preset.era, `${id} era`).toBe('expanded-universe');
      expect(preset.screenAccurate, `${id} screenAccurate`).toBe(true);
    }
  });

  it('Sol is a Jedi with green base color', () => {
    const sol = findById(EXTENDED_UNIVERSE_PRESETS, 'eu-sol-green')!;
    expect(sol.affiliation).toBe('jedi');
    // Green dominant: g > r and g > b
    expect(sol.config.baseColor.g).toBeGreaterThan(sol.config.baseColor.r);
    expect(sol.config.baseColor.g).toBeGreaterThan(sol.config.baseColor.b);
  });

  it('Qimir is a Sith with red dominant base color and unstable style', () => {
    const qimir = findById(EXTENDED_UNIVERSE_PRESETS, 'eu-qimir-stranger-red')!;
    expect(qimir.affiliation).toBe('sith');
    // Red dominant: r > g and r > b
    expect(qimir.config.baseColor.r).toBeGreaterThan(qimir.config.baseColor.g);
    expect(qimir.config.baseColor.r).toBeGreaterThan(qimir.config.baseColor.b);
    expect(qimir.config.style).toBe('unstable');
  });

  it('Vernestra standard variant is distinct from her existing lightwhip preset', () => {
    const standard = findById(
      EXTENDED_UNIVERSE_PRESETS,
      'eu-vernestra-rwoh-purple-standard',
    );
    const lightwhip = findById(
      EXTENDED_UNIVERSE_PRESETS,
      'eu-vernestra-rwoh-purple',
    );
    expect(standard, 'standard form').toBeDefined();
    expect(lightwhip, 'lightwhip form (existing)').toBeDefined();
    // Same character, different IDs
    expect(standard!.character).toBe(lightwhip!.character);
    expect(standard!.id).not.toBe(lightwhip!.id);
  });

  it('all Jedi Acolyte presets have blue or green base colors (no red Jedi)', () => {
    const jediIds = ACOLYTE_IDS.filter((id) => {
      const p = findById(EXTENDED_UNIVERSE_PRESETS, id)!;
      return p.affiliation === 'jedi';
    });
    expect(jediIds.length).toBeGreaterThan(0);
    for (const id of jediIds) {
      const preset = findById(EXTENDED_UNIVERSE_PRESETS, id)!;
      const { r, g, b } = preset.config.baseColor;
      // Blue dominant (b > r) or green dominant (g > r), never red
      const isBlueOrGreen = b > r || g > r;
      expect(isBlueOrGreen, `${id} base color {r:${r}, g:${g}, b:${b}}`).toBe(true);
    }
  });

  it('config shape passes runtime sanity for every Acolyte preset', () => {
    for (const id of ACOLYTE_IDS) {
      const preset = findById(EXTENDED_UNIVERSE_PRESETS, id)!;
      expect(preset.config.ledCount).toBe(144);
      expect(preset.config.ignitionMs).toBeGreaterThan(0);
      expect(preset.config.retractionMs).toBeGreaterThan(0);
      expect(preset.config.shimmer).toBeGreaterThanOrEqual(0);
      expect(preset.config.shimmer).toBeLessThanOrEqual(1);
      // Required RGB shape
      for (const channel of ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const) {
        const color = preset.config[channel] as { r: number; g: number; b: number };
        expect(color.r, `${id} ${channel}.r`).toBeGreaterThanOrEqual(0);
        expect(color.r, `${id} ${channel}.r`).toBeLessThanOrEqual(255);
        expect(color.g, `${id} ${channel}.g`).toBeGreaterThanOrEqual(0);
        expect(color.g, `${id} ${channel}.g`).toBeLessThanOrEqual(255);
        expect(color.b, `${id} ${channel}.b`).toBeGreaterThanOrEqual(0);
        expect(color.b, `${id} ${channel}.b`).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('Maul lifecycle variants (prequel-era.ts)', () => {
  it('ships both Maul lifecycle variants alongside the original prequel-darth-maul', () => {
    const original = findById(PREQUEL_ERA_PRESETS, 'prequel-darth-maul');
    expect(original, 'original Maul preset still ships').toBeDefined();
    for (const id of MAUL_LIFECYCLE_IDS) {
      const preset = findById(PREQUEL_ERA_PRESETS, id);
      expect(preset, `Expected ${id} in PREQUEL_ERA_PRESETS`).toBeDefined();
    }
  });

  it('both lifecycle variants share character "Darth Maul" + sith affiliation', () => {
    for (const id of MAUL_LIFECYCLE_IDS) {
      const preset = findById(PREQUEL_ERA_PRESETS, id)!;
      expect(preset.character).toBe('Darth Maul');
      expect(preset.affiliation).toBe('sith');
    }
  });

  it('both lifecycle variants use unstable style (cybernetic instability)', () => {
    for (const id of MAUL_LIFECYCLE_IDS) {
      const preset = findById(PREQUEL_ERA_PRESETS, id)!;
      expect(preset.config.style).toBe('unstable');
    }
  });

  it('Old Master variant has slower ignition than Crime Lord variant', () => {
    const crimeLord = findById(PREQUEL_ERA_PRESETS, 'prequel-maul-crime-lord')!;
    const oldMaster = findById(PREQUEL_ERA_PRESETS, 'prequel-maul-rebels-tatooine')!;
    expect(oldMaster.config.ignitionMs).toBeGreaterThan(crimeLord.config.ignitionMs);
    expect(oldMaster.config.retractionMs).toBeGreaterThan(crimeLord.config.retractionMs);
  });
});

describe('No accidental ID duplicates introduced', () => {
  it('every preset id remains unique across the new entries', () => {
    const allIds = [
      ...EXTENDED_UNIVERSE_PRESETS.map((p) => p.id),
      ...PREQUEL_ERA_PRESETS.map((p) => p.id),
    ];
    const idSet = new Set(allIds);
    expect(allIds.length).toBe(idSet.size);
  });
});

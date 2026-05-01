// ─── Inquisitor preset cracked-kyber convention drift sentinel ──────────
//
// Per the 2026-04-23 preset-accuracy audit (CLAUDE.md):
//   "Inquisitors unified on `style: 'unstable'` across the five presets
//    (cracked-kyber lore)"
//
// The 2026-05-01 audit confirmed that convention had drifted: Trilla
// Suduri (Jedi: Fallen Order) shipped with `style: 'stable'` and Marrok
// (Ahsoka) shipped with `style: 'fire'` — neither matches the cracked-
// kyber Inquisitor canonical look. Both fixed in the same PR that
// introduced this sentinel.
//
// Going forward: every preset whose CHARACTER is on the canonical
// Inquisitor roster MUST use `style: 'unstable'` and have an
// affiliation of `'sith'`. Adding a new Inquisitor character means
// adding it to the `INQUISITOR_CHARACTERS` set below — that\'s the
// authoritative source of truth.

import { describe, it, expect } from 'vitest';
import {
  ANIMATED_SERIES_PRESETS,
  EXTENDED_UNIVERSE_PRESETS,
  type Preset,
} from '../src/index.js';

const INQUISITOR_CHARACTERS = new Set([
  // Live-action / animation Inquisitor roster
  'Grand Inquisitor',
  'Second Sister',
  'Fifth Brother',
  'Seventh Sister',
  'Reva Sevander', // Third Sister
  'Trilla Suduri', // Same person as Second Sister, Jedi: Fallen Order continuity
  'Marrok', // Ahsoka mercenary
  // Tales of the Empire arc — Barriss as Inquisitor (her PADAWAN preset
  // in prequel-era.ts predates the fall and is intentionally affiliation
  // 'jedi'; this entry covers the post-fall variant)
] as const);

const ALL_INQUISITOR_RELATED_PRESETS: readonly Preset[] = [
  ...ANIMATED_SERIES_PRESETS,
  ...EXTENDED_UNIVERSE_PRESETS,
];

function inquisitorPresets(): Preset[] {
  return ALL_INQUISITOR_RELATED_PRESETS.filter((p) =>
    INQUISITOR_CHARACTERS.has(p.character),
  );
}

describe('Inquisitor preset cracked-kyber convention', () => {
  it('finds at least one preset for every canonical Inquisitor character', () => {
    const charactersWithPresets = new Set(
      inquisitorPresets().map((p) => p.character),
    );
    for (const character of INQUISITOR_CHARACTERS) {
      expect(
        charactersWithPresets.has(character),
        `Missing canonical Inquisitor preset for "${character}". ` +
          `Either add a preset or remove the character from ` +
          `INQUISITOR_CHARACTERS in this test if they\'re no longer canon.`,
      ).toBe(true);
    }
  });

  it('every Inquisitor preset uses style: "unstable"', () => {
    for (const preset of inquisitorPresets()) {
      expect(
        preset.config.style,
        `${preset.id} ("${preset.name}", character: ${preset.character}) ` +
          `must use style: "unstable" per the cracked-kyber Inquisitor ` +
          `convention. Current: "${preset.config.style}". See the ` +
          `2026-05-01 Inquisitor audit for context.`,
      ).toBe('unstable');
    }
  });

  it('every Inquisitor preset has affiliation: "sith"', () => {
    for (const preset of inquisitorPresets()) {
      expect(
        preset.affiliation,
        `${preset.id} ("${preset.name}", character: ${preset.character}) ` +
          `must have affiliation: "sith" per the Inquisitor convention. ` +
          `Current: "${preset.affiliation}".`,
      ).toBe('sith');
    }
  });

  it('every Inquisitor preset has red-dominant base color (r > g and r > b)', () => {
    for (const preset of inquisitorPresets()) {
      const { r, g, b } = preset.config.baseColor;
      expect(
        r > g && r > b,
        `${preset.id} ("${preset.name}") base color {r:${r}, g:${g}, b:${b}} ` +
          `should be red-dominant (Inquisitor cracked-kyber red). ` +
          `Current channels are not r-dominant.`,
      ).toBe(true);
    }
  });

  it('Tales of the Empire Inquisitor Barriss is present alongside her Padawan-era prequel preset', () => {
    const inquisitorBarriss = EXTENDED_UNIVERSE_PRESETS.find(
      (p) => p.id === 'eu-inquisitor-barriss-red',
    );
    expect(inquisitorBarriss).toBeDefined();
    expect(inquisitorBarriss!.affiliation).toBe('sith');
    expect(inquisitorBarriss!.config.style).toBe('unstable');
  });

  it('confirms Trilla Suduri uses unstable (the 2026-05-01 audit fix is durable)', () => {
    const trilla = EXTENDED_UNIVERSE_PRESETS.find((p) => p.id === 'eu-trilla-suduri-red');
    // The id may differ; assert by character
    const trillaByCharacter = EXTENDED_UNIVERSE_PRESETS.find(
      (p) => p.character === 'Trilla Suduri',
    );
    expect(trillaByCharacter).toBeDefined();
    expect(trillaByCharacter!.config.style).toBe('unstable');
    // Use trilla if id matches; the test tolerates either ID shape
    void trilla;
  });

  it('confirms Marrok uses unstable (the 2026-05-01 audit fix is durable)', () => {
    const marrok = EXTENDED_UNIVERSE_PRESETS.find((p) => p.character === 'Marrok');
    expect(marrok).toBeDefined();
    expect(marrok!.config.style).toBe('unstable');
  });
});

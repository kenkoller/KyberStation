// ─── Font-Pairing Heuristic Tests ───

import { describe, it, expect } from 'vitest';
import { scoreFontForConfig, pairingLabel } from '../lib/fontPairing';

const BLUE = { r: 0, g: 140, b: 255 };
const RED = { r: 255, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

function cfg(overrides: Partial<Parameters<typeof scoreFontForConfig>[1]> = {}) {
  return {
    style: 'stable',
    ignition: 'standard',
    baseColor: BLUE,
    name: '',
    ...overrides,
  };
}

describe('scoreFontForConfig', () => {
  it('returns 0 for completely unrelated fonts', () => {
    const { score } = scoreFontForConfig('GenericPack', cfg());
    expect(score).toBe(0);
  });

  it('gives SmthJedi a strong score for a blue stable preset', () => {
    const { score } = scoreFontForConfig('SmthJedi', cfg({ style: 'stable', baseColor: BLUE }));
    expect(score).toBeGreaterThan(0.5);
  });

  it('gives Vader a high score for a red stable preset', () => {
    const { score } = scoreFontForConfig('Vader', cfg({ style: 'stable', baseColor: RED }));
    expect(score).toBeGreaterThan(0.5);
  });

  it('penalises Vader for a Jedi-blue preset', () => {
    const { score } = scoreFontForConfig(
      'Vader',
      cfg({ style: 'stable', baseColor: BLUE }),
    );
    // Name mismatches palette, but keyword still matches style — should be low but not zero.
    expect(score).toBeLessThan(0.4);
  });

  it('boosts the score when preset name matches the character hint', () => {
    const withoutName = scoreFontForConfig('Vader', cfg({ baseColor: RED })).score;
    const withName = scoreFontForConfig(
      'Vader',
      cfg({ baseColor: RED, name: 'Darth Vader' }),
    ).score;
    expect(withName).toBeGreaterThan(withoutName);
  });

  it('Kylo font scores highest for unstable red', () => {
    const unstableRed = scoreFontForConfig(
      'KyloRen',
      cfg({ style: 'unstable', baseColor: RED }),
    ).score;
    const stableRed = scoreFontForConfig(
      'KyloRen',
      cfg({ style: 'stable', baseColor: RED }),
    ).score;
    expect(unstableRed).toBeGreaterThan(stableRed);
  });

  it('Darksaber pairs with white colour', () => {
    const { score } = scoreFontForConfig(
      'DarksaberClean',
      cfg({ style: 'stable', baseColor: WHITE, name: 'Darksaber' }),
    );
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('pairingLabel', () => {
  it('returns "Recommended" for high scores', () => {
    expect(pairingLabel(0.8).tag).toBe('recommended');
  });

  it('returns "Compatible" for medium scores', () => {
    expect(pairingLabel(0.35).tag).toBe('compatible');
  });

  it('returns "neutral" (empty label) for low scores', () => {
    expect(pairingLabel(0.1).tag).toBe('neutral');
    expect(pairingLabel(0.1).label).toBe('');
  });
});

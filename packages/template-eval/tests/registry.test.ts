import { describe, it, expect } from 'vitest';
import { isRegistered, registrySize, registeredNames } from '../src/registry.js';

describe('template registry', () => {
  it('has > 100 registered templates', () => {
    expect(registrySize()).toBeGreaterThan(100);
  });

  describe('named colors', () => {
    const colors = [
      'Red', 'Green', 'Blue', 'White', 'Black', 'Yellow', 'Cyan',
      'Magenta', 'Orange', 'Pink', 'DeepSkyBlue', 'DodgerBlue',
      'Purple', 'Gold', 'Crimson', 'Turquoise',
    ];
    for (const c of colors) {
      it(`registers ${c}`, () => {
        expect(isRegistered(c)).toBe(true);
      });
    }
  });

  describe('color aliases', () => {
    it('registers GREEN (uppercase alias)', () => {
      expect(isRegistered('GREEN')).toBe(true);
    });

    it('registers Grey as alias for Gray', () => {
      expect(isRegistered('Grey')).toBe(true);
    });

    it('registers OrangeRed as alias for Orange', () => {
      expect(isRegistered('OrangeRed')).toBe(true);
    });

    it('registers LimeGreen as alias for Lime', () => {
      expect(isRegistered('LimeGreen')).toBe(true);
    });
  });

  describe('color templates', () => {
    for (const name of ['Rgb', 'Rgb16', 'Mix', 'Gradient', 'Rainbow', 'AlphaL', 'RotateColorsX']) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  describe('function templates', () => {
    for (const name of ['Int', 'Scale', 'SwingSpeed', 'BladeAngle', 'Sin', 'Bump', 'ClampF', 'Sum', 'Mult']) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  describe('style templates', () => {
    for (const name of ['Layers', 'AudioFlicker', 'StyleFire', 'Pulsing', 'Stripes', 'Cylon', 'Blinking']) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  describe('effect templates', () => {
    for (const name of ['SimpleClashL', 'ResponsiveClashL', 'BlastL', 'LockupTrL', 'ResponsiveLockupL', 'TransitionEffectL']) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  describe('transition templates', () => {
    for (const name of ['TrInstant', 'TrFade', 'TrWipe', 'TrWipeIn', 'TrConcat', 'TrDelay', 'TrWaveX']) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  describe('wrapper templates', () => {
    for (const name of ['InOutTrL', 'InOutHelperL', 'StyleNormalPtr', 'TransitionLoop', 'SequenceL']) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  describe('aliases map to the same templates', () => {
    const aliasGroups = [
      ['TrSmoothFade', 'TrSmoothFadeX'],
      ['TrExtend', 'TrExtendX'],
      ['BlastL', 'BlastFadeoutL'],
      ['Pulsing', 'PulsingL', 'PulsingX'],
      ['Blinking', 'BlinkingL', 'BlinkingX'],
      ['NoisySoundLevel', 'NoisySoundLevelCompat'],
    ];

    for (const group of aliasGroups) {
      it(`${group.join(' / ')} all registered`, () => {
        for (const name of group) {
          expect(isRegistered(name)).toBe(true);
        }
      });
    }
  });

  it('registeredNames returns sorted array', () => {
    const names = registeredNames();
    expect(names.length).toBe(registrySize());
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('does not register unknown names', () => {
    expect(isRegistered('FooBarBaz')).toBe(false);
    expect(isRegistered('NotATemplate')).toBe(false);
  });
});

// ─── Gallery Filter Classifiers ───
//
// Spot checks for the two classifiers that power the color-family +
// style-family filter pills on the full-screen Gallery page. Focus on
// canonical saber colors + edge cases at the heuristic boundaries.

import { describe, it, expect } from 'vitest';
import {
  classifyColorFamily,
  classifyStyleFamily,
} from '../lib/galleryFilters';

describe('classifyColorFamily', () => {
  it('classifies canonical Jedi blue', () => {
    expect(classifyColorFamily({ r: 50, g: 100, b: 255 })).toBe('blue');
  });

  it('classifies pure blue', () => {
    expect(classifyColorFamily({ r: 0, g: 0, b: 255 })).toBe('blue');
  });

  it('classifies Qui-Gon / Luke ANH green', () => {
    expect(classifyColorFamily({ r: 0, g: 255, b: 0 })).toBe('green');
  });

  it('classifies canonical Sith red', () => {
    expect(classifyColorFamily({ r: 255, g: 10, b: 10 })).toBe('red');
  });

  it('classifies Mace Windu purple', () => {
    expect(classifyColorFamily({ r: 180, g: 50, b: 220 })).toBe('purple');
  });

  it('classifies magenta-ish as purple', () => {
    // r + b both strong, g dim — falls into the purple bucket
    expect(classifyColorFamily({ r: 255, g: 50, b: 255 })).toBe('purple');
  });

  it('classifies Ahsoka yellow', () => {
    expect(classifyColorFamily({ r: 255, g: 220, b: 40 })).toBe('yellow');
  });

  it('classifies pure white', () => {
    expect(classifyColorFamily({ r: 255, g: 255, b: 255 })).toBe('white');
  });

  it('classifies near-white (all bright, tight spread) as white', () => {
    expect(classifyColorFamily({ r: 240, g: 235, b: 230 })).toBe('white');
  });

  it('does NOT classify cream (too much spread) as white', () => {
    // max - min = 60 → not < 60, so falls through
    expect(classifyColorFamily({ r: 255, g: 240, b: 195 })).not.toBe('white');
  });

  it('buckets a muted pastel as other', () => {
    // All channels below the 160 dominant threshold
    expect(classifyColorFamily({ r: 140, g: 150, b: 130 })).toBe('other');
  });

  it('buckets pure black as other', () => {
    expect(classifyColorFamily({ r: 0, g: 0, b: 0 })).toBe('other');
  });

  it('buckets deep navy (dim blue) as other', () => {
    // b is dominant but below the 160 threshold
    expect(classifyColorFamily({ r: 10, g: 20, b: 100 })).toBe('other');
  });

  it('handles cyan as blue when b edges out g', () => {
    // g < b so the green branch skips; b dominant passes the blue check
    expect(classifyColorFamily({ r: 0, g: 200, b: 230 })).toBe('blue');
  });
});

describe('classifyStyleFamily', () => {
  it('buckets stable as steady', () => {
    expect(classifyStyleFamily('stable')).toBe('steady');
  });

  it('buckets rotoscope as steady', () => {
    expect(classifyStyleFamily('rotoscope')).toBe('steady');
  });

  it('buckets unstable as animated', () => {
    expect(classifyStyleFamily('unstable')).toBe('animated');
  });

  it('buckets fire + candle + ember as animated', () => {
    expect(classifyStyleFamily('fire')).toBe('animated');
    expect(classifyStyleFamily('candle')).toBe('animated');
    expect(classifyStyleFamily('ember')).toBe('animated');
  });

  it('buckets photon + plasma as particle', () => {
    expect(classifyStyleFamily('photon')).toBe('particle');
    expect(classifyStyleFamily('plasma')).toBe('particle');
  });

  it('buckets crystalShatter + shatter as particle', () => {
    expect(classifyStyleFamily('crystalShatter')).toBe('particle');
    expect(classifyStyleFamily('shatter')).toBe('particle');
  });

  it('buckets aurora + prism + nebula as color', () => {
    expect(classifyStyleFamily('aurora')).toBe('color');
    expect(classifyStyleFamily('prism')).toBe('color');
    expect(classifyStyleFamily('nebula')).toBe('color');
  });

  it('buckets painted + imageScroll as hand-painted', () => {
    expect(classifyStyleFamily('painted')).toBe('hand-painted');
    expect(classifyStyleFamily('imageScroll')).toBe('hand-painted');
  });

  it('buckets motion-reactive styles as kinetic', () => {
    // Genuinely motion-reactive — swing/tilt/twist/gravity drive visuals.
    expect(classifyStyleFamily('gravity')).toBe('kinetic');
    expect(classifyStyleFamily('tidal')).toBe('kinetic');
    expect(classifyStyleFamily('torrent')).toBe('kinetic');
    expect(classifyStyleFamily('vortex')).toBe('kinetic');
    expect(classifyStyleFamily('helix')).toBe('kinetic');
    expect(classifyStyleFamily('neutron')).toBe('kinetic');
  });

  it('falls through to other for unknown style IDs', () => {
    expect(classifyStyleFamily('futureMysteryStyle')).toBe('other');
    expect(classifyStyleFamily('')).toBe('other');
  });

  it('is case-sensitive (crystalShatter vs crystalshatter)', () => {
    // crystalShatter is the canonical camelCase id; lowercased variant
    // falls through to 'other' rather than being treated as a match.
    expect(classifyStyleFamily('crystalshatter')).toBe('other');
  });
});

// Dark switch — Original art, MIT, KyberStation v0.11.2
// Inspired by the MPP (Darth Vader) control section — a blackened grip
// wrap over the switch housing broken by a lone crimson activator. The
// wrap is the visual signature; minimal surface detail.

import type { HiltPart } from '../../types';

export const darkSwitch: HiltPart = {
  id: 'dark-switch',
  displayName: 'Dark Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 68',
    width: 48,
    height: 68,
    bodyPath: 'M 9 0 L 39 0 L 39 68 L 9 68 Z',
    // Black rubberised grip wrap spans the middle band.
    accentPath: 'M 9 14 L 39 14 L 39 54 L 9 54 Z',
    accentFill: '#141418',
    detailPath: [
      // Top ring
      'M 9 4 L 39 4',
      // Wrap top/bottom edges
      'M 9 14 L 39 14',
      'M 9 54 L 39 54',
      // Stitching / rib runs along the wrap
      'M 9 22 L 39 22',
      'M 9 32 L 39 32',
      'M 9 46 L 39 46',
      // Sinister crimson activator square (drawn with strokes; small,
      // reads dark next to the black wrap)
      'M 20 38 L 28 38',
      'M 20 42 L 28 42',
      'M 20 38 L 20 42',
      'M 28 38 L 28 42',
      // Bottom ring
      'M 9 64 L 39 64',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 68 },
  era: 'original',
  faction: 'sith',
};

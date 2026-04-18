// Taped grip — Original art, MIT, KyberStation v0.11.2
// Inspired by Kylo Ren's taped-wrap handle — a cross-hatched bandage
// treatment that speaks to a hilt built by hand rather than machined
// clean. Diagonal strokes running both ways suggest the crossing
// layers of tape without rendering each individual strand.

import type { HiltPart } from '../../types';

export const tapedGrip: HiltPart = {
  id: 'taped-grip',
  displayName: 'Taped Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    bodyPath: 'M 9 0 L 39 0 L 39 100 L 9 100 Z',
    // Dark wrap covers the full grip (frayed look — readers see the
    // tape, not polished metal below). Leather-dark for weathered
    // warmth.
    accentPath: 'M 9 8 L 39 8 L 39 92 L 9 92 Z',
    accentFill: '#3a2a1e',
    detailPath: [
      // Top and bottom band edges
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      'M 9 92 L 39 92',
      'M 9 96 L 39 96',
      // Diagonal cross-wrap — descending strokes (left → right)
      'M 9 12 L 39 28',
      'M 9 28 L 39 44',
      'M 9 44 L 39 60',
      'M 9 60 L 39 76',
      'M 9 76 L 39 92',
      // Ascending strokes (left bottom → right top)
      'M 9 28 L 39 12',
      'M 9 44 L 39 28',
      'M 9 60 L 39 44',
      'M 9 76 L 39 60',
      'M 9 92 L 39 76',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'sequel',
  faction: 'sith',
};

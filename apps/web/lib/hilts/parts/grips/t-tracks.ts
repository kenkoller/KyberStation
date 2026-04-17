// T-tracks grip — Original art, MIT, KyberStation v0.11.2
// The classic "T-tracks" ribbed-grip pattern found on Graflex-style
// hilts. Two pairs of parallel longitudinal grooves split by three
// horizontal band rings.

import type { HiltPart } from '../../types';

export const tTracksGrip: HiltPart = {
  id: 't-tracks-grip',
  displayName: 'T-Tracks Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    bodyPath: 'M 9 0 L 39 0 L 39 100 L 9 100 Z',
    detailPath: [
      // Left pair of longitudinal grooves
      'M 13 8 L 13 92',
      'M 17 8 L 17 92',
      // Right pair of longitudinal grooves
      'M 31 8 L 31 92',
      'M 35 8 L 35 92',
      // Horizontal band rings
      'M 9 4 L 39 4', // top edge
      'M 9 22 L 39 22',
      'M 9 50 L 39 50',
      'M 9 78 L 39 78',
      'M 9 96 L 39 96', // bottom edge
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'universal',
  faction: 'jedi',
};

// Anakin ROTS grip — Original art, MIT, KyberStation v0.15.0
// Black-rubber inset grip inspired by Anakin Skywalker's ROTS hilt.
// Two machined silver bands bracket a long dark grip section with
// vertical channel detail. Reads as utility-machined, not ornament.

import type { HiltPart } from '../../types';

export const anakinRotsGrip: HiltPart = {
  id: 'anakin-rots-grip',
  displayName: 'Anakin ROTS Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 96',
    width: 48,
    height: 96,
    bodyPath: 'M 9 0 L 39 0 L 39 96 L 9 96 Z',
    accentPath: 'M 9 14 L 39 14 L 39 78 L 9 78 Z',
    accentFill: '#141418',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 14 L 39 14',
      'M 9 78 L 39 78',
      'M 14 18 L 14 74',
      'M 19 18 L 19 74',
      'M 24 18 L 24 74',
      'M 29 18 L 29 74',
      'M 34 18 L 34 74',
      'M 9 30 L 39 30',
      'M 9 46 L 39 46',
      'M 9 62 L 39 62',
      'M 9 84 L 39 84',
      'M 9 92 L 39 92',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 96 },
  era: 'prequel',
  faction: 'jedi',
};

// Windu grip — Original art, MIT, KyberStation v0.13.1
// Fluted silver grip with vertical channels and clean ring spacing.
// Matches the precise machined look of Mace Windu's hilt. Silver
// accent bands bracket the flute field.

import type { HiltPart } from '../../types';

export const winduGrip: HiltPart = {
  id: 'windu-grip',
  displayName: 'Windu Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 92',
    width: 48,
    height: 92,
    bodyPath: 'M 9 0 L 39 0 L 39 92 L 9 92 Z',
    accentPath: [
      'M 9 4 L 39 4 L 39 10 L 9 10 Z',
      'M 9 82 L 39 82 L 39 88 L 9 88 Z',
    ].join(' '),
    accentFill: '#c8c9d0',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 82 L 39 82',
      'M 9 88 L 39 88',
      'M 13 14 L 13 78',
      'M 18 14 L 18 78',
      'M 23 14 L 23 78',
      'M 28 14 L 28 78',
      'M 33 14 L 33 78',
      'M 9 14 L 39 14',
      'M 9 44 L 39 44',
      'M 9 78 L 39 78',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 92 },
  era: 'prequel',
  faction: 'jedi',
};

// Dooku canon grip — Original art, MIT, KyberStation v0.15.0
// Curved bronze-trimmed grip inspired by Count Dooku's signature
// dueling-stance silhouette. Outline arcs to one side; the bronze
// accent band sits at the apex of the curve to call out the bend.

import type { HiltPart } from '../../types';

export const dookuCanonGrip: HiltPart = {
  id: 'dooku-canon-grip',
  displayName: 'Dooku Canon Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    bodyPath: [
      'M 9 0',
      'L 39 0',
      'C 44 25, 44 75, 39 100',
      'L 9 100',
      'C 14 75, 14 25, 9 0',
      'Z',
    ].join(' '),
    accentPath: 'M 11 46 L 41 46 L 41 54 L 11 54 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 10 18 L 40 18',
      'M 11 32 L 41 32',
      'M 11 46 L 41 46',
      'M 11 54 L 41 54',
      'M 11 68 L 41 68',
      'M 10 82 L 40 82',
      'M 9 96 L 39 96',
      'M 16 8 Q 18 50 16 92',
      'M 32 8 Q 30 50 32 92',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'prequel',
  faction: 'sith',
};

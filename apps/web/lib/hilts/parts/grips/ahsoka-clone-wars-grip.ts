// Ahsoka Clone Wars grip — Original art, MIT, KyberStation v0.15.0
// Geometric ridged grip inspired by Ahsoka's Clone Wars main hilt.
// Diamond-cross machined surface texture punctuated by horizontal
// rings. Slightly compressed length for the youthful padawan scale.

import type { HiltPart } from '../../types';

export const ahsokaCloneWarsGrip: HiltPart = {
  id: 'ahsoka-clone-wars-grip',
  displayName: 'Ahsoka Clone Wars Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 88',
    width: 48,
    height: 88,
    bodyPath: 'M 9 0 L 39 0 L 39 88 L 9 88 Z',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 12 L 39 12',
      'M 9 76 L 39 76',
      'M 9 84 L 39 84',
      'M 12 16 L 24 28',
      'M 24 16 L 36 28',
      'M 12 28 L 24 16',
      'M 24 28 L 36 16',
      'M 12 32 L 24 44',
      'M 24 32 L 36 44',
      'M 12 44 L 24 32',
      'M 24 44 L 36 32',
      'M 12 48 L 24 60',
      'M 24 48 L 36 60',
      'M 12 60 L 24 48',
      'M 24 60 L 36 48',
      'M 12 64 L 24 72',
      'M 24 64 L 36 72',
      'M 12 72 L 24 64',
      'M 24 72 L 36 64',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 88 },
  era: 'prequel',
  faction: 'jedi',
};

// Covertec grip — Original art, MIT, KyberStation v0.13.1
// Standard machined grip with a side-mounted "covertec"-style belt
// clip lug visible on the lower portion. The clip itself sits on
// the left edge of the grip within the 48-unit canvas footprint.
// Popular contemporary replica-hilt detail.

import type { HiltPart } from '../../types';

export const covertecGrip: HiltPart = {
  id: 'covertec-grip',
  displayName: 'Covertec Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 104',
    width: 48,
    height: 104,
    bodyPath:
      'M 9 0 L 39 0 L 39 104 L 9 104 L 9 76 L 6 76 L 6 66 L 9 66 Z',
    accentPath: 'M 6 68 L 9 68 L 9 74 L 6 74 Z',
    accentFill: '#3a3a3e',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 16 L 39 16',
      'M 9 20 L 39 20',
      'M 9 42 L 39 42',
      'M 6 66 L 9 66',
      'M 6 76 L 9 76',
      'M 6 66 L 6 76',
      'M 6 70 L 9 70',
      'M 6 72 L 9 72',
      'M 9 88 L 39 88',
      'M 9 92 L 39 92',
      'M 9 100 L 39 100',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 104 },
  era: 'universal',
  faction: 'grey',
};

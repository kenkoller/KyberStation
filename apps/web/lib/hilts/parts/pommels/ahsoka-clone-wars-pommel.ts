// Ahsoka Clone Wars pommel — Original art, MIT, KyberStation v0.15.0
// Stepped trapezoidal pommel inspired by Ahsoka's Clone Wars hilt.
// Clean machined steps narrow toward the base — geometric, slightly
// asymmetric in the rear-quarter detail.

import type { HiltPart } from '../../types';

export const ahsokaCloneWarsPommel: HiltPart = {
  id: 'ahsoka-clone-wars-pommel',
  displayName: 'Ahsoka Clone Wars Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 36',
    width: 48,
    height: 36,
    bodyPath:
      'M 9 0 L 39 0 L 39 14 L 36 18 L 36 30 L 33 36 L 15 36 L 12 30 L 12 18 L 9 14 Z',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 14 L 39 14',
      'M 12 18 L 36 18',
      'M 12 24 L 36 24',
      'M 12 30 L 36 30',
      'M 15 36 L 33 36',
      'M 22 33 L 26 33',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 36 },
  era: 'prequel',
  faction: 'jedi',
};

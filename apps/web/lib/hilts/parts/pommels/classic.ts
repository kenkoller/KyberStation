// Classic pommel — Original art, MIT, KyberStation v0.11.2
// Simple flat cap with a gentle taper toward the bottom. Suitable
// for most single-hilt classic and original-trilogy designs.

import type { HiltPart } from '../../types';

export const classicPommel: HiltPart = {
  id: 'classic-pommel',
  displayName: 'Classic Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 36',
    width: 48,
    height: 36,
    // Standard width (30) down to y=30, then tapers to 22 wide at bottom.
    bodyPath: 'M 9 0 L 39 0 L 39 30 L 35 34 L 35 36 L 13 36 L 13 34 L 9 30 Z',
    detailPath: [
      'M 9 4 L 39 4', // upper ring
      'M 9 16 L 39 16', // mid ring
      'M 13 30 L 35 30', // taper edge ring
      'M 21 33 L 27 33', // center stud
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 36 },
  era: 'universal',
  faction: 'jedi',
};

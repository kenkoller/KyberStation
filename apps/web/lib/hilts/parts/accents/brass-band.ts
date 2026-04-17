// Brass band accent — Original art, MIT, KyberStation v0.11.2
// Decorative ring accent — slots between larger parts in an assembly
// to break up otherwise monotonous cylinder silhouettes. Brass fill
// (#b08a4a) with two tiny rivet marks flanking the center.

import type { HiltPart } from '../../types';

export const brassBand: HiltPart = {
  id: 'brass-band',
  displayName: 'Brass Band',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 8',
    width: 48,
    height: 8,
    // Standard (30) cylinder, full height — this part is a thin ring.
    bodyPath: 'M 9 0 L 39 0 L 39 8 L 9 8 Z',
    // Brass accent fills the middle 6 units of the 8-unit ring.
    accentPath: 'M 9 1 L 39 1 L 39 7 L 9 7 Z',
    accentFill: '#b08a4a',
    detailPath: [
      'M 9 1 L 39 1', // top edge of accent
      'M 9 7 L 39 7', // bottom edge of accent
      'M 15 4 L 17 4', // rivet mark left
      'M 31 4 L 33 4', // rivet mark right
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 8 },
  era: 'universal',
  faction: 'jedi',
};

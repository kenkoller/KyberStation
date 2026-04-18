// Silver band accent — Original art, MIT, KyberStation v0.11.2
// Decorative ring accent — polished silver/chrome finish (#b8b8bc)
// for cooler-toned builds. Slots between larger parts like brass-band,
// but reads as the "Jedi-chrome" or "modern Sith" counterpart.

import type { HiltPart } from '../../types';

export const silverBand: HiltPart = {
  id: 'silver-band',
  displayName: 'Silver Band',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 8',
    width: 48,
    height: 8,
    // Standard (30) cylinder, full height.
    bodyPath: 'M 9 0 L 39 0 L 39 8 L 9 8 Z',
    accentPath: 'M 9 1 L 39 1 L 39 7 L 9 7 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      'M 9 1 L 39 1', // top edge of accent
      'M 9 7 L 39 7', // bottom edge of accent
      'M 13 3 L 35 3', // upper inner line
      'M 13 5 L 35 5', // lower inner line
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 8 },
  era: 'universal',
  faction: 'jedi',
};

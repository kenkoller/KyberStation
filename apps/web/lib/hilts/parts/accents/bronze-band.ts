// Bronze band accent — Original art, MIT, KyberStation v0.15.0
// Decorative ring accent in warm bronze (#8b6a3a) — sibling to the
// brass-band ring. Slots into Sith-aligned hilts (Dooku, Ventress)
// where a duskier warm tone suits the duelist aesthetic.

import type { HiltPart } from '../../types';

export const bronzeBand: HiltPart = {
  id: 'bronze-band',
  displayName: 'Bronze Band',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 8',
    width: 48,
    height: 8,
    bodyPath: 'M 9 0 L 39 0 L 39 8 L 9 8 Z',
    accentPath: 'M 9 1 L 39 1 L 39 7 L 9 7 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 1 L 39 1',
      'M 9 7 L 39 7',
      'M 14 4 L 16 4',
      'M 22 4 L 26 4',
      'M 32 4 L 34 4',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 8 },
  era: 'universal',
  faction: 'sith',
};

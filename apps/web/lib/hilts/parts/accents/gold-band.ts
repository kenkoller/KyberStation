// Gold band — Original art, MIT, KyberStation v0.13.1
// Decorative ring accent in polished gold, for ceremonial or
// ornate hilts (Emperor, Senate guards, ritual sabers). Thin with
// subtle engraving dots around its circumference.

import type { HiltPart } from '../../types';

export const goldBand: HiltPart = {
  id: 'gold-band',
  displayName: 'Gold Band',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 8',
    width: 48,
    height: 8,
    bodyPath: 'M 9 0 L 39 0 L 39 8 L 9 8 Z',
    accentPath: 'M 9 1 L 39 1 L 39 7 L 9 7 Z',
    accentFill: '#d4a846',
    detailPath: [
      'M 9 1 L 39 1',
      'M 9 7 L 39 7',
      'M 13 4 L 15 4',
      'M 19 4 L 21 4',
      'M 25 4 L 27 4',
      'M 31 4 L 33 4',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 8 },
  era: 'universal',
  faction: 'sith',
};

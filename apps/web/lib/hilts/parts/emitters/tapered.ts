// Tapered emitter — Original art, MIT, KyberStation v0.13.1
// Scoop-funnel emitter inspired by Luke Skywalker's ROTJ hilt. The
// aperture flares outward slightly and transitions to a stepped
// neck before meeting the standard-diameter body. Gives the top a
// subtle cone profile rather than a sharp bell.

import type { HiltPart } from '../../types';

export const taperedEmitter: HiltPart = {
  id: 'tapered',
  displayName: 'Tapered Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 56',
    width: 48,
    height: 56,
    bodyPath:
      'M 5 0 L 43 0 L 41 6 L 39 10 L 39 56 L 9 56 L 9 10 L 7 6 Z',
    detailPath: [
      'M 7 6 L 41 6',
      'M 9 10 L 39 10',
      'M 9 18 L 39 18',
      'M 17 22 L 17 38',
      'M 31 22 L 31 38',
      'M 9 40 L 39 40',
      'M 9 50 L 39 50',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 56 },
  era: 'original',
  faction: 'jedi',
};

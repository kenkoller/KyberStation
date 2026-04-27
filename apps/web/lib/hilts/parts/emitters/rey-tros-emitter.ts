// Rey TROS emitter — Original art, MIT, KyberStation v0.15.0
// Self-built emitter inspired by Rey's Rise of Skywalker hilt. Clean
// machined silver finish with a wrapped strap-band detail across the
// upper third — a callback to her quarterstaff heritage.

import type { HiltPart } from '../../types';

export const reyTrosEmitter: HiltPart = {
  id: 'rey-tros-emitter',
  displayName: 'Rey TROS Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 52',
    width: 48,
    height: 52,
    bodyPath:
      'M 7 0 L 41 0 L 41 4 L 39 6 L 39 52 L 9 52 L 9 6 L 7 4 Z',
    accentPath: 'M 9 14 L 39 14 L 39 22 L 9 22 Z',
    accentFill: '#3a2a1e',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      'M 9 14 L 39 14',
      'M 9 22 L 39 22',
      'M 12 14 L 12 22',
      'M 18 14 L 18 22',
      'M 24 14 L 24 22',
      'M 30 14 L 30 22',
      'M 36 14 L 36 22',
      'M 9 28 L 39 28',
      'M 16 32 L 16 42',
      'M 32 32 L 32 42',
      'M 9 46 L 39 46',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 52 },
  era: 'sequel',
  faction: 'jedi',
};

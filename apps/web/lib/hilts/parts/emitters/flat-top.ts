// Flat-top emitter — Original art, MIT, KyberStation v0.13.1
// Silver flat-top bezel emitter inspired by Mace Windu's hilt. The
// blade aperture sits on a full-width flat plate rather than a
// flared bell, giving a clean, precise silhouette unique among
// Jedi hilts. Standard body diameter below the plate.

import type { HiltPart } from '../../types';

export const flatTopEmitter: HiltPart = {
  id: 'flat-top',
  displayName: 'Flat-Top Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 48',
    width: 48,
    height: 48,
    bodyPath:
      'M 6 0 L 42 0 L 42 4 L 39 6 L 39 48 L 9 48 L 9 6 L 6 4 Z',
    accentPath: 'M 6 0 L 42 0 L 42 3 L 6 3 Z',
    accentFill: '#c8c9d0',
    detailPath: [
      'M 9 8 L 39 8',
      'M 9 16 L 39 16',
      'M 14 20 L 14 26',
      'M 24 20 L 24 26',
      'M 34 20 L 34 26',
      'M 9 30 L 39 30',
      'M 9 42 L 39 42',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 48 },
  era: 'prequel',
  faction: 'jedi',
};

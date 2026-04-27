// Ventress emitter — Original art, MIT, KyberStation v0.15.0
// Short curved-twin emitter inspired by Asajj Ventress's paired hilts.
// Bronze accent collar reads as a Sith-aligned warm tone; vent slits
// lean asymmetrically to suggest the matched curve of the pair.

import type { HiltPart } from '../../types';

export const ventressEmitter: HiltPart = {
  id: 'ventress-emitter',
  displayName: 'Ventress Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    bodyPath:
      'M 8 0 L 40 0 L 40 4 L 38 6 L 38 44 L 10 44 L 10 6 L 8 4 Z',
    accentPath: 'M 10 10 L 38 10 L 38 16 L 10 16 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 10 4 L 38 4',
      'M 10 10 L 38 10',
      'M 10 16 L 38 16',
      'M 14 20 L 14 32',
      'M 24 20 L 24 32',
      'M 34 20 L 34 32',
      'M 10 36 L 38 36',
      'M 10 40 L 38 40',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 44 },
  era: 'prequel',
  faction: 'sith',
};

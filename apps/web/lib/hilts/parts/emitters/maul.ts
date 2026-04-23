// Maul emitter — Original art, MIT, KyberStation v0.13.1
// Short dark-metal emitter derived from the Zabrak single-hilt
// aesthetic (Savage Opress / Maul's single variant). Stout profile,
// prominent stepped rings, dark accent band at the aperture.

import type { HiltPart } from '../../types';

export const maulEmitter: HiltPart = {
  id: 'maul-emitter',
  displayName: 'Maul Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    bodyPath:
      'M 9 0 L 39 0 L 39 4 L 40 6 L 40 12 L 39 14 L 39 44 L 9 44 L 9 14 L 8 12 L 8 6 L 9 4 Z',
    accentPath: 'M 8 6 L 40 6 L 40 12 L 8 12 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 8 8 L 40 8',
      'M 8 11 L 40 11',
      'M 9 18 L 39 18',
      'M 9 26 L 39 26',
      'M 16 20 L 16 24',
      'M 32 20 L 32 24',
      'M 9 36 L 39 36',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 44 },
  era: 'prequel',
  faction: 'sith',
};

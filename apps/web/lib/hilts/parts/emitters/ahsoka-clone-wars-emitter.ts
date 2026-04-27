// Ahsoka Clone Wars emitter — Original art, MIT, KyberStation v0.15.0
// Angular emitter inspired by Ahsoka's Clone Wars-era main hilt: a
// stepped silver bezel with three short vent slits and a mid-height
// activator collar. Reads geometric, slightly youthful in proportion.

import type { HiltPart } from '../../types';

export const ahsokaCloneWarsEmitter: HiltPart = {
  id: 'ahsoka-clone-wars-emitter',
  displayName: 'Ahsoka Clone Wars Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 46',
    width: 48,
    height: 46,
    bodyPath:
      'M 8 0 L 40 0 L 40 6 L 38 8 L 38 46 L 10 46 L 10 8 L 8 6 Z',
    accentPath: 'M 8 0 L 40 0 L 40 4 L 8 4 Z',
    accentFill: '#c8c9d0',
    detailPath: [
      'M 10 8 L 38 8',
      'M 10 14 L 38 14',
      'M 16 18 L 16 28',
      'M 24 18 L 24 28',
      'M 32 18 L 32 28',
      'M 10 30 L 38 30',
      'M 10 40 L 38 40',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 46 },
  era: 'prequel',
  faction: 'jedi',
};

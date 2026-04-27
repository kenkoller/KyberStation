// Plo Koon emitter — Original art, MIT, KyberStation v0.15.0
// Ornate-but-restrained emitter inspired by Plo Koon's Council-era
// hilt. Polished silver upper section, twin chrome bands flanking a
// machined collar. Reads as Jedi Council formal-issue.

import type { HiltPart } from '../../types';

export const ploKoonEmitter: HiltPart = {
  id: 'plo-koon-emitter',
  displayName: 'Plo Koon Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 50',
    width: 48,
    height: 50,
    bodyPath:
      'M 7 0 L 41 0 L 41 4 L 39 6 L 39 50 L 9 50 L 9 6 L 7 4 Z',
    accentPath:
      'M 9 10 L 39 10 L 39 14 L 9 14 Z M 9 22 L 39 22 L 39 26 L 9 26 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 14 L 39 14',
      'M 9 18 L 39 18',
      'M 9 22 L 39 22',
      'M 9 26 L 39 26',
      'M 14 30 L 14 40',
      'M 24 30 L 24 40',
      'M 34 30 L 34 40',
      'M 9 44 L 39 44',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 50 },
  era: 'prequel',
  faction: 'jedi',
};

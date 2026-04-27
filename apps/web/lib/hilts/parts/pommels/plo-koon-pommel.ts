// Plo Koon pommel — Original art, MIT, KyberStation v0.15.0
// Multi-step chrome-banded finial inspired by Plo Koon's Council
// hilt. Four polished steps narrow toward a precise center stud —
// the most ornament Plo Koon allows himself.

import type { HiltPart } from '../../types';

export const ploKoonPommel: HiltPart = {
  id: 'plo-koon-pommel',
  displayName: 'Plo Koon Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    bodyPath:
      'M 9 0 L 39 0 L 39 12 L 36 18 L 36 26 L 33 32 L 30 38 L 27 44 L 21 44 L 18 38 L 15 32 L 12 26 L 12 18 L 9 12 Z',
    accentPath:
      'M 9 8 L 39 8 L 39 12 L 9 12 Z M 12 22 L 36 22 L 36 26 L 12 26 Z M 15 32 L 33 32 L 33 36 L 15 36 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      'M 9 12 L 39 12',
      'M 12 18 L 36 18',
      'M 12 22 L 36 22',
      'M 12 26 L 36 26',
      'M 15 32 L 33 32',
      'M 15 36 L 33 36',
      'M 18 38 L 30 38',
      'M 21 44 L 27 44',
      'M 23 42 L 25 42',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 44 },
  era: 'prequel',
  faction: 'jedi',
};

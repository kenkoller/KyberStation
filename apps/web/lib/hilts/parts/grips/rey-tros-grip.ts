// Rey TROS grip — Original art, MIT, KyberStation v0.15.0
// Strap-wrapped grip inspired by Rey's TROS hilt — leather-toned
// wrap covers most of the grip length, with crossing strap detail
// running diagonally. Built, not bought.

import type { HiltPart } from '../../types';

export const reyTrosGrip: HiltPart = {
  id: 'rey-tros-grip',
  displayName: 'Rey TROS Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    bodyPath: 'M 9 0 L 39 0 L 39 100 L 9 100 Z',
    accentPath: 'M 9 8 L 39 8 L 39 86 L 9 86 Z',
    accentFill: '#3a2a1e',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      'M 9 86 L 39 86',
      'M 9 8 L 39 30',
      'M 9 30 L 39 8',
      'M 9 30 L 39 52',
      'M 9 52 L 39 30',
      'M 9 52 L 39 74',
      'M 9 74 L 39 52',
      'M 9 74 L 39 86',
      'M 39 74 L 9 86',
      'M 9 92 L 39 92',
      'M 9 96 L 39 96',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'sequel',
  faction: 'jedi',
};

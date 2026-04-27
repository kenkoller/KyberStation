// Plo Koon grip — Original art, MIT, KyberStation v0.15.0
// Polished chrome-banded grip inspired by Plo Koon's Council-grade
// hilt. Triple chrome bands segment the grip into three engraved
// fields. Meticulous, formal, every line intentional.

import type { HiltPart } from '../../types';

export const ploKoonGrip: HiltPart = {
  id: 'plo-koon-grip',
  displayName: 'Plo Koon Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    bodyPath: 'M 9 0 L 39 0 L 39 100 L 9 100 Z',
    accentPath: [
      'M 9 14 L 39 14 L 39 20 L 9 20 Z',
      'M 9 46 L 39 46 L 39 52 L 9 52 Z',
      'M 9 78 L 39 78 L 39 84 L 9 84 Z',
    ].join(' '),
    accentFill: '#b8b8bc',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 14 L 39 14',
      'M 9 20 L 39 20',
      'M 9 46 L 39 46',
      'M 9 52 L 39 52',
      'M 9 78 L 39 78',
      'M 9 84 L 39 84',
      'M 14 26 L 14 42',
      'M 24 26 L 24 42',
      'M 34 26 L 34 42',
      'M 14 58 L 14 74',
      'M 24 58 L 24 74',
      'M 34 58 L 34 74',
      'M 9 94 L 39 94',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'prequel',
  faction: 'jedi',
};

// Leia Rebels grip — Original art, MIT, KyberStation v0.15.0
// Plain training-grade grip inspired by Leia Organa's Rebels saber.
// Minimal lathework — a few horizontal rings in a clean field.
// Quiet, focused, beginner's discipline.

import type { HiltPart } from '../../types';

export const leiaRebelsGrip: HiltPart = {
  id: 'leia-rebels-grip',
  displayName: 'Leia Rebels Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 90',
    width: 48,
    height: 90,
    bodyPath: 'M 9 0 L 39 0 L 39 90 L 9 90 Z',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 24 L 39 24',
      'M 9 38 L 39 38',
      'M 9 52 L 39 52',
      'M 9 66 L 39 66',
      'M 9 80 L 39 80',
      'M 9 86 L 39 86',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 90 },
  era: 'original',
  faction: 'jedi',
};

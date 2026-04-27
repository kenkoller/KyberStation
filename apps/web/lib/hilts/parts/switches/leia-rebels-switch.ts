// Leia Rebels switch — Original art, MIT, KyberStation v0.15.0
// Understated single-button switch inspired by Leia Organa's Rebels
// training saber. One activator in a simple framed recess — built
// for learning, not display.

import type { HiltPart } from '../../types';

export const leiaRebelsSwitch: HiltPart = {
  id: 'leia-rebels-switch',
  displayName: 'Leia Rebels Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    bodyPath: 'M 9 0 L 39 0 L 39 44 L 9 44 Z',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 18 16 L 30 16',
      'M 18 28 L 30 28',
      'M 18 16 L 18 28',
      'M 30 16 L 30 28',
      'M 22 20 L 26 20',
      'M 22 24 L 26 24',
      'M 22 20 L 22 24',
      'M 26 20 L 26 24',
      'M 9 36 L 39 36',
      'M 9 40 L 39 40',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 44 },
  era: 'original',
  faction: 'jedi',
};

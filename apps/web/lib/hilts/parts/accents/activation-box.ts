// Activation box — Original art, MIT, KyberStation v0.13.1
// Boxy mid-body module with a prominent activation button housing
// and D-ring mounts. Protrudes slightly from the standard cylinder
// like the Graflex clamp but shorter and squarer. Brass fill.

import type { HiltPart } from '../../types';

export const activationBox: HiltPart = {
  id: 'activation-box',
  displayName: 'Activation Box',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 20',
    width: 48,
    height: 20,
    bodyPath: [
      'M 9 0',
      'L 39 0',
      'L 39 2',
      'L 40 4',
      'L 40 16',
      'L 39 18',
      'L 39 20',
      'L 9 20',
      'L 9 18',
      'L 8 16',
      'L 8 4',
      'L 9 2',
      'Z',
    ].join(' '),
    accentPath: 'M 8 4 L 40 4 L 40 16 L 8 16 Z',
    accentFill: '#b08a4a',
    detailPath: [
      'M 9 2 L 39 2',
      'M 8 4 L 40 4',
      'M 8 16 L 40 16',
      'M 9 18 L 39 18',
      'M 20 8 L 28 8',
      'M 20 12 L 28 12',
      'M 20 8 L 20 12',
      'M 28 8 L 28 12',
      'M 12 8 L 12 12',
      'M 36 8 L 36 12',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 20 },
  era: 'universal',
  faction: 'jedi',
};

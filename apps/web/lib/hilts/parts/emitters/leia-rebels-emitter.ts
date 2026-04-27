// Leia Rebels emitter — Original art, MIT, KyberStation v0.15.0
// Modest training-style emitter inspired by Leia Organa's Rebels-era
// practice saber. Plain machined cylinder with a single recessed ring
// at the aperture — restrained, purposeful, beginner's discipline.

import type { HiltPart } from '../../types';

export const leiaRebelsEmitter: HiltPart = {
  id: 'leia-rebels-emitter',
  displayName: 'Leia Rebels Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    bodyPath:
      'M 8 0 L 40 0 L 40 4 L 38 6 L 38 44 L 10 44 L 10 6 L 8 4 Z',
    detailPath: [
      'M 10 4 L 38 4',
      'M 10 8 L 38 8',
      'M 10 14 L 38 14',
      'M 18 18 L 18 28',
      'M 30 18 L 30 28',
      'M 10 32 L 38 32',
      'M 10 40 L 38 40',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 44 },
  era: 'original',
  faction: 'jedi',
};

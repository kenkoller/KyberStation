// Luke ROTJ grip — Original art, MIT, KyberStation v0.13.1
// Clean machined grip with a slight lower taper, inspired by Luke's
// ROTJ hilt. Two balanced mid-body ring-triples frame a restrained
// ridge field. No wrap, no clamp — just precise lathework.

import type { HiltPart } from '../../types';

export const lukeRotjGrip: HiltPart = {
  id: 'luke-rotj-grip',
  displayName: 'Luke ROTJ Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 96',
    width: 48,
    height: 96,
    bodyPath: 'M 9 0 L 39 0 L 39 96 L 9 96 Z',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 14 L 39 14',
      'M 9 18 L 39 18',
      'M 9 22 L 39 22',
      'M 9 36 L 39 36',
      'M 9 48 L 39 48',
      'M 9 60 L 39 60',
      'M 9 74 L 39 74',
      'M 9 78 L 39 78',
      'M 9 82 L 39 82',
      'M 9 92 L 39 92',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 96 },
  era: 'original',
  faction: 'jedi',
};

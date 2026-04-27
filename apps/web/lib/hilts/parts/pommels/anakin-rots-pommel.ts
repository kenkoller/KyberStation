// Anakin ROTS pommel — Original art, MIT, KyberStation v0.15.0
// Flat machined silver cap inspired by Anakin's ROTS hilt — clean
// disk-base with a central recessed mark and a single ring-edge
// detail. Field-utility, not ceremonial.

import type { HiltPart } from '../../types';

export const anakinRotsPommel: HiltPart = {
  id: 'anakin-rots-pommel',
  displayName: 'Anakin ROTS Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 32',
    width: 48,
    height: 32,
    bodyPath: 'M 9 0 L 39 0 L 39 28 L 36 32 L 12 32 L 9 28 Z',
    accentPath: 'M 9 18 L 39 18 L 39 22 L 9 22 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 18 L 39 18',
      'M 9 22 L 39 22',
      'M 12 32 L 36 32',
      'M 22 26 L 26 26',
      'M 22 30 L 26 30',
      'M 22 26 L 22 30',
      'M 26 26 L 26 30',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 32 },
  era: 'prequel',
  faction: 'jedi',
};

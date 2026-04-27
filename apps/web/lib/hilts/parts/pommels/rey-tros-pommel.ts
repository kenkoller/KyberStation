// Rey TROS pommel — Original art, MIT, KyberStation v0.15.0
// Wrapped flat cap inspired by Rey's TROS hilt. The leather strap
// detail extends to the very base, ending in a clean machined disk.
// Built-by-hand continuity throughout the silhouette.

import type { HiltPart } from '../../types';

export const reyTrosPommel: HiltPart = {
  id: 'rey-tros-pommel',
  displayName: 'Rey TROS Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 36',
    width: 48,
    height: 36,
    bodyPath: 'M 9 0 L 39 0 L 39 30 L 35 36 L 13 36 L 9 30 Z',
    accentPath: 'M 9 4 L 39 4 L 39 12 L 9 12 Z',
    accentFill: '#3a2a1e',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 12 L 39 12',
      'M 13 4 L 13 12',
      'M 19 4 L 19 12',
      'M 25 4 L 25 12',
      'M 31 4 L 31 12',
      'M 35 4 L 35 12',
      'M 9 18 L 39 18',
      'M 9 26 L 39 26',
      'M 13 36 L 35 36',
      'M 22 33 L 26 33',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 36 },
  era: 'sequel',
  faction: 'jedi',
};

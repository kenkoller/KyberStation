// Compact emitter — Original art, MIT, KyberStation v0.11.2
// Short emitter for shoto-scale hilts (Yoda, Ahsoka off-hand,
// youngling trainers). Narrow interface diameter (24 units / 1.0")
// on both connectors. Compressed vertical profile keeps the overall
// silhouette pocket-sized without losing mechanical character.

import type { HiltPart } from '../../types';

export const compactEmitter: HiltPart = {
  id: 'compact-emitter',
  displayName: 'Compact Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 42',
    width: 48,
    height: 42,
    // Narrow cylinder (24 wide, cx=24 → x from 12 to 36). Small flared
    // lip at the top (26 wide) to suggest a focused aperture.
    bodyPath:
      'M 11 0 L 37 0 L 37 3 L 36 5 L 36 42 L 12 42 L 12 5 L 11 3 Z',
    detailPath: [
      // Aperture lip
      'M 12 2 L 36 2',
      // Collar ring
      'M 12 7 L 36 7',
      // Two short vent slits — restrained, reads as compact
      'M 18 12 L 18 22',
      'M 30 12 L 30 22',
      // Mid ring
      'M 12 26 L 36 26',
      // Lower ring
      'M 12 38 L 36 38',
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 42 },
  era: 'universal',
  faction: 'jedi',
};

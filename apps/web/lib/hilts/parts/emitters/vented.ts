// Vented emitter — Original art, MIT, KyberStation v0.11.2
// Inspired by Kylo Ren's unstable crossguard hilt. The emitter body
// widens toward the bottom to mate with the crossguard quillon
// (bottomConnector: wide). Jagged vent slits along the body suggest
// an unstable crystal with energy escaping through exposed gaps.

import type { HiltPart } from '../../types';

export const ventedEmitter: HiltPart = {
  id: 'vented-emitter',
  displayName: 'Vented Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 54',
    width: 48,
    height: 54,
    // Standard cylinder (30) at top, flaring to wide (36) at the
    // bottom where the crossguard quillon mates.
    bodyPath:
      'M 9 0 L 39 0 L 39 6 L 38 8 L 38 30 L 40 34 L 42 40 L 42 54 L 6 54 L 6 40 L 8 34 L 10 30 L 10 8 L 9 6 Z',
    detailPath: [
      // Aperture edge
      'M 9 2 L 39 2',
      // Upper collar
      'M 9 6 L 39 6',
      // Jagged vent slits — unstable, irregular spacing
      'M 14 12 L 16 22',
      'M 18 10 L 16 20',
      'M 22 12 L 24 24',
      'M 28 10 L 26 22',
      'M 32 12 L 34 22',
      // Mid ring — broken, segmented
      'M 10 26 L 18 26',
      'M 22 26 L 28 26',
      'M 32 26 L 38 26',
      // Exposed crystal gap — horizontal rift
      'M 12 32 L 18 32',
      'M 22 32 L 26 32',
      'M 30 32 L 36 32',
      // Lower flare shoulder
      'M 8 40 L 40 40',
      // Quillon interface ring
      'M 7 48 L 41 48',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'wide', cx: 24, cy: 54 },
  era: 'sequel',
  faction: 'sith',
};

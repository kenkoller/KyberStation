// Dark pommel — Original art, MIT, KyberStation v0.11.2
// Vader-inspired flat cap with minimal ornamentation. Blunt silhouette,
// a hint of a terminal rivet, and a single detent ring separating cap
// from body. Reads "industrial, unadorned, imposing."

import type { HiltPart } from '../../types';

export const darkPommel: HiltPart = {
  id: 'dark-pommel',
  displayName: 'Dark Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 34',
    width: 48,
    height: 34,
    // Straight cylinder (30 wide) with a small flat end-cap step at y=28..34.
    bodyPath: 'M 9 0 L 39 0 L 39 28 L 37 30 L 37 34 L 11 34 L 11 30 L 9 28 Z',
    detailPath: [
      'M 9 4 L 39 4', // upper ring
      'M 9 26 L 39 26', // cap transition
      'M 11 30 L 37 30', // end-cap shoulder
      'M 23 32 L 25 32', // tiny terminal rivet
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 34 },
  era: 'original',
  faction: 'sith',
};

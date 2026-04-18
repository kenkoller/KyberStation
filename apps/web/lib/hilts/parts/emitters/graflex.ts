// Graflex-style emitter — Original art, MIT, KyberStation v0.11.2
// Inspired by the Graflex 3-cell flash reflector (public-domain
// photographic prop from the 1940s–60s). Features a flared bell
// at the top and three vent slits suggesting the flash cells.

import type { HiltPart } from '../../types';

export const graflexEmitter: HiltPart = {
  id: 'graflex-emitter',
  displayName: 'Graflex Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 60',
    width: 48,
    height: 60,
    // Flared bell: wide (36) for y=0..4, tapers to standard (30) for y=6..60.
    bodyPath:
      'M 6 0 L 42 0 L 41 4 L 39 6 L 39 60 L 9 60 L 9 6 L 7 4 Z',
    detailPath: [
      'M 9 10 L 39 10', // upper ring
      'M 15 14 L 15 34', // vent slit 1 (3-cell pattern)
      'M 24 14 L 24 34', // vent slit 2
      'M 33 14 L 33 34', // vent slit 3
      'M 9 40 L 39 40', // mid ring
      'M 9 54 L 39 54', // lower ring
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 60 },
  era: 'original',
  faction: 'jedi',
};

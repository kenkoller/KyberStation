// Anakin ROTS emitter — Original art, MIT, KyberStation v0.15.0
// Bare-machined silver emitter with a black-band recess inspired by
// Anakin Skywalker's Revenge of the Sith hilt. Stout cylinder with a
// flat aperture; the prominent dark groove is the signature read.

import type { HiltPart } from '../../types';

export const anakinRotsEmitter: HiltPart = {
  id: 'anakin-rots-emitter',
  displayName: 'Anakin ROTS Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 50',
    width: 48,
    height: 50,
    bodyPath:
      'M 7 0 L 41 0 L 41 4 L 39 6 L 39 50 L 9 50 L 9 6 L 7 4 Z',
    accentPath: 'M 9 16 L 39 16 L 39 24 L 9 24 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 9 16 L 39 16',
      'M 9 24 L 39 24',
      'M 14 18 L 14 22',
      'M 24 18 L 24 22',
      'M 34 18 L 34 22',
      'M 9 30 L 39 30',
      'M 9 38 L 39 38',
      'M 9 46 L 39 46',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 50 },
  era: 'prequel',
  faction: 'jedi',
};

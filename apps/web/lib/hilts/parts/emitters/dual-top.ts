// Dual emitter (top) — Original art, MIT, KyberStation v0.11.2
// Symmetric top of a Zabrak-style saberstaff (Darth Maul). Features
// a clean stepped aperture with a visible activation ring. Paired
// with dual-emitter-bottom to form a mirror-symmetric staff.

import type { HiltPart } from '../../types';

export const dualEmitterTop: HiltPart = {
  id: 'dual-emitter-top',
  displayName: 'Dual Emitter (Top)',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 46',
    width: 48,
    height: 46,
    // Clean stepped silhouette. Aperture (28) tapers out to a
    // single collar (32) then standard cylinder (30) all the way down.
    bodyPath: [
      'M 10 0',
      'L 38 0',
      'L 38 2',
      'L 40 4', // step out to collar
      'L 40 10',
      'L 39 12', // step in to standard
      'L 39 46',
      'L 9 46',
      'L 9 12',
      'L 8 10',
      'L 8 4',
      'L 10 2',
      'Z',
    ].join(' '),
    detailPath: [
      // Aperture edge
      'M 10 1 L 38 1',
      // Collar — top/bottom precision edges
      'M 8 5 L 40 5',
      'M 8 9 L 40 9',
      // Activation ring (centered band)
      'M 9 18 L 39 18',
      'M 9 22 L 39 22',
      // Rivet / index notches on the activation ring
      'M 14 19 L 14 21',
      'M 24 19 L 24 21',
      'M 34 19 L 34 21',
      // Lower body rings
      'M 9 30 L 39 30',
      'M 9 42 L 39 42',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 46 },
  era: 'prequel',
  faction: 'sith',
};

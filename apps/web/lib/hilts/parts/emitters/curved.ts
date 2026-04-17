// Curved emitter — Original art, MIT, KyberStation v0.11.2
// Inspired by Count Dooku's curved-hilt upper section. The emitter
// itself is straight (aperture perpendicular to blade axis), but
// the bottom connector flares asymmetrically to kiss the curved
// grip below. Top cx and bottom cx still sit at 24 per spec §2;
// the asymmetric flare is purely within the body silhouette.

import type { HiltPart } from '../../types';

export const curvedEmitter: HiltPart = {
  id: 'curved-emitter',
  displayName: 'Curved Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 50',
    width: 48,
    height: 50,
    // Straight aperture for y=0..30, then the right wall eases outward
    // and the left wall holds straight — giving the emitter a visual
    // "leaning" feel that reads as entry into a curved grip.
    bodyPath: [
      'M 9 0',
      'L 39 0', // flat top aperture
      'L 39 6',
      'L 40 10', // minor shoulder
      'L 40 28',
      // right wall arcs out subtly for the curve entry
      'C 40 34, 41 40, 40 46',
      'L 39 50',
      'L 9 50',
      'L 10 46',
      // left wall is straight — this is the inner curve side
      'C 9 40, 8 34, 8 28',
      'L 8 10',
      'L 9 6',
      'Z',
    ].join(' '),
    detailPath: [
      // Aperture edge
      'M 9 2 L 39 2',
      // Upper collar
      'M 8 8 L 40 8',
      // Mid rings — subtle tilt to signal curve
      'M 9 18 L 40 18',
      'M 9 28 L 40 28',
      // Diagonal vent slits — lean with the curve
      'M 16 12 L 16 24',
      'M 24 12 L 24 24',
      'M 32 12 L 32 24',
      // Lower ring near the curved connector
      'M 10 42 L 39 42',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 50 },
  era: 'prequel',
  faction: 'sith',
};

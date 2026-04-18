// Ornate emitter — Original art, MIT, KyberStation v0.11.2
// Inspired by the stepped, collared pro-Jedi emitter silhouette
// (Obi-Wan Revenge-of-the-Sith style). Features two precision
// step-downs suggesting machined collars and a fine aperture ring.

import type { HiltPart } from '../../types';

export const ornateEmitter: HiltPart = {
  id: 'ornate-emitter',
  displayName: 'Ornate Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 52',
    width: 48,
    height: 52,
    // Two-step collar: aperture (28) at y=0..2, first collar (34) y=4..10,
    // narrower collar (32) y=12..16, standard cylinder (30) y=18..52.
    bodyPath: [
      'M 10 0',
      'L 38 0', // aperture lip
      'L 38 2',
      'L 41 4', // step out to first collar
      'L 41 10',
      'L 40 12', // step in
      'L 40 16',
      'L 39 18', // step in to standard
      'L 39 52',
      'L 9 52',
      'L 9 18',
      'L 8 16',
      'L 8 12',
      'L 7 10',
      'L 7 4',
      'L 10 2',
      'Z',
    ].join(' '),
    detailPath: [
      // Aperture lip ring
      'M 10 1 L 38 1',
      // First collar — top & bottom precision edges
      'M 8 5 L 40 5',
      'M 8 9 L 40 9',
      // Fine knurl lines on the first collar
      'M 12 6 L 12 8',
      'M 16 6 L 16 8',
      'M 20 6 L 20 8',
      'M 24 6 L 24 8',
      'M 28 6 L 28 8',
      'M 32 6 L 32 8',
      'M 36 6 L 36 8',
      // Second (narrow) collar
      'M 9 13 L 39 13',
      'M 9 15 L 39 15',
      // Body rings
      'M 9 22 L 39 22',
      'M 9 36 L 39 36',
      'M 9 48 L 39 48',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 52 },
  era: 'prequel',
  faction: 'jedi',
};

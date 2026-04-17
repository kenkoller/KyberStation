// Pointed pommel — Original art, MIT, KyberStation v0.11.2
// Ahsoka Fulcrum-inspired elegant tapered finial. Narrow connector
// (24) for shoto-scale / Fulcrum-pair builds. Silhouette sweeps to
// a soft point — reads as "balanced, precise, reverse-grip ready."

import type { HiltPart } from '../../types';

export const pointedPommel: HiltPart = {
  id: 'pointed-pommel',
  displayName: 'Pointed Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 40',
    width: 48,
    height: 40,
    // Narrow (24) cylinder tapering through two angled stages to a
    // ~6-wide blunted point at the bottom. Left/right symmetric.
    bodyPath: [
      'M 12 0',
      'L 36 0', // top edge (narrow)
      'L 36 14', // upper cylinder
      'L 34 18', // first shoulder
      'L 33 26', // taper mid
      'L 30 34', // taper lower
      'L 27 40', // right point shoulder
      'L 21 40', // blunt tip (6 wide)
      'L 18 34', // left point shoulder
      'L 15 26',
      'L 14 18',
      'L 12 14',
      'Z',
    ].join(' '),
    detailPath: [
      'M 12 4 L 36 4', // upper ring
      'M 12 10 L 36 10', // mid upper ring
      'M 13 18 L 35 18', // first shoulder edge
      'M 16 26 L 32 26', // mid taper ring
      'M 19 34 L 29 34', // lower taper ring
      'M 22 38 L 26 38', // tip mark
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 40 },
  era: 'sequel',
  faction: 'grey',
};

// Sage pommel — Original art, MIT, KyberStation v0.11.2
// Yoda-inspired compact finial. Both connectors are narrow (24 units /
// 1.0") for shoto-scale builds. Jewel-like silhouette: short body with
// a pronounced end dome and a tiny crystal-point cap.

import type { HiltPart } from '../../types';

export const sagePommel: HiltPart = {
  id: 'sage-pommel',
  displayName: 'Sage Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 32',
    width: 48,
    height: 32,
    // Narrow (24-wide) cylinder tapering down to a small 18-wide
    // jewel-cap. Canvas center is still 24, so narrow spans x=12..36.
    bodyPath: [
      'M 12 0',
      'L 36 0', // top edge (narrow)
      'L 36 20', // body
      'Q 36 26 33 28', // shoulder curve
      'L 33 30',
      'L 30 32', // right foot point
      'L 18 32',
      'L 15 30',
      'L 15 28',
      'Q 12 26 12 20',
      'Z',
    ].join(' '),
    detailPath: [
      'M 12 4 L 36 4', // upper ring
      'M 12 12 L 36 12', // mid ring
      'M 15 20 L 33 20', // shoulder ring
      'M 17 26 L 31 26', // jewel cap edge
      'M 22 30 L 26 30', // center jewel mark
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 32 },
  era: 'prequel',
  faction: 'jedi',
};

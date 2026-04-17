// Raw pommel — Original art, MIT, KyberStation v0.11.2
// Kylo Ren inspired: cobbled-together, asymmetric, with exposed hex
// bolts and a jagged terminal edge. The silhouette is intentionally
// a little uneven — reads as "built in haste with salvaged parts."

import type { HiltPart } from '../../types';

export const rawPommel: HiltPart = {
  id: 'raw-pommel',
  displayName: 'Raw Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 38',
    width: 48,
    height: 38,
    // Standard (30) cylinder with deliberate micro-asymmetry: right
    // shoulder steps in 1 unit earlier than the left. Jagged bottom
    // edge with two step-downs.
    bodyPath: [
      'M 9 0',
      'L 39 0', // top edge
      'L 39 24',
      'L 38 26', // right shoulder (higher)
      'L 38 34',
      'L 36 36',
      'L 34 38',
      'L 28 38',
      'L 26 36', // notch in bottom
      'L 22 36',
      'L 20 38',
      'L 14 38',
      'L 12 36',
      'L 10 34',
      'L 10 26',
      'L 9 25', // left shoulder (lower) — asymmetric
      'Z',
    ].join(' '),
    detailPath: [
      'M 9 4 L 39 4', // top ring
      'M 9 14 L 39 14', // mid ring
      'M 10 26 L 38 26', // shoulder edge
      // Exposed hex bolts — short crossed strokes suggesting hardware
      'M 14 18 L 16 20', // bolt 1
      'M 14 20 L 16 18',
      'M 32 18 L 34 20', // bolt 2
      'M 32 20 L 34 18',
      'M 22 30 L 26 30', // lower strap mark
      'M 22 32 L 24 34', // scratch / weld-line
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 38 },
  era: 'sequel',
  faction: 'sith',
};

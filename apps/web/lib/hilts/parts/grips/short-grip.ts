// Short grip — Original art, MIT, KyberStation v0.11.2
// Compact narrow-diameter grip for shoto-scale hilts (Yoda, Ahsoka
// Padawan-era). Single central band ring breaks the length; enough
// longitudinal detail to feel machined without overcrowding the small
// canvas.

import type { HiltPart } from '../../types';

export const shortGrip: HiltPart = {
  id: 'short-grip',
  displayName: 'Short Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 66',
    width: 48,
    height: 66,
    // Narrow diameter — body spans x=12..36.
    bodyPath: 'M 12 0 L 36 0 L 36 66 L 12 66 Z',
    detailPath: [
      // Top edge
      'M 12 3 L 36 3',
      // Central band
      'M 12 30 L 36 30',
      'M 12 36 L 36 36',
      // Upper and lower ribs
      'M 12 12 L 36 12',
      'M 12 20 L 36 20',
      'M 12 46 L 36 46',
      'M 12 54 L 36 54',
      // Two longitudinal micro-grooves flanking centre
      'M 18 8 L 18 26',
      'M 30 8 L 30 26',
      'M 18 40 L 18 58',
      'M 30 40 L 30 58',
      // Bottom edge
      'M 12 63 L 36 63',
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 66 },
  era: 'prequel',
  faction: 'jedi',
};

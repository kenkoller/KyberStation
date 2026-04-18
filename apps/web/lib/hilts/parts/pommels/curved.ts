// Curved pommel — Original art, MIT, KyberStation v0.11.2
// Dooku-inspired rounded finial with warm bronze accent band. The
// silhouette sweeps outward slightly before rounding in, echoing the
// elegant curved-hilt profile popular with Dark-side duelists.

import type { HiltPart } from '../../types';

export const curvedPommel: HiltPart = {
  id: 'curved-pommel',
  displayName: 'Curved Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    // Subtle flare: 30 wide at top, swells to 32 at y=10, returns to 30
    // at y=26, then rounds to a 22-wide cap. Bezier curves in for a
    // proper rounded foot.
    bodyPath: [
      'M 9 0',
      'L 39 0', // top edge
      'Q 41 6 40 12', // flare out
      'Q 39 22 39 26', // return to body line
      'L 39 34',
      'Q 39 40 35 43', // rounded right foot
      'L 13 43',
      'Q 9 40 9 34', // rounded left foot (mirror)
      'L 9 26',
      'Q 9 22 8 12',
      'Q 7 6 9 0',
      'Z',
    ].join(' '),
    // Bronze accent band across the flare
    accentPath: 'M 9 14 L 39 14 L 40 22 L 8 22 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4', // upper ring
      'M 10 26 L 38 26', // lower body ring
      'M 12 34 L 36 34', // pre-foot ring
      'M 18 40 L 30 40', // foot ring
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 44 },
  era: 'prequel',
  faction: 'sith',
};

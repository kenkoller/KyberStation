// Fulcrum grip — Original art, MIT, KyberStation v0.11.2
// Inspired by Ahsoka's post-Rebels shoto hilts — sleek, minimal, and
// chrome-finished. A pair of slim horizontal accent bands bracket a
// long clean shaft; only a few longitudinal micro-grooves suggest
// texture. Narrow diameter keeps the silhouette disciplined.

import type { HiltPart } from '../../types';

export const fulcrumGrip: HiltPart = {
  id: 'fulcrum-grip',
  displayName: 'Fulcrum Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 90',
    width: 48,
    height: 90,
    // Narrow diameter — body spans x=12..36.
    bodyPath: 'M 12 0 L 36 0 L 36 90 L 12 90 Z',
    // Two slim chrome trim bands near the ends.
    accentPath: 'M 12 10 L 36 10 L 36 14 L 12 14 Z M 12 76 L 36 76 L 36 80 L 12 80 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      // Top ring
      'M 12 4 L 36 4',
      // Chrome band edges
      'M 12 10 L 36 10',
      'M 12 14 L 36 14',
      'M 12 76 L 36 76',
      'M 12 80 L 36 80',
      // Central clean shaft — sparse longitudinal grooves
      'M 18 20 L 18 70',
      'M 24 20 L 24 70',
      'M 30 20 L 30 70',
      // Bottom ring
      'M 12 86 L 36 86',
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 90 },
  era: 'sequel',
  faction: 'grey',
};

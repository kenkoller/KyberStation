// Fulcrum switch — Original art, MIT, KyberStation v0.11.2
// Inspired by Ahsoka's post-Rebels white hilts — streamlined, sharply
// geometric, chrome-accented. The activator sits inside a stadium-
// shaped recess with a thin chrome trim. Narrow diameter to match the
// shoto scale.

import type { HiltPart } from '../../types';

export const fulcrumSwitch: HiltPart = {
  id: 'fulcrum-switch',
  displayName: 'Fulcrum Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 56',
    width: 48,
    height: 56,
    // Narrow diameter — body spans x=12..36.
    bodyPath: 'M 12 0 L 36 0 L 36 56 L 12 56 Z',
    // Thin chrome trim strip — horizontal accent.
    accentPath: 'M 12 26 L 36 26 L 36 30 L 12 30 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      // Top edge
      'M 12 3 L 36 3',
      // Upper geometric recess — hexagonal stadium shape traced with strokes
      'M 16 9 L 32 9',
      'M 16 21 L 32 21',
      'M 16 9 L 16 21',
      'M 32 9 L 32 21',
      // Inner activator notch
      'M 21 13 L 27 13',
      'M 21 17 L 27 17',
      // Chrome trim edges
      'M 12 26 L 36 26',
      'M 12 30 L 36 30',
      // Lower micro-vent rows
      'M 18 36 L 30 36',
      'M 18 40 L 30 40',
      'M 18 44 L 30 44',
      // Bottom edge
      'M 12 53 L 36 53',
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 56 },
  era: 'sequel',
  faction: 'grey',
};

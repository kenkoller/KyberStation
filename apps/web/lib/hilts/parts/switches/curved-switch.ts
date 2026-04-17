// Curved switch — Original art, MIT, KyberStation v0.11.2
// Inspired by Count Dooku's curved-hilt switch box — a short, richly
// detailed section with warm bronze collar rings top and bottom and an
// ornate activator bezel. The body itself is straight; the signature
// bend lives in the grip below.

import type { HiltPart } from '../../types';

export const curvedSwitch: HiltPart = {
  id: 'curved-switch',
  displayName: 'Curved Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 66',
    width: 48,
    height: 66,
    bodyPath: 'M 9 0 L 39 0 L 39 66 L 9 66 Z',
    // Bronze collar band at top and bottom — two separate rectangles
    // in one accent path via Z closure.
    accentPath: 'M 9 6 L 39 6 L 39 14 L 9 14 Z M 9 52 L 39 52 L 39 60 L 9 60 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      // Top edge ring
      'M 9 2 L 39 2',
      // Collar band edges
      'M 9 6 L 39 6',
      'M 9 14 L 39 14',
      // Mid activator bezel — framed oblong
      'M 16 24 L 32 24',
      'M 16 42 L 32 42',
      'M 16 24 L 16 42',
      'M 32 24 L 32 42',
      // Inner activator button
      'M 21 30 L 27 30',
      'M 21 36 L 27 36',
      'M 21 30 L 21 36',
      'M 27 30 L 27 36',
      // Bottom collar band edges
      'M 9 52 L 39 52',
      'M 9 60 L 39 60',
      // Bottom edge ring
      'M 9 64 L 39 64',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 66 },
  era: 'prequel',
  faction: 'sith',
};

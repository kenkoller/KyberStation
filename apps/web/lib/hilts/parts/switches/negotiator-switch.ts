// Negotiator switch — Original art, MIT, KyberStation v0.11.2
// Inspired by Obi-Wan's ROTS hilt — a cleanly-machined multi-panel
// switch section with a polished chrome ring bisecting the body. The
// activator is flanked by two control studs; the overall impression
// is pro-Jedi elegance rather than raw mechanism.

import type { HiltPart } from '../../types';

export const negotiatorSwitch: HiltPart = {
  id: 'negotiator-switch',
  displayName: 'Negotiator Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 70',
    width: 48,
    height: 70,
    bodyPath: 'M 9 0 L 39 0 L 39 70 L 9 70 Z',
    // A thin chrome band crosses the mid-body.
    accentPath: 'M 9 32 L 39 32 L 39 38 L 9 38 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      // Top ring and sub-ring
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      // Upper panel — two shallow bays
      'M 14 14 L 22 14',
      'M 14 26 L 22 26',
      'M 14 14 L 14 26',
      'M 22 14 L 22 26',
      'M 26 14 L 34 14',
      'M 26 26 L 34 26',
      'M 26 14 L 26 26',
      'M 34 14 L 34 26',
      // Chrome band edges (so the accent reads cleanly)
      'M 9 32 L 39 32',
      'M 9 38 L 39 38',
      // Lower activator — central button flanked by studs
      'M 20 46 L 28 46',
      'M 20 54 L 28 54',
      'M 20 46 L 20 54',
      'M 28 46 L 28 54',
      'M 13 48 L 13 52',
      'M 35 48 L 35 52',
      // Bottom rings
      'M 9 62 L 39 62',
      'M 9 66 L 39 66',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 70 },
  era: 'prequel',
  faction: 'jedi',
};

// Ventress pommel — Original art, MIT, KyberStation v0.15.0
// Tapered mirror-twin pommel inspired by Asajj Ventress's paired
// hilts. Bronze cap atop a slim taper — the matched element that
// makes the pair read as a unit.

import type { HiltPart } from '../../types';

export const ventressPommel: HiltPart = {
  id: 'ventress-pommel',
  displayName: 'Ventress Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 38',
    width: 48,
    height: 38,
    bodyPath:
      'M 9 0 L 39 0 L 39 14 L 36 22 L 33 30 L 30 38 L 18 38 L 15 30 L 12 22 L 9 14 Z',
    accentPath: 'M 12 22 L 36 22 L 33 30 L 15 30 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 14 L 39 14',
      'M 12 22 L 36 22',
      'M 15 30 L 33 30',
      'M 18 38 L 30 38',
      'M 22 36 L 26 36',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 38 },
  era: 'prequel',
  faction: 'sith',
};

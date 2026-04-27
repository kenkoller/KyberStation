// Ventress grip — Original art, MIT, KyberStation v0.15.0
// Short curved grip inspired by Asajj Ventress's paired hilts. A
// gentler arc than Dooku's full curve — the smaller pair-scale —
// with bronze ring trim at the apex.

import type { HiltPart } from '../../types';

export const ventressGrip: HiltPart = {
  id: 'ventress-grip',
  displayName: 'Ventress Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 80',
    width: 48,
    height: 80,
    bodyPath: [
      'M 9 0',
      'L 39 0',
      'C 42 20, 42 60, 39 80',
      'L 9 80',
      'C 12 60, 12 20, 9 0',
      'Z',
    ].join(' '),
    accentPath: 'M 10 36 L 40 36 L 40 44 L 10 44 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 10 16 L 40 16',
      'M 10 28 L 40 28',
      'M 10 36 L 40 36',
      'M 10 44 L 40 44',
      'M 10 54 L 40 54',
      'M 10 64 L 40 64',
      'M 9 76 L 39 76',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 80 },
  era: 'prequel',
  faction: 'sith',
};

// Ventress switch — Original art, MIT, KyberStation v0.15.0
// Twin-button switch inspired by Asajj Ventress's paired hilts —
// the doubled activator arrangement reads as the visual signature
// of a matched pair. Bronze recess unifies the controls.

import type { HiltPart } from '../../types';

export const ventressSwitch: HiltPart = {
  id: 'ventress-switch',
  displayName: 'Ventress Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 50',
    width: 48,
    height: 50,
    bodyPath: 'M 9 0 L 39 0 L 39 50 L 9 50 Z',
    accentPath: 'M 12 16 L 36 16 L 36 32 L 12 32 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 12 16 L 36 16',
      'M 12 32 L 36 32',
      'M 12 16 L 12 32',
      'M 36 16 L 36 32',
      'M 14 20 L 22 20',
      'M 14 28 L 22 28',
      'M 14 20 L 14 28',
      'M 22 20 L 22 28',
      'M 26 20 L 34 20',
      'M 26 28 L 34 28',
      'M 26 20 L 26 28',
      'M 34 20 L 34 28',
      'M 17 24 L 19 24',
      'M 29 24 L 31 24',
      'M 9 38 L 39 38',
      'M 9 44 L 39 44',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 50 },
  era: 'prequel',
  faction: 'sith',
};

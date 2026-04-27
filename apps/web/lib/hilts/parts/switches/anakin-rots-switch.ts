// Anakin ROTS switch — Original art, MIT, KyberStation v0.15.0
// Activation-box style switch inspired by Anakin's ROTS hilt — a
// sunken rectangular control panel with a primary button and four
// corner screw-heads. Reads as field-utility, not ceremonial.

import type { HiltPart } from '../../types';

export const anakinRotsSwitch: HiltPart = {
  id: 'anakin-rots-switch',
  displayName: 'Anakin ROTS Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 56',
    width: 48,
    height: 56,
    bodyPath: 'M 9 0 L 39 0 L 39 56 L 9 56 Z',
    accentPath: 'M 14 14 L 34 14 L 34 32 L 14 32 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 14 14 L 34 14',
      'M 14 32 L 34 32',
      'M 14 14 L 14 32',
      'M 34 14 L 34 32',
      'M 16 16 L 17 17',
      'M 32 16 L 31 17',
      'M 16 30 L 17 29',
      'M 32 30 L 31 29',
      'M 20 22 L 28 22',
      'M 20 26 L 28 26',
      'M 9 38 L 39 38',
      'M 9 46 L 39 46',
      'M 9 52 L 39 52',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 56 },
  era: 'prequel',
  faction: 'jedi',
};

// Plo Koon switch — Original art, MIT, KyberStation v0.15.0
// Council-formal switch inspired by Plo Koon's hilt — twin small
// activators above a long chrome trim band. Reads precise, ceremonial,
// Master-of-the-Order-grade.

import type { HiltPart } from '../../types';

export const ploKoonSwitch: HiltPart = {
  id: 'plo-koon-switch',
  displayName: 'Plo Koon Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 56',
    width: 48,
    height: 56,
    bodyPath: 'M 9 0 L 39 0 L 39 56 L 9 56 Z',
    accentPath: 'M 9 30 L 39 30 L 39 36 L 9 36 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 18 14 L 22 14',
      'M 18 22 L 22 22',
      'M 18 14 L 18 22',
      'M 22 14 L 22 22',
      'M 26 14 L 30 14',
      'M 26 22 L 30 22',
      'M 26 14 L 26 22',
      'M 30 14 L 30 22',
      'M 9 30 L 39 30',
      'M 9 36 L 39 36',
      'M 13 32 L 13 34',
      'M 24 32 L 24 34',
      'M 35 32 L 35 34',
      'M 9 44 L 39 44',
      'M 9 52 L 39 52',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 56 },
  era: 'prequel',
  faction: 'jedi',
};

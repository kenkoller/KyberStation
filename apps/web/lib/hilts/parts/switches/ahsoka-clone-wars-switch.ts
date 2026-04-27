// Ahsoka Clone Wars switch — Original art, MIT, KyberStation v0.15.0
// Tri-button switch inspired by Ahsoka's Clone Wars-era hilt — three
// small round activators stacked vertically in a recessed panel.
// Compact, geometric, slightly asymmetric to one side.

import type { HiltPart } from '../../types';

export const ahsokaCloneWarsSwitch: HiltPart = {
  id: 'ahsoka-clone-wars-switch',
  displayName: 'Ahsoka Clone Wars Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 50',
    width: 48,
    height: 50,
    bodyPath: 'M 9 0 L 39 0 L 39 50 L 9 50 Z',
    accentPath: 'M 18 12 L 30 12 L 30 38 L 18 38 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 18 12 L 30 12',
      'M 18 38 L 30 38',
      'M 18 12 L 18 38',
      'M 30 12 L 30 38',
      'M 22 16 L 26 16',
      'M 22 18 L 26 18',
      'M 22 16 L 22 18',
      'M 26 16 L 26 18',
      'M 22 24 L 26 24',
      'M 22 26 L 26 26',
      'M 22 24 L 22 26',
      'M 26 24 L 26 26',
      'M 22 32 L 26 32',
      'M 22 34 L 26 34',
      'M 22 32 L 22 34',
      'M 26 32 L 26 34',
      'M 9 44 L 39 44',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 50 },
  era: 'prequel',
  faction: 'jedi',
};

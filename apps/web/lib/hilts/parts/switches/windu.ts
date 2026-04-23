// Windu switch — Original art, MIT, KyberStation v0.13.1
// Recessed activation panel with a silver-bezel button, inspired by
// Mace Windu's hilt control section. Sleek and minimal — no brass
// clamp, just a flush panel on a standard-diameter body.

import type { HiltPart } from '../../types';

export const winduSwitch: HiltPart = {
  id: 'windu-switch',
  displayName: 'Windu Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 56',
    width: 48,
    height: 56,
    bodyPath: 'M 9 0 L 39 0 L 39 56 L 9 56 Z',
    accentPath: 'M 19 18 L 29 18 L 29 26 L 19 26 Z',
    accentFill: '#c8c9d0',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 12 L 39 12',
      'M 16 16 L 32 16',
      'M 32 16 L 32 28',
      'M 16 28 L 32 28',
      'M 16 16 L 16 28',
      'M 22 20 L 26 20',
      'M 22 24 L 26 24',
      'M 9 36 L 39 36',
      'M 9 44 L 39 44',
      'M 18 38 L 18 42',
      'M 24 38 L 24 42',
      'M 30 38 L 30 42',
      'M 9 52 L 39 52',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 56 },
  era: 'prequel',
  faction: 'jedi',
};

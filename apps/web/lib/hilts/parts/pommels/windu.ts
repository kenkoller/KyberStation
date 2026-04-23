// Windu pommel — Original art, MIT, KyberStation v0.13.1
// Bullet-shaped silver-capped pommel. Rounded lower end with a
// prominent silver cap band — cleanly machined, precisely finished.

import type { HiltPart } from '../../types';

export const winduPommel: HiltPart = {
  id: 'windu-pommel',
  displayName: 'Windu Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 40',
    width: 48,
    height: 40,
    bodyPath:
      'M 9 0 L 39 0 L 39 24 L 36 30 L 32 36 L 28 40 L 20 40 L 16 36 L 12 30 L 9 24 Z',
    accentPath: 'M 9 4 L 39 4 L 39 8 L 9 8 Z',
    accentFill: '#c8c9d0',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      'M 9 24 L 39 24',
      'M 12 30 L 36 30',
      'M 16 36 L 32 36',
      'M 22 38 L 26 38',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 40 },
  era: 'prequel',
  faction: 'jedi',
};

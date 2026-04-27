// Chrome trim accent — Original art, MIT, KyberStation v0.15.0
// Decorative ring accent in polished chrome with twin engraved lines.
// Used in Plo Koon's Council-grade hilt and similar formal Jedi
// assemblies where extra precision-detail is wanted.

import type { HiltPart } from '../../types';

export const chromeTrim: HiltPart = {
  id: 'chrome-trim',
  displayName: 'Chrome Trim',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 8',
    width: 48,
    height: 8,
    bodyPath: 'M 9 0 L 39 0 L 39 8 L 9 8 Z',
    accentPath: 'M 9 1 L 39 1 L 39 7 L 9 7 Z',
    accentFill: '#b8b8bc',
    detailPath: [
      'M 9 1 L 39 1',
      'M 9 7 L 39 7',
      'M 11 3 L 37 3',
      'M 11 5 L 37 5',
      'M 16 4 L 18 4',
      'M 22 4 L 26 4',
      'M 30 4 L 32 4',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 8 },
  era: 'universal',
  faction: 'jedi',
};

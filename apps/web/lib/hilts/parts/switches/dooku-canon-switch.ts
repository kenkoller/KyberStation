// Dooku canon switch — Original art, MIT, KyberStation v0.15.0
// Bronze-bezeled control inspired by Count Dooku's elegant duelist
// aesthetic. A single recessed activator framed by a thin bronze
// trim — pre-curve section of the canonical Dooku hilt.

import type { HiltPart } from '../../types';

export const dookuCanonSwitch: HiltPart = {
  id: 'dooku-canon-switch',
  displayName: 'Dooku Canon Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 48',
    width: 48,
    height: 48,
    bodyPath: 'M 9 0 L 39 0 L 39 48 L 9 48 Z',
    accentPath: 'M 16 16 L 32 16 L 32 32 L 16 32 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      'M 16 16 L 32 16',
      'M 16 32 L 32 32',
      'M 16 16 L 16 32',
      'M 32 16 L 32 32',
      'M 18 18 L 30 18',
      'M 18 30 L 30 30',
      'M 18 18 L 18 30',
      'M 30 18 L 30 30',
      'M 22 22 L 26 22',
      'M 22 26 L 26 26',
      'M 9 38 L 39 38',
      'M 9 44 L 39 44',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 48 },
  era: 'prequel',
  faction: 'sith',
};

// Rey TROS switch — Original art, MIT, KyberStation v0.15.0
// Wrapped activation panel inspired by Rey's TROS hilt. A leather-
// strap detail edges the button bezel — built, not issued. Single
// machined activator at center.

import type { HiltPart } from '../../types';

export const reyTrosSwitch: HiltPart = {
  id: 'rey-tros-switch',
  displayName: 'Rey TROS Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 52',
    width: 48,
    height: 52,
    bodyPath: 'M 9 0 L 39 0 L 39 52 L 9 52 Z',
    accentPath: 'M 9 12 L 39 12 L 39 16 L 9 16 Z M 9 36 L 39 36 L 39 40 L 9 40 Z',
    accentFill: '#3a2a1e',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 12 L 39 12',
      'M 9 16 L 39 16',
      'M 13 12 L 13 16',
      'M 19 12 L 19 16',
      'M 25 12 L 25 16',
      'M 31 12 L 31 16',
      'M 35 12 L 35 16',
      'M 16 22 L 32 22',
      'M 16 30 L 32 30',
      'M 16 22 L 16 30',
      'M 32 22 L 32 30',
      'M 22 25 L 26 25',
      'M 22 27 L 26 27',
      'M 9 36 L 39 36',
      'M 9 40 L 39 40',
      'M 13 36 L 13 40',
      'M 19 36 L 19 40',
      'M 25 36 L 25 40',
      'M 31 36 L 31 40',
      'M 35 36 L 35 40',
      'M 9 48 L 39 48',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 52 },
  era: 'sequel',
  faction: 'jedi',
};

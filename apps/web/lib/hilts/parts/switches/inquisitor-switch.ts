// Inquisitor switch — Original art, MIT, KyberStation v0.13.1
// Multi-button control section for Imperial-era Inquisitor hilts.
// Two flanking activation pads (primary + secondary blade) framed
// by a dark accent strip. Reads as mechanically dense.

import type { HiltPart } from '../../types';

export const inquisitorSwitch: HiltPart = {
  id: 'inquisitor-switch',
  displayName: 'Inquisitor Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 60',
    width: 48,
    height: 60,
    bodyPath: 'M 9 0 L 39 0 L 39 60 L 9 60 Z',
    accentPath: 'M 9 20 L 39 20 L 39 32 L 9 32 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 14 L 39 14',
      'M 9 20 L 39 20',
      'M 9 32 L 39 32',
      'M 14 22 L 20 22',
      'M 14 30 L 20 30',
      'M 14 22 L 14 30',
      'M 20 22 L 20 30',
      'M 28 22 L 34 22',
      'M 28 30 L 34 30',
      'M 28 22 L 28 30',
      'M 34 22 L 34 30',
      'M 24 24 L 24 28',
      'M 13 42 L 13 48',
      'M 35 42 L 35 48',
      'M 9 56 L 39 56',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 60 },
  era: 'original',
  faction: 'sith',
};

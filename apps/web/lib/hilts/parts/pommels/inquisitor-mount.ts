// Inquisitor mount — Original art, MIT, KyberStation v0.13.1
// Disk-style pommel for Inquisitor-class hilts. Wide circular base
// suggests a mount-plate where secondary blade mechanisms attach.

import type { HiltPart } from '../../types';

export const inquisitorMount: HiltPart = {
  id: 'inquisitor-mount',
  displayName: 'Inquisitor Mount',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 28',
    width: 48,
    height: 28,
    bodyPath:
      'M 9 0 L 39 0 L 39 12 L 42 16 L 42 24 L 39 28 L 9 28 L 6 24 L 6 16 L 9 12 Z',
    accentPath: 'M 6 18 L 42 18 L 42 22 L 6 22 Z',
    accentFill: '#1f1f23',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 12 L 39 12',
      'M 6 16 L 42 16',
      'M 6 24 L 42 24',
      'M 10 20 L 12 20',
      'M 36 20 L 38 20',
      'M 22 20 L 26 20',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 28 },
  era: 'original',
  faction: 'sith',
};

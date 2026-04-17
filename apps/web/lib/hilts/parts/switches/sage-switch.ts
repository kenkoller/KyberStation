// Sage switch — Original art, MIT, KyberStation v0.11.2
// Inspired by Yoda's shoto-scale switch — compact, narrow, and spare.
// A single activation button sits in a recessed panel. No ornament;
// the design trusts the machined cylinder to carry the silhouette.

import type { HiltPart } from '../../types';

export const sageSwitch: HiltPart = {
  id: 'sage-switch',
  displayName: 'Sage Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 44',
    width: 48,
    height: 44,
    // Narrow diameter — body spans x=12..36 (24 units wide).
    bodyPath: 'M 12 0 L 36 0 L 36 44 L 12 44 Z',
    detailPath: [
      // Top ring
      'M 12 3 L 36 3',
      // Recessed panel frame
      'M 15 12 L 33 12',
      'M 15 32 L 33 32',
      'M 15 12 L 15 32',
      'M 33 12 L 33 32',
      // Lone centre activator
      'M 20 20 L 28 20',
      'M 20 24 L 28 24',
      'M 20 20 L 20 24',
      'M 28 20 L 28 24',
      // Bottom ring
      'M 12 41 L 36 41',
    ].join(' '),
  },
  topConnector: { diameter: 'narrow', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'narrow', cx: 24, cy: 44 },
  era: 'prequel',
  faction: 'jedi',
};

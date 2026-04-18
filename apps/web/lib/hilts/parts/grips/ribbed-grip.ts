// Ribbed grip — Original art, MIT, KyberStation v0.11.2
// A clean field of parallel horizontal ring-ribs — the signature
// machined-Jedi grip pattern shared by many prequel-era hilts. Used
// by Obi-Wan's TPM hilt, Mace Windu's hilt, and similar. Unlike
// t-tracks (longitudinal grooves), ribbed is a succession of lathe-
// cut rings stacked down the shaft.

import type { HiltPart } from '../../types';

export const ribbedGrip: HiltPart = {
  id: 'ribbed-grip',
  displayName: 'Ribbed Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    bodyPath: 'M 9 0 L 39 0 L 39 100 L 9 100 Z',
    detailPath: [
      // Top edge
      'M 9 4 L 39 4',
      // Evenly-spaced horizontal ribs through the grip
      'M 9 14 L 39 14',
      'M 9 22 L 39 22',
      'M 9 30 L 39 30',
      'M 9 38 L 39 38',
      'M 9 46 L 39 46',
      'M 9 54 L 39 54',
      'M 9 62 L 39 62',
      'M 9 70 L 39 70',
      'M 9 78 L 39 78',
      'M 9 86 L 39 86',
      // Bottom edge
      'M 9 96 L 39 96',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'prequel',
  faction: 'jedi',
};

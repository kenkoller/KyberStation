// Dooku canon pommel — Original art, MIT, KyberStation v0.15.0
// Hooked cane-style pommel inspired by Count Dooku's signature
// curved-hilt finial. The lower edge sweeps to one side, evoking the
// crook of a duelist's cane. Bronze ring at the apex of the hook.

import type { HiltPart } from '../../types';

export const dookuCanonPommel: HiltPart = {
  id: 'dooku-canon-pommel',
  displayName: 'Dooku Canon Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 50',
    width: 48,
    height: 50,
    bodyPath: [
      'M 9 0',
      'L 39 0',
      'L 39 12',
      'Q 41 18 41 26',
      'Q 41 38 35 46',
      'L 28 50',
      'L 18 50',
      'Q 13 46 11 40',
      'Q 9 32 9 22',
      'Z',
    ].join(' '),
    accentPath: 'M 10 22 L 41 22 L 41 28 L 10 28 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 12 L 39 12',
      'M 10 22 L 41 22',
      'M 10 28 L 41 28',
      'M 12 36 L 39 36',
      'M 16 44 L 34 44',
      'M 22 48 L 28 48',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 50 },
  era: 'prequel',
  faction: 'sith',
};

// Dooku canon emitter — Original art, MIT, KyberStation v0.15.0
// Ornate collared emitter inspired by Count Dooku's Attack of the
// Clones / Revenge of the Sith hilt. Brass-accent collar just beneath
// a stepped silver lip. Top is straight; the famous curve happens
// downstream in the grip.

import type { HiltPart } from '../../types';

export const dookuCanonEmitter: HiltPart = {
  id: 'dooku-canon-emitter',
  displayName: 'Dooku Canon Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 54',
    width: 48,
    height: 54,
    bodyPath:
      'M 7 0 L 41 0 L 41 4 L 39 8 L 39 54 L 9 54 L 9 8 L 7 4 Z',
    accentPath: 'M 9 12 L 39 12 L 39 18 L 9 18 Z',
    accentFill: '#8b6a3a',
    detailPath: [
      'M 9 4 L 39 4',
      'M 9 8 L 39 8',
      'M 9 12 L 39 12',
      'M 9 18 L 39 18',
      'M 13 14 L 13 16',
      'M 19 14 L 19 16',
      'M 25 14 L 25 16',
      'M 31 14 L 31 16',
      'M 9 26 L 39 26',
      'M 16 28 L 16 38',
      'M 32 28 L 32 38',
      'M 9 42 L 39 42',
      'M 9 50 L 39 50',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 54 },
  era: 'prequel',
  faction: 'sith',
};

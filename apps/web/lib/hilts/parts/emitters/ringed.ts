// Ringed emitter — Original art, MIT, KyberStation v0.13.1
// Emitter with a visible rotating ring-mount above the aperture,
// inspired by the Grand Inquisitor's double-bladed spinner hilt.
// The silver ring trim reads as the mechanism that lets the
// secondary blade rotate around the primary axis.

import type { HiltPart } from '../../types';

export const ringedEmitter: HiltPart = {
  id: 'ringed-emitter',
  displayName: 'Ringed Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 52',
    width: 48,
    height: 52,
    bodyPath:
      'M 9 0 L 39 0 L 39 8 L 42 10 L 42 14 L 39 16 L 39 52 L 9 52 L 9 16 L 6 14 L 6 10 L 9 8 Z',
    accentPath: 'M 6 10 L 42 10 L 42 14 L 6 14 Z',
    accentFill: '#c8c9d0',
    detailPath: [
      'M 9 4 L 39 4',
      'M 6 10 L 42 10',
      'M 6 14 L 42 14',
      'M 6 12 L 42 12',
      'M 12 10 L 12 14',
      'M 24 10 L 24 14',
      'M 36 10 L 36 14',
      'M 9 22 L 39 22',
      'M 20 26 L 20 38',
      'M 28 26 L 28 38',
      'M 9 44 L 39 44',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 52 },
  era: 'prequel',
  faction: 'sith',
};

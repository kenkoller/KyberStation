// MPP grip — Original art, MIT, KyberStation v0.11.2
// Inspired by the MPP (Darth Vader / luke-graflex family) grip —
// a black rubberised wrap covering most of the handle, interrupted by
// two machined metal bands that show through the wrap. Ribbed texture
// reads as sith-severe without ornament.

import type { HiltPart } from '../../types';

export const mppGrip: HiltPart = {
  id: 'mpp-grip',
  displayName: 'MPP Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 108',
    width: 48,
    height: 108,
    bodyPath: 'M 9 0 L 39 0 L 39 108 L 9 108 Z',
    // Black-grip wrap — two bands separated by a visible metal rib.
    accentPath: 'M 9 8 L 39 8 L 39 50 L 9 50 Z M 9 58 L 39 58 L 39 100 L 9 100 Z',
    accentFill: '#141418',
    detailPath: [
      // Top ring
      'M 9 4 L 39 4',
      // Upper wrap edges
      'M 9 8 L 39 8',
      'M 9 50 L 39 50',
      // Upper wrap ribbing — horizontal ridges across the rubber
      'M 9 16 L 39 16',
      'M 9 24 L 39 24',
      'M 9 32 L 39 32',
      'M 9 42 L 39 42',
      // Central metal rib (band showing through between wraps)
      'M 9 54 L 39 54',
      // Lower wrap edges
      'M 9 58 L 39 58',
      'M 9 100 L 39 100',
      // Lower wrap ribbing
      'M 9 66 L 39 66',
      'M 9 74 L 39 74',
      'M 9 82 L 39 82',
      'M 9 92 L 39 92',
      // Bottom ring
      'M 9 104 L 39 104',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 108 },
  era: 'original',
  faction: 'sith',
};

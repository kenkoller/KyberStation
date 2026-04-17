// MPP-style emitter — Original art, MIT, KyberStation v0.11.2
// Inspired by the MPP (Metal Products & Plastics) microphone bell
// windscreen used as the flash guard on Vader-style dark hilts.
// Features a flared bell at the top with horizontal vent grill bars
// suggesting the microphone windscreen mesh.

import type { HiltPart } from '../../types';

export const mppEmitter: HiltPart = {
  id: 'mpp-emitter',
  displayName: 'MPP Emitter',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 56',
    width: 48,
    height: 56,
    // Microphone bell: wide flare (40) at y=0..2, steep shoulder to y=8,
    // then standard cylinder (30) the rest of the way.
    bodyPath: 'M 4 0 L 44 0 L 44 2 L 40 8 L 39 10 L 39 56 L 9 56 L 9 10 L 8 8 L 4 2 Z',
    detailPath: [
      // Windscreen grill — horizontal bars inside the bell region
      'M 10 4 L 38 4',
      'M 10 7 L 38 7',
      // Shoulder step ring
      'M 9 12 L 39 12',
      // Ventilation grill bars — horizontal (MPP windscreen signature)
      'M 11 18 L 37 18',
      'M 11 22 L 37 22',
      'M 11 26 L 37 26',
      'M 11 30 L 37 30',
      'M 11 34 L 37 34',
      // Lower body rings
      'M 9 42 L 39 42',
      'M 9 52 L 39 52',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 56 },
  era: 'original',
  faction: 'sith',
};

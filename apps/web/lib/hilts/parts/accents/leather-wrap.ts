// Leather wrap — Original art, MIT, KyberStation v0.13.1
// Dark-leather mid-body wrap accent. Slots between grip and switch
// (or between two grip sections) to add tactile character. Visible
// cross-stitch detail on the wrap surface.

import type { HiltPart } from '../../types';

export const leatherWrap: HiltPart = {
  id: 'leather-wrap',
  displayName: 'Leather Wrap',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 16',
    width: 48,
    height: 16,
    bodyPath: 'M 9 0 L 39 0 L 39 16 L 9 16 Z',
    accentPath: 'M 9 2 L 39 2 L 39 14 L 9 14 Z',
    accentFill: '#3d2b1f',
    detailPath: [
      'M 9 2 L 39 2',
      'M 9 14 L 39 14',
      'M 13 5 L 17 11',
      'M 17 5 L 13 11',
      'M 21 5 L 25 11',
      'M 25 5 L 21 11',
      'M 29 5 L 33 11',
      'M 33 5 L 29 11',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 16 },
  era: 'universal',
  faction: 'grey',
};

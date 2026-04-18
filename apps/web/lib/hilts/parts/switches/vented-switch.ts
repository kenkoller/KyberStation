// Vented switch — Original art, MIT, KyberStation v0.11.2
// Inspired by Kylo Ren's crossguard hilt — raw, industrial-looking
// switch section with an exposed internal conduit window and a jagged
// bottom step that transitions from the wide emitter/quillon interface
// above down to a standard grip below. Sith-red bleed through the vent.

import type { HiltPart } from '../../types';

export const ventedSwitch: HiltPart = {
  id: 'vented-switch',
  displayName: 'Vented Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 74',
    width: 48,
    height: 74,
    // Wide (36) at top, tapers to standard (30) at bottom via two
    // shoulder steps at y=52. Left side goes 6 → 7 → 9; right mirrors.
    bodyPath: [
      'M 6 0',
      'L 42 0',
      'L 42 48',
      'L 40 52',
      'L 39 52',
      'L 39 74',
      'L 9 74',
      'L 9 52',
      'L 8 52',
      'L 6 48',
      'Z',
    ].join(' '),
    // Exposed crystal-chamber vent — sith-red bleed framed by the body.
    accentPath: 'M 18 20 L 30 20 L 30 38 L 18 38 Z',
    accentFill: '#5a1a1a',
    detailPath: [
      // Top ring (wide)
      'M 6 4 L 42 4',
      'M 6 8 L 42 8',
      // Vent frame strokes
      'M 18 20 L 30 20',
      'M 18 38 L 30 38',
      'M 18 20 L 18 38',
      'M 30 20 L 30 38',
      // Vent horizontal bars (broken/jagged feel)
      'M 20 24 L 28 24',
      'M 20 28 L 28 28',
      'M 20 32 L 28 32',
      // Exposed bolts flanking the vent
      'M 12 26 L 14 26',
      'M 12 32 L 14 32',
      'M 34 26 L 36 26',
      'M 34 32 L 36 32',
      // Shoulder-step cornice (faint line above the step)
      'M 9 48 L 39 48',
      // Bottom ring (standard)
      'M 9 58 L 39 58',
      'M 9 70 L 39 70',
      // Lower activator nub
      'M 22 62 L 26 62',
      'M 22 66 L 26 66',
      'M 22 62 L 22 66',
      'M 26 62 L 26 66',
    ].join(' '),
  },
  topConnector: { diameter: 'wide', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 74 },
  era: 'sequel',
  faction: 'sith',
};

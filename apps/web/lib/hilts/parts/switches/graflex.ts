// Graflex-style switch section — Original art, MIT, KyberStation v0.11.2
// The iconic brass clamp band and activation panel of the Graflex-
// derived lightsaber hilt. Clamp silhouette protrudes slightly beyond
// the main body cylinder for mechanical character.

import type { HiltPart } from '../../types';

export const graflexSwitch: HiltPart = {
  id: 'graflex-switch',
  displayName: 'Graflex Switch',
  type: 'switch',
  svg: {
    viewBox: '0 0 48 72',
    width: 48,
    height: 72,
    // Body silhouette includes the protruding clamp region (y=12..42)
    // where the brass band sits 1 unit wider than the standard cylinder.
    bodyPath: [
      'M 9 0',
      'L 39 0', // top edge
      'L 39 12',
      'L 40 12', // jog out for clamp flare
      'L 40 42',
      'L 39 42', // jog back in
      'L 39 72',
      'L 9 72', // bottom edge
      'L 9 42',
      'L 8 42', // jog out for clamp flare (left)
      'L 8 12',
      'L 9 12', // jog back in
      'Z',
    ].join(' '),
    // Brass clamp fills the flared region. Matches body width + 1 on each side.
    accentPath: 'M 8 12 L 40 12 L 40 42 L 8 42 Z',
    accentFill: '#b08a4a',
    detailPath: [
      'M 9 4 L 39 4', // top ring
      'M 9 10 L 39 10', // clamp top edge
      'M 9 44 L 39 44', // clamp bottom edge
      'M 9 68 L 39 68', // bottom ring
      // Red button / activator on the brass clamp
      'M 20 22 L 28 22',
      'M 20 28 L 28 28',
      'M 20 22 L 20 28',
      'M 28 22 L 28 28',
      // D-ring / rivet detail on the clamp
      'M 13 18 L 13 36',
      'M 35 18 L 35 36',
      // Switch panel (lower)
      'M 13 50 L 35 50',
      'M 13 62 L 35 62',
      'M 16 54 L 16 58',
      'M 24 54 L 24 58',
      'M 32 54 L 32 58',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 72 },
  era: 'original',
  faction: 'jedi',
};

// Ornate pommel — Original art, MIT, KyberStation v0.11.2
// Obi-Wan inspired multi-step finial with stacked machined rings. Two
// distinct taper shoulders and a recessed center band give it a
// "high-Jedi craftsman" feel without being fussy.

import type { HiltPart } from '../../types';

export const ornatePommel: HiltPart = {
  id: 'ornate-pommel',
  displayName: 'Ornate Pommel',
  type: 'pommel',
  svg: {
    viewBox: '0 0 48 42',
    width: 48,
    height: 42,
    // Standard (30) at top, steps in twice: first to 28 at y=22, then
    // to 24 at y=34, closing to a flat 22-wide cap.
    bodyPath: [
      'M 9 0',
      'L 39 0', // top edge
      'L 39 22', // first body section
      'L 38 24', // first taper shoulder
      'L 38 34',
      'L 36 36', // second taper shoulder
      'L 36 40',
      'L 35 42', // final cap slope
      'L 13 42',
      'L 12 40',
      'L 12 36',
      'L 10 34',
      'L 10 24',
      'L 9 22',
      'Z',
    ].join(' '),
    detailPath: [
      'M 9 4 L 39 4', // crown ring
      'M 9 12 L 39 12', // upper machined ring
      'M 9 18 L 39 18', // lower machined ring
      'M 10 24 L 38 24', // first shoulder edge
      'M 12 30 L 36 30', // middle band mark
      'M 12 36 L 36 36', // second shoulder edge
      'M 13 40 L 35 40', // terminal band
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 42 },
  era: 'prequel',
  faction: 'jedi',
};

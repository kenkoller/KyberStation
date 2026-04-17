// Curved grip — Original art, MIT, KyberStation v0.11.2
// Inspired by Count Dooku's curved-hilt signature shape — the grip's
// silhouette arcs toward one side like a sabre handle rather than a
// straight tube. Top and bottom connectors stay centered at cx=24 per
// spec, so the bend happens purely in the middle via symmetric cubic
// beziers on the left and right outlines.

import type { HiltPart } from '../../types';

export const curvedGrip: HiltPart = {
  id: 'curved-grip',
  displayName: 'Curved Grip',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 100',
    width: 48,
    height: 100,
    // Top and bottom edges are standard-diameter (x=9..39, width 30).
    // Middle belly bows to the right: right edge peaks near x=42 at
    // y≈50, left edge follows parallel at x≈12. The bezier control
    // points at y=25 and y=75 pull the outline into an S-free arc.
    bodyPath: [
      'M 9 0',
      'L 39 0',
      // Right outline: top (39,0) → belly (42,50) → bottom (39,100)
      'C 44 25, 44 75, 39 100',
      'L 9 100',
      // Left outline: bottom (9,100) → belly (12,50) → top (9,0)
      'C 14 75, 14 25, 9 0',
      'Z',
    ].join(' '),
    detailPath: [
      // Edge rings — drawn straight to read as lathe-cut bands on a
      // bent shaft. They approximate the curve by sitting slightly
      // offset from horizontal at the belly.
      'M 9 4 L 39 4',
      'M 10 22 L 40 22',
      'M 11 40 L 41 40',
      'M 12 50 L 42 50',
      'M 11 60 L 41 60',
      'M 10 78 L 40 78',
      'M 9 96 L 39 96',
      // A single longitudinal accent groove traced along the inside
      // of the curve (left side is the "inside" of the bend).
      'M 16 8 Q 18 50 16 92',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 100 },
  era: 'prequel',
  faction: 'sith',
};

// Crossguard quillon — Original art, MIT, KyberStation v0.11.2
// Perpendicular vent / quillon piece for Kylo-style crossguard hilts.
// Top connector WIDE (36), bottom connector STANDARD (30) — sits
// between the vented emitter and the switch section.
//
// Silhouette discipline: this part stays within the spec-standard
// width=48 canvas. Real crossguards (e.g. Kylo Ren's TLJ hilt) extend
// further laterally as exhaust vents, but at canvas-width 48 we read
// the lateral spread as a chunky flared rectangle filling most of the
// canvas from x=4 to x=44. Two exhaust "wing" accents flank the main
// body block so the quillon reads as a perpendicular element rather
// than just a wider cylinder section. Future spec revisions may
// permit an extended-width variant; for now the 48-unit contract is
// preserved — see HILT_PART_SPEC.md §1.

import type { HiltPart } from '../../types';

export const crossguardQuillon: HiltPart = {
  id: 'crossguard-quillon',
  displayName: 'Crossguard Quillon',
  type: 'accent-ring',
  svg: {
    viewBox: '0 0 48 28',
    width: 48,
    height: 28,
    // Body profile: enters at WIDE (36 wide, x=6..42) at the top, flares
    // out to a chunky crossguard block (40 wide, x=4..44) across the
    // middle rows, then steps in to STANDARD (30 wide, x=9..39) at the
    // bottom connector.
    bodyPath: [
      'M 6 0',
      'L 42 0', // top edge (wide — 36)
      'L 42 4', // short collar
      'L 44 6', // flare out (right wing root)
      'L 44 14',
      'L 42 16', // wing taper back in (right)
      'L 42 22',
      'L 39 24', // step toward standard (right)
      'L 39 28', // bottom-right at standard diameter
      'L 9 28', // bottom edge (standard — 30)
      'L 9 24', // step back up (left)
      'L 6 22',
      'L 6 16', // wing taper (left)
      'L 4 14',
      'L 4 6', // wing root (left)
      'L 6 4', // short collar
      'Z',
    ].join(' '),
    // Two exhaust-vent accents on the wings — dark slits that read as
    // the unstable-crystal venting glow. Using near-black to avoid
    // fighting the alert-color palette; visual punch from contrast.
    accentPath: [
      'M 5 8 L 7 8 L 7 14 L 5 14 Z', // left vent
      'M 41 8 L 43 8 L 43 14 L 41 14 Z', // right vent
    ].join(' '),
    accentFill: '#141418',
    detailPath: [
      'M 6 4 L 42 4', // upper collar
      'M 8 8 L 40 8', // cross-band upper
      'M 8 16 L 40 16', // cross-band lower
      'M 9 24 L 39 24', // bottom collar (step)
      // Vertical hash marks on the main body — adds mechanical density
      'M 14 8 L 14 16',
      'M 24 8 L 24 16',
      'M 34 8 L 34 16',
      // Wing rivet dots — tiny mounting marks on the flared edges
      'M 4 10 L 4 12', // left wing rivet
      'M 44 10 L 44 12', // right wing rivet
    ].join(' '),
  },
  // Connector asymmetry: WIDE on top (mates with vented-emitter bottom
  // which is wide), STANDARD on bottom (mates with standard switches).
  topConnector: { diameter: 'wide', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 28 },
  era: 'sequel',
  faction: 'sith',
};

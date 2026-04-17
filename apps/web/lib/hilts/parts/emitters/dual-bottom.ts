// Dual emitter (bottom) — Original art, MIT, KyberStation v0.11.2
// Mirror of dual-emitter-top, sitting at the bottom of a Zabrak
// saberstaff. Per spec §1, the emitter aperture always points "up"
// in its own local frame — here that means the aperture (with its
// stepped collar) lives at the BOTTOM of this part's canvas, because
// when the composer flips this at the pommel position of a staff
// the aperture will project downward. Top connector mates with the
// staff body; bottom connector is where the blade actually emits.

import type { HiltPart } from '../../types';

export const dualEmitterBottom: HiltPart = {
  id: 'dual-emitter-bottom',
  displayName: 'Dual Emitter (Bottom)',
  type: 'emitter',
  svg: {
    viewBox: '0 0 48 46',
    width: 48,
    height: 46,
    // Mirror of dual-emitter-top: standard body y=0..34, collar
    // y=36..42, aperture lip y=44..46. Top connector mates with the
    // staff body; bottom connector is the aperture edge.
    bodyPath: [
      'M 9 0',
      'L 39 0',
      'L 39 34',
      'L 40 36', // step out to collar
      'L 40 42',
      'L 38 44', // step in to aperture
      'L 38 46',
      'L 10 46',
      'L 10 44',
      'L 8 42',
      'L 8 36',
      'L 9 34',
      'Z',
    ].join(' '),
    detailPath: [
      // Upper body rings
      'M 9 4 L 39 4',
      'M 9 16 L 39 16',
      // Activation ring (centered band)
      'M 9 24 L 39 24',
      'M 9 28 L 39 28',
      // Rivet / index notches on the activation ring
      'M 14 25 L 14 27',
      'M 24 25 L 24 27',
      'M 34 25 L 34 27',
      // Collar — top/bottom precision edges
      'M 8 37 L 40 37',
      'M 8 41 L 40 41',
      // Aperture edge
      'M 10 45 L 38 45',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 46 },
  era: 'prequel',
  faction: 'sith',
};

// Staff body — Original art, MIT, KyberStation v0.11.2
// Specialty long-body grip for Zabrak/Maul-style double-bladed
// saberstaffs. Both ends mate to dual emitters (top + bottom of the
// staff). The silhouette implies length through a sequence of three
// machined sections separated by collars, with pairs of control studs
// where a second pilot's thumbs would fall.

import type { HiltPart } from '../../types';

export const staffBody: HiltPart = {
  id: 'staff-body',
  displayName: 'Staff Body',
  type: 'grip',
  svg: {
    viewBox: '0 0 48 200',
    width: 48,
    height: 200,
    bodyPath: 'M 9 0 L 39 0 L 39 200 L 9 200 Z',
    detailPath: [
      // Top edge and initial ring
      'M 9 4 L 39 4',
      'M 9 10 L 39 10',
      // Upper section ribs
      'M 9 24 L 39 24',
      'M 9 40 L 39 40',
      'M 9 56 L 39 56',
      // Upper activator pair (one per side of the grip)
      'M 13 48 L 17 48',
      'M 13 52 L 17 52',
      'M 13 48 L 13 52',
      'M 17 48 L 17 52',
      'M 31 48 L 35 48',
      'M 31 52 L 35 52',
      'M 31 48 L 31 52',
      'M 35 48 L 35 52',
      // Mid-staff collar (divides upper / centre sections)
      'M 9 68 L 39 68',
      'M 9 74 L 39 74',
      // Centre section — longitudinal grooves to break the length
      'M 14 80 L 14 120',
      'M 24 80 L 24 120',
      'M 34 80 L 34 120',
      // Lower mid collar (divides centre / lower sections)
      'M 9 126 L 39 126',
      'M 9 132 L 39 132',
      // Lower section ribs
      'M 9 144 L 39 144',
      'M 9 160 L 39 160',
      'M 9 176 L 39 176',
      // Lower activator pair (mirror of upper)
      'M 13 148 L 17 148',
      'M 13 152 L 17 152',
      'M 13 148 L 13 152',
      'M 17 148 L 17 152',
      'M 31 148 L 35 148',
      'M 31 152 L 35 152',
      'M 31 148 L 31 152',
      'M 35 148 L 35 152',
      // Bottom ring
      'M 9 190 L 39 190',
      'M 9 196 L 39 196',
    ].join(' '),
  },
  topConnector: { diameter: 'standard', cx: 24, cy: 0 },
  bottomConnector: { diameter: 'standard', cx: 24, cy: 200 },
  era: 'prequel',
  faction: 'sith',
};

import type { HardwareProfile } from '../types.js';

/**
 * 89sabers V3.9 (non-BT) chassis profile.
 *
 * Sourced verbatim from `89V3_allfont.h` in CCSabers' published OS 7.12
 * config pack:
 *   https://www.ccsabers.com/blogs/tutorials/ccsabers-89sabers-proffieboard-v3-9-config-files-full-os-7-12-pack
 *
 * Dual-blade topology: 128-LED main blade on `bladePin` plus a 30-LED
 * crystal chamber on `blade2Pin`. Board is mounted USB-toward-blade in
 * the hilt, requires `ENABLE_SERIAL` for the Fett263 prop's serial menu.
 *
 * Provenance: `community-validated`. The CCSabers pack is reseller-
 * published (not 89sabers-direct) and is used successfully by community
 * members, but KyberStation has not boot-confirmed it on real hardware
 * as of 2026-05-15. The 2026-05-14 V3.9-BT bench attempt failed, but
 * that's a distinct chassis variant (BT module on Serial3) — not this
 * non-BT profile.
 *
 * MOTION_TIMEOUT note: `89V3_allfont.h` defines `MOTION_TIMEOUT` twice
 * inside the same `CONFIG_TOP` block — line 30 sets `60 * 3 * 1000`
 * (180000 ms) and line 44 redefines it to `60 * 3 * 800` (144000 ms).
 * The C preprocessor takes the latter, so this profile captures the
 * effective post-redefinition value (144000 ms ≈ 2.4 min). The line 44
 * redefinition may have been an intentional power-saving tweak or a
 * leftover debug override — worth confirming with 89sabers / CCSabers.
 */
export const SABERS89_V3_9: HardwareProfile = {
  id: '89sabers-v3.9',
  vendor: '89sabers',
  model: 'V3.9',
  boardId: 'proffieboard-v3',
  boardChip: 'STM32L452RE',

  numBlades: 2,
  numButtons: 2,
  defaultVolume: 1800,
  clashThresholdG: 4.5,
  orientation: 'USB_TOWARDS_BLADE',
  enableSerial: true,
  propFile: 'saber_fett263_buttons.h',
  propDefines: [
    'DISABLE_DIAGNOSTIC_COMMANDS',
    'FETT263_MULTI_PHASE',
    'FETT263_TWIST_ON_NO_BM',
    'FETT263_TWIST_ON',
    'FETT263_TWIST_OFF',
    'FETT263_STAB_ON_NO_BM',
    'FETT263_STAB_ON',
    'FETT263_SWING_ON_SPEED 500',
    'FETT263_SWING_ON_NO_BM',
    'FETT263_SWING_ON',
    'FETT263_SWING_OFF',
    'FETT263_THRUST_ON',
    'FETT263_THRUST_OFF',
    'FETT263_DISABLE_COPY_PRESET',
  ],
  motionTimeoutMs: 144000,

  blades: [
    {
      type: 'ws281x',
      ledCount: 128,
      dataPin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
      role: 'main',
    },
    {
      type: 'ws281x',
      ledCount: 30,
      dataPin: 'blade2Pin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin4', 'bladePowerPin5'],
      role: 'crystal',
    },
  ],

  source: 'community-validated',
  validatedBy: [],
  notes:
    "Sourced from CCSabers' published OS 7.12 config pack (89V3_allfont.h). " +
    'Not boot-confirmed by KyberStation on real hardware as of 2026-05-15 ' +
    '(2026-05-14 V3.9-BT bench attempt failed — distinct chassis variant). ' +
    "MOTION_TIMEOUT captured from line 44 redefinition (60 * 3 * 800 = 144000 ms); " +
    "line 30's 180000 ms value is overridden by line 44 in the source file.",
};

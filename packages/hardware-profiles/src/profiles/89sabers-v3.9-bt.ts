import type { HardwareProfile } from '../types.js';

/**
 * 89sabers V3.9-BT (Bluetooth-equipped) chassis profile.
 *
 * Shares the same physical chassis topology as the non-BT V3.9
 * (128-LED main blade on `bladePin` + 30-LED crystal chamber on
 * `blade2Pin`), plus an external Feasycom FSC-BT909 Bluetooth module
 * wired to UART3. The BT module requires `#define ENABLE_SERIAL` to be
 * usable from ProffieOS; the rest of the chassis is identical to the
 * non-BT variant captured in `89sabers-v3.9.ts`.
 *
 * **Provenance: `community-validated`** — values are sourced from:
 *
 *   1. The 2026-05-14 bench session ([`docs/archive/SESSION_2026-05-14_V39BT_BENCH.md`](../../../../docs/archive/SESSION_2026-05-14_V39BT_BENCH.md))
 *      which characterized the chassis via USB CDC interrogation of
 *      factory firmware and confirmed dual-blade topology, Feasycom
 *      BT module identification (`62:21:23:B8:9B:6B`), and the need
 *      for `ENABLE_SERIAL` / `ORIENTATION USB_TOWARDS_BLADE`.
 *   2. CCSabers' published OS 7.12 config pack for V3.9 (non-BT) —
 *      same vendor pin map, prop file, and Fett263 gesture suite.
 *
 * **Bench status (2026-05-19): custom firmware does not boot.** Every
 * custom build tried on this chassis — 11 across four bench sessions
 * (2026-05-14 → 05-19), including this profile's emitted `config.h`,
 * CCSabers' `89V3_allfont.h`, and 89sabers' own factory
 * `89sabers-config.h` compiled with the standard toolchain — flashed
 * cleanly and then left the saber dark with no USB enumeration, whether
 * written to Bank 1, Bank 2 only, or Bank 1 with a 256K-constrained link.
 * Only a byte-perfect dual-bank factory restore boots it again. See
 * [`docs/research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md`](../../../../docs/research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md).
 * Hence `customFirmware: 'fails'` and `recommendedDelivery:
 * 'runtime-presets'` (SD-card `presets.ini`, bench-validated through
 * 2026-05-19 — PR #325 + #331). The topology values below stay accurate
 * and are kept as a reference, not a flash target. See
 * [`docs/HARDWARE_COMPATIBILITY.md`](../../../../docs/HARDWARE_COMPATIBILITY.md).
 *
 * **Out of scope for this profile** (to track in the BT-specific work):
 *
 *   - `BLE_PASSWORD`, `BLE_NAME`, `BLE_SHORTNAME` defines. These belong
 *     to the post-launch v0.17+ Web Bluetooth feature (tracked in
 *     [`docs/research/BLUETOOTH_FEASIBILITY.md`](../../../../docs/research/BLUETOOTH_FEASIBILITY.md))
 *     and may need to be user-configurable per-saber. Emitting them here
 *     with hardcoded placeholders risks PIN/identity collisions across
 *     users — leave them off the chassis profile and surface them at
 *     the Bluetooth-feature UI level once that ships.
 *
 * **Recovery procedure:** if a flash is attempted anyway, restore both
 * flash banks from a full backup taken beforehand —
 * `scripts/hardware-test/restore-factory.sh` does this SHA-gated from the
 * 2026-05-14 factory dump. [`docs/FLASH_GUIDE.md`](../../../../docs/FLASH_GUIDE.md)
 * covers boot-diagnostic capture and recovery.
 *
 * **MOTION_TIMEOUT note:** captured from the line-44 redefinition of
 * `89V3_allfont.h` (`60 * 3 * 800 = 144000 ms`), matching the non-BT
 * profile. The C preprocessor takes the later redefinition; pinning
 * the post-redefinition value so future contributors don't "correct"
 * it back to the line-30 value (`180000 ms`).
 */
export const SABERS89_V3_9_BT: HardwareProfile = {
  id: '89sabers-v3.9-bt',
  vendor: '89sabers',
  model: 'V3.9-BT',
  boardId: 'proffieboard-v3',
  boardChip: 'STM32L452RE',

  numBlades: 2,
  numButtons: 2,
  defaultVolume: 1800,
  clashThresholdG: 4.5,
  orientation: 'USB_TOWARDS_BLADE',
  // Required for the on-board Feasycom FSC-BT909 module on UART3 —
  // without ENABLE_SERIAL, the Bluetooth interface is inert.
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
  recommendedDelivery: 'runtime-presets',
  customFirmware: 'fails',
  notes:
    'Shares physical topology with 89sabers V3.9 (non-BT): 128 LED main + 30 LED crystal. ' +
    'Adds ENABLE_SERIAL for the on-board Feasycom FSC-BT909 BT module (UART3). ' +
    'Custom firmware does not boot on this chassis: 11/11 builds failed on the bench ' +
    "(2026-05-14 → 05-19), including 89sabers' own factory source, whichever flash bank " +
    'was written. Use runtime presets (SD card; PR #325, bench-validated through 2026-05-19). ' +
    'If a flash is attempted anyway, FLASH_GUIDE.md covers boot diagnostics and the ' +
    'dual-bank factory restore.',
};

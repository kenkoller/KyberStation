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
 * **Bench-validation status (2026-05-17):** the emitted `config.h` from
 * this profile matches the factory chassis shape per the recap. **Real-
 * hardware compile+flash is NOT yet bench-confirmed** — the 2026-05-14
 * and 2026-05-15 V3.9-BT bench sessions both failed to boot KyberStation-
 * emitted firmware. The 2026-05-15 session ([`SESSION_2026-05-15_V39BT_BENCH.md`](../../../../docs/archive/SESSION_2026-05-15_V39BT_BENCH.md))
 * disconfirmed all the obvious hypotheses (BLE defines, OLED, factory
 * non-BT config) — cracking the residual delta requires either ST-Link/
 * SWD boot logs or the source of `89sabers-config.h` from 89sabers
 * directly. Until that lands, **the recommended path for V3.9-BT users is
 * the runtime-presets export** (SD-card `presets.ini`), which is
 * bench-validated 2026-05-16 (PR #325 + #331) and sidesteps the
 * compile-flash workflow entirely. See [`docs/HARDWARE_COMPATIBILITY.md`](../../../../docs/HARDWARE_COMPATIBILITY.md)
 * for the matrix-level summary.
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
 * **Recovery procedure:** if a flash attempt fails to boot, restore via
 * the chassis-specific `dfu-util` workflow documented in
 * [`docs/FLASH_GUIDE.md`](../../../../docs/FLASH_GUIDE.md) §9
 * (boot-diagnostic capture) and §12 (recovery). The 89sabers V3.9-BT
 * factory firmware backs up reliably (~30 s, validated twice during
 * the 2026-05-14 bench) and restores cleanly to `Bank 1`.
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
  notes:
    'Shares physical topology with 89sabers V3.9 (non-BT): 128 LED main + 30 LED crystal. ' +
    'Adds ENABLE_SERIAL for the on-board Feasycom FSC-BT909 BT module (UART3). ' +
    'Real-hardware compile+flash boot NOT yet bench-confirmed — 2026-05-14/15 V3.9-BT ' +
    'bench attempts boot-looped; emitted config.h matches the factory chassis shape but ' +
    'a residual delta (likely in vendor 89sabers-config.h source not publicly available) ' +
    'blocks boot. Recommended path for V3.9-BT users today: runtime-presets export ' +
    '(SD card, bench-validated 2026-05-16 — PR #325 + #331). See FLASH_GUIDE.md §9 ' +
    'for boot-diagnostic + recovery procedure if flash is attempted.',
};

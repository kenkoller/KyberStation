import type { HardwareProfile } from '../types.js';

/**
 * Sabertrio Standard chassis profile (community-curated reference).
 *
 * Sourced from Ricapar's third-party `sabertrio-proffie` repo
 * (https://github.com/Ricapar/sabertrio-proffie/blob/master/config/s3config.h)
 * which is the only public precedent for Sabertrio-aware Proffie tooling
 * — Sabertrio does not publish factory configs themselves.
 *
 * **Important — this is an `experimental` stub.** Sabertrio's full
 * factory config is structurally more complex than KyberStation can
 * currently emit cleanly:
 *
 *   1. Four blades per preset: 115 LED primary + 20 LED side (Krosgaard)
 *      + 20 LED side (Krosgaard) + a CreeXPE2 white activation-switch
 *      LED. KyberStation's preset list only models the primary blade
 *      today.
 *   2. Custom prop file (`s3button_config.h`) that ships with Sabertrio
 *      sabers but is NOT in stock ProffieOS. Users who use this profile
 *      need to either source it from Ricapar's repo or accept that the
 *      emitted config references a file they may not have.
 *   3. Uses `BLADE_DETECT_PIN 17` to switch between two `BladeConfig`
 *      arrays at boot (with-blade vs no-blade). KyberStation emits one
 *      `BladeConfig` array per export — the detect-pin path isn't
 *      modeled.
 *   4. Uses `SimpleBladePtr<CreeXPE2WhiteTemplate<550>, ...>` for the
 *      activation switch LED. KyberStation's bladeConfig only emits
 *      `WS281XBladePtr<>` today.
 *
 * **Recommendation:** For real-hardware use, treat this profile as a
 * starting reference and switch to **Custom · Paste your config.h**
 * (the custom-paste passthrough) for full chassis fidelity. The
 * primary-blade defines below are correct; the missing structure
 * (side blades + activation switch + blade-detect) is what custom-paste
 * preserves verbatim.
 */
export const SABERTRIO_STANDARD: HardwareProfile = {
  id: 'sabertrio-standard',
  vendor: 'sabertrio',
  model: 'Standard (V2)',
  boardId: 'proffieboard-v2',
  boardChip: 'STM32L433CC',

  // Primary blade only. Sabertrio's actual config emits 4 blades per
  // preset; KyberStation Phase 1 ships just the main blade and notes
  // the limitation. Users who need full chassis support should use
  // Custom · Paste your config.h.
  numBlades: 1,
  numButtons: 2,
  defaultVolume: 450,
  clashThresholdG: 3.4,
  orientation: undefined,
  enableSerial: false,
  // Sabertrio's vendor-specific prop file. NOT in stock ProffieOS;
  // users sourcing this from Ricapar's repo or Sabertrio support.
  propFile: 's3button_config.h',
  propDefines: [
    'ENABLE_SSD1306',
    'COLOR_CHANGE_DIRECT',
    'IDLE_OFF_TIME 60*2*1000',
    'SHARED_POWER_PINS',
    'DISABLE_DIAGNOSTIC_COMMANDS',
    'BLADE_DETECT_PIN 17',
    'SAVE_PRESET',
  ],
  motionTimeoutMs: 600000, // 60 * 10 * 1000 from s3config.h L17

  blades: [
    {
      type: 'ws281x',
      ledCount: 115,
      dataPin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
      role: 'main',
    },
  ],

  source: 'experimental',
  validatedBy: [],
  notes:
    'Reference values from Ricapar/sabertrio-proffie (community-curated, not vendor-direct). ' +
    'Captures the primary 115-LED blade only — Sabertrio chassis also wire 2 side blades ' +
    '(Krosgaard variants) + a CreeXPE2 activation-switch LED that KyberStation Phase 1 cannot emit. ' +
    "Uses vendor-custom prop file 's3button_config.h' (not in stock ProffieOS — source from " +
    "Ricapar's repo or Sabertrio support). " +
    'For full chassis fidelity (side blades + activation switch + BLADE_DETECT_PIN), ' +
    'switch to Custom · Paste your config.h instead.',
};

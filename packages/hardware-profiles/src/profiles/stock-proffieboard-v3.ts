import type { HardwareProfile } from '../types.js';

/**
 * Reference design matching Hubbe's stock Proffieboard V3 dev board.
 *
 * KyberStation's current hardcoded defaults in
 * `apps/web/lib/zipExporter.ts` (`generateProffieConfig`) and
 * `packages/codegen/src/ConfigBuilder.ts` derive from this profile —
 * single 144-LED blade on `bladePin`, two-button setup, volume 2000,
 * Fett263 prop. As of 2026-05-15 this profile is the implicit baseline
 * but its real-hardware boot has never been confirmed end-to-end with
 * KyberStation-emitted firmware; the strategy doc plans Phase 3 hardware
 * verification on a stock Hubbe V3 board.
 */
export const STOCK_PROFFIEBOARD_V3: HardwareProfile = {
  id: 'stock-proffieboard-v3',
  vendor: 'hubbe',
  model: 'Proffieboard V3',
  boardId: 'proffieboard-v3',
  boardChip: 'STM32L452RE',

  numBlades: 1,
  numButtons: 2,
  defaultVolume: 2000,
  clashThresholdG: 3.0,
  orientation: undefined,
  enableSerial: false,
  propFile: 'saber_fett263_buttons.h',
  propDefines: [
    'FETT263_EDIT_MODE_MENU',
    'FETT263_MULTI_PHASE',
  ],
  motionTimeoutMs: 180000,

  blades: [
    {
      type: 'ws281x',
      ledCount: 144,
      dataPin: 'bladePin',
      colorOrder: 'Color8::GRB',
      powerPins: ['bladePowerPin2', 'bladePowerPin3'],
      role: 'main',
    },
  ],

  source: 'vendor-confirmed',
  validatedBy: [],
  notes:
    "Reference design matching Hubbe's stock Proffieboard V3 dev board. " +
    "KyberStation's hardcoded defaults derive from this profile. " +
    'Not yet boot-confirmed end-to-end with KyberStation-emitted firmware.',
};

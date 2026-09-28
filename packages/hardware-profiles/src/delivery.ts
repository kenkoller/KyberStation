import type { CustomFirmwareStatus, DeliveryPath, HardwareProfile } from './types.js';

/** UI-ready summary of how a design reaches a chassis. */
export interface DeliveryGuidance {
  path: DeliveryPath;
  customFirmware: CustomFirmwareStatus;
  /** Short uppercase badge label, e.g. `SD CARD PRESETS`. */
  badge: string;
  /** One sentence for chassis cards and onboarding. */
  summary: string;
  /**
   * True when custom firmware is known not to boot on this chassis.
   * Flashing UIs should warn and require an explicit acknowledgement.
   */
  flashKnownToFail: boolean;
}

const BADGES: Record<DeliveryPath, string> = {
  'compile-flash': 'COMPILE + FLASH',
  'runtime-presets': 'SD CARD PRESETS',
  'custom-paste': 'PASTE CONFIG',
};

/**
 * Translate a profile's delivery fields into the badge + sentence the
 * chassis picker, onboarding, and flash panel show. Kept here (not in
 * the web app) so every surface words the same bench result the same way.
 */
export function getDeliveryGuidance(profile: HardwareProfile): DeliveryGuidance {
  const path = profile.recommendedDelivery;
  const customFirmware = profile.customFirmware;

  let summary: string;
  if (path === 'runtime-presets') {
    summary =
      customFirmware === 'fails'
        ? 'Write presets to the SD card. Custom firmware has never booted on this chassis.'
        : 'Write presets to the SD card — no firmware flash needed.';
  } else if (path === 'custom-paste') {
    summary = 'Paste your factory config.h for full fidelity; this profile is a starting reference.';
  } else {
    summary =
      customFirmware === 'works'
        ? 'Export config.h, compile, and flash (bench-confirmed).'
        : 'Export config.h, compile, and flash. Not yet bench-confirmed — back up first.';
  }

  return {
    path,
    customFirmware,
    badge: BADGES[path],
    summary,
    flashKnownToFail: customFirmware === 'fails',
  };
}

import type {
  BladeSpec,
  HardwareProfile,
  WS2811DataPin,
} from './types.js';

/** Set of valid ProffieOS V3 data pin macros. */
const KNOWN_DATA_PINS: ReadonlySet<WS2811DataPin> = new Set([
  'bladePin',
  'blade2Pin',
  'blade3Pin',
]);

/** Returns true if the value is a recognized WS281X data pin macro. */
export function isKnownDataPin(pin: string): pin is WS2811DataPin {
  return KNOWN_DATA_PINS.has(pin as WS2811DataPin);
}

/**
 * Return the single `main` blade in a profile, or throw if there isn't
 * exactly one. Used both at runtime (codegen) and in validation tests.
 */
export function getMainBlade(profile: HardwareProfile): BladeSpec {
  const mains = profile.blades.filter((b) => b.role === 'main');
  if (mains.length !== 1) {
    throw new Error(
      `Profile "${profile.id}" must have exactly one 'main' blade, found ${mains.length}`,
    );
  }
  return mains[0]!;
}

/**
 * Validate a HardwareProfile against the structural invariants documented
 * in `docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md` §4. Returns an
 * array of error messages — empty array means the profile is valid.
 *
 * This is intentionally a fail-soft helper (no throw) so callers can
 * collect all violations in one pass. Tests assert `errors.length === 0`.
 */
export function validateProfile(profile: HardwareProfile): string[] {
  const errors: string[] = [];

  if (!profile.id || /\s/.test(profile.id)) {
    errors.push(`id must be non-empty and contain no whitespace (got "${profile.id}")`);
  }
  if (!profile.vendor) {
    errors.push('vendor must be non-empty');
  }
  if (!profile.model) {
    errors.push('model must be non-empty');
  }

  if (profile.numBlades !== profile.blades.length) {
    errors.push(
      `numBlades (${profile.numBlades}) must equal blades.length (${profile.blades.length})`,
    );
  }

  const mainCount = profile.blades.filter((b) => b.role === 'main').length;
  if (mainCount !== 1) {
    errors.push(`must have exactly one blade with role 'main' (found ${mainCount})`);
  }

  profile.blades.forEach((blade, idx) => {
    if (!isKnownDataPin(blade.dataPin)) {
      errors.push(
        `blades[${idx}].dataPin "${blade.dataPin}" is not a known data pin macro`,
      );
    }
    if (blade.powerPins.length === 0) {
      errors.push(`blades[${idx}].powerPins must not be empty`);
    }
    if (blade.type === 'ws281x' && blade.ledCount <= 0) {
      errors.push(`blades[${idx}].ledCount must be > 0 for ws281x (got ${blade.ledCount})`);
    }
  });

  if (profile.motionTimeoutMs <= 0) {
    errors.push(`motionTimeoutMs must be > 0 (got ${profile.motionTimeoutMs})`);
  }

  if (profile.defaultVolume < 0 || profile.defaultVolume > 3500) {
    errors.push(
      `defaultVolume must be in [0, 3500] (got ${profile.defaultVolume})`,
    );
  }

  if (profile.clashThresholdG <= 0) {
    errors.push(
      `clashThresholdG must be > 0 (got ${profile.clashThresholdG})`,
    );
  }

  return errors;
}

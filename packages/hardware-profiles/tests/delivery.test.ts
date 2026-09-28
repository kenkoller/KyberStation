import { describe, it, expect } from 'vitest';
import type { HardwareProfile } from '../src/index.js';
import {
  ALL_PROFILES,
  getDeliveryGuidance,
  SABERS89_V3_9,
  SABERS89_V3_9_BT,
  SABERTRIO_STANDARD,
  STOCK_PROFFIEBOARD_V3,
  validateProfile,
} from '../src/index.js';

function clone(profile: HardwareProfile): HardwareProfile {
  return structuredClone(profile);
}

describe('profile delivery fields', () => {
  it('every registered profile declares a delivery path and firmware status', () => {
    for (const p of ALL_PROFILES) {
      expect(['compile-flash', 'runtime-presets', 'custom-paste']).toContain(p.recommendedDelivery);
      expect(['untested', 'fails', 'works']).toContain(p.customFirmware);
    }
  });

  it('89sabers V3.9-BT: custom firmware fails, runtime presets recommended', () => {
    // 11/11 custom builds failed to boot on the bench, 2026-05-14 → 05-19.
    expect(SABERS89_V3_9_BT.customFirmware).toBe('fails');
    expect(SABERS89_V3_9_BT.recommendedDelivery).toBe('runtime-presets');
  });

  it('no profile claims custom firmware works without bench confirmation', () => {
    // Flip to 'works' only alongside a validatedBy entry.
    for (const p of ALL_PROFILES) {
      if (p.customFirmware === 'works') expect(p.validatedBy.length).toBeGreaterThan(0);
    }
  });

  it('stock V3 and non-BT V3.9 default to compile + flash, untested', () => {
    expect(STOCK_PROFFIEBOARD_V3.recommendedDelivery).toBe('compile-flash');
    expect(STOCK_PROFFIEBOARD_V3.customFirmware).toBe('untested');
    expect(SABERS89_V3_9.recommendedDelivery).toBe('compile-flash');
    expect(SABERS89_V3_9.customFirmware).toBe('untested');
  });

  it('Sabertrio recommends pasting the factory config', () => {
    expect(SABERTRIO_STANDARD.recommendedDelivery).toBe('custom-paste');
  });
});

describe('validateProfile delivery rule', () => {
  it('rejects a chassis that fails custom firmware but recommends flashing', () => {
    const bad = clone(SABERS89_V3_9_BT);
    bad.recommendedDelivery = 'compile-flash';
    expect(validateProfile(bad)).toContainEqual(
      expect.stringMatching(/recommendedDelivery must be 'runtime-presets'/),
    );
  });

  it('accepts runtime presets for a chassis whose firmware is untested', () => {
    const ok = clone(STOCK_PROFFIEBOARD_V3);
    ok.recommendedDelivery = 'runtime-presets';
    expect(validateProfile(ok)).toEqual([]);
  });
});

describe('getDeliveryGuidance', () => {
  it('V3.9-BT: SD-card badge, flash known to fail, summary says so', () => {
    const g = getDeliveryGuidance(SABERS89_V3_9_BT);
    expect(g.badge).toBe('SD CARD PRESETS');
    expect(g.flashKnownToFail).toBe(true);
    expect(g.summary).toMatch(/never booted/);
  });

  it('untested compile + flash tells the user to back up first', () => {
    const g = getDeliveryGuidance(STOCK_PROFFIEBOARD_V3);
    expect(g.badge).toBe('COMPILE + FLASH');
    expect(g.flashKnownToFail).toBe(false);
    expect(g.summary).toMatch(/back up first/);
  });

  it('bench-confirmed compile + flash drops the warning', () => {
    const confirmed = clone(STOCK_PROFFIEBOARD_V3);
    confirmed.customFirmware = 'works';
    expect(getDeliveryGuidance(confirmed).summary).toMatch(/bench-confirmed\)/);
  });

  it('runtime presets on a chassis without a known flash failure omits the warning', () => {
    const p = clone(STOCK_PROFFIEBOARD_V3);
    p.recommendedDelivery = 'runtime-presets';
    const g = getDeliveryGuidance(p);
    expect(g.flashKnownToFail).toBe(false);
    expect(g.summary).not.toMatch(/never booted/);
  });

  it('custom paste gets its own badge', () => {
    expect(getDeliveryGuidance(SABERTRIO_STANDARD).badge).toBe('PASTE CONFIG');
  });
});

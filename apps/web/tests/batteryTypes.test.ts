// ─── batteryTypes — manufacturer-rated cell catalog tests ───
//
// Locks in the contract that drives the safety warning in HardwarePanel.
// The whole feature's promise is that the warning is **only** based on
// real manufacturer specs vs. real peak draw. These tests guard:
//
//   1. Every shipped battery has a complete spec (no missing fields).
//   2. The warning math is a strict math identity (not a heuristic).
//   3. The default battery doesn't trigger a false warning at typical use.
//   4. Custom-battery resolution works.
//   5. Datasheet citations exist for every non-generic cell.

import { describe, it, expect } from 'vitest';
import {
  BATTERIES,
  DEFAULT_BATTERY_ID,
  DEFAULT_CUSTOM_BATTERY,
  resolveBattery,
  exceedsBatteryMargin,
  BATTERY_WARNING_THRESHOLD,
} from '@/lib/batteryTypes';
import { computePowerDraw } from '@/lib/powerDraw';

describe('BATTERIES catalog — shipped cells have complete specs', () => {
  it.each(BATTERIES.map((b) => [b.id, b]))(
    '%s — has all required fields with valid ranges',
    (_id, battery) => {
      expect(battery.id).toBeTruthy();
      expect(battery.label).toBeTruthy();
      expect(battery.notes).toBeTruthy();
      expect(battery.tier).toMatch(/^(basic|standard|high-drain|large)$/);

      // Realistic Li-ion ranges. If a cell falls outside these, either
      // the spec is wrong or the catalog is being repurposed for a
      // chemistry it wasn't designed for. Either way: explicit failure.
      expect(battery.capacityMah).toBeGreaterThanOrEqual(500);
      expect(battery.capacityMah).toBeLessThanOrEqual(10000);
      expect(battery.maxDischargeA).toBeGreaterThanOrEqual(5);
      expect(battery.maxDischargeA).toBeLessThanOrEqual(50);
      expect(battery.voltageNominal).toBeGreaterThanOrEqual(3.0);
      expect(battery.voltageNominal).toBeLessThanOrEqual(4.5);
    },
  );

  it('contains the default battery id', () => {
    const found = BATTERIES.find((b) => b.id === DEFAULT_BATTERY_ID);
    expect(found).toBeDefined();
  });

  it('every battery id is unique', () => {
    const ids = BATTERIES.map((b) => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('non-basic-tier cells cite a manufacturer datasheet URL', () => {
    // Generic basic-tier cells are class-typed (no single manufacturer);
    // every other cell must cite its source. This forces future authors
    // to bring a verifiable spec, not a guess.
    const namedTiers = BATTERIES.filter((b) => b.tier !== 'basic');
    for (const battery of namedTiers) {
      expect(battery.datasheetUrl).toBeTruthy();
      // Sanity check it's a URL string, not a free-form note.
      expect(battery.datasheetUrl).toMatch(/^https?:\/\//);
    }
  });
});

describe('exceedsBatteryMargin — strict math, no heuristic', () => {
  it('returns false when peakDraw is exactly at the threshold', () => {
    // 90% of 10A = 9A; at exactly 9A we are AT the threshold (not over).
    expect(exceedsBatteryMargin(9.0, 10)).toBe(false);
  });

  it('returns false when peakDraw is just under the threshold', () => {
    // 89% of 10A is well under the 90% threshold.
    expect(exceedsBatteryMargin(8.9, 10)).toBe(false);
  });

  it('returns true when peakDraw exceeds the threshold by any amount', () => {
    // The brief: warn ONLY when peak > 0.9 × maxA.
    expect(exceedsBatteryMargin(9.01, 10)).toBe(true);
    expect(exceedsBatteryMargin(15, 10)).toBe(true);
  });

  it('returns false for nonsense max (zero or negative)', () => {
    expect(exceedsBatteryMargin(5, 0)).toBe(false);
    expect(exceedsBatteryMargin(5, -10)).toBe(false);
  });

  it('does not warn for zero peak draw on any battery', () => {
    for (const b of BATTERIES) {
      expect(exceedsBatteryMargin(0, b.maxDischargeA)).toBe(false);
    }
  });

  it('uses the documented BATTERY_WARNING_THRESHOLD constant (0.9)', () => {
    expect(BATTERY_WARNING_THRESHOLD).toBe(0.9);
  });
});

describe('resolveBattery — known + unknown + custom paths', () => {
  it('resolves a known id to its full spec', () => {
    const result = resolveBattery('18650-vtc6', null);
    expect(result.id).toBe('18650-vtc6');
    expect(result.maxDischargeA).toBe(30);
    expect(result.capacityMah).toBe(3000);
  });

  it('falls back to default for an unknown id', () => {
    const result = resolveBattery('not-a-real-cell', null);
    expect(result.id).toBe(DEFAULT_BATTERY_ID);
  });

  it('returns the custom spec when id is "custom" and custom is provided', () => {
    const custom = { capacityMah: 2500, maxDischargeA: 20, voltageNominal: 3.7 };
    const result = resolveBattery('custom', custom);
    expect(result.id).toBe('custom');
    expect(result.capacityMah).toBe(2500);
    expect(result.maxDischargeA).toBe(20);
  });

  it('falls back to default when id is "custom" but no custom spec is provided', () => {
    const result = resolveBattery('custom', null);
    expect(result.id).toBe(DEFAULT_BATTERY_ID);
  });
});

describe('default battery — no false warning on typical 144-LED config', () => {
  // The contract Ken set: the default battery must NOT trigger the
  // warning on a typical 144-LED single-strip blade at full brightness.
  // This test computes the actual peak draw against the default cell
  // and confirms the warning math doesn't fire.

  it('a 144-LED blue blade at 100% brightness on Sony VTC6 → no warning', () => {
    const stats = computePowerDraw({
      ledCount: 144,
      stripType: 'single',
      baseColor: { r: 0, g: 140, b: 255 },
      brightnessPct: 100,
      batteryIdx: 0,
    });
    const defaultBattery = resolveBattery(DEFAULT_BATTERY_ID, null);
    const peakA = stats.peakMA / 1000;
    expect(exceedsBatteryMargin(peakA, defaultBattery.maxDischargeA)).toBe(false);
  });

  it('a 144-LED full-white worst case at 100% brightness on Sony VTC6 → no warning', () => {
    // Worst case: white at 100% brightness. The default 30A VTC6 has
    // ~3.4× headroom on this — it should never trigger.
    const stats = computePowerDraw({
      ledCount: 144,
      stripType: 'single',
      baseColor: { r: 255, g: 255, b: 255 },
      brightnessPct: 100,
      batteryIdx: 0,
    });
    const defaultBattery = resolveBattery(DEFAULT_BATTERY_ID, null);
    const peakA = stats.peakMA / 1000;
    expect(exceedsBatteryMargin(peakA, defaultBattery.maxDischargeA)).toBe(false);
  });
});

describe('basic 18650 cell — warns on extreme load (correctness sanity)', () => {
  // The basic 18650 is a 10A cell. A 4-strip 144-LED blade at full white
  // pulls roughly ~35A peak — well past the 9A threshold. The warning
  // SHOULD fire here. This is the inverse of the no-false-warning test.

  it('quad-strip 144-LED full-white on basic 10A cell → warning fires', () => {
    const stats = computePowerDraw({
      ledCount: 144,
      stripType: 'quad-neo',
      baseColor: { r: 255, g: 255, b: 255 },
      brightnessPct: 100,
      batteryIdx: 0,
    });
    const basic = resolveBattery('18650-basic', null);
    const peakA = stats.peakMA / 1000;
    expect(exceedsBatteryMargin(peakA, basic.maxDischargeA)).toBe(true);
  });
});

describe('DEFAULT_CUSTOM_BATTERY — sane starting values', () => {
  it('has realistic Li-ion defaults', () => {
    expect(DEFAULT_CUSTOM_BATTERY.capacityMah).toBeGreaterThan(0);
    expect(DEFAULT_CUSTOM_BATTERY.maxDischargeA).toBeGreaterThan(0);
    expect(DEFAULT_CUSTOM_BATTERY.voltageNominal).toBeCloseTo(3.7, 1);
  });
});

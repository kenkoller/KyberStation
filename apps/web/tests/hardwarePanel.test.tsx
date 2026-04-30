// ─── HardwarePanel — merged config + power-draw tests ────────────────
//
// The panel pulls live state from the bladeStore + uiStore, but the
// math that drives the readout is pulled into `lib/powerDraw.ts` so
// it can be tested without React + zustand. This file:
//
//   1. Exercises the pure power-draw math against fixture configs.
//      Three required cases from the brief:
//        (a) brightness slider updates power draw readout
//        (b) LED count change updates power draw
//        (c) headroom variant matches expected status color
//
//   2. Renders HardwarePanel through `react-dom/server` to lock down
//      the structural contract — section header, divider, big readout,
//      headroom signal, R/G/B breakdown, battery selector, etc.
//
// Test env is node-only (no jsdom). `renderToStaticMarkup` gives us
// the SSR HTML, which is sufficient to assert the static shape; click
// + state behaviour is exercised through the math layer instead.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Stub modules with DOM / portal reach so SSR completes cleanly ──

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return { ...actual, createPortal: (node: unknown) => node };
});

vi.mock('@/lib/uiSounds', () => ({ playUISound: () => {} }));

vi.mock('@/hooks/useModalDialog', () => ({
  useModalDialog: () => ({ dialogRef: { current: null } }),
}));

// useBoardProfile reads from window.localStorage; provide a stub so the
// hook returns a stable id during SSR.
vi.mock('@/hooks/useBoardProfile', () => ({
  useBoardProfile: () => ({
    boardId: 'proffie-v3.9',
    profile: undefined,
    setBoardId: () => {},
  }),
  STORAGE_KEY: 'kyberstation-board-id',
  BOARD_CHANGE_EVENT: 'kyberstation-board-changed',
  readStoredBoardId: () => 'proffie-v3.9',
  writeStoredBoardId: () => {},
}));

// ─── Imports under test ──────────────────────────────────────────────

import {
  computePowerDraw,
  classifyHeadroom,
  headroomLabel,
  getStripCount,
  isInHilt,
  BOARD_MAX_MA,
  BATTERY_PRESETS,
  HEADROOM_THRESHOLDS,
  AVG_DUTY_CYCLE,
  BOARD_IDLE_MA,
} from '@/lib/powerDraw';

// ─── Pure-math tests ─────────────────────────────────────────────────

describe('computePowerDraw — input → stat fields', () => {
  const blueObiWan = { r: 0, g: 140, b: 255 };

  it('returns finite, non-negative values for a default-shape input', () => {
    const stats = computePowerDraw({
      ledCount: 144,
      stripType: 'single',
      baseColor: blueObiWan,
      brightnessPct: 100,
      batteryIdx: 0,
    });

    expect(stats.totalLEDs).toBe(144);
    expect(stats.peakMA).toBeGreaterThan(0);
    expect(stats.colorMA).toBeGreaterThan(0);
    expect(stats.avgMA).toBeGreaterThan(0);
    expect(stats.runtimeMinutes).toBeGreaterThan(0);
    expect(stats.batteryLabel).toBe(BATTERY_PRESETS[0].label);
  });

  it('peakMA matches: ledCount × stripCount × 60mA × brightness + idle', () => {
    const stats = computePowerDraw({
      ledCount: 100,
      stripType: 'single',
      baseColor: blueObiWan,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    // 100 LEDs × 60 mA × 1.0 + 50 idle = 6050
    expect(stats.peakMA).toBe(6050);
    expect(stats.overLimit).toBe(true); // 6050 > 5000
  });

  it('headroomFrac equals peakMA / BOARD_MAX_MA', () => {
    const stats = computePowerDraw({
      ledCount: 50,
      stripType: 'single',
      baseColor: blueObiWan,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    // 50 LEDs × 60 mA + 50 idle = 3050 mA. 3050 / 5000 = 0.61.
    expect(stats.peakMA).toBe(3050);
    expect(stats.headroomFrac).toBeCloseTo(3050 / BOARD_MAX_MA, 5);
  });

  it('avgMA reflects the 60% duty-cycle assumption', () => {
    const stats = computePowerDraw({
      ledCount: 100,
      stripType: 'single',
      baseColor: { r: 255, g: 255, b: 255 }, // white at 1.0 → maPerLed = 60
      brightnessPct: 100,
      batteryIdx: 0,
    });
    // 100 × 60 × 0.60 + 50 = 3650
    const expectedAvg = Math.round(100 * 60 * AVG_DUTY_CYCLE + BOARD_IDLE_MA);
    expect(stats.avgMA).toBe(expectedAvg);
  });
});

describe('computePowerDraw — (a) brightness slider updates readout', () => {
  const blue = { r: 0, g: 140, b: 255 };
  const fixed = { ledCount: 144, stripType: 'single', baseColor: blue, batteryIdx: 0 };

  it('peak/color/avg all scale proportionally with brightness', () => {
    const at100 = computePowerDraw({ ...fixed, brightnessPct: 100 });
    const at50 = computePowerDraw({ ...fixed, brightnessPct: 50 });
    const at0 = computePowerDraw({ ...fixed, brightnessPct: 0 });

    // colorMA at 50% should be roughly half of (colorMA - idle) at 100%.
    const at100LED = at100.colorMA - BOARD_IDLE_MA;
    const at50LED = at50.colorMA - BOARD_IDLE_MA;
    expect(Math.abs(at50LED - at100LED * 0.5)).toBeLessThan(2); // round-off tolerance

    // peak halves with brightness too (idle still added).
    const at100Peak = at100.peakMA - BOARD_IDLE_MA;
    const at50Peak = at50.peakMA - BOARD_IDLE_MA;
    expect(Math.abs(at50Peak - at100Peak * 0.5)).toBeLessThan(2);

    // At 0% brightness, only idle remains.
    expect(at0.peakMA).toBe(BOARD_IDLE_MA);
    expect(at0.colorMA).toBe(BOARD_IDLE_MA);
  });

  it('runtime grows as brightness drops (avg falls → runtime rises)', () => {
    const dim = computePowerDraw({ ...fixed, brightnessPct: 25 });
    const bright = computePowerDraw({ ...fixed, brightnessPct: 100 });
    expect(dim.runtimeMinutes).toBeGreaterThan(bright.runtimeMinutes);
  });

  it('clamps brightness > 100 (and < 0) to the 0..100 band', () => {
    const above = computePowerDraw({ ...fixed, brightnessPct: 200 });
    const at100 = computePowerDraw({ ...fixed, brightnessPct: 100 });
    expect(above.peakMA).toBe(at100.peakMA);

    const below = computePowerDraw({ ...fixed, brightnessPct: -50 });
    const at0 = computePowerDraw({ ...fixed, brightnessPct: 0 });
    expect(below.peakMA).toBe(at0.peakMA);
  });
});

describe('computePowerDraw — (b) LED count change updates readout', () => {
  const blue = { r: 0, g: 140, b: 255 };
  const fixed = { stripType: 'single' as string | undefined, baseColor: blue, brightnessPct: 100, batteryIdx: 0 };

  it('totalLEDs tracks ledCount × stripCount for neopixel strips', () => {
    expect(computePowerDraw({ ...fixed, ledCount: 100 }).totalLEDs).toBe(100);
    expect(computePowerDraw({ ...fixed, ledCount: 144 }).totalLEDs).toBe(144);
    expect(
      computePowerDraw({ ...fixed, ledCount: 100, stripType: 'tri-neo' }).totalLEDs,
    ).toBe(300);
  });

  it('peak draw scales linearly with LED count', () => {
    const small = computePowerDraw({ ...fixed, ledCount: 50 });
    const big = computePowerDraw({ ...fixed, ledCount: 100 });
    // (peak_big - idle) ≈ 2 × (peak_small - idle)
    const ratio = (big.peakMA - BOARD_IDLE_MA) / (small.peakMA - BOARD_IDLE_MA);
    expect(ratio).toBeCloseTo(2, 5);
  });

  it('LED count change flips overLimit when peak crosses the 5A line', () => {
    const small = computePowerDraw({ ...fixed, ledCount: 50 }); // 3050 mA peak
    expect(small.overLimit).toBe(false);

    const big = computePowerDraw({ ...fixed, ledCount: 100 }); // 6050 mA peak
    expect(big.overLimit).toBe(true);
  });

  it('in-hilt strips ignore ledCount and report stripCount as totalLEDs', () => {
    const cree = computePowerDraw({ ...fixed, ledCount: 144, stripType: 'tri-cree' });
    expect(cree.totalLEDs).toBe(3);
    // 3 × 60 × 1.0 + 50 = 230
    expect(cree.peakMA).toBe(230);
  });
});

describe('classifyHeadroom — (c) headroom variant matches expected status color', () => {
  const blue = { r: 0, g: 140, b: 255 };

  it('returns "success" below the warn threshold (< 50%)', () => {
    // 30 LEDs × 60 mA + 50 = 1850 mA peak → 37% of 5A
    const stats = computePowerDraw({
      ledCount: 30,
      stripType: 'single',
      baseColor: blue,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    expect(stats.headroomFrac).toBeLessThan(HEADROOM_THRESHOLDS.warn);
    expect(classifyHeadroom(stats)).toBe('success');
  });

  it('returns "warning" between warn and critical (50-80%)', () => {
    // 60 LEDs × 60 mA + 50 = 3650 mA peak → 73% of 5A
    const stats = computePowerDraw({
      ledCount: 60,
      stripType: 'single',
      baseColor: blue,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    expect(stats.headroomFrac).toBeGreaterThanOrEqual(HEADROOM_THRESHOLDS.warn);
    expect(stats.headroomFrac).toBeLessThan(HEADROOM_THRESHOLDS.critical);
    expect(classifyHeadroom(stats)).toBe('warning');
  });

  it('returns "error" at or above the critical threshold (≥ 80%)', () => {
    // 100 LEDs × 60 mA + 50 = 6050 mA peak → 121% of 5A (over limit)
    const stats = computePowerDraw({
      ledCount: 100,
      stripType: 'single',
      baseColor: blue,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    expect(stats.headroomFrac).toBeGreaterThanOrEqual(HEADROOM_THRESHOLDS.critical);
    expect(classifyHeadroom(stats)).toBe('error');
  });

  it('headroom label reads "X% headroom" with X clamped at 0', () => {
    const safe = computePowerDraw({
      ledCount: 30,
      stripType: 'single',
      baseColor: blue,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    expect(headroomLabel(safe)).toMatch(/^\d+% headroom$/);

    const fried = computePowerDraw({
      ledCount: 200, // way over budget
      stripType: 'single',
      baseColor: blue,
      brightnessPct: 100,
      batteryIdx: 0,
    });
    expect(headroomLabel(fried)).toBe('0% headroom');
  });
});

describe('strip-type helpers', () => {
  it('getStripCount returns 1 for single, n for n-strip variants', () => {
    expect(getStripCount('single')).toBe(1);
    expect(getStripCount('dual-neo')).toBe(2);
    expect(getStripCount('tri-neo')).toBe(3);
    expect(getStripCount('quad-neo')).toBe(4);
    expect(getStripCount('penta-neo')).toBe(5);
    expect(getStripCount('tri-cree')).toBe(3);
    expect(getStripCount(undefined)).toBe(1);
    expect(getStripCount('not-a-real-strip')).toBe(1);
  });

  it('isInHilt returns true only for cree variants', () => {
    expect(isInHilt('single')).toBe(false);
    expect(isInHilt('tri-neo')).toBe(false);
    expect(isInHilt('tri-cree')).toBe(true);
    expect(isInHilt('quad-cree')).toBe(true);
    expect(isInHilt(undefined)).toBe(false);
  });
});

// ─── Render-shape tests ──────────────────────────────────────────────
//
// We have to defer the panel import until AFTER the mocks above are
// registered, otherwise the real `useBoardProfile` reads window during
// module load and SSR explodes. Lazy-require keeps the test runner
// happy.

describe('HardwarePanel — SSR shape', () => {
  let originalLocalStorage: unknown;

  beforeEach(() => {
    // Provide a minimal localStorage so anything that slips past the
    // mock layer doesn't crash. (Belt + braces.)
    originalLocalStorage = (globalThis as unknown as { localStorage?: unknown }).localStorage;
    const store: Record<string, string> = {};
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };
  });

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
    }
  });

  it('renders the CONFIGURATION header, divider, and POWER readout regions', async () => {
    const mod = await import('@/components/editor/HardwarePanel');
    const markup = renderToStaticMarkup(createElement(mod.HardwarePanel));

    // Section header
    expect(markup).toContain('data-testid="hw-section-config"');
    expect(markup.toLowerCase()).toContain('configuration');

    // Divider label
    expect(markup.toLowerCase()).toContain('power draw');

    // Big peak readout block + headroom signal
    expect(markup).toContain('data-testid="hw-power-readout"');
    expect(markup).toContain('data-testid="hw-headroom-signal"');
    expect(markup).toContain('data-testid="hw-peak-amps"');

    // Inputs
    expect(markup).toContain('data-testid="hw-led-override"');
    expect(markup).toContain('data-testid="hw-brightness"');
  });

  it('renders the per-channel R/G/B breakdown and battery selector', async () => {
    const mod = await import('@/components/editor/HardwarePanel');
    const markup = renderToStaticMarkup(createElement(mod.HardwarePanel));

    expect(markup).toContain('Channel Breakdown');
    // Each channel band is present
    for (const ch of ['R', 'G', 'B']) {
      // The label + ' mA' value pair
      expect(markup).toContain(`>${ch}<`);
    }

    // Battery selector
    expect(markup).toContain('id="hw-battery"');
    for (const bp of BATTERY_PRESETS) {
      expect(markup).toContain(bp.label);
    }
  });

  it('renders all 5 topology options + 5 strip-type options + 6 blade lengths', async () => {
    const mod = await import('@/components/editor/HardwarePanel');
    const markup = renderToStaticMarkup(createElement(mod.HardwarePanel));

    // Topology — every preset id has a radio button
    for (const t of ['Single Blade', 'Staff', 'Crossguard', 'Triple', 'Inquisitor']) {
      expect(markup).toContain(t);
    }

    // Strip configurations
    for (const s of ['1 Strip', '2 Strip', '3 Strip', '4 Strip', '5 Strip']) {
      expect(markup).toContain(s);
    }

    // Blade lengths — quotes are HTML-escaped to &quot; in SSR output,
    // so we match against the labels with that escape applied. Captions
    // are sourced from `lib/bladeLengths.ts::BLADE_LENGTH_CAPTIONS` and
    // reflect what real-world Neopixel saber vendors sell (36" = the
    // Standard length, 24" = Combat-style, etc.).
    for (const len of [
      'Shoto / Yoda (20&quot;)',
      'Combat (24&quot;)',
      'Uncommon (28&quot;)',
      'Medium (32&quot;)',
      'Standard (36&quot;)',
      'Extra Long (40&quot;)',
    ]) {
      expect(markup).toContain(len);
    }
  });

  it('does NOT surface the LED-override warning when ledCount matches the canonical for the inferred length', async () => {
    // Default bladeStore.config.ledCount is 144 (canonical for 36").
    // The warning should be silent — typical install path.
    const mod = await import('@/components/editor/HardwarePanel');
    const markup = renderToStaticMarkup(createElement(mod.HardwarePanel));
    expect(markup).not.toContain('data-testid="hw-led-override-warning"');
    // The aria-invalid hint on the input should also be `false`.
    expect(markup).toContain('aria-invalid="false"');
    expect(markup).not.toContain('aria-invalid="true"');
  });
});

// ─── Pure logic test for the LED-override divergence warning ──────────
//
// The HardwarePanel render-time test above can't easily flip the
// bladeStore default — Zustand 4's React binding pins SSR to
// `getInitialState()`. Test the warning's logic shape directly using
// the same `canonicalLedCountForInches` + `inferBladeInches` lookups
// the panel performs internally.

describe('HardwarePanel — LED-count divergence sentinel logic', () => {
  it('flags a manually-typed LED count that diverges from the inferred-bucket canonical', async () => {
    const { canonicalLedCountForInches, inferBladeInches } = await import(
      '@/lib/bladeLengths'
    );

    // 130 LEDs sits inside the 36" bucket (118..144) but doesn't match
    // the 36" canonical (144). The panel infers length from ledCount,
    // looks up the canonical for that bucket, and warns on mismatch.
    const inferred = inferBladeInches(130);
    expect(inferred).toBe(36);
    const canonical = canonicalLedCountForInches(inferred);
    expect(canonical).toBe(144);
    // Divergence check: the panel's `ledCountIsUnusual` becomes true.
    expect(canonical !== undefined && canonical !== 130).toBe(true);
  });

  it('does not flag 144 LEDs on the 36" canonical layout', async () => {
    const { canonicalLedCountForInches, inferBladeInches } = await import(
      '@/lib/bladeLengths'
    );
    const inferred = inferBladeInches(144);
    expect(inferred).toBe(36);
    expect(canonicalLedCountForInches(inferred)).toBe(144);
  });

  it('does not flag every canonical preset against itself (round-trip invariant)', async () => {
    const { BLADE_LENGTHS, canonicalLedCountForInches, inferBladeInches } =
      await import('@/lib/bladeLengths');

    for (const opt of BLADE_LENGTHS) {
      const inferred = inferBladeInches(opt.ledCount);
      const canonical = canonicalLedCountForInches(inferred);
      // Forward: ledCount → inferred inches → canonical ledCount; equal.
      expect(canonical).toBe(opt.ledCount);
    }
  });
});

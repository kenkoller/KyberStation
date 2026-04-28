// ─── Drift sentinel: BLADE_LENGTHS source-of-truth lift ───
//
// The same blade-length table was previously inlined in five places
// (HardwarePanel, BladeHardwarePanel, BladeCanvas, SaberWizard,
// bladeRenderMetrics). In two of those (HardwarePanel + BladeHardwarePanel)
// the 36" entry claimed 144 LEDs while the engine's BLADE_LENGTH_PRESETS
// said 132 — a documented drift that bit twice (PR #96 first, this lift
// second).
//
// This file pins the post-lift invariant: `BLADE_LENGTH_PRESETS` is the
// single canonical source, `BLADE_LENGTHS` (web side) is a derived view
// of it, and `inferBladeInches` is the reverse mapping. Drift on any of
// those three fails CI.

import { describe, it, expect } from 'vitest';
import { BLADE_LENGTH_PRESETS } from '@kyberstation/engine';
import {
  BLADE_LENGTHS,
  inferBladeInches,
  bladeLengthLabel,
} from '@/lib/bladeLengths';

describe('BLADE_LENGTH_PRESETS (canonical engine table)', () => {
  it('contains the 20" entry that the lift added', () => {
    // Pre-lift, the engine table had 24"-40" only. The 20" entry was
    // duplicated into web-side inline arrays. Lift moved it into the
    // canonical table so every consumer sees it without duplication.
    expect(BLADE_LENGTH_PRESETS['20"']).toBeDefined();
    expect(BLADE_LENGTH_PRESETS['20"']?.inches).toBe(20);
    expect(BLADE_LENGTH_PRESETS['20"']?.ledCount).toBe(73);
  });

  it('36" entry resolves to 132 LEDs (engine truth — NOT the historical 144 drift)', () => {
    // PR #96 fixed engine drift here. Two web-side inline arrays
    // (HardwarePanel + BladeHardwarePanel) still claimed 144 until this
    // lift. If a future change reintroduces 144, the visualizer will
    // disagree with real hardware again — this assertion catches it.
    expect(BLADE_LENGTH_PRESETS['36"']?.ledCount).toBe(132);
  });

  it('covers exactly the canonical 20"/24"/28"/32"/36"/40" presets', () => {
    expect(Object.keys(BLADE_LENGTH_PRESETS).sort()).toEqual(
      ['20"', '24"', '28"', '32"', '36"', '40"'].sort(),
    );
  });
});

describe('BLADE_LENGTHS (derived web-side view)', () => {
  it('mirrors BLADE_LENGTH_PRESETS shape-by-shape', () => {
    // For every preset in the canonical engine table, the derived
    // `BLADE_LENGTHS` array MUST contain a matching entry. This is the
    // primary drift sentinel — a future inline edit on either side
    // would fail here.
    for (const [id, cfg] of Object.entries(BLADE_LENGTH_PRESETS)) {
      const derived = BLADE_LENGTHS.find((b) => b.inches === cfg.inches);
      expect(derived).toBeDefined();
      expect(derived?.id).toBe(id);
      expect(derived?.ledCount).toBe(cfg.ledCount);
    }
  });

  it('every canonical entry surfaces in the derived array', () => {
    expect(BLADE_LENGTHS.length).toBe(Object.keys(BLADE_LENGTH_PRESETS).length);
  });

  it('is sorted by inches ascending', () => {
    const inches = BLADE_LENGTHS.map((b) => b.inches);
    const sorted = [...inches].sort((a, b) => a - b);
    expect(inches).toEqual(sorted);
  });

  it('20" entry surfaces (drift fix)', () => {
    const yoda = BLADE_LENGTHS.find((b) => b.inches === 20);
    expect(yoda).toBeDefined();
    expect(yoda?.ledCount).toBe(73);
  });

  it('36" entry resolves to 132 LEDs (NOT the historical 144 drift)', () => {
    // Mirror of the engine-side assertion at the web layer. This is the
    // load-bearing user-visible behavior — the visualizer renders 132
    // LEDs for a 36" blade, matching what real hardware does.
    const long = BLADE_LENGTHS.find((b) => b.inches === 36);
    expect(long?.ledCount).toBe(132);
  });
});

describe('inferBladeInches (reverse mapping)', () => {
  it('every preset ledCount reverse-maps to its inches', () => {
    // Round-trip invariant: forward via BLADE_LENGTHS, reverse via
    // inferBladeInches must agree for every canonical entry.
    for (const opt of BLADE_LENGTHS) {
      expect(inferBladeInches(opt.ledCount)).toBe(opt.inches);
    }
  });

  it('132 LEDs maps to 36" (the drift case)', () => {
    // Pre-lift, HardwarePanel's local inferBladeInches said 144 -> 36
    // and bladeRenderMetrics's said 132 -> 36. These disagreed silently.
    // Post-lift there's exactly one implementation; both pre-lift call
    // sites now agree on the engine truth.
    expect(inferBladeInches(132)).toBe(36);
  });

  it('133 LEDs and above maps to 40"', () => {
    expect(inferBladeInches(133)).toBe(40);
    expect(inferBladeInches(144)).toBe(40);
    expect(inferBladeInches(147)).toBe(40);
    expect(inferBladeInches(10000)).toBe(40);
  });

  it('LED counts at or below 73 map to 20"', () => {
    expect(inferBladeInches(0)).toBe(20);
    expect(inferBladeInches(1)).toBe(20);
    expect(inferBladeInches(73)).toBe(20);
  });

  it('boundary buckets match the canonical presets', () => {
    // Each preset boundary should resolve to the matching preset.
    expect(inferBladeInches(74)).toBe(24);
    expect(inferBladeInches(88)).toBe(24);
    expect(inferBladeInches(89)).toBe(28);
    expect(inferBladeInches(103)).toBe(28);
    expect(inferBladeInches(104)).toBe(32);
    expect(inferBladeInches(117)).toBe(32);
    expect(inferBladeInches(118)).toBe(36);
    expect(inferBladeInches(132)).toBe(36);
  });
});

describe('bladeLengthLabel', () => {
  it('returns the canonical preset label for known inches', () => {
    expect(bladeLengthLabel(36)).toBe('36"');
    expect(bladeLengthLabel(20)).toBe('20"');
  });

  it('falls back to inches-formatted label for unknown values', () => {
    expect(bladeLengthLabel(99)).toBe('99"');
  });
});

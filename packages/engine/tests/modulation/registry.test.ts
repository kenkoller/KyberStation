import { describe, expect, it } from 'vitest';

import {
  BUILT_IN_MODULATORS,
  isBuiltInModulatorId,
  lookupModulator,
} from '../../src/modulation/registry';
import type {
  BuiltInModulatorId,
  ModulatorDescriptor,
} from '../../src/modulation/types';

// ─── Helpers ────────────────────────────────────────────────────────

const EXPECTED_IDS: readonly BuiltInModulatorId[] = [
  'swing',
  'angle',
  'twist',
  'sound',
  'battery',
  'time',
  'clash',
  'lockup',
  'preon',
  'ignition',
  'retraction',
];

describe('BUILT_IN_MODULATORS', () => {
  it('contains exactly 11 entries', () => {
    expect(BUILT_IN_MODULATORS).toHaveLength(11);
  });

  it('covers every BuiltInModulatorId', () => {
    const ids = new Set(BUILT_IN_MODULATORS.map((d) => d.id));
    for (const expected of EXPECTED_IDS) {
      expect(ids.has(expected)).toBe(true);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = BUILT_IN_MODULATORS.map((d) => d.id as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('declares every descriptor as built-in', () => {
    for (const descriptor of BUILT_IN_MODULATORS) {
      expect(descriptor.builtIn).toBe(true);
    }
  });

  it('uses sensible ranges per the design doc §3.1 table', () => {
    const byId = new Map<string, ModulatorDescriptor>(
      BUILT_IN_MODULATORS.map((d) => [d.id as string, d]),
    );

    // 0..1 signals
    for (const id of ['swing', 'sound', 'battery', 'clash', 'lockup', 'preon', 'ignition', 'retraction'] as const) {
      const descriptor = byId.get(id)!;
      expect(descriptor.range[0]).toBe(0);
      expect(descriptor.range[1]).toBe(1);
    }

    // -1..1 bipolar signals
    for (const id of ['angle', 'twist'] as const) {
      const descriptor = byId.get(id)!;
      expect(descriptor.range[0]).toBe(-1);
      expect(descriptor.range[1]).toBe(1);
    }

    // time: non-negative, upper bound at or above 2^32 ms for safety
    const time = byId.get('time')!;
    expect(time.range[0]).toBe(0);
    expect(time.range[1]).toBeGreaterThanOrEqual(0x1_0000_0000);
  });

  it('uses distinct colorVars for every modulator', () => {
    const colorVars = BUILT_IN_MODULATORS.map((d) => d.colorVar);
    const unique = new Set(colorVars);
    expect(unique.size).toBe(colorVars.length);
  });

  it('uses `var(--mod-<id>)` CSS-variable convention for each colorVar', () => {
    for (const descriptor of BUILT_IN_MODULATORS) {
      expect(descriptor.colorVar).toMatch(/^var\(--mod-[a-z]+\)$/);
    }
  });

  it('declares smoothing in [0, 1) where set', () => {
    for (const descriptor of BUILT_IN_MODULATORS) {
      const smoothing = descriptor.smoothing;
      if (smoothing !== undefined) {
        expect(smoothing).toBeGreaterThanOrEqual(0);
        expect(smoothing).toBeLessThan(1);
      }
    }
  });

  it('sets smoothing=0 (or undefined) for discrete-event modulators', () => {
    const byId = new Map<string, ModulatorDescriptor>(
      BUILT_IN_MODULATORS.map((d) => [d.id as string, d]),
    );
    const discreteIds = ['clash', 'lockup', 'preon', 'ignition', 'retraction', 'time', 'battery'] as const;
    for (const id of discreteIds) {
      const smoothing = byId.get(id)!.smoothing ?? 0;
      expect(smoothing).toBe(0);
    }
  });

  it('applies heavier smoothing to perceptual-inertia signals (swing, sound)', () => {
    const byId = new Map<string, ModulatorDescriptor>(
      BUILT_IN_MODULATORS.map((d) => [d.id as string, d]),
    );
    expect((byId.get('swing')!.smoothing ?? 0)).toBeGreaterThan(0);
    expect((byId.get('sound')!.smoothing ?? 0)).toBeGreaterThan(0);
  });
});

describe('lookupModulator()', () => {
  it('returns descriptors for every built-in ID', () => {
    for (const id of EXPECTED_IDS) {
      const descriptor = lookupModulator(id);
      expect(descriptor).toBeDefined();
      expect(descriptor!.id).toBe(id);
    }
  });

  it('returns undefined for unknown IDs', () => {
    expect(lookupModulator('beatGrid' as never)).toBeUndefined();
    expect(lookupModulator('' as never)).toBeUndefined();
    expect(lookupModulator('Swing' as never)).toBeUndefined(); // case-sensitive
  });
});

describe('isBuiltInModulatorId()', () => {
  it('narrows known IDs to `true`', () => {
    for (const id of EXPECTED_IDS) {
      expect(isBuiltInModulatorId(id)).toBe(true);
    }
  });

  it('returns `false` for unknown IDs', () => {
    expect(isBuiltInModulatorId('beatGrid')).toBe(false);
    expect(isBuiltInModulatorId('')).toBe(false);
    expect(isBuiltInModulatorId('SWING')).toBe(false);
  });
});

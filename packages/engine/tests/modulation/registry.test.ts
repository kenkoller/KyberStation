import { describe, expect, it } from 'vitest';

import {
  BUILT_IN_MODULATORS,
  EVENT_MODULATOR_DECAY,
  EVENT_MODULATOR_IDS,
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

// Wave 8 LITE — 8 event-driven aux/gesture modulators added 2026-05-01.
// These IDs are NOT in the locked `BuiltInModulatorId` union per the
// types.ts contract lock; they live as `ModulatorId` strings in the
// registry. See PR body for the proposed types.ts extension.
const EXPECTED_EVENT_IDS: readonly string[] = [
  'aux-click',
  'aux-hold',
  'aux-double-click',
  'gesture-twist',
  'gesture-stab',
  'gesture-swing',
  'gesture-clash',
  'gesture-shake',
];

describe('BUILT_IN_MODULATORS', () => {
  it('contains 19 entries (11 v1.1 Core + 8 Wave 8 LITE event modulators)', () => {
    expect(BUILT_IN_MODULATORS).toHaveLength(19);
  });

  it('covers every BuiltInModulatorId', () => {
    const ids = new Set(BUILT_IN_MODULATORS.map((d) => d.id));
    for (const expected of EXPECTED_IDS) {
      expect(ids.has(expected)).toBe(true);
    }
  });

  it('covers every Wave 8 LITE event-modulator ID', () => {
    const ids = new Set(BUILT_IN_MODULATORS.map((d) => d.id as string));
    for (const expected of EXPECTED_EVENT_IDS) {
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
    // IDs may contain hyphens (Wave 8 LITE: `aux-click`, `gesture-twist`).
    for (const descriptor of BUILT_IN_MODULATORS) {
      expect(descriptor.colorVar).toMatch(/^var\(--mod-[a-z][a-z-]*\)$/);
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
    // Wave 8 LITE: aux/gesture event modulators are also discrete-event
    // — their decay envelope is owned by the sampler's latch+decay
    // logic, so descriptor smoothing must stay at 0 to avoid compounding.
    const discreteIds = [
      'clash',
      'lockup',
      'preon',
      'ignition',
      'retraction',
      'time',
      'battery',
      ...EXPECTED_EVENT_IDS,
    ];
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

// ─── Wave 8 LITE — event-modulator registry surface ─────────────────

describe('EVENT_MODULATOR_IDS', () => {
  it('lists all 8 Wave 8 LITE event modulator IDs', () => {
    expect(EVENT_MODULATOR_IDS).toHaveLength(8);
    for (const id of EXPECTED_EVENT_IDS) {
      expect(EVENT_MODULATOR_IDS).toContain(id);
    }
  });

  it('contains no duplicate entries', () => {
    expect(new Set(EVENT_MODULATOR_IDS).size).toBe(EVENT_MODULATOR_IDS.length);
  });

  it('every ID is also present in BUILT_IN_MODULATORS', () => {
    const registryIds = new Set(BUILT_IN_MODULATORS.map((d) => d.id as string));
    for (const id of EVENT_MODULATOR_IDS) {
      expect(registryIds.has(id)).toBe(true);
    }
  });
});

describe('EVENT_MODULATOR_DECAY', () => {
  it('declares a decay coefficient for every event modulator', () => {
    for (const id of EVENT_MODULATOR_IDS) {
      expect(EVENT_MODULATOR_DECAY[id]).toBeDefined();
    }
  });

  it('all coefficients live in [0, 1) per the latch+decay contract', () => {
    for (const id of EVENT_MODULATOR_IDS) {
      const decay = EVENT_MODULATOR_DECAY[id]!;
      expect(decay).toBeGreaterThanOrEqual(0);
      expect(decay).toBeLessThan(1);
    }
  });

  it('held-event modulators (aux-hold, gesture-shake) decay slowest', () => {
    // The two "held" modulators should have the highest decay
    // coefficients so their values stay near 1.0 across held frames
    // and only settle a beat after release.
    const held = ['aux-hold', 'gesture-shake'];
    const punchy = ['aux-click', 'aux-double-click', 'gesture-stab'];
    for (const heldId of held) {
      for (const punchyId of punchy) {
        expect(EVENT_MODULATOR_DECAY[heldId]!).toBeGreaterThan(
          EVENT_MODULATOR_DECAY[punchyId]!,
        );
      }
    }
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

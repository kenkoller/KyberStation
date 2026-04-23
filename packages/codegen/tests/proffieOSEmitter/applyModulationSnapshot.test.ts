// ─── applyModulationSnapshot — v1.0 Preview tests ────────────────────
//
// Covers the snapshot-at-export helper used by `generateStyleCode` when
// a BladeConfig carries a `modulation.bindings` payload. Validates:
//   - pass-through when no payload present
//   - snapshot value correctness (add / replace / multiply / min / max)
//   - multi-binding chaining (second binding sees first's result)
//   - bypassed bindings skipped with proper reason
//   - invalid / non-numeric target paths skipped
//   - shallow-clone-on-write (input config not mutated)
//   - comment block formatting

import { describe, it, expect } from 'vitest';
import {
  applyModulationSnapshot,
  formatSnapshotCommentBlock,
  type ModulationPayloadLike,
} from '../../src/proffieOSEmitter/applyModulationSnapshot.js';
import type {
  ModulationBinding,
  BladeConfig,
} from '../../src/proffieOSEmitter/mapBindings.js';

const BASELINE_CONFIG: BladeConfig = {
  name: 'Test Saber',
  baseColor: { r: 0, g: 140, b: 255 },
  shimmer: 0.1,
  ledCount: 144,
};

function binding(overrides: Partial<ModulationBinding>): ModulationBinding {
  return {
    id: 'b-' + Math.random().toString(36).slice(2, 10),
    source: 'swing',
    expression: null,
    target: 'shimmer',
    combinator: 'add',
    amount: 0.6,
    bypassed: false,
    ...overrides,
  };
}

// ─── Pass-through ─────────────────────────────────────────────────────

describe('applyModulationSnapshot — pass-through', () => {
  it('returns the original config + empty report when payload is undefined', () => {
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, undefined);
    expect(config).toBe(BASELINE_CONFIG);
    expect(report.totalBindings).toBe(0);
    expect(report.appliedBindings).toHaveLength(0);
    expect(report.skippedBindings).toHaveLength(0);
  });

  it('returns original + empty report when payload has no bindings', () => {
    const payload: ModulationPayloadLike = { version: 1, bindings: [] };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(config).toBe(BASELINE_CONFIG);
    expect(report.totalBindings).toBe(0);
  });
});

// ─── Snapshot values per combinator ──────────────────────────────────

describe('applyModulationSnapshot — combinator snapshot math', () => {
  it('add combinator with swing=0 leaves shimmer at baseline (0.1)', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ source: 'swing', target: 'shimmer', combinator: 'add', amount: 0.6 })],
    };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.appliedBindings).toHaveLength(1);
    expect(report.appliedBindings[0]!.snapshotValue).toBeCloseTo(0.1);
    expect((config as unknown as { shimmer: number }).shimmer).toBeCloseTo(0.1);
  });

  it('replace combinator at swing=0 drives target to 0', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ combinator: 'replace', amount: 1.0 })],
    };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.appliedBindings[0]!.snapshotValue).toBe(0);
    expect((config as unknown as { shimmer: number }).shimmer).toBe(0);
  });

  it('multiply at swing=0 × amount=0.6 zeros out baseline', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ combinator: 'multiply', amount: 0.6 })],
    };
    const { config } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect((config as unknown as { shimmer: number }).shimmer).toBe(0);
  });

  it('min combinator picks the smaller of baseline and driver', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ combinator: 'min', amount: 1.0 })],
    };
    const { config } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    // baseline=0.1, driver=swing(0)*1.0=0 → min=0
    expect((config as unknown as { shimmer: number }).shimmer).toBe(0);
  });

  it('max combinator picks the larger of baseline and driver', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ combinator: 'max', amount: 1.0 })],
    };
    const { config } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    // baseline=0.1, driver=0 → max=0.1
    expect((config as unknown as { shimmer: number }).shimmer).toBe(0.1);
  });

  it('writes snapshot to baseColor.r (nested path)', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ target: 'baseColor.r', combinator: 'replace', amount: 1.0 })],
    };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.appliedBindings).toHaveLength(1);
    expect(
      (config as unknown as { baseColor: { r: number } }).baseColor.r,
    ).toBe(0);
  });
});

// ─── Multi-binding chaining ──────────────────────────────────────────

describe('applyModulationSnapshot — multi-binding chains', () => {
  it('applies bindings in authoring order; later bindings see earlier writes', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [
        binding({ id: 'a', target: 'shimmer', combinator: 'replace', amount: 1.0 }),
        // Second binding adds swing*1 to shimmer (now 0 after first replace).
        binding({ id: 'b', target: 'shimmer', combinator: 'add', amount: 1.0 }),
      ],
    };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.appliedBindings).toHaveLength(2);
    // Both bindings applied; second sees 0 and adds swing(0)*1 = 0
    expect((config as unknown as { shimmer: number }).shimmer).toBe(0);
  });
});

// ─── Skipped bindings ─────────────────────────────────────────────────

describe('applyModulationSnapshot — skipped bindings', () => {
  it('skips bypassed bindings with reason "bypassed"', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ bypassed: true, combinator: 'replace', amount: 1.0 })],
    };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.appliedBindings).toHaveLength(0);
    expect(report.skippedBindings).toHaveLength(1);
    expect(report.skippedBindings[0]!.reason).toBe('bypassed');
    // Config unchanged
    expect((config as unknown as { shimmer: number }).shimmer).toBe(0.1);
  });

  it('skips bindings targeting non-existent paths', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ target: 'doesNotExist.nested.path' })],
    };
    const { report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.appliedBindings).toHaveLength(0);
    expect(report.skippedBindings).toHaveLength(1);
    expect(report.skippedBindings[0]!.reason).toMatch(/target path invalid/);
  });

  it('refuses to clobber non-numeric leaves', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      // `name` is a string — refuses to write a number here.
      bindings: [binding({ target: 'name', combinator: 'replace', amount: 1.0 })],
    };
    const { config, report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    expect(report.skippedBindings).toHaveLength(1);
    expect((config as unknown as { name: string }).name).toBe('Test Saber');
  });
});

// ─── Zero-mutation invariant ──────────────────────────────────────────

describe('applyModulationSnapshot — purity', () => {
  it('does not mutate the input config or its nested objects', () => {
    const original = { ...BASELINE_CONFIG, baseColor: { ...BASELINE_CONFIG.baseColor as object } };
    const snapshot = JSON.parse(JSON.stringify(original));
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [
        binding({ target: 'shimmer', combinator: 'replace', amount: 1.0 }),
        binding({ target: 'baseColor.r', combinator: 'replace', amount: 1.0 }),
      ],
    };
    applyModulationSnapshot(original as BladeConfig, payload);
    expect(original).toEqual(snapshot);
  });
});

// ─── Comment block formatter ─────────────────────────────────────────

describe('formatSnapshotCommentBlock', () => {
  it('returns empty string for zero-binding reports', () => {
    expect(formatSnapshotCommentBlock({
      totalBindings: 0,
      appliedBindings: [],
      skippedBindings: [],
    })).toBe('');
  });

  it('includes BETA label + binding count + snapshot rows', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [binding({ source: 'swing', target: 'shimmer', amount: 0.6 })],
    };
    const { report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    const block = formatSnapshotCommentBlock(report);
    expect(block).toContain('Modulation Routing — v1.0 Preview BETA');
    expect(block).toContain('1 live-modulation binding');
    expect(block).toContain('swing');
    expect(block).toContain('shimmer');
    expect(block).toContain('add');
    expect(block).toContain('60%');
    expect(block).toContain('v1.1 Core');
  });

  it('lists skipped bindings in a separate section', () => {
    const payload: ModulationPayloadLike = {
      version: 1,
      bindings: [
        binding({ bypassed: true }),
        binding({ target: 'doesNotExist' }),
      ],
    };
    const { report } = applyModulationSnapshot(BASELINE_CONFIG, payload);
    const block = formatSnapshotCommentBlock(report);
    expect(block).toContain('Skipped bindings');
    expect(block).toMatch(/bypassed/);
    expect(block).toMatch(/target path/);
  });
});

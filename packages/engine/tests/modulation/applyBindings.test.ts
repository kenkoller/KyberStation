import { describe, expect, it } from 'vitest';

import {
  applyBindings,
  _internal,
  type ParameterClampRange,
  type ParameterClampRanges,
} from '../../src/modulation/applyBindings';
import type {
  EvalContext,
  ExpressionNode,
  ModulationBinding,
  ModulatorId,
} from '../../src/modulation/types';
import type { BladeConfig, StyleContext } from '../../src/types';

// ─── Test fixtures ──────────────────────────────────────────────────

function makeConfig(): BladeConfig {
  return {
    baseColor: { r: 10, g: 20, b: 30 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
  };
}

function makeStyleContext(config: BladeConfig): StyleContext {
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1,
    config,
  };
}

function makeEvalContext(
  modulatorValues: Record<string, number>,
  config: BladeConfig,
): EvalContext {
  const modulators = new Map<ModulatorId, number>();
  for (const [id, value] of Object.entries(modulatorValues)) {
    modulators.set(id as ModulatorId, value);
  }
  return {
    modulators,
    styleContext: makeStyleContext(config),
    frame: 0,
  };
}

const SHIMMER_CLAMP: ParameterClampRange = { min: 0, max: 1, default: 0.1 };
const COLOR_CHANNEL_CLAMP: ParameterClampRange = { min: 0, max: 255, default: 0 };

function clampRanges(
  entries: Array<[string, ParameterClampRange]>,
): ParameterClampRanges {
  return new Map(entries);
}

function binding(overrides: Partial<ModulationBinding> & Pick<ModulationBinding, 'target'>): ModulationBinding {
  return {
    id: 'b-test',
    source: null,
    expression: null,
    target: overrides.target,
    combinator: 'replace',
    amount: 1,
    ...overrides,
  };
}

// ─── Early-exit & empty-list ────────────────────────────────────────

describe('applyBindings — empty list', () => {
  it('returns the original config reference when bindings is empty', () => {
    const config = makeConfig();
    const ctx = makeEvalContext({}, config);
    const next = applyBindings(config, [], ctx, new Map());
    expect(next).toBe(config);
  });
});

// ─── Combinator coverage ────────────────────────────────────────────

describe('applyBindings — combinators (§6.2)', () => {
  it('replace — driver overwrites static', () => {
    const config = { ...makeConfig(), shimmer: 0.5 };
    const ctx = makeEvalContext({ swing: 0.8 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.8, 6);
  });

  it('add — driver adds to static', () => {
    const config = { ...makeConfig(), shimmer: 0.2 };
    const ctx = makeEvalContext({ swing: 0.5 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'add', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.7, 6);
  });

  it('multiply — driver scales static', () => {
    const config = { ...makeConfig(), shimmer: 0.4 };
    const ctx = makeEvalContext({ swing: 0.5 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'multiply', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.2, 6);
  });

  it('min — picks the smaller of static and driver', () => {
    const config = { ...makeConfig(), shimmer: 0.9 };
    const ctx = makeEvalContext({ swing: 0.3 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'min', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.3, 6);
  });

  it('max — picks the larger of static and driver', () => {
    const config = { ...makeConfig(), shimmer: 0.2 };
    const ctx = makeEvalContext({ swing: 0.8 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'max', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.8, 6);
  });

  it('_internal.combine covers all 5 combinators', () => {
    const fn = _internal.combine;
    expect(fn(5, 10, 'replace')).toBe(10);
    expect(fn(5, 10, 'add')).toBe(15);
    expect(fn(5, 10, 'multiply')).toBe(50);
    expect(fn(5, 10, 'min')).toBe(5);
    expect(fn(5, 10, 'max')).toBe(10);
  });
});

// ─── Amount scaling ─────────────────────────────────────────────────

describe('applyBindings — amount (wet/dry)', () => {
  it('scales the driver by amount before combining', () => {
    const config = { ...makeConfig(), shimmer: 0 };
    const ctx = makeEvalContext({ swing: 1 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'add', amount: 0.5 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.5, 6);
  });

  it('amount=0 produces no-op for additive combinators', () => {
    const config = { ...makeConfig(), shimmer: 0.3 };
    const ctx = makeEvalContext({ swing: 1 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'add', amount: 0 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.3, 6);
  });
});

// ─── Sanitization (§6.3) ────────────────────────────────────────────

describe('applyBindings — NaN/Infinity sanitization (§6.3)', () => {
  it('NaN result → parameter default', () => {
    const config = makeConfig();
    // Divide shimmer by something that produces NaN via missing source
    // — simplest route is to set static=0 and multiply by a missing
    // modulator, which reads 0 → result 0. Use the helper directly.
    const clamp: ParameterClampRange = { min: 0, max: 1, default: 0.42 };
    expect(_internal.sanitize(Number.NaN, clamp)).toBe(0.42);
    expect(_internal.sanitize(0, clamp)).toBe(0);
    expect(_internal.sanitize(0.5, clamp)).toBe(0.5);
    // Drive NaN through the pipeline too:
    const badBinding: ModulationBinding = {
      id: 'bad',
      source: null,
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
    };
    // With both source=null + expression=null, driver resolves to 0.
    // NaN behavior is exercised via the helper above and via the
    // +Infinity test below.
    const ctx = makeEvalContext({}, config);
    const result = applyBindings(
      config,
      [badBinding],
      ctx,
      clampRanges([['shimmer', clamp]]),
    );
    expect(result.shimmer).toBe(0); // clamped into [0,1] after driver=0
  });

  it('+Infinity → parameter max', () => {
    const clamp: ParameterClampRange = { min: 0, max: 1, default: 0.1 };
    expect(_internal.sanitize(Number.POSITIVE_INFINITY, clamp)).toBe(1);
  });

  it('-Infinity → parameter min', () => {
    const clamp: ParameterClampRange = { min: 0, max: 1, default: 0.1 };
    expect(_internal.sanitize(Number.NEGATIVE_INFINITY, clamp)).toBe(0);
  });

  it('clamps out-of-range positives to max', () => {
    const config = { ...makeConfig(), shimmer: 0.5 };
    const ctx = makeEvalContext({ swing: 5 }, config); // raw > 1
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBe(1);
  });

  it('clamps negative values on unsigned params to min', () => {
    const config = { ...makeConfig(), shimmer: 0.5 };
    const ctx = makeEvalContext({ swing: -5 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBe(0);
  });

  it('falls back to permissive mode when no clamp range is given', () => {
    const config = { ...makeConfig(), shimmer: 0.5 };
    const ctx = makeEvalContext({ swing: 42 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'swing', combinator: 'replace', amount: 1 })],
      ctx,
      new Map(), // no clamp ranges
    );
    // No clamp range → passthrough 42.
    expect(result.shimmer).toBe(42);
  });
});

// ─── Missing modulator ID ───────────────────────────────────────────

describe('applyBindings — missing modulator ID', () => {
  it('driver resolves to 0 when source ID is not in modulators map', () => {
    const config = { ...makeConfig(), shimmer: 0.3 };
    const ctx = makeEvalContext({}, config); // empty map
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: 'beatGrid' as ModulatorId, combinator: 'add', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // Driver=0 so the add is a no-op.
    expect(result.shimmer).toBeCloseTo(0.3, 6);
  });
});

// ─── Multi-binding composition (§6.2) ───────────────────────────────

describe('applyBindings — multi-binding composition (§6.2)', () => {
  it('applies bindings in authoring order, chaining the accumulator', () => {
    // Worked example from the design doc §6.2:
    //   shimmer = 0.1
    //   swing → shimmer, add,       amount=1,   driver=0.3 → 0.4
    //   sound → shimmer, multiply,  amount=0.5, driver=0.2 → 0.4 * 0.1 = 0.04
    // Actually recomputed: 0.5 * 0.2 = 0.1 (the scaled driver).
    // 0.4 * 0.1 = 0.04
    const config = { ...makeConfig(), shimmer: 0.1 };
    const ctx = makeEvalContext({ swing: 0.3, sound: 0.2 }, config);
    const bindings: ModulationBinding[] = [
      binding({ id: 'b1', target: 'shimmer', source: 'swing', combinator: 'add', amount: 1 }),
      binding({ id: 'b2', target: 'shimmer', source: 'sound', combinator: 'multiply', amount: 0.5 }),
    ];
    const result = applyBindings(
      config,
      bindings,
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // 0.1 + 0.3 = 0.4; then 0.4 * (0.2 * 0.5) = 0.4 * 0.1 = 0.04.
    expect(result.shimmer).toBeCloseTo(0.04, 6);
  });

  it('skips bindings flagged as bypassed', () => {
    const config = { ...makeConfig(), shimmer: 0.1 };
    const ctx = makeEvalContext({ swing: 0.9 }, config);
    const bindings: ModulationBinding[] = [
      binding({
        id: 'muted',
        target: 'shimmer',
        source: 'swing',
        combinator: 'replace',
        amount: 1,
        bypassed: true,
      }),
    ];
    const result = applyBindings(
      config,
      bindings,
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.1, 6);
  });

  it('replace in the middle of a chain resets the accumulator', () => {
    const config = { ...makeConfig(), shimmer: 0.1 };
    const ctx = makeEvalContext({ swing: 0.2, sound: 0.7, battery: 0.9 }, config);
    const bindings: ModulationBinding[] = [
      binding({ id: 'b1', target: 'shimmer', source: 'swing', combinator: 'add', amount: 1 }),
      binding({ id: 'b2', target: 'shimmer', source: 'sound', combinator: 'replace', amount: 1 }),
      binding({ id: 'b3', target: 'shimmer', source: 'battery', combinator: 'multiply', amount: 1 }),
    ];
    const result = applyBindings(
      config,
      bindings,
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // 0.1 + 0.2 = 0.3; replace → 0.7; multiply 0.9 → 0.63
    expect(result.shimmer).toBeCloseTo(0.63, 6);
  });
});

// ─── Nested path writes ─────────────────────────────────────────────

describe('applyBindings — nested paths', () => {
  it('writes into `baseColor.r` without mutating original', () => {
    const config = makeConfig();
    const ctx = makeEvalContext({ clash: 1 }, config);
    const result = applyBindings(
      config,
      [binding({ target: 'baseColor.r', source: 'clash', combinator: 'replace', amount: 200 })],
      ctx,
      clampRanges([['baseColor.r', COLOR_CHANNEL_CLAMP]]),
    );
    expect(result.baseColor.r).toBe(200);
    // Original unchanged
    expect(config.baseColor.r).toBe(10);
    // Other channels on the clone preserved
    expect(result.baseColor.g).toBe(20);
    expect(result.baseColor.b).toBe(30);
  });

  it('drops the write silently when an intermediate path segment is missing', () => {
    const config = makeConfig();
    const ctx = makeEvalContext({ swing: 0.5 }, config);
    // `motionSwingColorShift.r` is a legal path *shape* but the config
    // here doesn't define `motionSwingColorShift`. Writing should
    // silently drop rather than throw.
    const result = applyBindings(
      config,
      [binding({ target: 'motionSwingColorShift.r', source: 'swing', combinator: 'replace', amount: 1 })],
      ctx,
      new Map(),
    );
    // Config shape preserved; no new segment materialised.
    expect((result as { motionSwingColorShift?: unknown }).motionSwingColorShift).toBeUndefined();
  });
});

// ─── Expression resolution (v1.1) ───────────────────────────────────
//
// The v1.0 stub resolved non-`var` expressions to 0 because the
// evaluator hadn't landed yet. In v1.1 the evaluator is wired in, so
// literal, binary, unary, and call expressions all compute their real
// values. Deep coverage of evaluator semantics lives in
// `evaluator.test.ts`; these tests only confirm the wiring.

describe('applyBindings — expression resolution (v1.1)', () => {
  it('when binding.expression is a `var` node, reads that modulator', () => {
    const config = { ...makeConfig(), shimmer: 0 };
    const ctx = makeEvalContext({ sound: 0.6 }, config);
    const varExpr: ExpressionNode = { kind: 'var', id: 'sound' };
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: null, expression: varExpr, combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.6, 6);
  });

  it('when binding.expression is a literal, drives that constant', () => {
    const config = { ...makeConfig(), shimmer: 0.5 };
    const ctx = makeEvalContext({ swing: 1 }, config);
    const literalExpr: ExpressionNode = { kind: 'literal', value: 0.7 };
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: null, expression: literalExpr, combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // Literal expression evaluates to its value; shimmer clamped to [0,1].
    expect(result.shimmer).toBeCloseTo(0.7, 6);
  });

  it('when binding.expression is a binary op, evaluates it', () => {
    const config = { ...makeConfig(), shimmer: 0 };
    const ctx = makeEvalContext({ swing: 0.3 }, config);
    // swing * 2 = 0.6
    const expr: ExpressionNode = {
      kind: 'binary',
      op: '*',
      lhs: { kind: 'var', id: 'swing' },
      rhs: { kind: 'literal', value: 2 },
    };
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: null, expression: expr, combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.6, 6);
  });

  it('when binding.expression is a call, evaluates through the built-in', () => {
    const config = { ...makeConfig(), shimmer: 0 };
    const ctx = makeEvalContext({ swing: 0.9 }, config);
    // clamp(swing * 2, 0, 1) with swing=0.9 → clamp(1.8, 0, 1) = 1
    const expr: ExpressionNode = {
      kind: 'call',
      fn: 'clamp',
      args: [
        {
          kind: 'binary',
          op: '*',
          lhs: { kind: 'var', id: 'swing' },
          rhs: { kind: 'literal', value: 2 },
        },
        { kind: 'literal', value: 0 },
        { kind: 'literal', value: 1 },
      ],
    };
    const result = applyBindings(
      config,
      [binding({ target: 'shimmer', source: null, expression: expr, combinator: 'replace', amount: 1 })],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(1, 6);
  });
});

// ─── Read/write path internals ──────────────────────────────────────

describe('applyBindings — readPath/writePath internals', () => {
  it('readPath returns NaN for missing leaves', () => {
    const config = makeConfig();
    expect(Number.isNaN(_internal.readPath(config, 'nonexistent'))).toBe(true);
    expect(Number.isNaN(_internal.readPath(config, 'nonexistent.r'))).toBe(true);
  });

  it('readPath returns numeric leaves intact', () => {
    const config = makeConfig();
    expect(_internal.readPath(config, 'shimmer')).toBe(0.1);
    expect(_internal.readPath(config, 'baseColor.r')).toBe(10);
  });

  it('writePath clones the chain of ancestors, leaving the original untouched', () => {
    const config = makeConfig();
    const next = _internal.writePath(config, 'baseColor.r', 99);
    expect(next).not.toBe(config);
    expect(next.baseColor).not.toBe(config.baseColor);
    expect(next.baseColor.r).toBe(99);
    expect(config.baseColor.r).toBe(10);
  });
});

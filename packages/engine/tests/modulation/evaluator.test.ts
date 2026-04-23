// ─── Evaluator tests ────────────────────────────────────────────────
//
// Covers `evaluate(node, ctx)` against the semantics in design doc
// §4.4: every expression evaluates to a number, missing modulator IDs
// evaluate to 0, NaN / Infinity propagate per JS semantics, evaluation
// is deterministic.

import { describe, expect, it } from 'vitest';

import { evaluate, _internal } from '../../src/modulation/evaluator';
import { parseExpression } from '../../src/modulation/parser';
import type {
  EvalContext,
  ExpressionNode,
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

function makeCtx(modulators: Record<string, number>): EvalContext {
  const config = makeConfig();
  const map = new Map<ModulatorId, number>();
  for (const [id, v] of Object.entries(modulators)) {
    map.set(id as ModulatorId, v);
  }
  return {
    modulators: map,
    styleContext: makeStyleContext(config),
    frame: 0,
  };
}

const EMPTY_CTX: EvalContext = makeCtx({});

// ─── Literal + var + unary ──────────────────────────────────────────

describe('evaluate — atoms', () => {
  it('evaluates a numeric literal to its value', () => {
    const node: ExpressionNode = { kind: 'literal', value: 3.14 };
    expect(evaluate(node, EMPTY_CTX)).toBe(3.14);
  });

  it('evaluates a var against the context modulator map', () => {
    const ctx = makeCtx({ swing: 0.5 });
    const node: ExpressionNode = { kind: 'var', id: 'swing' };
    expect(evaluate(node, ctx)).toBe(0.5);
  });

  it('returns 0 for a missing modulator ID (design doc §4.4)', () => {
    const node: ExpressionNode = { kind: 'var', id: 'beatGrid' };
    expect(evaluate(node, EMPTY_CTX)).toBe(0);
  });

  it('evaluates unary minus', () => {
    const node: ExpressionNode = {
      kind: 'unary',
      op: '-',
      operand: { kind: 'literal', value: 3 },
    };
    expect(evaluate(node, EMPTY_CTX)).toBe(-3);
  });

  it('evaluates double unary minus', () => {
    // -(-5) = 5
    const node: ExpressionNode = {
      kind: 'unary',
      op: '-',
      operand: {
        kind: 'unary',
        op: '-',
        operand: { kind: 'literal', value: 5 },
      },
    };
    expect(evaluate(node, EMPTY_CTX)).toBe(5);
  });
});

// ─── Binary arithmetic ─────────────────────────────────────────────

describe('evaluate — binary arithmetic', () => {
  it('performs addition', () => {
    expect(evaluate(parseExpression('2 + 3'), EMPTY_CTX)).toBe(5);
  });

  it('performs subtraction', () => {
    expect(evaluate(parseExpression('10 - 4'), EMPTY_CTX)).toBe(6);
  });

  it('performs multiplication', () => {
    expect(evaluate(parseExpression('3 * 4'), EMPTY_CTX)).toBe(12);
  });

  it('performs division', () => {
    expect(evaluate(parseExpression('8 / 2'), EMPTY_CTX)).toBe(4);
  });

  it('division by zero → Infinity (JS semantics)', () => {
    expect(evaluate(parseExpression('1 / 0'), EMPTY_CTX)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('negative division by zero → -Infinity', () => {
    expect(evaluate(parseExpression('-1 / 0'), EMPTY_CTX)).toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('0/0 → NaN', () => {
    expect(Number.isNaN(evaluate(parseExpression('0 / 0'), EMPTY_CTX))).toBe(
      true,
    );
  });

  it('respects * before + precedence', () => {
    // 2 + 3 * 4 = 14 (not 20)
    expect(evaluate(parseExpression('2 + 3 * 4'), EMPTY_CTX)).toBe(14);
  });

  it('respects parens overriding precedence', () => {
    // (2 + 3) * 4 = 20
    expect(evaluate(parseExpression('(2 + 3) * 4'), EMPTY_CTX)).toBe(20);
  });

  it('left-associative subtraction', () => {
    // (10 - 5) - 2 = 3, NOT 10 - (5 - 2) = 7
    expect(evaluate(parseExpression('10 - 5 - 2'), EMPTY_CTX)).toBe(3);
  });

  it('left-associative division', () => {
    // (100 / 10) / 2 = 5
    expect(evaluate(parseExpression('100 / 10 / 2'), EMPTY_CTX)).toBe(5);
  });
});

// ─── Negative zero ──────────────────────────────────────────────────

describe('evaluate — negative zero', () => {
  it('produces -0 from unary minus of 0', () => {
    // Object.is distinguishes -0 from 0
    const result = evaluate(parseExpression('-0'), EMPTY_CTX);
    expect(Object.is(result, -0)).toBe(true);
  });

  it('treats -0 as equal to 0 for arithmetic', () => {
    // -0 + 0 === 0 (not -0) — standard IEEE 754
    expect(evaluate(parseExpression('-0 + 0'), EMPTY_CTX)).toBe(0);
  });
});

// ─── All 10 built-in functions ──────────────────────────────────────

describe('evaluate — built-in functions', () => {
  it('min(a, b) picks the smaller', () => {
    expect(evaluate(parseExpression('min(1, 2)'), EMPTY_CTX)).toBe(1);
    expect(evaluate(parseExpression('min(5, -3)'), EMPTY_CTX)).toBe(-3);
  });

  it('max(a, b) picks the larger', () => {
    expect(evaluate(parseExpression('max(1, 2)'), EMPTY_CTX)).toBe(2);
    expect(evaluate(parseExpression('max(5, -3)'), EMPTY_CTX)).toBe(5);
  });

  it('clamp(x, lo, hi) clamps into [lo, hi]', () => {
    expect(evaluate(parseExpression('clamp(0.5, 0, 1)'), EMPTY_CTX)).toBe(0.5);
    expect(evaluate(parseExpression('clamp(-5, 0, 1)'), EMPTY_CTX)).toBe(0);
    expect(evaluate(parseExpression('clamp(5, 0, 1)'), EMPTY_CTX)).toBe(1);
    expect(evaluate(parseExpression('clamp(0, 0, 1)'), EMPTY_CTX)).toBe(0);
    expect(evaluate(parseExpression('clamp(1, 0, 1)'), EMPTY_CTX)).toBe(1);
  });

  it('lerp(a, b, t) blends with NO clamping on t', () => {
    expect(evaluate(parseExpression('lerp(0, 10, 0.5)'), EMPTY_CTX)).toBe(5);
    expect(evaluate(parseExpression('lerp(0, 10, 0)'), EMPTY_CTX)).toBe(0);
    expect(evaluate(parseExpression('lerp(0, 10, 1)'), EMPTY_CTX)).toBe(10);
    // t outside [0, 1] extrapolates (explicit design choice per §4.1)
    expect(evaluate(parseExpression('lerp(0, 10, 2)'), EMPTY_CTX)).toBe(20);
    expect(evaluate(parseExpression('lerp(0, 10, -1)'), EMPTY_CTX)).toBe(-10);
  });

  it('sin(x) returns Math.sin(x) radians', () => {
    expect(evaluate(parseExpression('sin(0)'), EMPTY_CTX)).toBe(0);
    expect(
      Math.abs(evaluate(parseExpression('sin(3.141592653589793)'), EMPTY_CTX)),
    ).toBeLessThan(1e-10);
  });

  it('cos(x) returns Math.cos(x) radians', () => {
    expect(evaluate(parseExpression('cos(0)'), EMPTY_CTX)).toBe(1);
    expect(
      Math.abs(evaluate(parseExpression('cos(3.141592653589793)'), EMPTY_CTX) + 1),
    ).toBeLessThan(1e-10);
  });

  it('abs(x) returns Math.abs(x)', () => {
    expect(evaluate(parseExpression('abs(-5)'), EMPTY_CTX)).toBe(5);
    expect(evaluate(parseExpression('abs(5)'), EMPTY_CTX)).toBe(5);
    expect(evaluate(parseExpression('abs(0)'), EMPTY_CTX)).toBe(0);
  });

  it('floor(x) rounds toward -∞', () => {
    expect(evaluate(parseExpression('floor(1.7)'), EMPTY_CTX)).toBe(1);
    expect(evaluate(parseExpression('floor(-1.2)'), EMPTY_CTX)).toBe(-2);
    expect(evaluate(parseExpression('floor(3)'), EMPTY_CTX)).toBe(3);
  });

  it('ceil(x) rounds toward +∞', () => {
    expect(evaluate(parseExpression('ceil(1.2)'), EMPTY_CTX)).toBe(2);
    expect(evaluate(parseExpression('ceil(-1.7)'), EMPTY_CTX)).toBe(-1);
    expect(evaluate(parseExpression('ceil(3)'), EMPTY_CTX)).toBe(3);
  });

  it('round(x) rounds to nearest, ties toward +∞', () => {
    // Math.round rounds half toward +Infinity (i.e. 0.5 → 1, -0.5 → -0).
    expect(evaluate(parseExpression('round(1.5)'), EMPTY_CTX)).toBe(2);
    expect(evaluate(parseExpression('round(1.4)'), EMPTY_CTX)).toBe(1);
    // Math.round(-0.5) returns -0 per spec; Object.is distinguishes
    // -0 from 0 so we assert via equality rather than toBe.
    expect(evaluate(parseExpression('round(-0.5)'), EMPTY_CTX)).toEqual(-0);
    expect(evaluate(parseExpression('round(-1.5)'), EMPTY_CTX)).toBe(-1);
  });
});

// ─── Nested functions ──────────────────────────────────────────────

describe('evaluate — nested + composed', () => {
  it('evaluates nested function calls', () => {
    // sin(cos(0)) = sin(1) ≈ 0.8414709848
    const v = evaluate(parseExpression('sin(cos(0))'), EMPTY_CTX);
    expect(v).toBeCloseTo(Math.sin(1), 10);
  });

  it('evaluates design-doc §4.1 example: clamp(swing * 2, 0, 1)', () => {
    const ast = parseExpression('clamp(swing * 2, 0, 1)');
    expect(evaluate(ast, makeCtx({ swing: 0.3 }))).toBe(0.6);
    expect(evaluate(ast, makeCtx({ swing: 0.7 }))).toBe(1);
    expect(evaluate(ast, makeCtx({ swing: -0.5 }))).toBe(0);
    expect(evaluate(ast, makeCtx({ swing: 0 }))).toBe(0);
  });

  it('evaluates design-doc §4.1 example: lerp(a, b, t)', () => {
    const ast = parseExpression('lerp(a, b, t)');
    // All three missing → lerp(0, 0, 0) = 0
    expect(evaluate(ast, makeCtx({}))).toBe(0);
    // a=10, b=20, t=0.25 → 12.5
    expect(evaluate(ast, makeCtx({ a: 10, b: 20, t: 0.25 }))).toBe(12.5);
  });

  it('evaluates design-doc §4.1 example: sin(time * 0.001) * 0.5 + 0.5', () => {
    const ast = parseExpression('sin(time * 0.001) * 0.5 + 0.5');
    // t=0 → sin(0)*0.5 + 0.5 = 0.5
    expect(evaluate(ast, makeCtx({ time: 0 }))).toBe(0.5);
    // t=π/0.001 → sin(π)*0.5 + 0.5 ≈ 0.5
    const v = evaluate(ast, makeCtx({ time: Math.PI * 1000 }));
    expect(v).toBeCloseTo(0.5, 10);
    // t=(π/2)/0.001 → sin(π/2)*0.5 + 0.5 = 1
    const v2 = evaluate(ast, makeCtx({ time: (Math.PI / 2) * 1000 }));
    expect(v2).toBeCloseTo(1, 10);
  });

  it('evaluates design-doc §4.1 example: max(sound, swing)', () => {
    const ast = parseExpression('max(sound, swing)');
    expect(evaluate(ast, makeCtx({ sound: 0.3, swing: 0.7 }))).toBe(0.7);
    expect(evaluate(ast, makeCtx({ sound: 0.8, swing: 0.2 }))).toBe(0.8);
    expect(evaluate(ast, makeCtx({}))).toBe(0);
  });

  it('evaluates design-doc §4.1 example: clamp(1 - battery, 0, 0.5)', () => {
    const ast = parseExpression('clamp(1 - battery, 0, 0.5)');
    // full battery (1): 1-1 = 0 → clamp(0, 0, 0.5) = 0
    expect(evaluate(ast, makeCtx({ battery: 1 }))).toBe(0);
    // mid battery (0.7): 1-0.7 = 0.3 → ~0.3 (float noise OK)
    expect(evaluate(ast, makeCtx({ battery: 0.7 }))).toBeCloseTo(0.3, 10);
    // empty battery (0): 1-0 = 1 → clamped to 0.5
    expect(evaluate(ast, makeCtx({ battery: 0 }))).toBe(0.5);
  });

  it('evaluates nested min/max', () => {
    const ast = parseExpression('min(max(0, swing), 1)');
    expect(evaluate(ast, makeCtx({ swing: 0.5 }))).toBe(0.5);
    expect(evaluate(ast, makeCtx({ swing: -0.5 }))).toBe(0);
    expect(evaluate(ast, makeCtx({ swing: 1.5 }))).toBe(1);
  });
});

// ─── NaN / Infinity propagation ─────────────────────────────────────

describe('evaluate — NaN / Infinity propagation', () => {
  it('NaN propagates through arithmetic', () => {
    // NaN reaches evaluator via 0/0 then composes with other ops.
    const v = evaluate(parseExpression('0 / 0 + 1'), EMPTY_CTX);
    expect(Number.isNaN(v)).toBe(true);
  });

  it('Infinity propagates through addition', () => {
    const v = evaluate(parseExpression('1 / 0 + 1'), EMPTY_CTX);
    expect(v).toBe(Number.POSITIVE_INFINITY);
  });

  it('Infinity - Infinity = NaN', () => {
    const v = evaluate(parseExpression('1 / 0 - 1 / 0'), EMPTY_CTX);
    expect(Number.isNaN(v)).toBe(true);
  });

  it('min with a NaN arg returns NaN', () => {
    const v = evaluate(parseExpression('min(0 / 0, 1)'), EMPTY_CTX);
    expect(Number.isNaN(v)).toBe(true);
  });
});

// ─── Determinism ────────────────────────────────────────────────────

describe('evaluate — determinism', () => {
  it('returns the same value for the same AST + context', () => {
    const ast = parseExpression(
      'clamp(sin(time * 0.001) * 0.5 + 0.5, 0, 1) + swing * 0.25',
    );
    const ctx = makeCtx({ time: 12345, swing: 0.6 });
    const a = evaluate(ast, ctx);
    const b = evaluate(ast, ctx);
    const c = evaluate(ast, ctx);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('returns different values for different contexts with same AST', () => {
    const ast = parseExpression('swing + 1');
    const a = evaluate(ast, makeCtx({ swing: 0 }));
    const b = evaluate(ast, makeCtx({ swing: 0.5 }));
    expect(a).not.toBe(b);
    expect(a).toBe(1);
    expect(b).toBe(1.5);
  });

  it('does not mutate the AST or context', () => {
    const ast = parseExpression('a + b * 2');
    const ctxMap = new Map<ModulatorId, number>([['a', 1], ['b', 2]]);
    const ctx: EvalContext = {
      modulators: ctxMap,
      styleContext: makeStyleContext(makeConfig()),
      frame: 0,
    };
    const before = JSON.stringify(ast);
    evaluate(ast, ctx);
    expect(JSON.stringify(ast)).toBe(before);
    expect(ctxMap.size).toBe(2);
  });
});

// ─── Internal dispatch sanity ───────────────────────────────────────

describe('evaluate — internal dispatch defensiveness', () => {
  it('evaluateBinary returns expected for each op', () => {
    expect(_internal.evaluateBinary('+', 1, 2)).toBe(3);
    expect(_internal.evaluateBinary('-', 5, 3)).toBe(2);
    expect(_internal.evaluateBinary('*', 4, 6)).toBe(24);
    expect(_internal.evaluateBinary('/', 10, 4)).toBe(2.5);
  });

  it('resolveVar returns 0 for missing IDs', () => {
    expect(_internal.resolveVar('doesNotExist', EMPTY_CTX)).toBe(0);
  });

  it('evaluateCall handles all 10 built-ins', () => {
    expect(_internal.evaluateCall('min', [1, 2])).toBe(1);
    expect(_internal.evaluateCall('max', [1, 2])).toBe(2);
    expect(_internal.evaluateCall('clamp', [0.5, 0, 1])).toBe(0.5);
    expect(_internal.evaluateCall('lerp', [0, 10, 0.5])).toBe(5);
    expect(_internal.evaluateCall('sin', [0])).toBe(0);
    expect(_internal.evaluateCall('cos', [0])).toBe(1);
    expect(_internal.evaluateCall('abs', [-5])).toBe(5);
    expect(_internal.evaluateCall('floor', [1.7])).toBe(1);
    expect(_internal.evaluateCall('ceil', [1.2])).toBe(2);
    expect(_internal.evaluateCall('round', [1.5])).toBe(2);
  });
});

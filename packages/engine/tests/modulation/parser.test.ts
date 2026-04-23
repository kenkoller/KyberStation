// ─── Parser tests — v1 stability drift-sentinel ─────────────────────
//
// Every fixture below doubles as part of the v1 grammar stability
// drift-sentinel per `docs/MODULATION_ROUTING_V1.1.md` §7.2. Moving a
// fixture across the accept/reject boundary is a breaking change and
// requires bumping `ModulationPayload.version`.

import { describe, expect, it } from 'vitest';

import {
  ExpressionParseError,
  parseExpression,
} from '../../src/modulation/parser';
import type { ExpressionNode } from '../../src/modulation/types';

// ─── Accept fixtures ────────────────────────────────────────────────
//
// 50+ strings the parser must accept. Grouped by category so a failure
// surfaces intent-clear in the test output.

const ACCEPT_FIXTURES: readonly string[] = [
  // ── Design-doc §4.1 canonical examples ────────────────────────────
  'clamp(swing * 2, 0, 1)',
  'lerp(base, clash, clash_level)',
  'sin(time * 0.001) * 0.5 + 0.5',
  'max(sound, swing)',
  'clamp(1 - battery, 0, 0.5)',

  // ── Numeric literals ──────────────────────────────────────────────
  '0',
  '1',
  '42',
  '0.5',
  '3.14',
  '100.0',
  '1000000',

  // ── Bare identifiers (variables) ──────────────────────────────────
  'swing',
  'sound',
  'angle',
  'time',
  '_private',
  'a1',
  'camelCase',
  'snake_case',
  'CONSTANT_NAME',

  // ── Arithmetic & precedence ───────────────────────────────────────
  '1 + 2',
  '1 - 2',
  '1 * 2',
  '1 / 2',
  '1 + 2 * 3',          // precedence: mul binds tighter
  '2 * 3 + 1',          // left-to-right
  '(1 + 2) * 3',        // parens override precedence
  'a + b - c',          // left-associative
  'a - b - c',          // left-associative (NOT right)
  'a * b / c',
  '1 + 2 + 3 + 4 + 5',  // chained adds

  // ── Unary minus ───────────────────────────────────────────────────
  '-1',
  '-swing',
  '-(a + b)',
  '-sin(x)',
  '- 3',                // whitespace after unary
  '--1',                // double unary (legal PEG: -(-1))
  '-0.5',
  '1 + -2',             // unary inside additive

  // ── Whitespace tolerance ──────────────────────────────────────────
  ' 42 ',
  '  1  +  2  ',
  '\t1\n+\n2\t',
  'sin ( x )',
  'clamp ( x , 0 , 1 )',

  // ── Function calls (all 10 built-ins, correct arity) ──────────────
  'min(1, 2)',
  'max(3, 4)',
  'clamp(0.5, 0, 1)',
  'lerp(0, 10, 0.5)',
  'sin(0)',
  'cos(0)',
  'abs(-5)',
  'floor(1.7)',
  'ceil(1.2)',
  'round(1.5)',

  // ── Nested function calls ─────────────────────────────────────────
  'sin(cos(0))',
  'min(max(1, 2), 3)',
  'clamp(sin(time), -1, 1)',
  'lerp(sin(x), cos(x), t)',
  'abs(floor(ceil(round(x))))',

  // ── Mixed numeric + function expressions ──────────────────────────
  'sin(time * 0.001)',
  '2 * sin(t) + 1',
  '(a + b) * clamp(c, 0, 1)',
];

describe('parseExpression — accept fixtures (drift-sentinel v1)', () => {
  it('has at least 50 fixtures (drift-sentinel sanity)', () => {
    expect(ACCEPT_FIXTURES.length).toBeGreaterThanOrEqual(50);
  });

  it.each(ACCEPT_FIXTURES)('accepts: %s', (source) => {
    expect(() => parseExpression(source)).not.toThrow();
  });
});

// ─── Reject fixtures ────────────────────────────────────────────────

const REJECT_FIXTURES: readonly string[] = [
  // ── Empty / whitespace only ───────────────────────────────────────
  '',
  ' ',
  '\t\n',

  // ── Unmatched parens ──────────────────────────────────────────────
  '(',
  ')',
  '(1',
  '1)',
  '((1)',
  '(1))',
  'sin(1',
  'sin(1))',

  // ── Trailing / dangling operators ─────────────────────────────────
  '1 +',
  '+ 1',
  '1 -',
  '1 *',
  '1 /',
  '1 + 2 +',
  '* 2',
  '/ 2',

  // ── Operator stacking (invalid) ───────────────────────────────────
  // Note: `+ 1` is rejected, and we include `1 + + 2` as a variant
  // test — this only succeeds if `+` is accepted as a unary prefix,
  // which our grammar does not do (only `-` is).
  '1 + + 2',
  '1 * * 2',
  '1 // 2',
  '+ + 1',

  // ── Invalid identifiers ───────────────────────────────────────────
  '1abc',     // digit prefix
  '@foo',
  '#bar',
  '$baz',
  'foo.bar',  // dot not in alphabet
  'foo-bar',  // hyphen parses as binary minus with `bar` var, so: check specifics below
  'foo bar',  // two tokens, no operator
  '1 2',
  '1 2 3',

  // ── Function arity errors ─────────────────────────────────────────
  'sin()',
  'sin(1, 2)',
  'cos()',
  'cos(1, 2, 3)',
  'abs()',
  'floor()',
  'ceil()',
  'round()',
  'min(1)',
  'min(1, 2, 3)',
  'max()',
  'clamp(1, 2)',
  'clamp(1, 2, 3, 4)',
  'lerp(1, 2)',

  // ── Unknown functions ─────────────────────────────────────────────
  'unknown(1)',
  'tan(1)',
  'log(1)',
  'pow(2, 3)',
  'sqrt(4)',

  // ── Malformed numbers ─────────────────────────────────────────────
  '1.',
  '.5',
  '1..5',
  '1.2.3',

  // ── Misc ───────────────────────────────────────────────────────────
  ',',
  '()',
  'foo(',
  'foo(,)',
  'foo(1,)',
  '1 + ,',
  ';',
];

// Special note on `foo-bar`: in our grammar this is `foo - bar` —
// two variables separated by binary minus — which is syntactically
// legal. So we pull it out of the reject list and include it only in
// the accept suite for documentation. Remove it from REJECT_FIXTURES:

const REJECT_FIXTURES_CLEANED = REJECT_FIXTURES.filter((s) => s !== 'foo-bar');

describe('parseExpression — reject fixtures (drift-sentinel v1)', () => {
  it('has at least 50 fixtures (drift-sentinel sanity)', () => {
    expect(REJECT_FIXTURES_CLEANED.length).toBeGreaterThanOrEqual(50);
  });

  it.each(REJECT_FIXTURES_CLEANED)('rejects: %j', (source) => {
    expect(() => parseExpression(source)).toThrow();
  });

  it('rejects with ExpressionParseError (instanceof)', () => {
    try {
      parseExpression('1 +');
      throw new Error('expected parseExpression to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ExpressionParseError);
    }
  });

  it('rejects empty string with ExpressionParseError', () => {
    expect(() => parseExpression('')).toThrow(ExpressionParseError);
  });
});

// `foo-bar` is syntactically legal — documents the boundary.
describe('parseExpression — boundary: identifiers with hyphen', () => {
  it('parses "foo-bar" as binary subtraction of two vars', () => {
    const ast = parseExpression('foo-bar');
    expect(ast.kind).toBe('binary');
    if (ast.kind !== 'binary') throw new Error('unreachable');
    expect(ast.op).toBe('-');
    expect(ast.lhs.kind).toBe('var');
    expect(ast.rhs.kind).toBe('var');
  });
});

// ─── AST shape spot-checks ──────────────────────────────────────────

describe('parseExpression — AST shape', () => {
  it('parses a numeric literal', () => {
    const ast = parseExpression('3.14');
    expect(ast).toEqual({ kind: 'literal', value: 3.14 });
  });

  it('parses a bare variable', () => {
    const ast = parseExpression('swing');
    expect(ast).toEqual({ kind: 'var', id: 'swing' });
  });

  it('parses unary minus', () => {
    const ast = parseExpression('-x');
    expect(ast).toEqual({
      kind: 'unary',
      op: '-',
      operand: { kind: 'var', id: 'x' },
    });
  });

  it('parses binary operation', () => {
    const ast = parseExpression('a + b');
    expect(ast).toEqual({
      kind: 'binary',
      op: '+',
      lhs: { kind: 'var', id: 'a' },
      rhs: { kind: 'var', id: 'b' },
    });
  });

  it('respects * before + precedence', () => {
    const ast = parseExpression('a + b * c');
    // Should parse as: a + (b * c)
    expect(ast).toEqual({
      kind: 'binary',
      op: '+',
      lhs: { kind: 'var', id: 'a' },
      rhs: {
        kind: 'binary',
        op: '*',
        lhs: { kind: 'var', id: 'b' },
        rhs: { kind: 'var', id: 'c' },
      },
    });
  });

  it('respects parens overriding precedence', () => {
    const ast = parseExpression('(a + b) * c');
    expect(ast).toEqual({
      kind: 'binary',
      op: '*',
      lhs: {
        kind: 'binary',
        op: '+',
        lhs: { kind: 'var', id: 'a' },
        rhs: { kind: 'var', id: 'b' },
      },
      rhs: { kind: 'var', id: 'c' },
    });
  });

  it('parses left-to-right associativity for -', () => {
    // a - b - c should parse as (a - b) - c, NOT a - (b - c)
    const ast = parseExpression('a - b - c');
    expect(ast.kind).toBe('binary');
    if (ast.kind !== 'binary') throw new Error('unreachable');
    expect(ast.op).toBe('-');
    expect(ast.rhs).toEqual({ kind: 'var', id: 'c' });
    expect(ast.lhs.kind).toBe('binary');
  });

  it('parses a function call', () => {
    const ast = parseExpression('clamp(x, 0, 1)');
    expect(ast).toEqual({
      kind: 'call',
      fn: 'clamp',
      args: [
        { kind: 'var', id: 'x' },
        { kind: 'literal', value: 0 },
        { kind: 'literal', value: 1 },
      ],
    });
  });

  it('parses nested function calls', () => {
    const ast = parseExpression('sin(cos(x))');
    expect(ast).toEqual({
      kind: 'call',
      fn: 'sin',
      args: [
        {
          kind: 'call',
          fn: 'cos',
          args: [{ kind: 'var', id: 'x' }],
        },
      ],
    });
  });
});

// ─── Design-doc §4.1 — 5 canonical example expressions ──────────────
//
// These specific shapes are part of the stability contract. The AST
// they produce must be stable across all future v1 parser revisions.

describe('parseExpression — design-doc §4.1 examples', () => {
  it('clamp(swing * 2, 0, 1)', () => {
    const ast = parseExpression('clamp(swing * 2, 0, 1)');
    expect(ast).toEqual<ExpressionNode>({
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
    });
  });

  it('lerp(base, clash, clash_level)', () => {
    const ast = parseExpression('lerp(base, clash, clash_level)');
    expect(ast).toEqual<ExpressionNode>({
      kind: 'call',
      fn: 'lerp',
      args: [
        { kind: 'var', id: 'base' },
        { kind: 'var', id: 'clash' },
        { kind: 'var', id: 'clash_level' },
      ],
    });
  });

  it('sin(time * 0.001) * 0.5 + 0.5', () => {
    // ((sin(time * 0.001) * 0.5) + 0.5)
    const ast = parseExpression('sin(time * 0.001) * 0.5 + 0.5');
    expect(ast).toEqual<ExpressionNode>({
      kind: 'binary',
      op: '+',
      lhs: {
        kind: 'binary',
        op: '*',
        lhs: {
          kind: 'call',
          fn: 'sin',
          args: [
            {
              kind: 'binary',
              op: '*',
              lhs: { kind: 'var', id: 'time' },
              rhs: { kind: 'literal', value: 0.001 },
            },
          ],
        },
        rhs: { kind: 'literal', value: 0.5 },
      },
      rhs: { kind: 'literal', value: 0.5 },
    });
  });

  it('max(sound, swing)', () => {
    const ast = parseExpression('max(sound, swing)');
    expect(ast).toEqual<ExpressionNode>({
      kind: 'call',
      fn: 'max',
      args: [
        { kind: 'var', id: 'sound' },
        { kind: 'var', id: 'swing' },
      ],
    });
  });

  it('clamp(1 - battery, 0, 0.5)', () => {
    const ast = parseExpression('clamp(1 - battery, 0, 0.5)');
    expect(ast).toEqual<ExpressionNode>({
      kind: 'call',
      fn: 'clamp',
      args: [
        {
          kind: 'binary',
          op: '-',
          lhs: { kind: 'literal', value: 1 },
          rhs: { kind: 'var', id: 'battery' },
        },
        { kind: 'literal', value: 0 },
        { kind: 'literal', value: 0.5 },
      ],
    });
  });
});

// ─── Error reporting ────────────────────────────────────────────────

describe('parseExpression — error shape', () => {
  it('carries location with offset / line / column', () => {
    try {
      parseExpression('1 +');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ExpressionParseError);
      if (!(err instanceof ExpressionParseError)) throw err;
      expect(typeof err.location.line).toBe('number');
      expect(typeof err.location.column).toBe('number');
      expect(typeof err.location.offset).toBe('number');
      expect(err.location.line).toBeGreaterThanOrEqual(1);
      expect(err.location.column).toBeGreaterThanOrEqual(1);
      expect(err.location.offset).toBeGreaterThanOrEqual(0);
    }
  });

  it('carries expected[] (string array)', () => {
    try {
      parseExpression('1 +');
      throw new Error('expected throw');
    } catch (err) {
      if (!(err instanceof ExpressionParseError)) throw err;
      expect(Array.isArray(err.expected)).toBe(true);
      // expected is a flat string array
      for (const e of err.expected) {
        expect(typeof e).toBe('string');
      }
    }
  });

  it('rejects unknown function name with a helpful message', () => {
    try {
      parseExpression('sqrt(4)');
      throw new Error('expected throw');
    } catch (err) {
      if (!(err instanceof ExpressionParseError)) throw err;
      expect(err.message).toMatch(/sqrt/);
      // Mentions allowed function list or at least one built-in name
      expect(err.message.toLowerCase()).toMatch(/unknown|allowed|min|max|clamp|lerp|sin|cos/);
    }
  });

  it('rejects wrong arity with a helpful message', () => {
    try {
      parseExpression('sin(1, 2)');
      throw new Error('expected throw');
    } catch (err) {
      if (!(err instanceof ExpressionParseError)) throw err;
      expect(err.message).toMatch(/sin/);
      expect(err.message).toMatch(/1|one/);
      expect(err.message).toMatch(/2|got/);
    }
  });
});

// ─── Round-trip stability ───────────────────────────────────────────

describe('parseExpression — determinism', () => {
  it('produces equal ASTs across calls for the same source', () => {
    const src = 'clamp(sin(time * 0.001) * 0.5 + 0.5, 0, 1)';
    const a = parseExpression(src);
    const b = parseExpression(src);
    expect(a).toEqual(b);
    // Distinct object references — not cached.
    expect(a).not.toBe(b);
  });
});

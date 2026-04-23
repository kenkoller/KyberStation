// ─── Modulation — Math-Expression Parser (v1.1) ───
//
// Runtime-compiled peggy parser for the expression mini-language.
// Spec:
//   - grammar:     `docs/MODULATION_ROUTING_V1.1.md` §4.1
//   - parser rec.: `docs/MODULATION_ROUTING_V1.1.md` §4.2 (peggy chosen
//                  over nearley / hand-roll — 25 KB gzipped, MIT, fits
//                  runtime compile path)
//   - AST shape:   `docs/MODULATION_ROUTING_V1.1.md` §4.3
//   - semantics:   `docs/MODULATION_ROUTING_V1.1.md` §4.4
//
// The canonical annotated grammar file lives alongside at
// `./grammar.peggy` with richer prose docs suitable for editing via
// the peggy CLI or a grammar-aware editor. The `GRAMMAR_SOURCE`
// constant below embeds the rules-only form (no banner comments) as
// the runtime-compiled string. The two are NOT kept byte-identical on
// purpose — `grammar.peggy` is for humans, `GRAMMAR_SOURCE` is for the
// parser generator. If you edit one, mirror the rule changes into the
// other manually.
//
// This module has zero DOM / React dependencies per CLAUDE.md
// Architecture Principle #2 (engine-first, headless-capable). Peggy's
// generated parser is pure JavaScript and depends only on
// `source-map-generator` (small, Node-safe, browser-safe).

import peggy, { type Parser as PeggyParser } from 'peggy';

import type { ExpressionNode } from './types.js';

// ─── Grammar ────────────────────────────────────────────────────────
//
// Rule-only form. The canonical annotated version lives in
// `./grammar.peggy`.

const GRAMMAR_SOURCE = `
{{
  const BUILTIN_FN_ARITY = {
    min: 2, max: 2, clamp: 3, lerp: 3,
    sin: 1, cos: 1, abs: 1, floor: 1, ceil: 1, round: 1,
  };
}}

Start
  = _ expr:Expression _ { return expr; }

Expression
  = head:MultiplicativeExpr tail:(_ AddOp _ MultiplicativeExpr)* {
      return tail.reduce(function (lhs, part) {
        return { kind: 'binary', op: part[1], lhs: lhs, rhs: part[3] };
      }, head);
    }

AddOp
  = op:("+" / "-") { return op; }

MultiplicativeExpr
  = head:UnaryExpr tail:(_ MulOp _ UnaryExpr)* {
      return tail.reduce(function (lhs, part) {
        return { kind: 'binary', op: part[1], lhs: lhs, rhs: part[3] };
      }, head);
    }

MulOp
  = op:("*" / "/") { return op; }

UnaryExpr
  = "-" _ operand:UnaryExpr {
      return { kind: 'unary', op: '-', operand: operand };
    }
  / Primary

Primary
  = Number
  / Call
  / Variable
  / "(" _ expr:Expression _ ")" { return expr; }

Call
  = name:Identifier _ "(" _ args:ArgList? _ ")" {
      const arity = BUILTIN_FN_ARITY[name];
      if (arity === undefined) {
        error('Unknown function "' + name + '". Allowed: min, max, clamp, lerp, sin, cos, abs, floor, ceil, round.');
      }
      const argList = args || [];
      if (argList.length !== arity) {
        error('Function "' + name + '" expects ' + arity + ' argument' + (arity === 1 ? '' : 's') + ', got ' + argList.length + '.');
      }
      return { kind: 'call', fn: name, args: argList };
    }

ArgList
  = head:Expression tail:(_ "," _ Expression)* {
      return [head].concat(tail.map(function (part) { return part[3]; }));
    }

Variable
  = id:Identifier { return { kind: 'var', id: id }; }

Number
  = digits:$([0-9]+ ("." [0-9]+)?) {
      return { kind: 'literal', value: parseFloat(digits) };
    }

Identifier
  = name:$([a-zA-Z_][a-zA-Z0-9_]*) { return name; }

_ "whitespace"
  = [ \\t\\n\\r]*
`;

// Re-export the raw grammar source for test-visibility (e.g. so a test
// can recompile the parser with instrumentation, or inspect the exact
// string peggy is seeing).
export const GRAMMAR_SOURCE_FOR_TESTING = GRAMMAR_SOURCE;

// ─── Module-load compile (cached) ───────────────────────────────────
//
// The grammar is ~30 lines of rules; peggy's compile pass is fast.
// We compile once at module load so parse() is amortised O(input).

let CACHED_PARSER: PeggyParser | null = null;

function getParser(): PeggyParser {
  if (CACHED_PARSER === null) {
    CACHED_PARSER = peggy.generate(GRAMMAR_SOURCE);
  }
  return CACHED_PARSER;
}

// ─── Public error type ─────────────────────────────────────────────

/**
 * Error thrown by `parseExpression` when the source string fails to
 * parse. Wraps peggy's internal `SyntaxError` so consumers don't need
 * to import anything from peggy directly.
 *
 * Shape:
 *   - `location: { line, column, offset }` — 1-based line + column,
 *     0-based offset. Flattened from peggy's `LocationRange.start`.
 *   - `expected: string[]` — deduplicated, human-readable list of
 *     tokens / rules that would have allowed progress. Empty when the
 *     error was raised by an `error()` call (e.g. wrong arity).
 *   - `found: string | null` — single character encountered, or `null`
 *     at EOF.
 *
 * The `message` already composed by peggy is preserved on `.message`.
 */
export class ExpressionParseError extends Error {
  public readonly location: { line: number; column: number; offset: number };
  public readonly expected: readonly string[];
  public readonly found: string | null;

  constructor(opts: {
    message: string;
    location: { line: number; column: number; offset: number };
    expected: readonly string[];
    found: string | null;
  }) {
    super(opts.message);
    this.name = 'ExpressionParseError';
    this.location = opts.location;
    this.expected = opts.expected;
    this.found = opts.found;
    // Preserve prototype chain for `instanceof` after transpile.
    Object.setPrototypeOf(this, ExpressionParseError.prototype);
  }
}

// ─── Expectation flattening ─────────────────────────────────────────
//
// Peggy's `expected` array contains rich objects — `LiteralExpectation`,
// `ClassExpectation`, etc. The UI wants a flat `string[]` for
// "expected: foo, bar, baz". We deduplicate and sort so error messages
// are deterministic across runs (important for snapshot stability in
// tests and for the reject-fixture drift-sentinel).

interface RawExpectation {
  type: string;
  text?: string;
  description?: string;
  parts?: unknown;
  ignoreCase?: boolean;
}

function flattenExpected(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const e of raw as RawExpectation[]) {
    if (!e || typeof e !== 'object') continue;
    switch (e.type) {
      case 'literal':
        if (typeof e.text === 'string') seen.add(`"${e.text}"`);
        break;
      case 'rule':
      case 'other':
        if (typeof e.description === 'string') seen.add(e.description);
        break;
      case 'class':
        seen.add('character class');
        break;
      case 'end':
        seen.add('end of input');
        break;
      case 'any':
        seen.add('any character');
        break;
      default:
        break;
    }
  }
  return Array.from(seen).sort();
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Parse a math-expression source string into an `ExpressionNode` AST.
 *
 * Throws `ExpressionParseError` on any syntax / arity violation. The
 * caller is responsible for treating a parse failure as a recoverable
 * authoring error (live-type red underline in the Inspector, per UX
 * North Star §4).
 *
 * @param source — the user-authored expression string
 * @throws {ExpressionParseError}
 */
export function parseExpression(source: string): ExpressionNode {
  // Empty / whitespace-only source is always a parse error — the
  // grammar requires at least one `Expression`. We surface this as a
  // tidy message rather than letting peggy produce something noisy.
  if (source.trim().length === 0) {
    throw new ExpressionParseError({
      message: 'Expression is empty.',
      location: { line: 1, column: 1, offset: 0 },
      expected: ['expression'],
      found: null,
    });
  }

  try {
    const ast = getParser().parse(source) as ExpressionNode;
    return ast;
  } catch (err: unknown) {
    // peggy throws its own SyntaxError subclass — we don't import the
    // constructor for `instanceof` because it's a namespace export; we
    // duck-type on the presence of `location` + `expected`.
    if (
      err !== null &&
      typeof err === 'object' &&
      'location' in err &&
      'message' in err
    ) {
      const peggyErr = err as {
        message: string;
        location?: { start?: { line?: number; column?: number; offset?: number } };
        expected?: unknown;
        found?: string | null;
      };
      const start = peggyErr.location?.start ?? {};
      throw new ExpressionParseError({
        message: peggyErr.message,
        location: {
          line: start.line ?? 1,
          column: start.column ?? 1,
          offset: start.offset ?? 0,
        },
        expected: flattenExpected(peggyErr.expected),
        found: peggyErr.found ?? null,
      });
    }
    // Anything else is a bug — rethrow with the original stack.
    throw err;
  }
}

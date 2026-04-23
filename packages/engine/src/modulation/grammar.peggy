// ─── Modulation — Math-Expression Grammar (v1.1) ───
//
// Peggy (PEG) grammar for the math-expression mini-language used by
// modulation routing. Spec lives in
// `docs/MODULATION_ROUTING_V1.1.md` §4.1; this file is the canonical
// BNF per §4.2 (parser recommendation).
//
// The grammar produces `ExpressionNode` ASTs matching the type contract
// in `packages/engine/src/modulation/types.ts` (`NumericLiteralNode`,
// `VariableRefNode`, `BinaryOpNode`, `UnaryOpNode`, `CallNode`).
//
// Semantics:
//   - Left-associative `+` `-` at lower precedence than `*` `/`.
//   - Unary minus binds tighter than multiplicative.
//   - Parenthesised sub-expressions rebind to the top of the precedence
//     ladder.
//   - Identifiers that are followed by `(` are `call` nodes; otherwise
//     they are `var` nodes.
//   - Built-in function arity is checked at parse time; unknown function
//     names and wrong arities raise a parse error with a location.
//
// The 10 built-ins (design doc §4.1 table):
//   min(a,b) · max(a,b) · clamp(x,lo,hi) · lerp(a,b,t) ·
//   sin(x) · cos(x) · abs(x) · floor(x) · ceil(x) · round(x)

{{
  // Initializer block — runs once when the parser is generated. Any
  // symbol bound here is in scope for every action block below.

  const BUILTIN_FN_ARITY = {
    min: 2,
    max: 2,
    clamp: 3,
    lerp: 3,
    sin: 1,
    cos: 1,
    abs: 1,
    floor: 1,
    ceil: 1,
    round: 1,
  };
}}

Start
  = _ expr:Expression _ { return expr; }

// ─── Additive: + and - (left-associative) ───────────────────────────
Expression
  = head:MultiplicativeExpr tail:(_ AddOp _ MultiplicativeExpr)* {
      return tail.reduce(function (lhs, part) {
        return { kind: 'binary', op: part[1], lhs: lhs, rhs: part[3] };
      }, head);
    }

AddOp
  = op:("+" / "-") { return op; }

// ─── Multiplicative: * and / (left-associative) ─────────────────────
MultiplicativeExpr
  = head:UnaryExpr tail:(_ MulOp _ UnaryExpr)* {
      return tail.reduce(function (lhs, part) {
        return { kind: 'binary', op: part[1], lhs: lhs, rhs: part[3] };
      }, head);
    }

MulOp
  = op:("*" / "/") { return op; }

// ─── Unary minus (right-associative by nature of recursion) ─────────
UnaryExpr
  = "-" _ operand:UnaryExpr {
      return { kind: 'unary', op: '-', operand: operand };
    }
  / Primary

// ─── Primary: numbers, calls, vars, parens ──────────────────────────
//
// Ordering matters here: Call must be tried before Variable because
// both start with an identifier. Number before Identifier because a
// bare `0` should parse as a literal, not a variable named `0` (the
// identifier rule already excludes leading digits, but keeping the
// rule order intention-explicit is cheap insurance).
Primary
  = Number
  / Call
  / Variable
  / "(" _ expr:Expression _ ")" { return expr; }

// ─── Call: identifier followed immediately by "(" ───────────────────
Call
  = name:Identifier _ "(" _ args:ArgList? _ ")" {
      const arity = BUILTIN_FN_ARITY[name];
      if (arity === undefined) {
        error(
          'Unknown function "' + name + '". ' +
          'Allowed: min, max, clamp, lerp, sin, cos, abs, floor, ceil, round.'
        );
      }
      const argList = args || [];
      if (argList.length !== arity) {
        error(
          'Function "' + name + '" expects ' + arity + ' argument' +
          (arity === 1 ? '' : 's') + ', got ' + argList.length + '.'
        );
      }
      return { kind: 'call', fn: name, args: argList };
    }

ArgList
  = head:Expression tail:(_ "," _ Expression)* {
      return [head].concat(tail.map(function (part) { return part[3]; }));
    }

// ─── Variable: bare identifier ──────────────────────────────────────
Variable
  = id:Identifier { return { kind: 'var', id: id }; }

// ─── Number: integer + optional fractional ──────────────────────────
//
// We do NOT accept a leading `+`/`-` here — unary minus is handled at
// the UnaryExpr level. This keeps `- 3` and `-3` equivalent in the AST
// (both produce a `unary(-)` wrapping a `literal(3)`).
Number
  = digits:$([0-9]+ ("." [0-9]+)?) {
      return { kind: 'literal', value: parseFloat(digits) };
    }

// ─── Identifier: alpha / underscore start, alphanumeric body ────────
Identifier
  = name:$([a-zA-Z_][a-zA-Z0-9_]*) { return name; }

// ─── Whitespace ─────────────────────────────────────────────────────
_ "whitespace"
  = [ \t\n\r]*

// ─── Style Validator ───
//
// Structural checks for ProffieOS style code. Two entry points:
//
//   validateAST(ast)         Walks a StyleNode tree, then prints it with
//                            emitCode() and checks the delimiters of the
//                            text the emitter actually produced.
//   validateStyleCode(code)  Checks a code string (for example what
//                            generateStyleCode() returns): stray characters,
//                            delimiter balance, exactly one top-level
//                            expression, parse errors, then the same tree
//                            walk over the parsed AST.
//
// Errors mean the code is malformed. Warnings flag names the validator does
// not recognise (a typo, or a template missing from the registry).
// tests/synthetic.test.ts runs both entry points over every built-in preset
// and requires zero errors and zero warnings.
//
// Template arity is NOT checked. The registry's `argTypes` are
// representative counts rather than min/max bounds — ProffieOS StyleFire
// takes 2-8 args but is registered with 4, and Layers / Gradient / Stripes /
// TrConcat are variadic — so an arity rule would reject valid code. The
// parser's arity notices are ignored here for the same reason.
//
// History: before 2026-09 the bracket check counted brackets over the AST.
// Every node with args contributes one matched pair by construction, so the
// count was always 0 and the "unbalanced" error could never fire. The check
// now scans emitted text.

import type {
  StyleNode,
  StyleNodeType,
  ValidationResult,
  ValidationError,
} from './types.js';
import { isKnownTemplate } from './templates/index.js';
import { emitCode } from './CodeEmitter.js';
import { parseStyleCode, tokenize } from './parser/index.js';
import type { Token } from './parser/index.js';

const NODE_TYPES: ReadonlySet<string> = new Set<StyleNodeType>([
  'template',
  'color',
  'integer',
  'function',
  'transition',
  'wrapper',
  'mix',
  'raw',
]);

/** A bare C++ identifier. Every template name must be one. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** A scope-qualified identifier, e.g. `SaberBase::LOCKUP_NORMAL`. */
const QUALIFIED_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)+$/;
const INTEGER_LITERAL = /^-?\d+$/;

/** `EffectType` values from ProffieOS 7.x common/saber_base.h (`EFFECT_<X>`). */
const PROFFIE_EFFECTS = [
  'NONE', 'CLASH', 'CLASH_UPDATE', 'BLAST', 'FORCE', 'STAB', 'BOOT',
  'LOCKUP_BEGIN', 'LOCKUP_END', 'DRAG_BEGIN', 'DRAG_END', 'PREON', 'POSTOFF',
  'IGNITION', 'RETRACTION', 'CHANGE', 'NEWFONT', 'LOW_BATTERY', 'POWERSAVE',
  'BATTERY_LEVEL', 'VOLUME_LEVEL', 'ON', 'FAST_ON', 'QUOTE',
  'SECONDARY_IGNITION', 'SECONDARY_RETRACTION', 'OFF', 'FAST_OFF', 'OFF_CLASH',
  'NEXT_QUOTE', 'INTERACTIVE_PREON', 'INTERACTIVE_BLAST', 'TRACK',
  'BEGIN_BATTLE_MODE', 'END_BATTLE_MODE', 'BEGIN_AUTO_BLAST', 'END_AUTO_BLAST',
  'ALT_SOUND', 'TRANSITION_SOUND', 'SOUND_LOOP', 'STUN', 'FIRE', 'CLIP_IN',
  'CLIP_OUT', 'RELOAD', 'MODE', 'RANGE', 'EMPTY', 'FULL', 'JAM', 'UNJAM',
  'PLI_ON', 'PLI_OFF', 'GAME_START', 'GAME_ACTION1', 'GAME_ACTION2',
  'GAME_CHOICE', 'GAME_RESPONSE1', 'GAME_RESPONSE2', 'GAME_RESULT1',
  'GAME_RESULT2', 'GAME_WIN', 'GAME_LOSE', 'USER1', 'USER2', 'USER3', 'USER4',
  'USER5', 'USER6', 'USER7', 'USER8', 'SD_CARD_NOT_FOUND',
  'ERROR_IN_FONT_DIRECTORY', 'ERROR_IN_BLADE_ARRAY', 'FONT_DIRECTORY_NOT_FOUND',
] as const;

/** `SaberBase::LockupType` values from ProffieOS 7.x (`SaberBase::LOCKUP_<X>`). */
const PROFFIE_LOCKUP_TYPES = [
  'NONE', 'NORMAL', 'DRAG', 'ARMED', 'AUTOFIRE', 'MELT', 'LIGHTNING_BLOCK',
] as const;

/**
 * Bare identifiers that are valid ProffieOS leaves. Named colours and the
 * zero-arg functions are also in the template registry; the enum values are
 * not.
 */
const KNOWN_RAW_VALUES: ReadonlySet<string> = new Set([
  'White',
  'Black',
  'Red',
  'Green',
  'Blue',
  'Yellow',
  'Orange',
  'Cyan',
  'Magenta',
  'DeepSkyBlue',
  'DodgerBlue',
  'Rainbow',
  'TrInstant',
  'NoisySoundLevel',
  'BatteryLevel',
  'BladeAngle',
  'TwistAngle',
  ...PROFFIE_EFFECTS.map((e) => `EFFECT_${e}`),
  ...PROFFIE_LOCKUP_TYPES.map((l) => `SaberBase::LOCKUP_${l}`),
]);

/** Cap per-check delimiter errors so one bad paste doesn't flood the result. */
const MAX_DELIMITER_ERRORS = 10;

// ─── Public API ───

/**
 * Validate a StyleNode AST.
 *
 * Checks performed:
 * - Every node has a name, a known node type and an args array
 * - Names print as valid tokens: template names are C++ identifiers; leaves
 *   are identifiers, scope-qualified identifiers or integer literals
 * - Raw nodes have no children (emitters print raw nodes verbatim and drop
 *   children)
 * - Integer leaves are integer literals
 * - Template names and leaf values are recognised (warnings)
 * - The code emitCode() prints for this tree has balanced `<>` and `()`
 */
export function validateAST(ast: StyleNode): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  validateNode(ast, 'root', errors, warnings);

  let emitted: string | null = null;
  try {
    emitted = emitCode(ast);
  } catch (err) {
    errors.push({
      path: 'root',
      message: `emitCode() threw while printing this tree: ${describeError(err)}`,
      severity: 'error',
    });
  }
  if (emitted !== null) {
    checkDelimiters(tokenize(emitted), emitted, 'emitted', errors);
  }

  return toResult(errors, warnings);
}

/**
 * Validate one ProffieOS style expression given as source text, such as
 * the output of `generateStyleCode()`. Comments are ignored.
 *
 * Checks performed:
 * - The code is not empty
 * - No characters outside the style-expression alphabet (identifiers,
 *   integers, `<>(),`, `::`, whitespace, comments)
 * - `<>` and `()` are balanced and properly nested
 * - Exactly one top-level expression (nothing trails it)
 * - The parser reports no errors
 * - The parsed tree passes the same node checks as validateAST()
 */
export function validateStyleCode(code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (typeof code !== 'string') {
    errors.push({ path: 'code', message: 'Style code must be a string', severity: 'error' });
    return toResult(errors, warnings);
  }

  const tokens = tokenize(code);
  checkStrayCharacters(code, tokens, errors);

  const significant = tokens.filter(
    (t) => t.type !== 'WHITESPACE' && t.type !== 'COMMENT',
  );
  if (significant.length === 0 || significant[0].type === 'EOF') {
    errors.push({ path: 'code', message: 'Style code is empty', severity: 'error' });
    return toResult(errors, warnings);
  }

  const before = errors.length;
  checkDelimiters(tokens, code, 'code', errors);
  if (errors.length === before) {
    checkSingleExpression(significant, code, errors);
  }

  let parsed: ReturnType<typeof parseStyleCode>;
  try {
    parsed = parseStyleCode(code);
  } catch (err) {
    errors.push({
      path: 'code',
      message: `Parser threw: ${describeError(err)}`,
      severity: 'error',
    });
    return toResult(errors, warnings);
  }

  for (const e of parsed.errors) {
    errors.push({
      path: `code@${lineCol(code, e.position)}`,
      message: `Parse error: ${e.message}`,
      severity: 'error',
    });
  }
  if (parsed.ast) {
    validateNode(parsed.ast, 'root', errors, warnings);
  } else if (parsed.errors.length === 0) {
    errors.push({
      path: 'code',
      message: 'Code did not parse to a style expression',
      severity: 'error',
    });
  }

  return toResult(errors, warnings);
}

// ─── Recursive Node Validation ───

function validateNode(
  node: StyleNode,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  const error = (message: string) => errors.push({ path, message, severity: 'error' });
  const warn = (message: string) => warnings.push({ path, message, severity: 'warning' });

  if (node === null || typeof node !== 'object') {
    error('Node is not an object');
    return;
  }
  if (!node.name) {
    error('Node is missing a name');
    return;
  }
  if (!node.type) {
    error('Node is missing a type');
    return;
  }
  if (!NODE_TYPES.has(node.type)) {
    error(`Unknown node type "${node.type}" on "${node.name}"`);
    return;
  }
  if (!Array.isArray(node.args)) {
    error(`Node "${node.name}" has no args array`);
    return;
  }

  const { name, args } = node;

  if (node.type === 'raw') {
    if (args.length > 0) {
      error(
        `Raw node "${name}" has ${args.length} child arg(s) — emitters print raw nodes verbatim and drop their children`,
      );
    }
    if (!isLeafToken(name)) {
      error(
        `Raw value "${name}" is not a C++ identifier or integer literal — raw nodes are emitted verbatim, so template syntax here escapes validation (model it as a template node)`,
      );
    } else if (!isKnownLeaf(name)) {
      warn(`Unknown raw value: "${name}"`);
    }
    return;
  }

  if (args.length === 0) {
    if (node.type === 'integer') {
      if (!INTEGER_LITERAL.test(name)) {
        error(`Integer node has non-numeric name: "${name}"`);
      }
      return;
    }
    // Zero-arg templates, colours and functions print as a bare name.
    if (!isLeafToken(name)) {
      error(`Name "${name}" is not a C++ identifier`);
    } else if (!isKnownLeaf(name)) {
      warn(`Unknown template name: "${name}"`);
    }
    return;
  }

  // Nodes with args print as NAME<arg, ...>.
  if (!IDENTIFIER.test(name)) {
    error(`Template name "${name}" is not a C++ identifier`);
  } else if (!isKnownTemplate(name)) {
    warn(`Unknown template name: "${name}"`);
  }

  for (let i = 0; i < args.length; i++) {
    validateNode(args[i], `${path}.${name}[${i}]`, errors, warnings);
  }
}

function isLeafToken(name: string): boolean {
  return (
    IDENTIFIER.test(name) ||
    QUALIFIED_IDENTIFIER.test(name) ||
    INTEGER_LITERAL.test(name)
  );
}

function isKnownLeaf(name: string): boolean {
  return (
    INTEGER_LITERAL.test(name) ||
    KNOWN_RAW_VALUES.has(name) ||
    isKnownTemplate(name)
  );
}

// ─── Text Checks ───

const OPENERS: Partial<Record<Token['type'], Token['type']>> = {
  CLOSE_ANGLE: 'OPEN_ANGLE',
  CLOSE_PAREN: 'OPEN_PAREN',
};

/**
 * Check `<>` / `()` balance and nesting over a token stream. The lexer has
 * already set comments aside, so brackets inside comments don't count.
 */
function checkDelimiters(
  tokens: Token[],
  source: string,
  label: string,
  errors: ValidationError[],
): void {
  const stack: Token[] = [];
  let reported = 0;
  const report = (message: string, position: number) => {
    if (reported++ >= MAX_DELIMITER_ERRORS) return;
    errors.push({
      path: `${label}@${lineCol(source, position)}`,
      message,
      severity: 'error',
    });
  };

  for (const token of tokens) {
    if (token.type === 'OPEN_ANGLE' || token.type === 'OPEN_PAREN') {
      stack.push(token);
      continue;
    }
    const opener = OPENERS[token.type];
    if (!opener) continue;

    const top = stack[stack.length - 1];
    if (!top) {
      report(
        `${delimiterFamily(token)} are unbalanced: '${token.value}' at ${lineCol(source, token.position)} has no matching '${opener === 'OPEN_ANGLE' ? '<' : '('}'`,
        token.position,
      );
      continue;
    }
    stack.pop();
    if (top.type !== opener) {
      report(
        `Mismatched delimiters: '${token.value}' at ${lineCol(source, token.position)} closes '${top.value}' opened at ${lineCol(source, top.position)}`,
        token.position,
      );
    }
  }

  for (const open of stack) {
    report(
      `${delimiterFamily(open)} are unbalanced: '${open.value}' at ${lineCol(source, open.position)} is never closed`,
      open.position,
    );
  }
}

function delimiterFamily(token: Token): string {
  return token.type === 'OPEN_ANGLE' || token.type === 'CLOSE_ANGLE'
    ? 'Angle brackets'
    : 'Parentheses';
}

/**
 * The lexer silently skips characters it doesn't recognise (`;`, `.`, `=`,
 * quotes, a lone `:` …). In a style expression those are always mistakes, so
 * flag every character no token covers.
 */
function checkStrayCharacters(
  source: string,
  tokens: Token[],
  errors: ValidationError[],
): void {
  const covered = new Uint8Array(source.length);
  for (const token of tokens) {
    const end = Math.min(source.length, token.position + token.value.length);
    for (let i = Math.max(0, token.position); i < end; i++) covered[i] = 1;
  }
  let reported = 0;
  for (let i = 0; i < source.length; i++) {
    if (covered[i]) continue;
    if (reported++ >= MAX_DELIMITER_ERRORS) return;
    errors.push({
      path: `code@${lineCol(source, i)}`,
      message: `Unexpected character '${source[i]}' at ${lineCol(source, i)}`,
      severity: 'error',
    });
  }
}

/**
 * A style is a single expression: `Name`, `Name<…>`, `Name<…>()`,
 * `Name(…)` or an integer. The parser stops after the first expression and
 * ignores whatever follows, so trailing content has to be caught here.
 * Assumes delimiters are already known to balance.
 */
function checkSingleExpression(
  significant: Token[],
  source: string,
  errors: ValidationError[],
): void {
  const first = significant[0];
  let i = 1;
  if (first.type === 'TEMPLATE_NAME') {
    const opening = significant[i]?.type;
    if (opening === 'OPEN_ANGLE' || opening === 'OPEN_PAREN') {
      i = skipBalanced(significant, i);
      if (
        opening === 'OPEN_ANGLE' &&
        significant[i]?.type === 'OPEN_PAREN' &&
        significant[i + 1]?.type === 'CLOSE_PAREN'
      ) {
        i += 2;
      }
    }
  } else if (first.type !== 'INTEGER') {
    // The parser reports what's wrong with the first token.
    return;
  }

  const next = significant[i];
  if (next && next.type !== 'EOF') {
    errors.push({
      path: `code@${lineCol(source, next.position)}`,
      message: `Unexpected content after the style expression at ${lineCol(source, next.position)}: '${next.value}'`,
      severity: 'error',
    });
  }
}

/** Index just past the delimiter group that opens at `start`. */
function skipBalanced(tokens: Token[], start: number): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i].type;
    if (t === 'OPEN_ANGLE' || t === 'OPEN_PAREN') depth++;
    else if (t === 'CLOSE_ANGLE' || t === 'CLOSE_PAREN') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return tokens.length;
}

// ─── Helpers ───

/** 1-based `line:col` for a character offset. */
function lineCol(source: string, position: number): string {
  const clamped = Math.max(0, Math.min(position, source.length));
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < clamped; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return `${line}:${clamped - lineStart + 1}`;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toResult(
  errors: ValidationError[],
  warnings: ValidationError[],
): ValidationResult {
  return { valid: errors.length === 0, errors, warnings };
}

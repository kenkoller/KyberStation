// ─── ProffieOS C++ Style Recursive Descent Parser ───
// Parses a token stream into a StyleNode AST.

import type { StyleNode } from '../types.js';
import type { Token } from './Lexer.js';
import { tokenize, filterTokens } from './Lexer.js';
import { lookupTemplate } from '../templates/index.js';

/**
 * Named ProffieOS colour + identifier primitives that parse as
 * standalone identifiers without being templates. We skip these
 * during template validation so they don't trigger spurious "unknown
 * template" warnings.
 */
const NAMED_PRIMITIVES = new Set([
  'White', 'Black', 'Red', 'Green', 'Blue',
  'Yellow', 'Cyan', 'Magenta', 'Orange',
  'DeepSkyBlue', 'DodgerBlue', 'Purple',
  'TrInstant',
]);

/**
 * Templates that accept a variable number of arguments. The registry
 * declares a representative count, but ProffieOS allows more: Layers
 * takes a base style + any number of effect layers, Gradient takes any
 * number of colour stops, TrConcat chains 2+ transitions, etc. Treat
 * arg-count mismatches for these as informational, not warnings.
 */
const VARIADIC_TEMPLATES = new Set([
  'Layers',
  'Gradient',
  'TrConcat',
]);

export interface ParseError {
  message: string;
  position: number;
}

export interface ParseWarning {
  message: string;
  position: number;
  /** Template name the warning applies to, when applicable. */
  template?: string;
}

export interface ParseResult {
  ast: StyleNode | null;
  errors: ParseError[];
  /** Non-fatal notices — unknown template names, arg-count mismatches, etc. */
  warnings: ParseWarning[];
}

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];
  private warnings: ParseWarning[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', position: -1 };
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token ?? { type: 'EOF', value: '', position: -1 };
  }

  private expect(type: Token['type']): Token | null {
    const token = this.peek();
    if (token.type === type) {
      return this.advance();
    }
    this.errors.push({
      message: `Expected ${type}, got ${token.type} '${token.value}'`,
      position: token.position,
    });
    return null;
  }

  /**
   * Parse a template expression:
   *   TemplateName<arg1, arg2, ...>
   *   TemplateName<arg1, arg2, ...>()
   *   TemplateName (no args, e.g., Rainbow, Black)
   *   INTEGER
   */
  parseExpression(): StyleNode | null {
    const token = this.peek();

    // Integer literal
    if (token.type === 'INTEGER') {
      this.advance();
      return {
        type: 'integer',
        name: 'Int',
        args: [{ type: 'raw', name: token.value, args: [] }],
      };
    }

    // Template name
    if (token.type === 'TEMPLATE_NAME') {
      const nameToken = this.advance();
      const name = nameToken.value;

      // Check for angle bracket arguments
      if (this.peek().type === 'OPEN_ANGLE') {
        this.advance(); // consume '<'
        const args: StyleNode[] = [];

        // Parse comma-separated arguments
        while (this.peek().type !== 'CLOSE_ANGLE' && this.peek().type !== 'EOF') {
          const arg = this.parseExpression();
          if (arg) {
            args.push(arg);
          } else {
            // Skip to next comma or close angle on error
            while (
              this.peek().type !== 'COMMA' &&
              this.peek().type !== 'CLOSE_ANGLE' &&
              this.peek().type !== 'EOF'
            ) {
              this.advance();
            }
          }

          if (this.peek().type === 'COMMA') {
            this.advance(); // consume ','
          }
        }

        this.expect('CLOSE_ANGLE');

        // Optional trailing () — e.g., StylePtr<...>()
        if (this.peek().type === 'OPEN_PAREN') {
          this.advance();
          this.expect('CLOSE_PAREN');
        }

        // ── Validation (v0.10.0) ──
        // Non-fatal warnings only — validation never prevents a parse from
        // succeeding. Unknown templates still parse as generic nodes so
        // downstream can at least display them.
        this.validateTemplate(name, args, nameToken.position);

        return {
          type: this.classifyNode(name),
          name,
          args,
        };
      }

      // No angle brackets — zero-arg template (Rainbow, Black, etc.)
      this.validateTemplate(name, [], nameToken.position);
      return {
        type: this.classifyNode(name),
        name,
        args: [],
      };
    }

    // Unexpected token
    this.errors.push({
      message: `Unexpected token: ${token.type} '${token.value}'`,
      position: token.position,
    });
    this.advance();
    return null;
  }

  /**
   * Classify a node type based on its template name.
   */
  private classifyNode(name: string): StyleNode['type'] {
    const tmpl = lookupTemplate(name);
    if (!tmpl) return 'template';

    // Use template registry categories
    if (name === 'Rgb' || name === 'RgbArg' || name === 'Mix' || name === 'Gradient' ||
        name === 'AudioFlicker' || name === 'StyleFire' || name === 'Pulsing' ||
        name === 'Stripes' || name === 'HumpFlicker' || name === 'Rainbow' ||
        name === 'RotateColorsX' || name === 'FireConfig') {
      return 'color';
    }
    if (name.startsWith('Tr') || name === 'TrConcat') return 'transition';
    if (name === 'Int' || name === 'IntArg' || name === 'Scale' || name === 'Sin' ||
        name === 'SwingSpeed' || name === 'Bump' || name === 'SmoothStep' ||
        name === 'NoisySoundLevel' || name === 'BatteryLevel' ||
        name === 'BladeAngle' || name === 'TwistAngle' || name === 'IncrementModuloF') {
      return 'function';
    }
    if (name === 'StylePtr' || name === 'InOutTrL' || name === 'Layers') return 'wrapper';
    if (name === 'Mix') return 'mix';

    return 'template';
  }

  getErrors(): ParseError[] {
    return this.errors;
  }

  getWarnings(): ParseWarning[] {
    return this.warnings;
  }

  /**
   * Non-fatal validation of a parsed template invocation.
   *
   * Emits a warning when:
   *   - The template name isn't in our known registry. Most common cause:
   *     user typo ("StyleFIRE" vs "StyleFire") or an OS7 primitive we
   *     haven't registered yet. We still parse the node through —
   *     ProffieOS's compiler is the ultimate authority.
   *   - The argument count doesn't match the registered `argTypes.length`.
   *     A mismatch usually indicates the user pasted code from a different
   *     ProffieOS version, or a typo. Keeping this as a warning lets
   *     forward-compatible templates parse without noise.
   */
  private validateTemplate(
    name: string,
    args: StyleNode[],
    position: number,
  ): void {
    // Skip numeric-literal-passthrough nodes the parser emits (integer
    // literals take the path through parseExpression's INTEGER branch,
    // but the trailing raw-literal "Int<123>" wrap comes through here).
    // Also skip reserved ProffieOS primitives: the SaberBase enum values,
    // effect / lockup enum tokens, and named colours (White, Red, etc.)
    // which parse as standalone identifiers rather than proper templates.
    if (
      name.startsWith('SaberBase::') ||
      name.startsWith('EFFECT_') ||
      name.startsWith('LOCKUP_') ||
      name === 'SaberBase' ||  // appears bare when ::-splitting is disabled
      NAMED_PRIMITIVES.has(name)
    ) {
      return;
    }

    const registered = lookupTemplate(name);
    if (!registered) {
      this.warnings.push({
        message: `Unknown template "${name}" — may be a typo or an OS7 feature not yet registered in KyberStation.`,
        position,
        template: name,
      });
      return;
    }

    const expected = registered.argTypes.length;
    if (VARIADIC_TEMPLATES.has(name)) {
      // Variadic — only warn if the user supplied FEWER than the
      // minimum (1 for a layer stack, 2 for a gradient, 2 for concat).
      const minArgs = name === 'Layers' ? 1 : 2;
      if (args.length < minArgs) {
        this.warnings.push({
          message: `Template "${name}" expects at least ${minArgs} arg${
            minArgs === 1 ? '' : 's'
          }, got ${args.length}.`,
          position,
          template: name,
        });
      }
      return;
    }
    if (expected > 0 && args.length !== expected) {
      this.warnings.push({
        message: `Template "${name}" expects ${expected} arg${
          expected === 1 ? '' : 's'
        }, got ${args.length}. Emitted code may fail to compile.`,
        position,
        template: name,
      });
    }
  }
}

/**
 * Parse a ProffieOS C++ style code string into a StyleNode AST.
 */
export function parseStyleCode(code: string): ParseResult {
  const rawTokens = tokenize(code);
  const tokens = filterTokens(rawTokens);

  const parser = new Parser(tokens);
  const ast = parser.parseExpression();

  return {
    ast,
    errors: parser.getErrors(),
    warnings: parser.getWarnings(),
  };
}

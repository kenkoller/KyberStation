// ─── ProffieOS C++ Style Recursive Descent Parser ───
// Parses a token stream into a StyleNode AST.

import type { StyleNode } from '../types.js';
import type { Token } from './Lexer.js';
import { tokenize, filterTokens } from './Lexer.js';
import { lookupTemplate } from '../templates/index.js';

export interface ParseError {
  message: string;
  position: number;
}

export interface ParseResult {
  ast: StyleNode | null;
  errors: ParseError[];
}

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];

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

        return {
          type: this.classifyNode(name),
          name,
          args,
        };
      }

      // No angle brackets — zero-arg template (Rainbow, Black, etc.)
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
  };
}

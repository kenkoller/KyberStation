// ─── ProffieOS Template String Parser ───
// Parses C++ template syntax into a TemplateNode tree for evaluation.
// Follows the same tokenization patterns as packages/codegen/src/parser/Lexer.ts
// but produces TemplateNode ASTs instead of codegen StyleNode ASTs.

import type { TemplateNode } from './types.js';

// ─── Tokenizer ───

type TokenType =
  | 'NAME'
  | 'OPEN_ANGLE'
  | 'CLOSE_ANGLE'
  | 'COMMA'
  | 'OPEN_PAREN'
  | 'CLOSE_PAREN'
  | 'INTEGER'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

/**
 * Tokenize a ProffieOS C++ template string.
 * Handles nested angle brackets, template names with ::, integers,
 * and discards whitespace/comments.
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];

    // Skip whitespace
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }

    // Line comment //
    if (ch === '/' && input[pos + 1] === '/') {
      while (pos < input.length && input[pos] !== '\n') pos++;
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && input[pos + 1] === '*') {
      pos += 2;
      while (pos < input.length - 1 && !(input[pos] === '*' && input[pos + 1] === '/')) pos++;
      pos += 2;
      continue;
    }

    if (ch === '<') { tokens.push({ type: 'OPEN_ANGLE', value: '<', pos }); pos++; continue; }
    if (ch === '>') { tokens.push({ type: 'CLOSE_ANGLE', value: '>', pos }); pos++; continue; }
    if (ch === '(') { tokens.push({ type: 'OPEN_PAREN', value: '(', pos }); pos++; continue; }
    if (ch === ')') { tokens.push({ type: 'CLOSE_PAREN', value: ')', pos }); pos++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',', pos }); pos++; continue; }

    // Integer (including negative)
    if (/\d/.test(ch) || (ch === '-' && pos + 1 < input.length && /\d/.test(input[pos + 1]))) {
      const start = pos;
      if (ch === '-') pos++;
      while (pos < input.length && /\d/.test(input[pos])) pos++;
      tokens.push({ type: 'INTEGER', value: input.slice(start, pos), pos: start });
      continue;
    }

    // Name (identifier with :: support for SaberBase::LOCKUP_NORMAL etc.)
    if (/[A-Za-z_]/.test(ch)) {
      const start = pos;
      while (pos < input.length) {
        if (/[A-Za-z0-9_]/.test(input[pos])) {
          pos++;
        } else if (input[pos] === ':' && input[pos + 1] === ':') {
          pos += 2;
        } else {
          break;
        }
      }
      tokens.push({ type: 'NAME', value: input.slice(start, pos), pos: start });
      continue;
    }

    // Unknown character — skip
    pos++;
  }

  tokens.push({ type: 'EOF', value: '', pos });
  return tokens;
}

// ─── Recursive Descent Parser ───

class TemplateParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', pos: -1 };
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok ?? { type: 'EOF', value: '', pos: -1 };
  }

  /**
   * Parse a template expression:
   *   Name<arg1, arg2, ...>         — template with arguments
   *   Name<arg1, arg2, ...>()       — template with trailing parens (StylePtr)
   *   Name                          — bare identifier (named color, zero-arg template)
   *   INTEGER                       — integer literal
   */
  parseExpression(): TemplateNode | null {
    const tok = this.peek();

    // Integer literal
    if (tok.type === 'INTEGER') {
      this.advance();
      return { name: tok.value, args: [] };
    }

    // Named template / identifier
    if (tok.type === 'NAME') {
      const nameTok = this.advance();
      const name = nameTok.value;

      // Check for angle-bracket arguments
      if (this.peek().type === 'OPEN_ANGLE') {
        this.advance(); // consume '<'
        const args: TemplateNode[] = [];

        while (this.peek().type !== 'CLOSE_ANGLE' && this.peek().type !== 'EOF') {
          const arg = this.parseExpression();
          if (arg) {
            args.push(arg);
          } else {
            // Skip to next comma or close on error
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

        if (this.peek().type === 'CLOSE_ANGLE') {
          this.advance(); // consume '>'
        }

        // Optional trailing () — e.g., StylePtr<...>()
        if (this.peek().type === 'OPEN_PAREN') {
          this.advance();
          if (this.peek().type === 'CLOSE_PAREN') {
            this.advance();
          }
        }

        return { name, args };
      }

      // Bare identifier (named color, zero-arg function)
      return { name, args: [] };
    }

    // Unexpected token
    this.advance();
    return null;
  }

  parse(): TemplateNode | null {
    const result = this.parseExpression();
    return result;
  }
}

// ─── Public API ───

/**
 * Parse a ProffieOS C++ template string into an AST.
 *
 * Examples:
 *   "Red" → { name: "Red", args: [] }
 *   "Rgb<255,0,0>" → { name: "Rgb", args: [{ name: "255", args: [] }, ...] }
 *   "Layers<Red, AudioFlicker<Blue, White>>" → nested tree
 *
 * @param input ProffieOS C++ template string
 * @returns Root TemplateNode or null on parse failure
 */
export function parseTemplateString(input: string): TemplateNode | null {
  // Strip StylePtr<...>() wrapper if present — it's just a pointer wrapper
  // and not semantically meaningful for evaluation.
  let cleaned = input.trim();

  // Strip leading "StylePtr<" and trailing ">()" or ">"
  const stylePtrMatch = /^StylePtr\s*<(.+)>\s*\(\s*\)\s*$/s.exec(cleaned);
  if (stylePtrMatch) {
    cleaned = stylePtrMatch[1];
  }

  const tokens = tokenize(cleaned);
  const parser = new TemplateParser(tokens);
  return parser.parse();
}

/**
 * Tokenize a template string (exposed for testing).
 */
export { tokenize };

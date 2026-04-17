// ─── ProffieOS C++ Style Lexer ───
// Tokenizes ProffieOS style strings for the recursive descent parser.

export type TokenType =
  | 'TEMPLATE_NAME'
  | 'OPEN_ANGLE'
  | 'CLOSE_ANGLE'
  | 'COMMA'
  | 'OPEN_PAREN'
  | 'CLOSE_PAREN'
  | 'INTEGER'
  | 'WHITESPACE'
  | 'COMMENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenize a ProffieOS C++ style string.
 * Handles nested angle brackets, template names, integers, and comments.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];

    // Skip whitespace
    if (/\s/.test(ch)) {
      const start = pos;
      while (pos < input.length && /\s/.test(input[pos])) pos++;
      tokens.push({ type: 'WHITESPACE', value: input.slice(start, pos), position: start });
      continue;
    }

    // Line comment //
    if (ch === '/' && input[pos + 1] === '/') {
      const start = pos;
      while (pos < input.length && input[pos] !== '\n') pos++;
      tokens.push({ type: 'COMMENT', value: input.slice(start, pos), position: start });
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && input[pos + 1] === '*') {
      const start = pos;
      pos += 2;
      while (pos < input.length - 1 && !(input[pos] === '*' && input[pos + 1] === '/')) pos++;
      pos += 2;
      tokens.push({ type: 'COMMENT', value: input.slice(start, pos), position: start });
      continue;
    }

    // Angle brackets
    if (ch === '<') {
      tokens.push({ type: 'OPEN_ANGLE', value: '<', position: pos });
      pos++;
      continue;
    }
    if (ch === '>') {
      tokens.push({ type: 'CLOSE_ANGLE', value: '>', position: pos });
      pos++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'OPEN_PAREN', value: '(', position: pos });
      pos++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'CLOSE_PAREN', value: ')', position: pos });
      pos++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', position: pos });
      pos++;
      continue;
    }

    // Integer (including negative)
    if (/\d/.test(ch) || (ch === '-' && pos + 1 < input.length && /\d/.test(input[pos + 1]))) {
      const start = pos;
      if (ch === '-') pos++;
      while (pos < input.length && /\d/.test(input[pos])) pos++;
      tokens.push({ type: 'INTEGER', value: input.slice(start, pos), position: start });
      continue;
    }

    // Template name (identifier: letters, digits, underscore).
    // C++ scope-resolution operator `::` is consumed as part of the
    // identifier so that `SaberBase::LOCKUP_NORMAL` stays one token
    // instead of being silently split (which would skew downstream
    // arg-count validation and round-trip identity). The regex below
    // accepts `::` as an internal separator.
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
      tokens.push({ type: 'TEMPLATE_NAME', value: input.slice(start, pos), position: start });
      continue;
    }

    // Unknown character — skip
    pos++;
  }

  tokens.push({ type: 'EOF', value: '', position: pos });
  return tokens;
}

/**
 * Filter out whitespace and comment tokens.
 */
export function filterTokens(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
}

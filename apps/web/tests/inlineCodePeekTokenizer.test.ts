// ─── InlineCodePeek tokenizer regression tests ───
//
// The tokenizer is a one-pass scanner — cheap to cover directly.
// These pin the token-kind classifier so a future edit to the keyword
// set or identifier rules can't silently warp the rendered colors.

import { describe, it, expect } from 'vitest';
import { tokenize } from '@/components/marketing/InlineCodePeek';

describe('tokenize', () => {
  it('returns an empty array for an empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns a single plain token for unadorned text', () => {
    const tokens = tokenize('hello world');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'plain', value: 'hello world' });
  });

  it('classifies a C++ keyword', () => {
    const tokens = tokenize('const');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'keyword', value: 'const' });
  });

  it('classifies PascalCase identifiers as templates', () => {
    const tokens = tokenize('StylePtr');
    expect(tokens[0]).toEqual({ kind: 'template', value: 'StylePtr' });
  });

  it('classifies integer literals as numbers', () => {
    const tokens = tokenize('12345');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'number', value: '12345' });
  });

  it('classifies floating-point literals as numbers', () => {
    const tokens = tokenize('3.14');
    expect(tokens[0]).toEqual({ kind: 'number', value: '3.14' });
  });

  it('captures a double-quoted string including the quotes', () => {
    const tokens = tokenize('"hello"');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'string', value: '"hello"' });
  });

  it('spans the full string when it contains an escaped quote', () => {
    const tokens = tokenize('"a \\" b"');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('string');
    expect(tokens[0].value).toBe('"a \\" b"');
  });

  it('captures a single-quoted string literal', () => {
    const tokens = tokenize("'x'");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'string', value: "'x'" });
  });

  it('line comment does not consume the newline', () => {
    const tokens = tokenize('// note\n');
    expect(tokens[0]).toEqual({ kind: 'comment', value: '// note' });
    expect(tokens[1]).toEqual({ kind: 'plain', value: '\n' });
  });

  it('captures a block comment including the closing */', () => {
    const tokens = tokenize('/* hi */');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'comment', value: '/* hi */' });
  });

  it('classifies preprocessor at line start', () => {
    const tokens = tokenize('#include <foo>');
    expect(tokens[0]).toEqual({ kind: 'preproc', value: '#include <foo>' });
  });

  it('does NOT classify # as preproc when it is not at line start', () => {
    const tokens = tokenize('x = #foo');
    const anyPreproc = tokens.some((t) => t.kind === 'preproc');
    expect(anyPreproc).toBe(false);
  });

  it('realistic ProffieOS snippet yields a plausible token mix', () => {
    const src =
      'StylePtr<Layers<Rgb<0,0,255>, SimpleClashL<Rgb<255,255,255>>>>()';
    const tokens = tokenize(src);
    const kinds = tokens.map((t) => t.kind);
    const values = tokens.map((t) => t.value);

    expect(kinds).toContain('template');
    expect(kinds).toContain('number');

    const templateValues = tokens
      .filter((t) => t.kind === 'template')
      .map((t) => t.value);
    expect(templateValues).toContain('StylePtr');
    expect(templateValues).toContain('Layers');
    expect(templateValues).toContain('Rgb');
    expect(templateValues).toContain('SimpleClashL');

    // Sanity: every value contributes; concatenation reconstructs input.
    expect(values.join('')).toBe(src);
  });

  it('merges consecutive plain characters into a single token', () => {
    const tokens = tokenize('+++');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: 'plain', value: '+++' });
  });
});

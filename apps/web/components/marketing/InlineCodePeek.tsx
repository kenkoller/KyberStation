import React from 'react';
import { CopyButton } from './CopyButton';

export interface InlineCodePeekProps {
  /** The ProffieOS C++ (or other) source to display. */
  code: string;
  /** Optional label above the code block (e.g. "config.h"). */
  filename?: string;
  /** Show line numbers. Default: false. */
  lineNumbers?: boolean;
  /** Max visible lines before the block scrolls. Default: 24. */
  maxLines?: number;
  /** Language hint for the aria-label. Default: 'cpp'. */
  language?: 'cpp' | 'typescript' | 'text';
  className?: string;
}

// ── Tokenizer ────────────────────────────────────────────────────────
// Approximate, not a parser. Miscolored identifiers are fine — we only
// need visual separation of templates / keywords / numbers / strings.

export type TokenKind =
  | 'plain'
  | 'keyword'
  | 'template'
  | 'number'
  | 'string'
  | 'comment'
  | 'preproc';

export interface Token {
  kind: TokenKind;
  value: string;
}

const CPP_KEYWORDS = new Set([
  'const',
  'static',
  'using',
  'struct',
  'namespace',
  'class',
  'void',
  'int',
  'float',
  'bool',
  'true',
  'false',
  'nullptr',
  'if',
  'else',
  'return',
  'new',
  'delete',
  'include',
  'define',
]);

const isIdentStart = (c: string): boolean =>
  (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
const isIdentCont = (c: string): boolean =>
  isIdentStart(c) || (c >= '0' && c <= '9');
const isDigit = (c: string): boolean => c >= '0' && c <= '9';

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, value: string): void => {
    if (!value) return;
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) {
      last.value += value;
      return;
    }
    tokens.push({ kind, value });
  };

  let i = 0;
  let atLineStart = true;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === '\n') {
      push('plain', c);
      i += 1;
      atLineStart = true;
      continue;
    }

    if (atLineStart && (c === ' ' || c === '\t')) {
      push('plain', c);
      i += 1;
      continue;
    }
    if (atLineStart && c === '#') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      push('preproc', src.slice(i, stop));
      i = stop;
      atLineStart = false;
      continue;
    }
    atLineStart = false;

    if (c === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      push('comment', src.slice(i, stop));
      i = stop;
      continue;
    }

    if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      push('comment', src.slice(i, stop));
      i = stop;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\' && j + 1 < src.length) {
          j += 2;
          continue;
        }
        if (src[j] === '\n') break;
        j += 1;
      }
      const stop = Math.min(j + 1, src.length);
      push('string', src.slice(i, stop));
      i = stop;
      continue;
    }

    if (isDigit(c)) {
      let j = i + 1;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j += 1;
      push('number', src.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < src.length && isIdentCont(src[j])) j += 1;
      const word = src.slice(i, j);

      if (CPP_KEYWORDS.has(word)) {
        push('keyword', word);
      } else if (/^[A-Z]/.test(word)) {
        push('template', word);
      } else {
        push('plain', word);
      }
      i = j;
      continue;
    }

    push('plain', c);
    i += 1;
  }

  return tokens;
}

const STYLE_BY_KIND: Record<TokenKind, React.CSSProperties> = {
  plain: { color: 'rgb(var(--text-primary))' },
  keyword: { color: 'rgb(var(--text-muted))', fontWeight: 600 },
  template: { color: 'rgb(var(--accent))' },
  number: { color: 'rgb(var(--status-warn))' },
  string: { color: 'rgb(var(--status-ok))' },
  comment: { color: 'rgb(var(--text-muted))', fontStyle: 'italic' },
  preproc: { color: 'rgb(var(--faction-grey))' },
};

function renderTokens(tokens: ReadonlyArray<Token>): React.ReactNode {
  return tokens.map((t, i) =>
    t.kind === 'plain' ? (
      <React.Fragment key={i}>{t.value}</React.Fragment>
    ) : (
      <span key={i} style={STYLE_BY_KIND[t.kind]}>
        {t.value}
      </span>
    ),
  );
}

/**
 * Inline code peek — formatted, token-colored C++/TS snippet with an
 * optional filename header + copy button. Zero new dependencies (the
 * tokenizer is a 60-line one-pass scanner in this file). Server-
 * rendered; only the CopyButton is a client island.
 */
export function InlineCodePeek({
  code,
  filename,
  lineNumbers = false,
  maxLines = 24,
  language = 'cpp',
  className = '',
}: InlineCodePeekProps) {
  const lines = code.split('\n');
  const tokens = tokenize(code);

  // ~20px line-height at 13px / 1.55 body → maxLines * 20.
  const lineHeightPx = 20;
  const maxHeight = maxLines * lineHeightPx;

  const ariaLabel =
    language === 'cpp'
      ? `Generated C++ code${filename ? ` — ${filename}` : ''}`
      : `Generated code${filename ? ` — ${filename}` : ''}`;

  return (
    <figure
      className={`rounded-[2px] overflow-hidden ${className}`}
      style={{
        background: 'rgb(var(--bg-deep))',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {filename && (
        <figcaption
          className="flex items-center justify-between px-4 md:px-5 py-2.5"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgb(var(--accent) / 0.04)',
          }}
        >
          <span
            className="dot-matrix"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            {filename}
          </span>
          <CopyButton getText={() => code} />
        </figcaption>
      )}
      <div
        className="overflow-auto p-4 md:p-5"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <pre
          aria-label={ariaLabel}
          className="font-mono text-[13px] leading-[20px] m-0"
          style={{
            fontFamily:
              "'IBM Plex Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace",
          }}
        >
          <code>
            {lineNumbers ? (
              <div className="flex">
                <div
                  aria-hidden="true"
                  className="select-none pr-4 text-right tabular-nums"
                  style={{
                    color: 'rgb(var(--text-muted) / 0.6)',
                    borderRight: '1px solid var(--border-subtle)',
                    marginRight: '1rem',
                  }}
                >
                  {lines.map((_, n) => (
                    <div key={n}>{n + 1}</div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">{renderTokens(tokens)}</div>
              </div>
            ) : (
              renderTokens(tokens)
            )}
          </code>
        </pre>
      </div>
    </figure>
  );
}

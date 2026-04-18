import React from 'react';

// ─── Tiny, project-specific markdown renderer ────────────────────────
//
// We only render the subset of markdown that appears in CHANGELOG.md:
//   - `### Subheading`
//   - `- bullet line`
//   - `**bold**`
//   - `` `inline code` ``
//   - `[text](url)`
//   - blank-line paragraph separation
//
// Anything richer (tables, images, fenced code, nested lists) isn't
// used in the changelog, so we skip it to avoid pulling in a markdown
// library.

interface Props {
  source: string;
}

const BOLD_RE = /\*\*([^*]+)\*\*/g;
const CODE_RE = /`([^`]+)`/g;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string };

function renderInline(text: string): React.ReactNode {
  const tokens: InlineToken[] = [];
  let remaining = text;
  type Match = {
    type: 'bold' | 'code' | 'link';
    index: number;
    length: number;
    value: string;
    href?: string;
  };

  while (remaining.length > 0) {
    const candidates: Match[] = [];
    BOLD_RE.lastIndex = 0;
    CODE_RE.lastIndex = 0;
    LINK_RE.lastIndex = 0;

    const b = BOLD_RE.exec(remaining);
    if (b) {
      candidates.push({
        type: 'bold',
        index: b.index,
        length: b[0].length,
        value: b[1],
      });
    }
    const c = CODE_RE.exec(remaining);
    if (c) {
      candidates.push({
        type: 'code',
        index: c.index,
        length: c[0].length,
        value: c[1],
      });
    }
    const l = LINK_RE.exec(remaining);
    if (l) {
      candidates.push({
        type: 'link',
        index: l.index,
        length: l[0].length,
        value: l[1],
        href: l[2],
      });
    }

    if (candidates.length === 0) {
      tokens.push({ type: 'text', value: remaining });
      break;
    }

    candidates.sort((a, b2) => a.index - b2.index);
    const first = candidates[0];

    if (first.index > 0) {
      tokens.push({ type: 'text', value: remaining.slice(0, first.index) });
    }
    if (first.type === 'link') {
      tokens.push({ type: 'link', value: first.value, href: first.href! });
    } else if (first.type === 'bold') {
      tokens.push({ type: 'bold', value: first.value });
    } else {
      tokens.push({ type: 'code', value: first.value });
    }
    remaining = remaining.slice(first.index + first.length);
  }

  return tokens.map((t, i) => {
    switch (t.type) {
      case 'text':
        return <React.Fragment key={i}>{t.value}</React.Fragment>;
      case 'bold':
        return (
          <strong key={i} className="text-text-primary font-semibold">
            {t.value}
          </strong>
        );
      case 'code':
        return (
          <code
            key={i}
            className="font-mono text-[13px] px-1.5 py-0.5 rounded-[2px]"
            style={{
              background: 'rgb(var(--bg-deep))',
              color: 'rgb(var(--accent))',
            }}
          >
            {t.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={t.href}
            target={t.href.startsWith('http') ? '_blank' : undefined}
            rel={t.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-accent hover:underline"
          >
            {t.value}
          </a>
        );
    }
  });
}

export function ChangelogMarkdown({ source }: Props) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split('\n');

  let i = 0;
  let keyCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h-${keyCounter++}`}
          className="font-cinematic text-[11px] tracking-[0.22em] uppercase text-text-primary mt-8 mb-3"
        >
          {line.slice(4)}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('- ') ||
          lines[i].startsWith('* ') ||
          lines[i].startsWith('  '))
      ) {
        if (lines[i].startsWith('- ') || lines[i].startsWith('* ')) {
          listItems.push(lines[i].slice(2));
        } else if (listItems.length > 0) {
          listItems[listItems.length - 1] += ' ' + lines[i].trim();
        }
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${keyCounter++}`}
          className="list-none space-y-2 my-4 text-[15px] text-text-secondary"
        >
          {listItems.map((item, j) => (
            <li key={j} className="flex gap-3 leading-relaxed">
              <span
                aria-hidden="true"
                className="mt-[9px] inline-block w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: 'rgb(var(--accent) / 0.7)' }}
              />
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.startsWith('---')) {
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('### ') &&
      !lines[i].startsWith('- ') &&
      !lines[i].startsWith('* ') &&
      !lines[i].startsWith('---')
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p
        key={`p-${keyCounter++}`}
        className="my-3 text-[15px] text-text-secondary leading-relaxed"
      >
        {renderInline(paragraph.join(' '))}
      </p>,
    );
  }

  return <>{blocks}</>;
}

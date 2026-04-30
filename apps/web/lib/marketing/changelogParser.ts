import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ChangelogRelease {
  /** Anchor slug derived from the version (e.g. "v0-16-0"). */
  anchor: string;
  /** Display version (e.g. "0.16.0"). */
  version: string;
  /** Release date string as authored in CHANGELOG.md. */
  date: string;
  /** Pre-rendered HTML body for the release section (everything below the header line). */
  bodyHtml: string;
}

const CHANGELOG_PATH = join(process.cwd(), '..', '..', 'CHANGELOG.md');

/**
 * Read CHANGELOG.md from the repo root and split it into per-release
 * sections. The marketing `/changelog` page renders the result.
 *
 * The CHANGELOG follows Keep-a-Changelog conventions; each release
 * starts with a line like `## [0.16.0] — 2026-04-30`. We split on
 * those headers, strip them out of the body, and convert the markdown
 * inside each section to lightweight HTML via {@link renderMarkdown}.
 *
 * No external markdown library — the supported subset is small
 * (headings, paragraphs, lists, inline code, links, bold/italic) and
 * the regex pass is deterministic + cheap.
 */
export function loadChangelog(): ChangelogRelease[] {
  let raw: string;
  try {
    raw = readFileSync(CHANGELOG_PATH, 'utf8');
  } catch {
    return [];
  }
  return parseChangelog(raw);
}

const RELEASE_HEADER = /^## \[([^\]]+)\]\s*[—-]\s*(.+?)\s*$/;

/**
 * Parses the CHANGELOG body into per-release sections. Exported for
 * unit tests.
 */
export function parseChangelog(raw: string): ChangelogRelease[] {
  const lines = raw.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];

  let current: { version: string; date: string; bodyLines: string[] } | null =
    null;

  for (const line of lines) {
    const headerMatch = RELEASE_HEADER.exec(line);
    if (headerMatch) {
      if (current) {
        releases.push(finalize(current));
      }
      current = {
        version: headerMatch[1].trim(),
        date: headerMatch[2].trim(),
        bodyLines: [],
      };
      continue;
    }
    if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) {
    releases.push(finalize(current));
  }
  return releases;
}

function finalize(input: {
  version: string;
  date: string;
  bodyLines: string[];
}): ChangelogRelease {
  const anchor = `v${input.version.replace(/\./g, '-')}`;
  const body = input.bodyLines.join('\n').trim();
  return {
    anchor,
    version: input.version,
    date: input.date,
    bodyHtml: renderMarkdown(body),
  };
}

/**
 * Tiny markdown → HTML converter. Supports the subset KyberStation's
 * CHANGELOG actually uses:
 *
 * - `### Heading` → `<h3>` (and `####` → `<h4>`)
 * - `- item` (or `* item`) → `<ul><li>` blocks
 * - `**bold**` / `*italic*`
 * - `` `code` `` → `<code>`
 * - `[label](url)` → `<a>`
 * - Blank line → paragraph break
 * - Horizontal rules (`---`) → `<hr>`
 *
 * HTML is escaped first, then markdown markers are rewritten.
 * Exported for unit tests.
 */
export function renderMarkdown(input: string): string {
  if (!input) {
    return '';
  }
  const escaped = escapeHtml(input);
  const blocks = escaped.split(/\n{2,}/);
  const out: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) {
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      out.push('<hr />');
      continue;
    }
    const headingMatch = /^(#{2,6})\s+(.+?)\s*$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2]);
      out.push(`<h${level}>${text}</h${level}>`);
      continue;
    }
    const listLines = trimmed.split('\n');
    if (listLines.every((l) => /^\s*[-*]\s+/.test(l))) {
      const items = listLines
        .map((l) => l.replace(/^\s*[-*]\s+/, ''))
        .map((l) => `<li>${renderInline(l)}</li>`)
        .join('');
      out.push(`<ul>${items}</ul>`);
      continue;
    }
    // Treat as a paragraph; normalize internal newlines to a single space.
    const paragraph = trimmed.replace(/\n/g, ' ');
    out.push(`<p>${renderInline(paragraph)}</p>`);
  }
  return out.join('\n');
}

// Sentinels for the inline-code placeholder pass. The marker pattern
// is unlikely to occur in real CHANGELOG content, and the regex used
// to restore is exact-match.
const CODE_PLACEHOLDER_OPEN = 'CODE';
const CODE_PLACEHOLDER_CLOSE = '';
const CODE_PLACEHOLDER_RE = /CODE(\d+)/g;

function renderInline(input: string): string {
  let s = input;
  // Stash inline code as opaque placeholders so the subsequent
  // bold/italic/link passes don't rewrite tokens inside `…`.
  const codeSpans: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_, body: string) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${body}</code>`);
    return `${CODE_PLACEHOLDER_OPEN}${idx}${CODE_PLACEHOLDER_CLOSE}`;
  });
  // Links: [label](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  // Bold (handle before italic so **a** doesn't get eaten by single asterisks).
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic — single * not adjacent to alphanumerics on both sides for safety.
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Restore placeholders.
  s = s.replace(CODE_PLACEHOLDER_RE, (_, idxStr: string) => {
    const idx = Number(idxStr);
    return codeSpans[idx] ?? '';
  });
  return s;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

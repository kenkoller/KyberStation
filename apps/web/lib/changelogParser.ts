import fs from 'node:fs/promises';
import path from 'node:path';

export interface ChangelogEntry {
  /** e.g. "0.11.3" or "Unreleased" */
  version: string;
  /** e.g. "2026-04-17" — omitted for unreleased / missing dates. */
  date?: string;
  /** Raw markdown body for the section (between headings). */
  body: string;
}

/**
 * Reads and splits `CHANGELOG.md` into one entry per `## [X]` heading.
 *
 * Intentionally a tiny parser — the changelog has a fixed, hand-curated
 * shape, and we render our own markdown subset downstream rather than
 * pulling in a full markdown library.
 */
export async function loadChangelog(): Promise<ChangelogEntry[]> {
  const file = path.resolve(process.cwd(), '../../CHANGELOG.md');
  let content: string;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch {
    const alt = path.resolve(process.cwd(), 'CHANGELOG.md');
    content = await fs.readFile(alt, 'utf8');
  }

  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');
  let current: ChangelogEntry | null = null;
  let buffer: string[] = [];

  const VERSION_RE = /^##\s+\[([^\]]+)\](?:\s+—\s+(.+?))?\s*$/;

  for (const line of lines) {
    const match = line.match(VERSION_RE);
    if (match) {
      if (current) {
        current.body = buffer.join('\n').trim();
        entries.push(current);
      }
      current = {
        version: match[1].trim(),
        date: match[2]?.trim(),
        body: '',
      };
      buffer = [];
    } else if (current) {
      buffer.push(line);
    }
  }
  if (current) {
    current.body = buffer.join('\n').trim();
    entries.push(current);
  }

  return entries;
}

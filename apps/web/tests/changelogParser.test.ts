// ─── CHANGELOG.md parser tests ───
//
// We mock node:fs/promises so the test is insensitive to where vitest
// is invoked from. The helper tries two paths; both calls resolve to
// the same canned string in the mock, so either fallback lands.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted to file-top; the factory must not reference
// outer-scope variables that haven't been initialized yet. vi.hoisted
// moves the mock fn creation up alongside the vi.mock call.
const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: { readFile: readFileMock },
  readFile: readFileMock,
}));

import { loadChangelog } from '@/lib/changelogParser';

function setFile(content: string): void {
  readFileMock.mockReset();
  readFileMock.mockResolvedValue(content);
}

describe('loadChangelog', () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  it('returns [] for empty input', async () => {
    setFile('');
    const entries = await loadChangelog();
    expect(entries).toEqual([]);
  });

  it('parses a single dated section', async () => {
    setFile(
      [
        '# Changelog',
        '',
        '## [0.1.0] — 2026-01-01',
        '',
        '### Added',
        '- Feature',
        '',
      ].join('\n'),
    );
    const entries = await loadChangelog();
    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe('0.1.0');
    expect(entries[0].date).toBe('2026-01-01');
    expect(entries[0].body).toContain('### Added');
    expect(entries[0].body).toContain('- Feature');
  });

  it('returns multiple sections in source order', async () => {
    setFile(
      [
        '## [0.2.0] — 2026-02-02',
        '- two',
        '',
        '## [0.1.0] — 2026-01-01',
        '- one',
      ].join('\n'),
    );
    const entries = await loadChangelog();
    expect(entries.map((e) => e.version)).toEqual(['0.2.0', '0.1.0']);
    expect(entries[0].date).toBe('2026-02-02');
    expect(entries[1].date).toBe('2026-01-01');
  });

  it('handles an Unreleased section with no date', async () => {
    setFile(['## [Unreleased]', '', '### Added', '- wip', ''].join('\n'));
    const entries = await loadChangelog();
    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe('Unreleased');
    expect(entries[0].date).toBeUndefined();
    expect(entries[0].body).toContain('### Added');
  });

  it('discards preamble content before the first ## [ header', async () => {
    setFile(
      [
        '# Changelog',
        'Some preamble paragraph.',
        'More preamble.',
        '',
        '## [0.1.0] — 2026-01-01',
        '- entry',
      ].join('\n'),
    );
    const entries = await loadChangelog();
    expect(entries).toHaveLength(1);
    expect(entries[0].body).not.toContain('preamble');
  });

  it('yields an empty body string for a title-only section', async () => {
    setFile('## [0.1.0] — 2026-01-01\n');
    const entries = await loadChangelog();
    expect(entries).toHaveLength(1);
    expect(entries[0].body).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseChangelog,
  renderMarkdown,
} from '@/lib/marketing/changelogParser';

const SAMPLE_CHANGELOG = `# Changelog

All notable changes are documented here.

---

## [0.16.0] — 2026-04-30

**KyberStation v1.0 public launch.** First release.

### Added

- **Save Preset v1** (PR #134) — \`SAVE\` button + IndexedDB.
- **Add to Queue v1** (PR #136) — One-click queue.

### Fixed

- **Retraction animation** (PR #132) — Inverted progress.

---

## [0.15.0] — 2026-04-27

**Codename:** Modulation Routing.

### Added

- 11 modulators with live viz.
- AST-level template injection.
`;

describe('parseChangelog', () => {
  it('splits the changelog into per-release entries', () => {
    const releases = parseChangelog(SAMPLE_CHANGELOG);
    expect(releases).toHaveLength(2);
    expect(releases[0].version).toBe('0.16.0');
    expect(releases[0].date).toBe('2026-04-30');
    expect(releases[1].version).toBe('0.15.0');
    expect(releases[1].date).toBe('2026-04-27');
  });

  it('produces a stable anchor slug from the version', () => {
    const releases = parseChangelog(SAMPLE_CHANGELOG);
    expect(releases[0].anchor).toBe('v0-16-0');
    expect(releases[1].anchor).toBe('v0-15-0');
  });

  it('includes section content in the body html', () => {
    const releases = parseChangelog(SAMPLE_CHANGELOG);
    expect(releases[0].bodyHtml).toContain('<h3>Added</h3>');
    expect(releases[0].bodyHtml).toContain('<h3>Fixed</h3>');
    expect(releases[0].bodyHtml).toContain('Save Preset v1');
  });

  it('does NOT include the release header line in the body', () => {
    const releases = parseChangelog(SAMPLE_CHANGELOG);
    expect(releases[0].bodyHtml).not.toContain('[0.16.0]');
    expect(releases[0].bodyHtml).not.toContain('2026-04-30');
  });

  it('returns an empty array for an empty input', () => {
    expect(parseChangelog('')).toEqual([]);
  });

  it('handles a changelog with no releases gracefully', () => {
    expect(parseChangelog('# Changelog\n\nNo releases yet.\n')).toEqual([]);
  });
});

describe('renderMarkdown', () => {
  it('renders headings at the right level', () => {
    expect(renderMarkdown('## Big')).toBe('<h2>Big</h2>');
    expect(renderMarkdown('### Med')).toBe('<h3>Med</h3>');
    expect(renderMarkdown('#### Small')).toBe('<h4>Small</h4>');
  });

  it('renders bullet lists', () => {
    const html = renderMarkdown('- one\n- two\n- three');
    expect(html).toBe('<ul><li>one</li><li>two</li><li>three</li></ul>');
  });

  it('renders inline code', () => {
    expect(renderMarkdown('Run `npm install` first')).toBe(
      '<p>Run <code>npm install</code> first</p>',
    );
  });

  it('renders bold and italic', () => {
    expect(renderMarkdown('**bold** text')).toBe(
      '<p><strong>bold</strong> text</p>',
    );
    expect(renderMarkdown('and *italic* too')).toBe(
      '<p>and <em>italic</em> too</p>',
    );
  });

  it('renders links with target=_blank for external URLs', () => {
    const html = renderMarkdown('See [docs](https://example.com).');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('escapes raw HTML in input', () => {
    const html = renderMarkdown('Use <script>alert("xss")</script>.');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders horizontal rules as <hr>', () => {
    expect(renderMarkdown('text\n\n---\n\nmore')).toContain('<hr />');
  });

  it('renders consecutive paragraphs as separate blocks', () => {
    const html = renderMarkdown('first paragraph\n\nsecond paragraph');
    expect(html).toBe('<p>first paragraph</p>\n<p>second paragraph</p>');
  });

  it('handles empty input cleanly', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('handles `code` containing markdown special chars without re-processing', () => {
    const html = renderMarkdown('Try `**not bold**` here.');
    expect(html).toContain('<code>**not bold**</code>');
    expect(html).not.toContain('<strong>');
  });
});

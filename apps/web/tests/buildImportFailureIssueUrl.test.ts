// ─── buildImportFailureIssueUrl — Chip #6 (Sprint 5F) ────────────────
//
// Pre-fills a GitHub "new issue" URL using the import_failure.md
// template + a body containing the failing snippet, parse warnings,
// and environment info. Loop-closing affordance for the
// no-owner-hardware era: every failing import becomes a structured
// bug report in one click.

import { describe, it, expect } from 'vitest';
import { buildImportFailureIssueUrl } from '@/components/editor/CodeOutput';

describe('buildImportFailureIssueUrl', () => {
  it('returns a github.com/kenkoller/KyberStation/issues/new URL', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'Mozilla/5.0 Test',
    });
    expect(url).toMatch(/^https:\/\/github\.com\/kenkoller\/KyberStation\/issues\/new\?/);
  });

  it('uses the import_failure.md template', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    expect(url).toContain('template=import_failure.md');
  });

  it('includes the snippet in the encoded body', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Layers<Blue, ResponsiveLockupL<White>>>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).toContain('StylePtr<Layers<Blue, ResponsiveLockupL<White>>>()');
  });

  it('includes the user agent string in the body', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/132.0.0.0',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).toContain('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/132.0.0.0');
  });

  it('extracts unique unknown template names from warnings', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<UnknownX<...>>()',
      warnings: [
        'Unknown template "UnknownX" — may be a typo or an OS7 feature not yet registered.',
        'Unknown template "PulsingL" — may be a typo or an OS7 feature not yet registered.',
        'Unknown template "PulsingL" — may be a typo or an OS7 feature not yet registered.', // dup
        'Some other warning that\'s not about an unknown template',
      ],
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).toContain('unique unknown templates: UnknownX, PulsingL');
  });

  it('shows "none" for zero warnings', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).toContain('Parse warnings**: none');
  });

  it('includes parse errors block when errors exist', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue',
      warnings: [],
      errors: ['Unexpected end of input', 'Unmatched <'],
      confidence: 0.5,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).toContain('Parse errors');
    expect(decoded).toContain('Unexpected end of input');
    expect(decoded).toContain('Unmatched <');
  });

  it('includes confidence score when provided', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.27,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).toContain('Reconstruction confidence**: 0.27');
  });

  it('omits confidence line when undefined', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: undefined,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    expect(decoded).not.toContain('Reconstruction confidence');
  });

  it('truncates very large snippets to fit within URL limits', () => {
    const giantSnippet = 'StylePtr<' + 'A'.repeat(10000) + '>()';
    const url = buildImportFailureIssueUrl({
      snippet: giantSnippet,
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    // URL stays well under GitHub's 8KB practical limit for the body
    const bodyEncoded = url.split('body=')[1] ?? '';
    expect(bodyEncoded.length).toBeLessThan(8192);
    const decoded = decodeURIComponent(bodyEncoded);
    expect(decoded).toContain('truncated');
  });

  it('user agent is truncated to 200 chars to avoid bloat', () => {
    const giantUA = 'Mozilla/5.0 ' + 'X'.repeat(500);
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: giantUA,
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    // The substring should be present but capped
    expect(decoded).toContain('Mozilla/5.0 ');
    // Original 500-char tail should NOT be fully present
    expect(decoded).not.toContain('X'.repeat(500));
  });

  it('title field is included in the URL', () => {
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: [],
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    expect(url).toContain('title=Import+failed%3A+');
  });

  it('limits unknown templates to 5 entries (not all 100 if user pasted a giant blob)', () => {
    const lotsOfUnknowns = Array.from({ length: 20 }, (_, i) =>
      `Unknown template "Template${i}" — may be a typo.`,
    );
    const url = buildImportFailureIssueUrl({
      snippet: 'StylePtr<Blue>()',
      warnings: lotsOfUnknowns,
      errors: [],
      confidence: 0.5,
      userAgent: 'test',
    });
    const decoded = new URL(url).searchParams.get('body') ?? '';
    // Should mention 20 warnings total, but only list 5 template names
    expect(decoded).toContain('20');
    expect(decoded).toContain('Template0, Template1, Template2, Template3, Template4');
    expect(decoded).not.toContain('Template5,');
  });
});

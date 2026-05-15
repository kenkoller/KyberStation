// ─── runtimePresetIO tests ───────────────────────────────────────────
//
// Pure helper tests for parsing the install_time line out of an
// existing presets.ini. The async FileSystemDirectoryHandle wrappers
// are thin shims and rely on the parser tested here.

import { describe, it, expect } from 'vitest';
import { parseInstallTime } from '@/lib/runtimePresetIO';

describe('parseInstallTime', () => {
  it('extracts the value after installed=', () => {
    const input = 'installed=Apr 21 2026 08:44:54\nnew_preset\nfont=Graflex\n';
    expect(parseInstallTime(input)).toBe('Apr 21 2026 08:44:54');
  });

  it('tolerates CRLF line endings', () => {
    const input = 'installed=Apr 21 2026 08:44:54\r\nnew_preset\r\n';
    expect(parseInstallTime(input)).toBe('Apr 21 2026 08:44:54');
  });

  it('strips a leading BOM', () => {
    const input = '﻿installed=May 1 2026 12:00:00\nnew_preset\n';
    expect(parseInstallTime(input)).toBe('May 1 2026 12:00:00');
  });

  it('skips leading blank lines and # comments', () => {
    const input = '\n\n# this is a comment\ninstalled=May 14 2026 18:00:00\n';
    expect(parseInstallTime(input)).toBe('May 14 2026 18:00:00');
  });

  it('returns null for an empty string', () => {
    expect(parseInstallTime('')).toBeNull();
  });

  it('returns null when the first non-comment line is not installed=', () => {
    const input = 'new_preset\ninstalled=Too Late 2026\nend\n';
    expect(parseInstallTime(input)).toBeNull();
  });

  it('returns null when installed= value is empty', () => {
    expect(parseInstallTime('installed=\nnew_preset\n')).toBeNull();
  });

  it('returns null when installed= value is whitespace only', () => {
    expect(parseInstallTime('installed=   \nnew_preset\n')).toBeNull();
  });

  it('trims trailing whitespace from the install_time value', () => {
    expect(parseInstallTime('installed=Apr 21 2026 08:44:54   \nnew_preset\n')).toBe(
      'Apr 21 2026 08:44:54',
    );
  });
});

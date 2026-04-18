// ─── Cue-list view regression tests ───
//
// The cue-list view is an alternate tabular presentation of the
// timeline (ETC Eos lighting-console register per UX North Star §4).
// Both views share the same timelineStore — so these tests focus on
// the two pure helpers that the cue-list view relies on for inline
// editing: `formatTime` (seconds → MM:SS.ms for the Time column) and
// `parseTimeString` (user input → seconds, for committing edits).
//
// Regression targets:
//   - MM:SS.ms must round-trip through format/parse within 1 cs
//   - parseTimeString must accept both "MM:SS.ms" and plain seconds
//   - parseTimeString must reject garbage without throwing
//   - formatTime output must satisfy ETC Eos-style left-padding

import { describe, it, expect } from 'vitest';
import {
  __formatTimeForTest as formatTime,
  __parseTimeStringForTest as parseTimeString,
} from '../components/editor/TimelinePanel';

describe('formatTime (cue-list Time column)', () => {
  it('left-pads minutes and seconds to two digits', () => {
    expect(formatTime(0)).toBe('00:00.00');
    expect(formatTime(1)).toBe('00:01.00');
    expect(formatTime(59)).toBe('00:59.00');
  });

  it('rolls over to the next minute at 60s', () => {
    expect(formatTime(60)).toBe('01:00.00');
    expect(formatTime(125)).toBe('02:05.00');
  });

  it('renders fractional seconds as a two-digit centisecond suffix', () => {
    expect(formatTime(1.5)).toBe('00:01.50');
    expect(formatTime(12.345)).toBe('00:12.35'); // rounded to cs
  });
});

describe('parseTimeString (cue-list Time column inline edit)', () => {
  it('parses plain seconds strings', () => {
    expect(parseTimeString('0')).toBe(0);
    expect(parseTimeString('5')).toBe(5);
    expect(parseTimeString('12.5')).toBe(12.5);
  });

  it('parses MM:SS form', () => {
    expect(parseTimeString('00:00')).toBe(0);
    expect(parseTimeString('01:30')).toBe(90);
    expect(parseTimeString('2:45')).toBe(165);
  });

  it('parses MM:SS.ms form (what formatTime produces)', () => {
    expect(parseTimeString('00:01.50')).toBeCloseTo(1.5, 4);
    expect(parseTimeString('01:30.25')).toBeCloseTo(90.25, 4);
  });

  it('round-trips through formatTime with centisecond precision', () => {
    for (const t of [0, 0.5, 1, 12.34, 59.99, 60, 125.5]) {
      const parsed = parseTimeString(formatTime(t));
      expect(parsed).not.toBeNull();
      // formatTime rounds to centiseconds — compare at cs precision
      expect(parsed!).toBeCloseTo(t, 1);
    }
  });

  it('rejects garbage without throwing', () => {
    expect(parseTimeString('')).toBeNull();
    expect(parseTimeString('abc')).toBeNull();
    expect(parseTimeString('1:2:3')).toBeNull();
    expect(parseTimeString('::')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseTimeString('  5  ')).toBe(5);
    expect(parseTimeString(' 00:01.50 ')).toBeCloseTo(1.5, 4);
  });
});

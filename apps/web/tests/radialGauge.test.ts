// ─── RadialGauge — tier + readout helper tests ───
//
// The component itself is SVG presentation — hard to unit-test without
// DOM snapshots. What matters is the math: the tier classification
// applied to the thresholds, and the readout formatting used by the
// central numeric. Pinning both here catches accidental changes to
// pulse behaviour and readout stability.

import { describe, it, expect } from 'vitest';
import { classifyTier, formatReadoutValue } from '../components/shared/RadialGauge';

describe('classifyTier', () => {
  const pctTiers = { warn: 75, critical: 90 };

  it('returns "ok" below the warn threshold', () => {
    expect(classifyTier(0, pctTiers)).toBe('ok');
    expect(classifyTier(50, pctTiers)).toBe('ok');
    expect(classifyTier(74.9, pctTiers)).toBe('ok');
  });

  it('returns "warn" at or above warn, below critical', () => {
    expect(classifyTier(75, pctTiers)).toBe('warn');
    expect(classifyTier(80, pctTiers)).toBe('warn');
    expect(classifyTier(89.9, pctTiers)).toBe('warn');
  });

  it('returns "critical" at or above critical', () => {
    expect(classifyTier(90, pctTiers)).toBe('critical');
    expect(classifyTier(100, pctTiers)).toBe('critical');
    expect(classifyTier(250, pctTiers)).toBe('critical');
  });

  it('handles absolute-unit thresholds', () => {
    // Matches the PowerDrawPanel wiring: 2.5A warn, 4A critical out of 5A budget.
    const ampTiers = { warn: 2.5, critical: 4 };
    expect(classifyTier(1.2, ampTiers)).toBe('ok');
    expect(classifyTier(2.5, ampTiers)).toBe('warn');
    expect(classifyTier(3.9, ampTiers)).toBe('warn');
    expect(classifyTier(4.0, ampTiers)).toBe('critical');
    expect(classifyTier(4.5, ampTiers)).toBe('critical');
  });
});

describe('formatReadoutValue', () => {
  it('shows two decimals under 10', () => {
    expect(formatReadoutValue(0)).toBe('0.00');
    expect(formatReadoutValue(1.2345)).toBe('1.23');
    // 9.999 rounds up past the v<10 branch — it lands in the 10≤v<100
    // one-decimal branch. Pinning the cross-branch behaviour here.
    expect(formatReadoutValue(9.999)).toBe('10.00');
    expect(formatReadoutValue(9.8)).toBe('9.80');
  });

  it('shows one decimal between 10 and 100', () => {
    expect(formatReadoutValue(10)).toBe('10.0');
    expect(formatReadoutValue(42.67)).toBe('42.7');
    expect(formatReadoutValue(99.94)).toBe('99.9');
  });

  it('shows no decimals at or above 100', () => {
    expect(formatReadoutValue(100)).toBe('100');
    expect(formatReadoutValue(1234.5)).toBe('1235');
  });

  it('returns "0" for non-finite values', () => {
    expect(formatReadoutValue(NaN)).toBe('0');
    expect(formatReadoutValue(Infinity)).toBe('0');
    expect(formatReadoutValue(-Infinity)).toBe('0');
  });
});

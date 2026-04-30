/**
 * Drift sentinel for the Tailwind `screens` configuration.
 *
 * The macro-shell switch points (600 / 1024 / 1440) are load-bearing —
 * AppShell.tsx picks MobileShell / TabletShell / WorkbenchLayout based
 * on these. Moving any of these boundaries would require a coordinated
 * rewrite of the corresponding shell.
 *
 * `phone-sm` (≤479px, added in Phase 4 PR #1, 2026-04-30) is a NEW
 * inflection INSIDE MobileShell. It does not change the macro shell
 * boundary. It exists so subsequent Phase 4 PRs can apply tighter
 * reflow rules to the smallest phones (action bar icon-only mode,
 * edge-to-edge sheets, etc.) without touching the 600px MobileShell
 * boundary.
 *
 * If this test fails, either:
 *   (a) revert the unintended `screens` change, OR
 *   (b) update the corresponding shell boundary at the same time and
 *       update this test to match.
 */
import { describe, it, expect } from 'vitest';
import config from '../../../tailwind.config';

describe('tailwind breakpoints (drift sentinel)', () => {
  it('exports the phone-sm variant at max 479px (added Phase 4 PR #1)', () => {
    const screens = config.theme?.extend?.screens as
      | Record<string, string | { min?: string; max?: string }>
      | undefined;
    expect(screens).toBeDefined();
    expect(screens?.['phone-sm']).toEqual({ max: '479px' });
  });

  it('preserves the existing phone / tablet / desktop / wide variants', () => {
    const screens = config.theme?.extend?.screens as
      | Record<string, string | { min?: string; max?: string }>
      | undefined;
    expect(screens?.phone).toEqual({ max: '599px' });
    expect(screens?.tablet).toEqual({ min: '600px', max: '1023px' });
    expect(screens?.desktop).toBe('1024px');
    expect(screens?.wide).toBe('1440px');
  });
});
